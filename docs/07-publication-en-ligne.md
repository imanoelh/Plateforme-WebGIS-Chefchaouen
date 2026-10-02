# Publication GitHub et hébergement en ligne

## Objectif

Le collaborateur ouvre le WebGIS avec un navigateur, depuis n'importe quel ordinateur. Il n'installe ni Docker, ni PostgreSQL/PostGIS, ni le frontend. Ces services tournent sur des plateformes hébergées.

Architecture préparée :

```text
Navigateur du collaborateur
          |
          v
Cloudflare Workers — interface publique
          |
          v
Render — API FastAPI — réseau privé — PostgreSQL/PostGIS Raster
```

Le dépôt contient [`render.yaml`](../render.yaml), un Blueprint Render qui prépare l'API et la base. Render annonce la prise en charge de `postgis` et `postgis_raster`. Le site utilise le preset Cloudflare Workers déjà généré par le build TanStack Start/Nitro.

## 1. Publier le code sur GitHub

Le dépôt distant `origin` est déjà configuré. Vérifier que seuls les fichiers du projet sont préparés pour le commit. Ne jamais ajouter `.env`, `backend/.env`, `frontend/.env` ni `backup/` : ces fichiers restent locaux et sont exclus par `.gitignore`. Publier ensuite la branche `main` sur GitHub.

## 2. Créer l'API et la base hébergées

Dans Render, connecter le dépôt GitHub, puis créer un **Blueprint** à partir de `render.yaml`. Les noms et variables de connexion sont fournis par la configuration; Render garde la base accessible à l'API sur son réseau privé. L'API est publique et en lecture seule (`GET`).

Le plan gratuit permet une démonstration sans frais, mais Render met en veille les services web inactifs et supprime une base PostgreSQL gratuite après 30 jours. Choisir une base payante avant de créer les ressources si le lien doit rester disponible au-delà de cette période. Voir la [tarification Render](https://render.com/pricing) et les [limites des plans gratuits](https://render.com/docs/free).

## 3. Restaurer les données PostGIS

Une base hébergée vide ne contient pas les données. Depuis l'ordinateur de développement, produire un dump limité au schéma applicatif `webgis` à partir de la base locale. Garder le fichier dans `backup/`, qui est ignoré par Git. Le dump complet existant contient aussi des extensions système qui ne sont pas nécessaires à l'application.

```powershell
$envMap = @{}
Get-Content .env | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $envMap[$matches[1]] = $matches[2].Trim('"') }
}
$dbUser = $envMap['POSTGRES_USER']
$dbName = $envMap['POSTGRES_DB']
docker exec chefchaouen_postgis pg_dump -U $dbUser -d $dbName -Fc --no-owner --schema=webgis -f /tmp/chefchaouen_webgis_only.backup
docker cp chefchaouen_postgis:/tmp/chefchaouen_webgis_only.backup backup/chefchaouen_webgis_only.backup
docker exec chefchaouen_postgis rm /tmp/chefchaouen_webgis_only.backup
```

Dans Render, autoriser temporairement l'adresse IP de l'ordinateur de développement dans la liste d'accès de la base. Utiliser l'hôte, le port externe, la base et l'utilisateur montrés par Render. Dans PowerShell, saisir le mot de passe de façon masquée et créer les extensions avant la restauration :

```powershell
$securePassword = Read-Host 'Mot de passe PostgreSQL Render' -AsSecureString
$env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
$env:PGSSLMODE = 'require'
$backupPath = (Resolve-Path 'backup').Path

docker run --rm --mount "type=bind,source=$backupPath,target=/backup,readonly" -e PGPASSWORD -e PGSSLMODE postgis/postgis:16-3.5 psql -h '<HOTE_EXTERNE>' -p '<PORT_EXTERNE>' -U '<UTILISATEUR>' -d '<BASE>' -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION postgis; CREATE EXTENSION postgis_raster;'
docker run --rm --mount "type=bind,source=$backupPath,target=/backup,readonly" -e PGPASSWORD -e PGSSLMODE postgis/postgis:16-3.5 pg_restore -h '<HOTE_EXTERNE>' -p '<PORT_EXTERNE>' -U '<UTILISATEUR>' -d '<BASE>' --no-owner --no-privileges --exit-on-error /backup/chefchaouen_webgis_only.backup

Remove-Item Env:PGPASSWORD
Remove-Item Env:PGSSLMODE
```

Remplacer les quatre valeurs entre chevrons par celles de Render. Le dump contient uniquement `webgis` et ne contient pas les extensions; il est généré depuis la base actuelle et inclut la superficie corrigée. Le mot de passe reste temporaire dans la session PowerShell et n'est pas écrit dans l'historique des commandes.

Après restauration, contrôler `/api/health`, `/api/dashboard/summary` et `/api/rasters/diagnostics/classes`. Les valeurs de superficie doivent inclure la zone à **8 084,5 ha**. Retirer ensuite l'adresse IP temporaire de la liste d'accès; l'API communique avec la base via le réseau privé Render.

## 4. Publier le frontend

Connecter le même dépôt dans Cloudflare Workers Builds. Sélectionner `frontend/` comme répertoire du projet, puis configurer :

| Paramètre | Valeur |
| --- | --- |
| Branche | `main` |
| Installation | `npm ci` |
| Build | `npm run build` |
| Déploiement | `npx nitro deploy --prebuilt` |
| Variable de build | `VITE_API_URL=https://<nom-api>.onrender.com` |

La variable `VITE_API_URL` doit être présente **au moment du build**, car l'adresse de l'API est intégrée au JavaScript du frontend. Cloudflare attribue une adresse `*.workers.dev`; cette adresse devient le lien à transmettre au collaborateur. Les mises à jour de `main` redéploient les services connectés.

## 5. Vérification depuis un autre ordinateur

Ouvrir le lien Cloudflare dans une fenêtre privée ou depuis un autre réseau. Vérifier le fond de carte, les couches 2019/2025/changements, la comparaison, les légendes, les statistiques et une valeur ponctuelle. Vérifier également `https://<nom-api>.onrender.com/api/health` et la réponse des rasters. La première requête peut être lente si le service gratuit Render sort de veille.

Le collaborateur n'a besoin que du lien navigateur. L'export initial des données et la configuration des services hébergés sont réalisés une fois par la personne qui possède les comptes de déploiement.
