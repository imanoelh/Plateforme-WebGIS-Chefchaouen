# Documentation du WebGIS Chefchaouen

État documenté au **1er octobre 2026**. Cette documentation retrace le projet depuis les éléments déjà présents lors du premier audit jusqu'au backend testé aujourd'hui. Les numéros de phase décrivent l'ordre logique du travail ; les dates de réalisation de chaque étape ne sont pas connues avec certitude.

## Parcours du projet

| Phase | Sujet | État |
| --- | --- | --- |
| [01](01-interface-initiale.md) | Interface WebGIS initiale et audit | Interface présente ; audit réalisé |
| [02](02-donnees-et-postgis.md) | Données SIG et base PostGIS | Sources et tables présentes ; structure vérifiée |
| [03](03-fond-de-carte.md) | Fond satellite et fond plan | Sélecteur intégré au frontend |
| [04](04-backend-api.md) | API FastAPI et service des rasters | Backend lancé et testé |
| [05](05-validation-et-suite.md) | Validation, limites et prochaines étapes | Tests backend réussis ; intégration frontend à faire |

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
                | intégration à réaliser
                v
    Frontend React + MapLibre
       (fonds Esri / OpenStreetMap)
```

Les statistiques et couches métier affichées par le frontend ne proviennent **pas encore** de l'API. Le fond satellite est opérationnel côté interface, mais la comparaison 2019/2025 n'est pas encore reliée aux vraies couches raster.

## Repères dans le dépôt

- [`frontend/`](../frontend/) : interface existante, carte, panneaux, graphiques et contrôles.
- [`data/`](../data/) et [`data_chefchaouen/`](../data_chefchaouen/) : jeux de données et styles livrés avec le projet.
- [`backend/`](../backend/) : API FastAPI et tests d'intégration.
- [`docker-compose.yml`](../docker-compose.yml) : services PostGIS et backend.
- [`backend/README.md`](../backend/README.md) : commandes de démarrage du backend.

Les fichiers `.env` contiennent une configuration locale et ne doivent pas être copiés dans la documentation ni publiés.
