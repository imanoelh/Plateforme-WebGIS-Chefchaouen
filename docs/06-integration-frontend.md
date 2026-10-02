# Phase 06 — Raccordement du frontend à l'API

État au **2 octobre 2026**.

## Réalisation

Le frontend utilise maintenant l'API FastAPI du projet via [`webgisApi.ts`](../frontend/src/lib/webgisApi.ts). Son adresse publique est centralisée dans [`mapConfig.ts`](../frontend/src/config/mapConfig.ts) et configurable par `VITE_API_URL` (voir [`frontend/.env.example`](../frontend/.env.example)). Par défaut, en développement local : `http://localhost:8001`.

| Composant | Données réelles consommées |
| --- | --- |
| Panneau statistique | `/api/dashboard/summary` et `/api/transitions` |
| Légende | `/api/legend` |
| Limite de la zone et zoom « Home » | `/api/study-area` |
| Couches 2019, 2025 et changements | `/api/rasters` puis les trois `image.png` |
| Popup au clic sur la carte | `/api/rasters/{id}/value` pour les trois rasters |
| Fenêtre « About » | Indicateurs de précision du résumé API |

Les couches métier ne dépendent plus des liens WMS/WFS GeoServer. MapLibre place les images PNG colorées à l'aide des quatre coordonnées renvoyées par l'API. Le mode « opacity » mélange les couches 2019 et 2025 ; le mode « swipe » superpose une seconde carte synchronisée, limitée par le séparateur mobile. Les données historiques de `mockStatistics.ts` et les constantes de classes sont conservées dans le dépôt, mais ne sont plus importées dans les écrans actifs.

## Comportement en cas d'indisponibilité

Les zones sans réponse API affichent un état de chargement puis un message d'erreur ; elles ne reviennent pas silencieusement à des valeurs simulées. Le bouton de comparaison est désactivé tant que les deux rasters requis ne sont pas disponibles. La carte de fond externe reste distincte des couches métier.

## Vérifications

- `python -m unittest discover -s backend/tests -v` : **16 tests sur 16 réussis**.
- Requêtes HTTP avec `Origin: http://localhost:8081` : résumé, transitions, légende, zone d'étude, métadonnées, trois PNG et valeur de pixel ont répondu **200**, avec CORS autorisé.
- `npx tsc --noEmit` : réussi.
- `npm run lint` : réussi avec 7 avertissements Fast Refresh non bloquants.
- `npm run build` : réussi après toutes les mises à jour, y compris la fenêtre « About ».

## Vérification manuelle encore nécessaire

Aucun navigateur automatisable n'était disponible lors de cette phase. Le rendu réel des trois couches, l'alignement avec le fond satellite, le déplacement du swipe, les interactions sur mobile et le comportement en cas de tuiles externes bloquées doivent être confirmés dans un navigateur sur le poste cible. Le backend et les données sources n'ont pas été modifiés pendant cette phase.
