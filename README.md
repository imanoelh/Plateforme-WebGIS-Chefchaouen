# Plateforme WebGIS Chefchaouen

Application de suivi de l'occupation du sol (2019, 2025) et des changements à Chefchaouen. Le frontend React/MapLibre lit les statistiques, la limite d'étude et les rasters depuis le backend FastAPI/PostGIS. Voir la [documentation par phases](docs/README.md).

La [notice des données et de la méthode](data/README.md) décrit les sources, les codes des classes, le calcul des superficies et les limites des résultats fournis par le collaborateur. Le [guide de publication](docs/07-publication-en-ligne.md) explique la mise en ligne sur Cloudflare Workers et Render.

## Démarrage local

Depuis la racine du projet, avec le fichier `.env` PostgreSQL existant :

```powershell
docker compose up -d --build
docker compose ps
```

PostGIS reste sur `localhost:5434` et l'API sur `http://localhost:8001` (`/docs` pour Swagger). Le volume PostgreSQL existant est conservé.

Dans un second terminal :

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 8081 --strictPort
```

Ouvrir `http://127.0.0.1:8081/`. Le frontend cible par défaut `http://localhost:8001`. Pour une autre adresse API, définir `VITE_API_URL` dans `frontend/.env` à partir de [`frontend/.env.example`](frontend/.env.example), puis redémarrer Vite. Ne pas publier `.env`.

## Contrôles

```powershell
python -m unittest discover -s backend/tests -v
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

Les fonds Esri World Imagery et OpenStreetMap nécessitent un accès Internet. Les données métier proviennent de PostGIS et non des fichiers simulés du frontend. Aucun GeoServer n'est requis pour cette version.
