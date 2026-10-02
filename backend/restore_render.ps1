param(
    [string]$BackupPath = (Join-Path $PSScriptRoot '..\backup\chefchaouen_webgis_only.backup'),
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if ((Get-Item -LiteralPath $resolvedBackup).Length -eq 0) {
    throw 'Le fichier de sauvegarde est vide.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker est necessaire sur le poste de developpement pour cet import.'
}
if ($PreflightOnly) {
    Write-Host 'Sauvegarde et commande Docker disponibles.'
    return
}

Write-Host 'Import dans la base Render vide. Aucune table existante ne sera remplacee.'
$secureUrl = Read-Host 'Collez External Database URL de Render (saisie masquee)' -AsSecureString
$plainUrl = [System.Net.NetworkCredential]::new('', $secureUrl).Password
try {
    $renderUri = [Uri]$plainUrl
} catch {
    throw 'URL PostgreSQL invalide.'
} finally {
    $plainUrl = $null
}
if ($renderUri.Scheme -notin @('postgres', 'postgresql') -or
    -not $renderUri.Host.EndsWith('.render.com')) {
    throw 'Utilisez uniquement External Database URL de la base Render du projet.'
}
$loginParts = $renderUri.UserInfo.Split([char[]]@(':'), 2)
if ($loginParts.Count -ne 2 -or $renderUri.AbsolutePath -eq '/') {
    throw 'URL incomplete : utilisateur, mot de passe et base sont requis.'
}

$pgNames = @('PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD', 'PGSSLMODE', 'PGCONNECT_TIMEOUT')
$previousEnv = @{}
foreach ($name in $pgNames) {
    $previousEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
    $env:PGHOST = $renderUri.Host
    $env:PGPORT = if ($renderUri.Port -gt 0) { [string]$renderUri.Port } else { '5432' }
    $env:PGUSER = [Uri]::UnescapeDataString($loginParts[0])
    $env:PGDATABASE = [Uri]::UnescapeDataString($renderUri.AbsolutePath.TrimStart('/'))
    $env:PGPASSWORD = [Uri]::UnescapeDataString($loginParts[1])
    $env:PGSSLMODE = 'require'
    $env:PGCONNECT_TIMEOUT = '15'
    $renderUri = $null
    $loginParts = $null
    $secureUrl = $null

    $dockerArgs = @('run', '--rm')
    foreach ($name in $pgNames) { $dockerArgs += @('-e', $name) }
    $image = 'postgis/postgis:16-3.5'
    $existsSql = "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'webgis');"
    $schemaExists = & docker @dockerArgs $image psql -X -A -t -v ON_ERROR_STOP=1 -c $existsSql
    if ($LASTEXITCODE -ne 0) { throw 'Connexion Render impossible. Verifiez l URL et la liste des IP autorisees.' }
    if (($schemaExists -join '').Trim() -ne 'f') {
        throw 'Le schema webgis existe deja. Import arrete pour proteger les donnees.'
    }

    & docker @dockerArgs $image psql -X -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster;'
    if ($LASTEXITCODE -ne 0) { throw 'Installation des extensions PostGIS impossible.' }

    $backupDir = Split-Path -Parent $resolvedBackup
    $backupName = Split-Path -Leaf $resolvedBackup
    $mountArg = "type=bind,source=$backupDir,target=/backup,readonly"
    & docker @dockerArgs --mount $mountArg $image pg_restore --dbname $env:PGDATABASE --no-owner --no-privileges --single-transaction --exit-on-error "/backup/$backupName"
    if ($LASTEXITCODE -ne 0) { throw 'Import echoue. La transaction de restauration a ete annulee.' }

    & docker @dockerArgs $image psql -X -v ON_ERROR_STOP=1 -c 'SELECT name, area_ha FROM webgis.study_area;'
    if ($LASTEXITCODE -ne 0) { throw 'Verification de la zone apres import impossible.' }
    Write-Host 'Import termine. Verifiez maintenant l API et les couches sur le site public.'
} finally {
    foreach ($name in $pgNames) {
        [Environment]::SetEnvironmentVariable($name, $previousEnv[$name], 'Process')
    }
    $renderUri = $null
    $loginParts = $null
    $secureUrl = $null
}
