// Centralised map + service configuration. Replace via env vars, never hard-code URLs elsewhere.
export const GEOSERVER_URL: string = import.meta.env.VITE_GEOSERVER_URL ?? "";
export const API_URL: string = import.meta.env.VITE_API_URL ?? "";
export const GEOSERVER_WORKSPACE: string = import.meta.env.VITE_GEOSERVER_WORKSPACE ?? "chefchaouen";

export const MAP_CENTER: [number, number] = [-5.2636, 35.1688]; // Chefchaouen
export const MAP_ZOOM = 12;
// Approximate study-area extent [west, south, east, north]; replace with real boundary bbox.
export const STUDY_AREA_BBOX: [number, number, number, number] = [-5.33, 35.12, -5.2, 35.22];

export type BasemapId = "satellite" | "streets";

export const DEFAULT_BASEMAP: BasemapId = "satellite";

export const BASEMAPS: { id: BasemapId; title: string; description: string }[] = [
  { id: "satellite", title: "Satellite", description: "Esri World Imagery" },
  { id: "streets", title: "Plan", description: "OpenStreetMap" },
];

export const BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    streets: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
    },
  },
  layers: [
    { id: "basemap-satellite", type: "raster" as const, source: "satellite" },
    { id: "basemap-streets", type: "raster" as const, source: "streets", layout: { visibility: "none" as const } },
  ],
};
export type LayerGroup = "Land Cover" | "Change Analysis" | "Reference";
export type LegendKind = "landcover" | "change" | null;

export interface LayerConfig {
  id: string;
  title: string;
  group: LayerGroup;
  kind: "wms" | "geojson";
  geoserverLayer: string; // workspace:layer name in GeoServer
  defaultVisible: boolean;
  defaultOpacity: number;
  legend: LegendKind;
}

export const LAYERS: LayerConfig[] = [
  { id: "lc2019", title: "Land Cover 2019", group: "Land Cover", kind: "wms", geoserverLayer: "landcover_2019", defaultVisible: true, defaultOpacity: 0.85, legend: "landcover" },
  { id: "lc2025", title: "Land Cover 2025", group: "Land Cover", kind: "wms", geoserverLayer: "landcover_2025", defaultVisible: false, defaultOpacity: 0.85, legend: "landcover" },
  { id: "change", title: "Forest Change 2019–2025", group: "Change Analysis", kind: "wms", geoserverLayer: "forest_change_2019_2025", defaultVisible: false, defaultOpacity: 0.9, legend: "change" },
  { id: "boundary", title: "Study Area Boundary", group: "Reference", kind: "geojson", geoserverLayer: "study_area", defaultVisible: true, defaultOpacity: 1, legend: null },
];

export const LAYER_GROUPS: LayerGroup[] = ["Land Cover", "Change Analysis", "Reference"];

export const isGeoServerConnected = () => GEOSERVER_URL.length > 0;

export function wmsTileUrl(layer: LayerConfig) {
  const p = new URLSearchParams({
    service: "WMS", version: "1.1.1", request: "GetMap", format: "image/png", transparent: "true",
    layers: `${GEOSERVER_WORKSPACE}:${layer.geoserverLayer}`, srs: "EPSG:3857", width: "256", height: "256",
  });
  return `${GEOSERVER_URL}/wms?${p.toString()}&bbox={bbox-epsg-3857}`;
}

export function wfsGeoJsonUrl(layer: LayerConfig) {
  const p = new URLSearchParams({
    service: "WFS", version: "2.0.0", request: "GetFeature", outputFormat: "application/json",
    typeNames: `${GEOSERVER_WORKSPACE}:${layer.geoserverLayer}`, srsName: "EPSG:4326",
  });
  return `${GEOSERVER_URL}/wfs?${p.toString()}`;
}

// Placeholder boundary (bbox rectangle) until the real PostGIS geometry is published.
export const PLACEHOLDER_BOUNDARY = {
  type: "Feature" as const,
  properties: { name: "Study area (placeholder extent)" },
  geometry: {
    type: "Polygon" as const,
    coordinates: [[
      [STUDY_AREA_BBOX[0], STUDY_AREA_BBOX[1]], [STUDY_AREA_BBOX[2], STUDY_AREA_BBOX[1]],
      [STUDY_AREA_BBOX[2], STUDY_AREA_BBOX[3]], [STUDY_AREA_BBOX[0], STUDY_AREA_BBOX[3]],
      [STUDY_AREA_BBOX[0], STUDY_AREA_BBOX[1]],
    ]],
  },
};
