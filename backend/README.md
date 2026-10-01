# Chefchaouen WebGIS API

FastAPI reads the existing `webgis` schema and PostGIS Raster tables. It never imports or modifies the source data.

## Docker

From the project root, keep the existing `.env` with the PostgreSQL variables and run:

```powershell
docker compose up -d --build --no-deps backend
docker compose ps
python -m unittest discover -s backend/tests -v
```

The API is at `http://localhost:8001`, with OpenAPI at `/docs` and `/redoc`. Docker connects to the existing `postgis:5432` service; PostgreSQL remains exposed on Windows port 5434.

## Local backend

Install `backend/requirements.txt`, copy `backend/.env.example` to `backend/.env`, set the existing database password, and use `DB_HOST=localhost`, `DB_PORT=5434`. From `backend/`, run `uvicorn app.main:app --host 127.0.0.1 --port 8001`. Never commit `backend/.env`.

## Raster delivery

`GET /api/rasters` returns the geographic corner coordinates for MapLibre image sources. `GET /api/rasters/{id}/image.png` builds a transparent RGBA PNG from the existing 16 PostGIS tiles, using class colors from `webgis.legend`. The PNG driver is enabled only for that database transaction. Each raster PNG is cached in the backend process after its first request; restart the backend if raster or legend contents change. Source tables and SRIDs remain unchanged.

The frontend can add each image using the `coordinates` array from metadata and the `image_url` path, then toggle visibility for 2019, 2025, or change. A client side split view can compare the 2019 and 2025 image layers. There is no GeoServer in the current Compose stack.

`GET /api/rasters/diagnostics/classes` checks every raster's actual pixel values against the legend on demand. It is intentionally not part of `/api/health` because it scans all raster pixels.
