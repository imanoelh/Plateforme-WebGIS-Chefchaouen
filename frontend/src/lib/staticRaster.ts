import proj4 from "proj4";
import type { Coordinate, PixelValue, RasterMetadata } from "@/lib/webgisApi";

export type StaticRasterId = "landcover_2019" | "landcover_2025" | "change_2019_2025";
export type StaticRasterLayer = "landcover" | "change";

export interface StaticRasterClass {
  name: string;
  color: string;
}

export interface StaticRasterManifestEntry {
  displayImage: string;
  classData: string;
  width: number;
  height: number;
  sourceCrs: string;
  displayCrs: string;
  origin: [number, number, number];
  resolution: [number, number, number];
  bbox: [number, number, number, number];
  displayCoordinates: [Coordinate, Coordinate, Coordinate, Coordinate];
  nodata: number;
  classes: Record<string, StaticRasterClass>;
  classDataOrder: string;
}

export interface StaticRasterManifest {
  version: number;
  rasters: Record<StaticRasterId, StaticRasterManifestEntry>;
}

export type StaticTestMode = "2019" | "all" | null;

function staticDefaultEnabled(): boolean {
  return String(import.meta.env.VITE_STATIC_DEFAULT).toLowerCase() === "true";
}

export function staticTestMode(): StaticTestMode {
  if (typeof window === "undefined") return staticDefaultEnabled() ? "all" : null;
  const value = new URLSearchParams(window.location.search).get("staticTest");
  if (value === "2019" || value === "all") return value;
  // The API override is intentionally limited to Vite development builds. A
  // public production URL must not re-enable backend calls accidentally.
  if (value === "api" && import.meta.env.DEV) return null;
  return staticDefaultEnabled() ? "all" : null;
}

export async function loadStaticRasterManifest(): Promise<StaticRasterManifest> {
  const response = await fetch("/static-data/manifest.json");
  if (!response.ok) throw new Error(`Static raster manifest: HTTP ${response.status}`);
  const manifest = (await response.json()) as StaticRasterManifest;
  const ids: StaticRasterId[] = ["landcover_2019", "landcover_2025", "change_2019_2025"];
  if (!manifest.rasters || manifest.version !== 1 || ids.some((id) => !manifest.rasters[id])) {
    throw new Error("Manifest statique incomplet ou invalide");
  }
  for (const id of ids) {
    const raster = manifest.rasters[id];
    if (raster.sourceCrs !== "EPSG:32630" || raster.displayCrs !== "EPSG:4326") {
      throw new Error(`CRS invalide pour ${id}`);
    }
    if (
      raster.width <= 0 ||
      raster.height <= 0 ||
      raster.classDataOrder !== "row-major, top-to-bottom, left-to-right"
    ) {
      throw new Error(`Métadonnées invalides pour ${id}`);
    }
  }
  return manifest;
}

export function staticRasterMetadata(
  id: StaticRasterId,
  raster: StaticRasterManifestEntry,
): RasterMetadata {
  return {
    id,
    name: `${id} (static test)`,
    type: id === "change_2019_2025" ? "change" : "landcover",
    srid: 32630,
    number_of_bands: 1,
    tile_count: 1,
    available: true,
    coordinates: raster.displayCoordinates,
    image_url: `/${raster.displayImage.replace(/^\//, "")}`,
  };
}

const classDataCache = new Map<StaticRasterId, Promise<Uint8Array>>();

async function loadClassData(
  id: StaticRasterId,
  raster: StaticRasterManifestEntry,
): Promise<Uint8Array> {
  let pending = classDataCache.get(id);
  if (!pending) {
    pending = fetch(`/${raster.classData.replace(/^\//, "")}`).then(async (response) => {
      if (!response.ok) throw new Error(`Static raster classes ${id}: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    });
    classDataCache.set(id, pending);
  }
  return pending;
}

export async function staticRasterPixelValue(
  id: StaticRasterId,
  raster: StaticRasterManifestEntry,
  lng: number,
  lat: number,
): Promise<PixelValue> {
  const [x, y] = proj4(raster.displayCrs, raster.sourceCrs, [lng, lat]);
  const [originX, originY] = raster.origin;
  const [resolutionX, resolutionY] = raster.resolution;
  const column = Math.floor((x - originX) / resolutionX);
  const row = Math.floor((y - originY) / resolutionY);
  if (column < 0 || column >= raster.width || row < 0 || row >= raster.height) {
    return { raster_id: id, value: null, class_name: null, hex_color: null };
  }
  const classes = await loadClassData(id, raster);
  const value = classes[row * raster.width + column];
  if (value === undefined || value === raster.nodata) {
    return { raster_id: id, value: null, class_name: null, hex_color: null };
  }
  const legend = raster.classes[String(value)];
  if (!legend) throw new Error(`Classe statique inconnue pour ${id}: ${value}`);
  return { raster_id: id, value, class_name: legend.name, hex_color: legend.color };
}
