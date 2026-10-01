# Phase 03 — Fonds de carte

## Besoin exprimé

Afficher une imagerie satellite derrière l'application et pouvoir revenir à un fond de type plan.

## Réalisation

La configuration est centralisée dans [`frontend/src/config/mapConfig.ts`](../frontend/src/config/mapConfig.ts). Le fond par défaut est **Esri World Imagery**. Un second fond **OpenStreetMap Standard** est disponible via un sélecteur dans [`LayerManager.tsx`](../frontend/src/components/webgis/LayerManager.tsx). [`MapView.tsx`](../frontend/src/components/webgis/MapView.tsx) commute la visibilité des deux fonds MapLibre sans reconstruire la carte.

Le fond « Plan » utilisait initialement CARTO Voyager. Lors de la vérification du 1er octobre 2026, la [documentation de CARTO](https://carto.com/blog/new-voyager-basemap/) indiquait qu'une clé API gratuite était désormais nécessaire hors de CARTO. Le projet n'en possédant pas, la source a été remplacée par `tile.openstreetmap.org`. Son utilisation doit respecter la [politique officielle d'OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) : attribution visible, trafic raisonnable, cache navigateur et absence de téléchargement massif. Un fournisseur dédié sera préférable si l'application reçoit beaucoup de trafic.

Le fond satellite choisi est **Esri**, et non Google Satellite. Le sélecteur de fond ne remplace pas les couches thématiques du projet : il sert uniquement d'arrière-plan.

## Vérification et limites

Le build de production du frontend avait réussi après l'intégration initiale. Le rendu des tuiles dépend de l'accès réseau du navigateur aux fournisseurs de fonds et de leurs conditions d'utilisation. La limite d'étude affichée sans GeoServer demeure provisoire ; les rasters 2019/2025 et la carte des changements ne sont pas encore affichés depuis l'API.
