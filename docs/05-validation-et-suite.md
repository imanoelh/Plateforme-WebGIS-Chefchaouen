# Phase 05 — Validation, état actuel et suite

## Vérifications effectuées

Les contrôles réalisés au terme du développement backend ont donné les résultats suivants :

| Vérification | Résultat |
| --- | --- |
| Conteneurs PostGIS et backend | Démarrés ; backend signalé `healthy` |
| `/api/health` | `ok`, base connectée, PostGIS et PostGIS Raster disponibles |
| Tables statistiques et zone d'étude | Réponses conformes aux données existantes |
| Trois métadonnées raster et trois images PNG | Disponibles |
| Classes raster contre légende | Diagnostic `ok` |
| Tests d'intégration HTTP | **16 réussis sur 16** |
| Compilation Python et configuration Compose | Réussies |
| Build de production frontend | Réussi |

Les tests sont dans [`backend/tests/test_api.py`](../backend/tests/test_api.py). Pour les relancer depuis la racine du projet, une fois les services démarrés :

```powershell
python -m unittest discover -s backend/tests -v
```

Le build frontend peut être relancé depuis `frontend/` avec `npm run build`. Le succès de ce build prouve la compilation, **pas** l'intégration des données réelles dans la carte.

## Problèmes résolus pendant le backend

- Le filtre `year` était initialement mal typé dans la validation des paramètres : corrigé, puis retesté.
- L'export PNG PostGIS échouait car le pilote GDAL PNG n'était pas activé : activation locale à la transaction, sans changement permanent de la base.
- Les tests HTTP ont été relancés après que le conteneur a atteint son état opérationnel.

## État réel de l'application

**Fonctionnel :** interface et fonds de carte, API REST, connexion PostGIS, consultation des statistiques et de la zone d'étude via API, génération des images raster, lecture de valeurs de pixels, documentation OpenAPI et tests backend.

**À réaliser :** connecter le frontend à l'API pour remplacer progressivement `mockStatistics.ts`, charger la vraie géométrie de `/api/study-area`, afficher les PNG 2019/2025/changement comme couches MapLibre, rendre le swipe réellement cartographique, alimenter les popups avec les valeurs raster et faire un test de bout en bout dans le navigateur. Les références WMS/WFS GeoServer actuelles sont des emplacements prévus, pas un GeoServer opérationnel.

## Ordre recommandé pour la suite

1. Centraliser l'URL API du frontend et brancher santé, statistiques, légende et zone d'étude.
2. Afficher les trois rasters avec les `coordinates` et `image_url` fournis par `/api/rasters`.
3. Relier visibilité, opacité, comparaison et popup aux vraies couches.
4. Vérifier sur ordinateur et mobile les réponses réseau, les couleurs, les CRS et le comportement en cas d'API indisponible.

Ne pas supprimer les CSV/GeoTIFF sources ni le volume Docker pendant cette migration. Les statistiques ne doivent être qualifiées de « données en direct » dans l'interface qu'après le raccordement effectif.
