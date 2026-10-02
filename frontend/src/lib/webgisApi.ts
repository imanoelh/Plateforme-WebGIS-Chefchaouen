import { API_URL } from "@/config/mapConfig";

export interface LandcoverArea {
  year: number;
  value: number;
  name: string;
  area_ha: number;
  hex_color: string | null;
}

export interface ChangeArea {
  period: string;
  value: number;
  name: string;
  area_ha: number;
  hex_color: string | null;
}

export interface Transition {
  code: number;
  from_class: string;
  to_class: string;
  area_ha: number;
}

export interface Accuracy {
  year: number;
  overall_accuracy: number;
  kappa: number;
  n_train: number;
  n_test: number;
}

export interface LegendEntry {
  layer: "landcover" | "change";
  value: number;
  class_name: string;
  hex_color: string;
}

export interface DashboardSummary {
  study_area: { name: string; area_ha: number } | null;
  landcover: Record<"2019" | "2025", LandcoverArea[]>;
  changes: ChangeArea[];
  accuracy: Accuracy[];
  net_forest_change_ha: number;
}

export type Coordinate = [number, number];

export interface RasterMetadata {
  id: "landcover_2019" | "landcover_2025" | "change_2019_2025";
  name: string;
  type: "landcover" | "change";
  srid: number;
  number_of_bands: number;
  tile_count: number;
  available: boolean;
  coordinates: [Coordinate, Coordinate, Coordinate, Coordinate] | null;
  image_url: string;
}

export interface StudyArea {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: { name: string; area_ha: number };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
  }>;
}

export interface PixelValue {
  raster_id: string;
  value: number | null;
  class_name: string | null;
  hex_color: string | null;
}

export function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, "")}${path}`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path));
  if (!response.ok) throw new Error(`API ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export const webgisApi = {
  summary: () => getJson<DashboardSummary>("/api/dashboard/summary"),
  transitions: () => getJson<Transition[]>("/api/transitions"),
  legend: () => getJson<LegendEntry[]>("/api/legend"),
  studyArea: () => getJson<StudyArea>("/api/study-area"),
  rasters: () => getJson<RasterMetadata[]>("/api/rasters"),
  pixelValue: (id: RasterMetadata["id"], lng: number, lat: number) =>
    getJson<PixelValue>(
      `/api/rasters/${id}/value?${new URLSearchParams({ lng: String(lng), lat: String(lat) })}`,
    ),
};

export function studyAreaBounds(
  area: StudyArea | undefined,
): [[number, number], [number, number]] | null {
  const positions: number[][] = [];
  function visit(node: unknown): void {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number")
      positions.push(node as number[]);
    else node.forEach(visit);
  }
  area?.features.forEach((feature) => visit(feature.geometry.coordinates));
  if (positions.length === 0) return null;
  const west = Math.min(...positions.map((p) => p[0]!));
  const south = Math.min(...positions.map((p) => p[1]!));
  const east = Math.max(...positions.map((p) => p[0]!));
  const north = Math.max(...positions.map((p) => p[1]!));
  return [
    [west, south],
    [east, north],
  ];
}
