import json
import os
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("API_TEST_URL", "http://127.0.0.1:8001")


def request(path: str, origin: str | None = None):
    headers = {"Origin": origin} if origin else {}
    req = Request(BASE_URL + path, headers=headers)
    try:
        response = urlopen(req, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        body = response.read()
        content_type = response.headers.get("Content-Type", "")
        parsed = json.loads(body) if "application/json" in content_type else body
        return response.status, parsed, response.headers


class ApiIntegrationTests(unittest.TestCase):
    def test_health(self):
        status, body, _ = request("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(body, {"status": "ok", "database": "connected", "postgis": True, "postgis_raster": True})

    def test_study_area(self):
        status, body, _ = request("/api/study-area")
        self.assertEqual(status, 200)
        self.assertEqual(body["type"], "FeatureCollection")
        self.assertEqual(len(body["features"]), 1)
        self.assertEqual(body["features"][0]["geometry"]["type"], "Polygon")

    def test_landcover_areas(self):
        for path, count in (("/api/landcover/areas", 12), ("/api/landcover/areas?year=2019", 6),
                            ("/api/landcover/areas?year=2025", 6)):
            with self.subTest(path=path):
                status, body, _ = request(path)
                self.assertEqual(status, 200)
                self.assertEqual(len(body), count)
                self.assertTrue(all(item["hex_color"].startswith("#") for item in body))

    def test_changes(self):
        status, body, _ = request("/api/changes/areas")
        self.assertEqual(status, 200)
        self.assertEqual([item["value"] for item in body], [1, 2, 3, 4])

    def test_transitions(self):
        status, body, _ = request("/api/transitions")
        self.assertEqual(status, 200)
        self.assertEqual(len(body), 28)

    def test_transition_matrix(self):
        status, body, _ = request("/api/transitions/matrix")
        self.assertEqual(status, 200)
        self.assertEqual(len(body["classes"]), 6)
        self.assertEqual(len(body["matrix"]), 6)
        self.assertAlmostEqual(body["total_ha"], sum(sum(row) for row in body["matrix"]), places=2)

    def test_accuracy(self):
        for path, count in (("/api/accuracy", 2), ("/api/accuracy?year=2019", 1),
                            ("/api/accuracy?year=2025", 1)):
            with self.subTest(path=path):
                status, body, _ = request(path)
                self.assertEqual(status, 200)
                self.assertEqual(len(body), count)

    def test_legend(self):
        for path, count in (("/api/legend", 10), ("/api/legend?layer=landcover", 6),
                            ("/api/legend?layer=change", 4)):
            with self.subTest(path=path):
                status, body, _ = request(path)
                self.assertEqual(status, 200)
                self.assertEqual(len(body), count)

    def test_raster_metadata(self):
        status, body, _ = request("/api/rasters")
        self.assertEqual(status, 200)
        self.assertEqual(len(body), 3)
        for raster in body:
            self.assertEqual((raster["srid"], raster["number_of_bands"], raster["tile_count"]), (32630, 1, 16))
            self.assertTrue(raster["available"])
            self.assertEqual(len(raster["coordinates"]), 4)

    def test_raster_class_diagnostics(self):
        status, body, _ = request("/api/rasters/diagnostics/classes")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertEqual([item["observed_classes"] for item in body["rasters"]],
                         [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4]])

    def test_raster_images(self):
        for raster_id in ("landcover_2019", "landcover_2025", "change_2019_2025"):
            with self.subTest(raster_id=raster_id):
                status, body, headers = request(f"/api/rasters/{raster_id}/image.png")
                self.assertEqual(status, 200)
                self.assertEqual(headers.get_content_type(), "image/png")
                self.assertTrue(body.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_raster_value(self):
        status, body, _ = request("/api/rasters/landcover_2019/value?lng=-5.23&lat=35.18")
        self.assertEqual(status, 200)
        self.assertEqual(body["raster_id"], "landcover_2019")

    def test_dashboard_summary(self):
        status, body, _ = request("/api/dashboard/summary")
        self.assertEqual(status, 200)
        self.assertEqual(body["study_area"]["name"], "Chefchaouen study area")
        self.assertAlmostEqual(body["net_forest_change_ha"], -68.95, places=2)

    def test_invalid_parameters(self):
        for path, expected in (("/api/landcover/areas?year=2020", 422),
                               ("/api/legend?layer=invalid", 422),
                               ("/api/rasters/invalid", 404),
                               ("/api/rasters/invalid/image.png", 404)):
            with self.subTest(path=path):
                status, _, _ = request(path)
                self.assertEqual(status, expected)

    def test_cors(self):
        status, _, headers = request("/api/health", "http://localhost:8081")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "http://localhost:8081")
        _, _, other = request("/api/health", "https://example.invalid")
        self.assertIsNone(other.get("Access-Control-Allow-Origin"))

    def test_openapi(self):
        status, body, _ = request("/openapi.json")
        self.assertEqual(status, 200)
        self.assertIn("/api/rasters", body["paths"])
        for path in ("/docs", "/redoc"):
            with self.subTest(path=path):
                status, _, _ = request(path)
                self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
