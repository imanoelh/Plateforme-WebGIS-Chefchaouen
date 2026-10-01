import json

from sqlalchemy import text
from sqlalchemy.engine import Connection


def rows(connection: Connection, query: str, params: dict | None = None) -> list[dict]:
    return [dict(row._mapping) for row in connection.execute(text(query), params or {})]


def study_area(connection: Connection) -> dict:
    records = rows(connection, """
        SELECT id, name, area_ha, ST_AsGeoJSON(geom) AS geometry
        FROM webgis.study_area ORDER BY id
    """)
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": record["id"],
                "properties": {"name": record["name"], "area_ha": record["area_ha"]},
                "geometry": json.loads(record["geometry"]),
            }
            for record in records
        ],
    }


def landcover_areas(connection: Connection, year: int | None = None) -> list[dict]:
    where = "WHERE a.year = :year" if year is not None else ""
    return rows(connection, f"""
        SELECT CAST(a.year AS integer) AS year, CAST(a.value AS integer) AS value,
               a.name, CAST(a.area_ha AS double precision) AS area_ha, l.hex_color
        FROM webgis.landcover_areas AS a
        LEFT JOIN webgis.legend AS l ON l.layer = 'landcover' AND l.value = a.value
        {where}
        ORDER BY a.year, CAST(a.value AS integer)
    """, {"year": str(year)} if year is not None else None)


def change_areas(connection: Connection) -> list[dict]:
    return rows(connection, """
        SELECT a.period, CAST(a.value AS integer) AS value, a.name,
               CAST(a.area_ha AS double precision) AS area_ha, l.hex_color
        FROM webgis.change_areas AS a
        LEFT JOIN webgis.legend AS l ON l.layer = 'change' AND l.value = a.value
        ORDER BY CAST(a.value AS integer)
    """)


def transitions(connection: Connection) -> list[dict]:
    return rows(connection, """
        SELECT CAST(code AS integer) AS code, from_class, to_class,
               CAST(area_ha AS double precision) AS area_ha
        FROM webgis.transitions ORDER BY CAST(code AS integer)
    """)


def accuracy(connection: Connection, year: int | None = None) -> list[dict]:
    where = "WHERE year = :year" if year is not None else ""
    return rows(connection, f"""
        SELECT CAST(year AS integer) AS year,
               CAST(overall_accuracy AS double precision) AS overall_accuracy,
               CAST(kappa AS double precision) AS kappa,
               CAST(n_train AS integer) AS n_train, CAST(n_test AS integer) AS n_test
        FROM webgis.accuracy {where} ORDER BY year
    """, {"year": str(year)} if year is not None else None)


def legend(connection: Connection, layer: str | None = None) -> list[dict]:
    where = "WHERE layer = :layer" if layer is not None else ""
    return rows(connection, f"""
        SELECT layer, CAST(value AS integer) AS value, class_name, hex_color
        FROM webgis.legend {where} ORDER BY layer, CAST(value AS integer)
    """, {"layer": layer} if layer is not None else None)


def transition_matrix(connection: Connection) -> dict:
    classes = legend(connection, "landcover")
    records = transitions(connection)
    names = [item["class_name"] for item in classes]
    indices = {name: i for i, name in enumerate(names)}
    matrix = [[0.0 for _ in classes] for _ in classes]
    for record in records:
        matrix[indices[record["from_class"]]][indices[record["to_class"]]] += record["area_ha"]
    return {
        "classes": classes,
        "matrix": matrix,
        "row_totals": [round(sum(row), 2) for row in matrix],
        "column_totals": [round(sum(row[i] for row in matrix), 2) for i in range(len(classes))],
        "total_ha": round(sum(record["area_ha"] for record in records), 2),
    }


def dashboard_summary(connection: Connection) -> dict:
    study = rows(connection, "SELECT name, area_ha FROM webgis.study_area ORDER BY id LIMIT 1")
    landcover = landcover_areas(connection)
    changes = change_areas(connection)
    accuracies = accuracy(connection)
    by_year = {year: [item for item in landcover if item["year"] == year] for year in (2019, 2025)}
    forest = {year: next(item["area_ha"] for item in by_year[year] if item["value"] == 1) for year in (2019, 2025)}
    return {
        "study_area": study[0] if study else None,
        "landcover": by_year,
        "changes": changes,
        "accuracy": accuracies,
        "net_forest_change_ha": round(forest[2025] - forest[2019], 2),
    }
