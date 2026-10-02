# Publication GitHub et hébergement en ligne

## Objectif

Le collaborateur ouvre le WebGIS avec un navigateur, depuis n'importe quel ordinateur. Il n'installe ni Docker, ni PostgreSQL/PostGIS, ni le frontend. Ces services tournent sur des plateformes hébergées.

Architecture préparée :

```text
Navigateur du collaborateur
          |
          v
Render Static Site — interface publique
          |
          v
Render — API FastAPI — réseau privé — PostgreSQL/PostGIS Raster
```

Le dépôt contient [`render.yaml`](../render.yaml), un Blueprint Render qui prépare les trois ressources gratuites : site statique, API et base. Render annonce la prise en charge de `postgis` et `postgis_raster`. Le frontend est préconstruit en HTML et JavaScript; il n'a pas besoin d'un serveur Node en fonctionnement.

## 1. Publier le code sur GitHub

Le dépôt distant `origin` est déjà configuré et la branche `main` est publiée sur GitHub. Ne jamais ajouter `.env`, `backend/.env`, `frontend/.env` ni `backup/` : ces fichiers restent locaux et sont exclus par `.gitignore`. Pousser les mises à jour de `main` avant de créer ou de synchroniser le Blueprint.

## 2. Créer le site, l'API et la base hébergés

Dans Render, connecter le dépôt GitHub, puis créer un **Blueprint** à partir de `render.yaml`. Vérifier que les trois ressources affichent le plan gratuit avant de confirmer : `chefchaouen-webgis` (site statique), `chefchaouen-webgis-api` (API) et `chefchaouen-webgis-db` (PostgreSQL). Les variables de connexion sont fournies par la configuration; Render garde la base accessible à l'API sur son réseau privé. L'adresse publique de l'API est transmise automatiquement au build du site. L'API est publique et en lecture seule (`GET`).

Cette configuration utilise uniquement les plans gratuits. Render met en veille l'API après 15 minutes d'inactivité; la première ouverture peut prendre environ une minute. Le frontend attend et relance les requêtes transitoires pendant le réveil de l'API. La base PostgreSQL gratuite expire 30 jours après sa création. Pour prolonger une démonstration gratuite, garder le dump local dans `backup/`, créer une nouvelle base gratuite après expiration et restaurer les données à nouveau; l'ancienne base ne reste pas accessible. Render ne fournit pas de sauvegarde automatique pour la base gratuite. Voir les [limites des plans gratuits](https://render.com/docs/free).

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

## 4. Vérifier le frontend publié

Le Blueprint construit et publie automatiquement `chefchaouen-webgis` depuis `frontend/.output/public`. Vérifier dans Render que le build du site a réussi et que son adresse `https://chefchaouen-webgis.onrender.com` s'ouvre. Si Render attribue un autre sous-domaine, utiliser l'adresse indiquée dans son tableau de bord. La variable `VITE_API_URL` est injectée automatiquement depuis l'adresse publique de l'API au moment du build; une modification de cette adresse nécessite une reconstruction du site.

## 5. Vérification depuis un autre ordinateur

Ouvrir le lien du site Render dans une fenêtre privée ou depuis un autre réseau. Vérifier le fond de carte, les couches 2019/2025/changements, la comparaison, les légendes, les statistiques et une valeur ponctuelle. Vérifier également `https://<nom-api>.onrender.com/api/health` et la réponse des rasters. La première requête peut être lente si le service gratuit Render sort de veille.

Le collaborateur n'a besoin que du lien navigateur. L'export initial des données et la configuration des services hébergés sont réalisés une fois par la personne qui possède les comptes de déploiement.
