import json
from io import BytesIO
from functools import lru_cache

from PIL import Image
from sqlalchemy import text

from app.database import engine
from app.services.statistics import legend


# Only these verified tables may be interpolated into SQL identifiers.
RASTERS = {
    "landcover_2019": {"name": "Land cover 2019", "type": "landcover", "year": 2019, "period": None, "legend_type": "landcover"},
    "landcover_2025": {"name": "Land cover 2025", "type": "landcover", "year": 2025, "period": None, "legend_type": "landcover"},
    "change_2019_2025": {"name": "Forest change 2019-2025", "type": "change", "year": None, "period": "2019-2025", "legend_type": "change"},
}


def _table(raster_id: str) -> str:
    if raster_id not in RASTERS:
        raise KeyError(raster_id)
    return f"webgis.{raster_id}"


@lru_cache(maxsize=1)
def raster_metadata() -> list[dict]:
    result = []
    with engine.connect() as connection:
        for raster_id, details in RASTERS.items():
            table = _table(raster_id)
            record = connection.execute(text(f"""
                WITH mosaic AS (
                    SELECT COUNT(*) AS tile_count, ST_Union(rast) AS rast FROM {table}
                )
                SELECT tile_count, ST_SRID(rast) AS srid,
                       ST_NumBands(rast) AS number_of_bands,
                       ST_Width(rast) AS width, ST_Height(rast) AS height,
                       ST_ScaleX(rast) AS pixel_size_x, ST_ScaleY(rast) AS pixel_size_y,
                       ST_AsGeoJSON(ST_Transform(ST_Envelope(rast), 4326)) AS footprint
                FROM mosaic
            """)).mappings().one()
            footprint = json.loads(record["footprint"]) if record["footprint"] else None
            result.append({
                "id": raster_id,
                **details,
                "srid": record["srid"],
                "number_of_bands": record["number_of_bands"],
                "tile_count": record["tile_count"],
                "available": record["tile_count"] > 0,
                "width": record["width"],
                "height": record["height"],
                "pixel_size": [record["pixel_size_x"], record["pixel_size_y"]],
                "coordinates": footprint["coordinates"][0][:4] if footprint else None,
                "image_url": f"/api/rasters/{raster_id}/image.png",
            })
    return result


def metadata_for(raster_id: str) -> dict:
    _table(raster_id)
    return next(item for item in raster_metadata() if item["id"] == raster_id)


@lru_cache(maxsize=3)
def raster_png(raster_id: str) -> bytes:
    table = _table(raster_id)
    legend_type = RASTERS[raster_id]["legend_type"]
    with engine.connect() as connection:
        entries = legend(connection, legend_type)
        # Read the classified values from PostGIS and encode the PNG in Python.
        # This avoids relying on server-side GDAL output drivers, which are not
        # enabled on every managed PostgreSQL provider (including Render).
        values = connection.execute(text(f"""
            SELECT ST_DumpValues(ST_Union(rast), 1, false)
            FROM {table}
        """)).scalar_one()
    if not values:
        raise RuntimeError("Raster has no pixels")
    palette = {
        int(entry["value"]): (*bytes.fromhex(entry["hex_color"][1:]), 255)
        for entry in entries
    }
    height = len(values)
    width = len(values[0]) if height else 0
    if not width or any(len(row) != width for row in values):
        raise RuntimeError("Raster matrix is invalid")
    image = Image.new("RGBA", (width, height))
    image.putdata([
        palette.get(int(value), (0, 0, 0, 0)) if value is not None else (0, 0, 0, 0)
        for row in values
        for value in row
    ])
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


def pixel_value(raster_id: str, longitude: float, latitude: float) -> dict:
    table = _table(raster_id)
    with engine.connect() as connection:
        value = connection.execute(text(f"""
            WITH location AS (
                SELECT ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 32630) AS geom
            )
            SELECT ST_Value(r.rast, 1, location.geom)::integer
            FROM {table} AS r, location
            WHERE ST_Intersects(r.rast, location.geom)
            LIMIT 1
        """), {"lng": longitude, "lat": latitude}).scalar_one_or_none()
        item = next((entry for entry in legend(connection, RASTERS[raster_id]["legend_type"]) if entry["value"] == value), None)
    return {"raster_id": raster_id, "value": value, "class_name": item["class_name"] if item else None,
            "hex_color": item["hex_color"] if item else None}


def class_diagnostics() -> dict:
    """Scan pixel values only when this diagnostic endpoint is requested."""
    rasters = []
    with engine.connect() as connection:
        for raster_id, details in RASTERS.items():
            table = _table(raster_id)
            observed = sorted(int(row.value) for row in connection.execute(text(f"""
                SELECT DISTINCT CAST((vc).value AS integer) AS value
                FROM (SELECT ST_ValueCount(rast, 1, true) AS vc FROM {table}) AS counts
            """)))
            expected = sorted(item["value"] for item in legend(connection, details["legend_type"]))
            rasters.append({"id": raster_id, "observed_classes": observed,
                            "legend_classes": expected, "consistent": observed == expected})
    return {"status": "ok" if all(item["consistent"] for item in rasters) else "mismatch",
            "rasters": rasters}
