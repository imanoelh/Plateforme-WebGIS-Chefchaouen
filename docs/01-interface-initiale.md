# Phase 01 — Interface initiale et audit

## Objectif

Disposer d'une interface WebGIS pour présenter l'occupation du sol à Chefchaouen en 2019 et 2025, les changements entre les deux dates et les indicateurs associés.

## Ce qui était déjà présent

Lors du premier audit, [`frontend/`](../frontend/) contenait déjà une application **React / TypeScript / TanStack Start**, construite avec Vite. La carte utilise **MapLibre GL JS** ; les graphiques utilisent **Recharts**. La page principale se trouve dans [`frontend/src/routes/index.tsx`](../frontend/src/routes/index.tsx).

Les principaux composants identifiés sont :

- [`MapView.tsx`](../frontend/src/components/webgis/MapView.tsx) : affichage de la carte et gestion des couches ;
- [`LayerManager.tsx`](../frontend/src/components/webgis/LayerManager.tsx) : visibilité et opacité des couches ;
- [`StatisticsPanel.tsx`](../frontend/src/components/webgis/StatisticsPanel.tsx) : tableaux et graphiques ;
- [`CompareControl.tsx`](../frontend/src/components/webgis/CompareControl.tsx) : interface de comparaison ;
- [`Legend.tsx`](../frontend/src/components/webgis/Legend.tsx) et [`MapPopup.tsx`](../frontend/src/components/webgis/MapPopup.tsx) : légende et informations ponctuelles.

Le projet comportait également les dossiers `data/`, `data_chefchaouen/` et `backend/` ; le backend était vide avant son implémentation ultérieure.

## Résultat de l'audit fonctionnel

L'interface et ses commandes existaient, mais plusieurs sources étaient provisoires :

- les statistiques du panneau proviennent encore de [`mockStatistics.ts`](../frontend/src/data/mockStatistics.ts) ;
- les couches métier sont configurées comme WMS/WFS GeoServer dans [`mapConfig.ts`](../frontend/src/config/mapConfig.ts), sans service GeoServer dans la pile Docker actuelle ;
- sans GeoServer, la limite de zone affichée est un rectangle provisoire et non la géométrie réelle de PostGIS ;
- le contrôle « swipe » affiche un séparateur, mais ne découpe pas encore la couche 2025 ; la comparaison effective dépend du raccordement cartographique.

## Bilan de phase

L'architecture du frontend a été comprise et préservée. Cette phase décrit l'interface **existante** ; elle n'attribue pas sa création complète au travail backend réalisé ensuite.
