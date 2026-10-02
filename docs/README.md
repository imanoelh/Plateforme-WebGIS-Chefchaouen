# Documentation du WebGIS Chefchaouen

État documenté au **2 octobre 2026**. Cette documentation retrace le projet depuis les éléments déjà présents lors du premier audit jusqu'au raccordement du frontend à l'API. Les numéros de phase décrivent l'ordre logique du travail ; les dates de réalisation de chaque étape ne sont pas connues avec certitude.

## Parcours du projet

| Phase | Sujet | État |
| --- | --- | --- |
| [01](01-interface-initiale.md) | Interface WebGIS initiale et audit | Interface présente ; audit réalisé |
| [02](02-donnees-et-postgis.md) | Données SIG et base PostGIS | Sources et tables présentes ; structure vérifiée |
| [03](03-fond-de-carte.md) | Fond satellite et fond plan | Sélecteur intégré au frontend |
| [04](04-backend-api.md) | API FastAPI et service des rasters | Backend lancé et testé |
| [05](05-validation-et-suite.md) | Validation, limites et prochaines étapes | Bilan historique avant le raccordement frontend |
| [06](06-integration-frontend.md) | Raccordement frontend à l'API | Code intégré ; contrôles automatisés réussis |
| [07](07-publication-en-ligne.md) | Publication GitHub et hébergement | Configuration préparée ; comptes cloud requis |

## Vue d'ensemble

```text
GeoTIFF / GeoJSON / CSV (sources conservées)
                |
                v
       PostgreSQL + PostGIS
                |
                v
          FastAPI (port 8001)
                |
                | données réelles raccordées
                v
    Frontend React + MapLibre
       (fonds Esri / OpenStreetMap)
```

Les statistiques et couches métier affichées par le frontend proviennent désormais de l'API. La comparaison 2019/2025 utilise les deux images raster réelles. Le rendu visuel dans un navigateur reste à confirmer manuellement sur le poste cible ; les contrôles automatisés, le build et les réponses HTTP sont réussis.

## Repères dans le dépôt

- [`frontend/`](../frontend/) : interface existante, carte, panneaux, graphiques et contrôles.
- [`data/`](../data/) et sa [notice méthodologique](../data/README.md) : jeux de données, styles, codes des classes et limites des résultats.
- [`backend/`](../backend/) : API FastAPI et tests d'intégration.
- [`docker-compose.yml`](../docker-compose.yml) : services PostGIS et backend.
- [`backend/README.md`](../backend/README.md) : commandes de démarrage du backend.
- [`docs/07-publication-en-ligne.md`](07-publication-en-ligne.md) : guide GitHub, Render et Cloudflare.

Les fichiers `.env` contiennent une configuration locale et ne doivent pas être copiés dans la documentation ni publiés.
