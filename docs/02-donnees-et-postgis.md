# Phase 02 — Données SIG et PostgreSQL/PostGIS

## Sources du projet

Les jeux de données sont conservés dans [`data/`](../data/) et [`data_chefchaouen/`](../data_chefchaouen/). Ils comprennent :

| Type | Fichiers principaux | Rôle |
| --- | --- | --- |
| Raster | `chefchaouen_landcover_2019.tif`, `chefchaouen_landcover_2025.tif` | Occupation du sol aux deux dates |
| Raster | `chefchaouen_change_2019_2025.tif` | Changements 2019–2025 |
| Vecteur | `chefchaouen_aoi.geojson` | Zone d'étude |
| Statistiques | CSV de superficies, transitions et précision | Tableaux et graphiques |
| Styles | SLD et QML | Symbologie cartographique |

La notice de données [`data_chefchaouen/README.txt`](../data_chefchaouen/README.txt) décrit la méthode de production par télédétection, les classes et les limites scientifiques du jeu de données. Elle attribue l'analyse satellite à Mohamed Chikh Essbiti et l'application WebGIS à Imane Elhamri. Les valeurs de précision y sont présentées comme un accord avec des étiquettes dérivées de WorldCover, **pas** comme une validation terrain indépendante.

## Base constatée lors de l'audit

Le service Docker `postgis` utilise l'image `postgis/postgis:16-3.5`, avec le volume persistant `chefchaouen_postgis_data`. PostgreSQL est exposé sur **localhost:5434** côté Windows et accessible comme **postgis:5432** depuis le backend Docker. Les extensions `postgis` et `postgis_raster` sont installées.

Le schéma `webgis` contient :

| Table | Lignes constatées | Usage |
| --- | ---: | --- |
| `study_area` | 1 | Polygone de zone d'étude, EPSG:4326, géométrie valide |
| `landcover_areas` | 12 | Superficies par classe pour 2019 et 2025 |
| `change_areas` | 4 | Superficies par catégorie de changement |
| `transitions` | 28 | Transitions entre classes |
| `accuracy` | 2 | Indicateurs de précision par année |
| `legend` | 10 | Libellés et couleurs des classes |

Les tables raster `landcover_2019`, `landcover_2025` et `change_2019_2025` contiennent **16 tuiles chacune**, une bande et un SRID **EPSG:32630**. Leur mosaïque mesure **931 × 909 pixels** à **10 m** de résolution. Les classes observées sont `1–6` pour l'occupation du sol et `1–4` pour les changements.

## Précaution importante

Le vecteur en EPSG:4326 et les rasters en EPSG:32630 ont des systèmes de coordonnées différents, ce qui est normal. Le backend transforme les coordonnées des requêtes ou des emprises lorsque nécessaire ; il ne change ni le SRID des tables ni les GeoTIFF sources. Aucun réimport ni recalcul des valeurs métier n'a été effectué pendant le développement du backend.
