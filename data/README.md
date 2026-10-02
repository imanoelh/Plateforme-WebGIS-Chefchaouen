# Données et méthode — WebGIS Chefchaouen

Cette notice adapte au classement de ce dépôt le `README.txt` du jeu de données fourni par Mohamed Chikh Essbiti (version 1.0, octobre 2026). L'analyse satellitaire est attribuée à Mohamed Chikh Essbiti et l'application WebGIS à Imane Elhamri. Les résultats ci-dessous sont ceux livrés avec les données ; l'application les affiche depuis PostGIS sans recalculer les superficies à partir des pixels lors de la consultation.

## Zone et fichiers

La zone couvre la ville de Chefchaouen et les versants boisés du Jbel El Kelaa. Le périmètre fourni est volontairement rectangulaire : 5,28° O à 5,18° O et 35,14° N à 35,22° N, pour environ **8 084,5 ha**. Sa géométrie est dans [`vector/chefchaouen_aoi.geojson`](vector/chefchaouen_aoi.geojson) (EPSG:4326). La copie utilisée par l'application porte `area_ha = 8084.5`, conformément à la notice ; la géométrie n'a pas été modifiée.

| Données | Fichiers dans ce dépôt | Usage |
| --- | --- | --- |
| Occupation du sol | [`rasters/chefchaouen_landcover_2019.tif`](rasters/chefchaouen_landcover_2019.tif), [`rasters/chefchaouen_landcover_2025.tif`](rasters/chefchaouen_landcover_2025.tif) | Cartes des deux dates |
| Changements | [`rasters/chefchaouen_change_2019_2025.tif`](rasters/chefchaouen_change_2019_2025.tif) | Carte 2019–2025 |
| Statistiques | [`stats/landcover_areas_ha.csv`](stats/landcover_areas_ha.csv), [`stats/change_areas_ha.csv`](stats/change_areas_ha.csv), [`stats/transitions_2019_2025_ha.csv`](stats/transitions_2019_2025_ha.csv), [`stats/accuracy.csv`](stats/accuracy.csv) | Superficies, transitions et précision |
| Légende | [`stats/legend.csv`](stats/legend.csv) | Codes, noms et couleurs |
| Styles | [`styles/landcover.sld`](styles/landcover.sld), [`styles/change.sld`](styles/change.sld), [`styles/landcover.qml`](styles/landcover.qml), [`styles/change.qml`](styles/change.qml) | Styles GeoServer et QGIS |

Les trois rasters sont des GeoTIFF optimisés pour le cloud, sur une bande `UInt8`, en **EPSG:32630**, avec une résolution nominale de **10 m** et `NoData = 0`.

## Codes des classes

| Code | Occupation du sol 2019 et 2025 | Couleur |
| ---: | --- | --- |
| 1 | Forest (forêt) | `#1B7837` |
| 2 | Shrubland/grassland (matorral et herbacées) | `#A6D96A` |
| 3 | Cropland (cultures) | `#FEE08B` |
| 4 | Built-up (bâti) | `#D73027` |
| 5 | Bare/sparse (sol nu ou végétation clairsemée) | `#BDBDBD` |
| 6 | Water (eau) | `#4575B4` |

| Code | Changement 2019–2025 | Interprétation | Couleur |
| ---: | --- | --- | --- |
| 1 | Stable | Même classe aux deux dates | `#E0E0E0` |
| 2 | Forest loss | Forêt en 2019, autre classe en 2025 | `#D55E00` |
| 3 | Forest gain | Autre classe en 2019, forêt en 2025 | `#009E73` |
| 4 | Other change | Changement entre deux classes non forestières | `#56B4E9` |

## Méthode de production

Le collaborateur a produit les cartes dans **Google Earth Engine** à partir de Sentinel-2 Level-2A, réflectance de surface harmonisée. Chaque année utilise une composition médiane des images de **juin à septembre**. Les nuages sont masqués avec Cloud Score+ (`cs_cdf ≥ 0,60`).

Les variables de classification sont dix bandes spectrales (B2 à B8A, B11 et B12), les indices NDVI, NBR et MNDWI, ainsi que l'altitude et la pente issues de SRTM 30 m. Les points ont été échantillonnés de manière stratifiée à partir des zones où ESA WorldCover 2020 et 2021 concordent. La répartition annoncée est de **70 % pour l'entraînement** et **30 % pour la validation**. Un Random Forest de **300 arbres** a été entraîné pour chaque année, puis un filtre majoritaire **3 × 3** a été appliqué.

La notice source indique que les superficies ont été calculées à partir des surfaces des pixels en zone UTM 30N. Les CSV fournis sont les résultats à présenter dans l'application. Un simple comptage de tous les pixels du GeoTIFF exporté, y compris ceux de bord hors du périmètre, ne reproduit pas nécessairement ces superficies.

## Résultats fournis

| Classe | 2019 (ha) | 2025 (ha) |
| --- | ---: | ---: |
| Forest | 3 426,34 | 3 357,39 |
| Shrubland/grassland | 3 663,12 | 3 750,80 |
| Cropland | 541,19 | 487,94 |
| Built-up | 241,99 | 251,95 |
| Bare/sparse | 211,69 | 236,35 |
| Water | 0,15 | 0,04 |

Les changements fournis sont : **7 245,14 ha** stables, **261,13 ha** de perte forestière, **192,19 ha** de gain forestier et **386,02 ha** d'autres changements. La différence des superficies forestières entre les deux dates est de **−68,95 ha**, soit environ **−2 %** de la forêt de 2019. Les transitions détaillées figurent dans le CSV correspondant.

L'exactitude globale annoncée est de **77,6 %** en 2019 (`κ = 0,72`) et **75,7 %** en 2025 (`κ = 0,70`), sur **577 points de validation** par année.

## Limites et sources

Ces valeurs de précision mesurent l'accord avec des étiquettes dérivées de WorldCover, et non une validation indépendante sur le terrain. L'essentiel des pertes et gains forestiers provient des échanges entre forêt et matorral/herbacées, où la confusion entre classes peut surestimer le changement brut. Environ 36 ha de transitions depuis le bâti vers d'autres classes sont surtout considérés comme du bruit de classification. La classe eau représente moins de 1 ha.

Ce jeu de données est une **démonstration** ; il ne doit pas servir seul à des décisions de gestion ou à des décisions juridiques. Sources créditées dans la notice du collaborateur : données Copernicus Sentinel modifiées (2019 et 2025), ESA WorldCover 2020 v100 et 2021 v200 (CC BY 4.0), Cloud Score+ (Google) et SRTM 1 Arc-Second Global (NASA/USGS).
