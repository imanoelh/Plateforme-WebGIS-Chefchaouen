// Browser-visible API address. Override for deployed environments.
export const API_URL: string = import.meta.env["VITE_API_URL"] ?? "http://localhost:8001";

export const MAP_CENTER: [number, number] = [-5.2636, 35.1688]; // Chefchaouen
export const MAP_ZOOM = 12;

export type BasemapId = "satellite" | "streets";

export const DEFAULT_BASEMAP: BasemapId = "satellite";

export const BASEMAPS: { id: BasemapId; title: string; description: string }[] = [
  { id: "satellite", title: "Esri World Imagery", description: "Satellite basemap" },
  { id: "streets", title: "Plan", description: "OpenStreetMap" },
];

export const BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    streets: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
    },
  },
  layers: [
    { id: "basemap-satellite", type: "raster" as const, source: "satellite" },
    {
      id: "basemap-streets",
      type: "raster" as const,
      source: "streets",
      layout: { visibility: "none" as const },
    },
  ],
};
export type LayerGroup = "Land Cover" | "Change Analysis" | "Reference";
export type LegendKind = "landcover" | "change" | null;
export type LayerId = "lc2019" | "lc2025" | "change" | "boundary";

export interface LayerConfig {
  id: LayerId;
  title: string;
  group: LayerGroup;
  kind: "image" | "geojson";
  defaultVisible: boolean;
  defaultOpacity: number;
  legend: LegendKind;
}

export const LAYERS: LayerConfig[] = [
  {
    id: "lc2019",
    title: "Land Cover 2019",
    group: "Land Cover",
    kind: "image",
    defaultVisible: true,
    defaultOpacity: 0.85,
    legend: "landcover",
  },
  {
    id: "lc2025",
    title: "Land Cover 2025",
    group: "Land Cover",
    kind: "image",
    defaultVisible: false,
    defaultOpacity: 0.85,
    legend: "landcover",
  },
  {
    id: "change",
    title: "Forest Change 2019–2025",
    group: "Change Analysis",
    kind: "image",
    defaultVisible: false,
    defaultOpacity: 0.9,
    legend: "change",
  },
  {
    id: "boundary",
    title: "Study Area Boundary",
    group: "Reference",
    kind: "geojson",
    defaultVisible: true,
    defaultOpacity: 1,
    legend: null,
  },
];

export const LAYER_GROUPS: LayerGroup[] = ["Land Cover", "Change Analysis", "Reference"];
