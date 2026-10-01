# Phase 04 — Backend FastAPI et service raster

## Objectif

Donner au frontend un accès contrôlé aux données PostgreSQL/PostGIS existantes et aux trois rasters, sans modifier les données sources.

## Architecture réalisée

Le code se trouve dans [`backend/app/`](../backend/app/) : `config.py` pour les paramètres, `database.py` pour la connexion SQLAlchemy/psycopg, `routers/` pour les routes, `services/` pour les requêtes métier et raster, et `schemas.py` pour les réponses. [`backend/Dockerfile`](../backend/Dockerfile) et [`docker-compose.yml`](../docker-compose.yml) lancent l'API sur **localhost:8001**. La documentation interactive est accessible sur `/docs` et `/redoc`.

Les identifiants de connexion sont fournis par variables d'environnement. Le fichier [`backend/.env.example`](../backend/.env.example) est un modèle sans mot de passe réel. Le backend Docker se connecte à `postgis:5432`. CORS autorise les origines de développement configurées sur le port 8081.

## API disponible

| Groupe | Endpoints GET | Source / fonction |
| --- | --- | --- |
| Santé | `/api/health` | Connexion DB et extensions spatiales |
| Zone d'étude | `/api/study-area` | GeoJSON de `webgis.study_area` |
| Statistiques | `/api/landcover/areas?year=2019|2025`, `/api/changes/areas` | Superficies et couleurs de légende |
| Transitions | `/api/transitions`, `/api/transitions/matrix` | Liste et matrice des transitions |
| Qualité et légende | `/api/accuracy?year=2019|2025`, `/api/legend?layer=landcover|change` | Mesures et classes existantes |
| Tableau de bord | `/api/dashboard/summary` | Synthèse des tables statistiques |
| Rasters | `/api/rasters`, `/api/rasters/{id}` | Métadonnées des trois couches |
| Images et pixels | `/api/rasters/{id}/image.png`, `/api/rasters/{id}/value?lng=...&lat=...` | PNG coloré et valeur ponctuelle |
| Diagnostic | `/api/rasters/diagnostics/classes` | Contrôle explicite des classes observées |

`/api/change/areas` reste aussi disponible comme alias de compatibilité. L'API ne publie pas de WMS/WMTS.

## Traitement des rasters

Les trois tables raster sont sélectionnées au moyen d'une liste autorisée explicite. PostGIS assemble leurs tuiles et applique les couleurs de `webgis.legend` pour générer des PNG transparents. Les images sont mises en cache dans le processus backend après la première demande. Le pilote PNG de PostGIS est activé uniquement pour la transaction de génération. L'emprise est fournie en coordonnées géographiques pour un futur affichage MapLibre ; les rasters restent en EPSG:32630 dans la base.

Le diagnostic de classes parcourt les pixels seulement lorsqu'il est demandé. Aucun GeoServer n'est installé : ce service FastAPI est la solution légère retenue pour ces petits rasters. La procédure de lancement est détaillée dans [`backend/README.md`](../backend/README.md).
