import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import {
  BASEMAP_STYLE,
  LAYERS,
  MAP_CENTER,
  MAP_ZOOM,
  type BasemapId,
  type LayerId,
} from "@/config/mapConfig";
import { apiUrl, studyAreaBounds, type RasterMetadata, type StudyArea } from "@/lib/webgisApi";
import type { StaticRasterManifest } from "@/lib/staticRaster";

export type LayerState = Record<LayerId, { visible: boolean; opacity: number }>;

const RASTER_IDS: Partial<Record<LayerId, RasterMetadata["id"]>> = {
  lc2019: "landcover_2019",
  lc2025: "landcover_2025",
  change: "change_2019_2025",
};

const MAX_RASTER_RETRIES = 3;
const RASTER_RETRY_DELAYS = [2_000, 4_000, 8_000];

interface Props {
  layerState: LayerState;
  basemap: BasemapId;
  studyArea: StudyArea | undefined;
  rasters: RasterMetadata[] | undefined;
  staticManifest?: StaticRasterManifest;
  staticTest?: "2019" | "all" | null;
  swipe?: number;
  compareMode: "swipe" | "opacity" | null;
  onReady: (map: MLMap) => void;
  onMove: (lngLat: { lng: number; lat: number } | null) => void;
  onClick: (lngLat: { lng: number; lat: number }, point: { x: number; y: number }) => void;
}

export function MapView({
  layerState,
  basemap,
  studyArea,
  rasters,
  staticManifest,
  staticTest = null,
  swipe = 0.5,
  compareMode,
  onReady,
  onMove,
  onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const hasInitialFit = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [rasterNotice, setRasterNotice] = useState<string | null>(null);
  const rastersRef = useRef(rasters);
  const rasterRetriesRef = useRef(new Map<string, number>());
  const rasterTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const rasterIssuesRef = useRef(new Map<string, string>());
  const stateRef = useRef(layerState);
  const basemapRef = useRef(basemap);
  rastersRef.current = rasters;
  stateRef.current = layerState;
  basemapRef.current = basemap;
  const cb = useRef({ onReady, onMove, onClick });
  cb.current = { onReady, onMove, onClick };

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | undefined;
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
    setMapError(null);
    setRasterNotice(null);
    rasterRetriesRef.current.clear();
    rasterIssuesRef.current.clear();

    const refreshRasterNotice = () => {
      const issue = [...rasterIssuesRef.current.values()][0];
      setRasterNotice(issue ?? null);
    };

    const rasterSourceIdForError = (event: maplibregl.ErrorEvent): string | null => {
      const sourceId = (event as unknown as { sourceId?: string }).sourceId;
      if (sourceId && RASTER_IDS[sourceId as LayerId]) return sourceId;
      const detail = event.error as Error & { url?: string };
      if (!detail.url) return null;
      const failedPath = detail.url.split("?")[0];
      const match = Object.entries(RASTER_IDS).find(([, rasterId]) => {
        const raster = rastersRef.current?.find((item) => item.id === rasterId);
        return raster && rasterImageUrl(raster, staticManifest).split("?")[0] === failedPath;
      });
      return match?.[0] ?? null;
    };

    const retryRasterSource = (sourceId: string) => {
      const rasterId = RASTER_IDS[sourceId as LayerId];
      const raster = rastersRef.current?.find((item) => item.id === rasterId);
      if (!raster?.available || !raster.coordinates || cancelled) return;
      if (rasterTimersRef.current.has(sourceId)) return;

      const attempt = (rasterRetriesRef.current.get(sourceId) ?? 0) + 1;
      if (attempt > MAX_RASTER_RETRIES) {
        rasterIssuesRef.current.set(
          sourceId,
          "Cette couche raster est indisponible pour le moment. Réessayez plus tard.",
        );
        refreshRasterNotice();
        return;
      }

      rasterRetriesRef.current.set(sourceId, attempt);
      rasterIssuesRef.current.set(
        sourceId,
        `Chargement de la couche raster en cours… nouvelle tentative ${attempt}/${MAX_RASTER_RETRIES}.`,
      );
      refreshRasterNotice();
      const delay = RASTER_RETRY_DELAYS[attempt - 1] ?? RASTER_RETRY_DELAYS.at(-1)!;
      const timer = setTimeout(() => {
        rasterTimersRef.current.delete(sourceId);
        if (cancelled || !map) return;
        try {
          if (map.getLayer(sourceId)) map.removeLayer(sourceId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          const sourceUrl = rasterImageUrl(raster, staticManifest);
          const separator = sourceUrl.includes("?") ? "&" : "?";
          map.addSource(sourceId, {
            type: "image",
            url: `${sourceUrl}${separator}retry=${attempt}`,
            coordinates: raster.coordinates,
          });
          map.addLayer(
            { id: sourceId, type: "raster", source: sourceId },
            map.getLayer("boundary-fill") ? "boundary-fill" : undefined,
          );
          const currentState = stateRef.current[sourceId as LayerId];
          if (currentState) {
            map.setLayoutProperty(
              sourceId,
              "visibility",
              currentState.visible ? "visible" : "none",
            );
            map.setPaintProperty(sourceId, "raster-opacity", currentState.opacity);
          }
        } catch (error) {
          console.error("Raster retry could not be scheduled", error);
          rasterIssuesRef.current.set(
            sourceId,
            "Cette couche raster est indisponible pour le moment. Réessayez plus tard.",
          );
          refreshRasterNotice();
        }
      }, delay);
      rasterTimersRef.current.set(sourceId, timer);
    };

    Promise.resolve()
      .then(() => {
        if (cancelled || !ref.current) return;
        const createdMap = new maplibregl.Map({
          container: ref.current,
          style: BASEMAP_STYLE,
          center: MAP_CENTER,
          zoom: MAP_ZOOM,
          attributionControl: false,
        });
        map = createdMap;
        const collapseAttribution = () => {
          const attribution = createdMap
            .getContainer()
            .querySelector<HTMLElement>(".maplibregl-ctrl-attrib.maplibregl-compact");
          attribution?.classList.remove("maplibregl-compact-show");
          attribution?.removeAttribute("open");
        };
        const attributionControl = new maplibregl.AttributionControl({ compact: true });
        createdMap.addControl(attributionControl, "bottom-right");
        collapseAttribution();
        createdMap.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
        mapRef.current = createdMap;
        const ready = () => {
          collapseAttribution();
          map?.resize();
          setMapError(null);
          setMapReady(true);
          applyBasemap(map!, basemapRef.current);
          cb.current.onReady(map!);
        };
        // `load` is the first event after the initial style, source and canvas are ready.
        createdMap.once("load", ready);
        createdMap.on("error", (event) => {
          const sourceId = rasterSourceIdForError(event);
          if (sourceId) {
            const detail = event.error as Error & { status?: number; url?: string };
            const isTransient =
              detail.status !== undefined && detail.status >= 500 && detail.status < 600;
            if (isTransient) {
              retryRasterSource(sourceId);
            } else if (!cancelled) {
              rasterIssuesRef.current.set(
                sourceId,
                "Impossible de charger cette couche raster. Vérifiez sa disponibilité.",
              );
              refreshRasterNotice();
            }
            return;
          }
          console.error("MapLibre error", event.error);
          if (!cancelled) setMapError(event.error?.message ?? "Map tiles could not be loaded");
        });
        createdMap.on("sourcedata", (event) => {
          if (!event.sourceId || !RASTER_IDS[event.sourceId as LayerId] || !event.isSourceLoaded)
            return;
          rasterRetriesRef.current.delete(event.sourceId);
          rasterIssuesRef.current.delete(event.sourceId);
          refreshRasterNotice();
        });
        createdMap.on("mousemove", (e) => cb.current.onMove(e.lngLat));
        createdMap.on("mouseout", () => cb.current.onMove(null));
        createdMap.on("click", (e) => cb.current.onClick(e.lngLat, e.point));
      })
      .catch((error: unknown) => {
        console.error("MapLibre initialization failed", error);
        setMapError(error instanceof Error ? error.message : "MapLibre could not be initialized");
      });
    const rasterTimers = rasterTimersRef.current;
    return () => {
      cancelled = true;
      rasterTimers.forEach((timer) => clearTimeout(timer));
      rasterTimers.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [staticManifest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    for (const layer of LAYERS) {
      if (layer.kind !== "image" || map.getSource(layer.id)) continue;
      const raster = rasters?.find((item) => item.id === RASTER_IDS[layer.id]);
      if (!raster?.available || !raster.coordinates) continue;
      map.addSource(layer.id, {
        type: "image",
        url: rasterImageUrl(raster, staticManifest),
        coordinates: raster.coordinates,
      });
      map.addLayer(
        { id: layer.id, type: "raster", source: layer.id },
        map.getLayer("boundary-fill") ? "boundary-fill" : undefined,
      );
    }
    if (studyArea?.features.length) {
      const data = studyArea as unknown as FeatureCollection;
      const source = map.getSource("boundary") as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        map.addSource("boundary", { type: "geojson", data });
        map.addLayer({
          id: "boundary-fill",
          type: "fill",
          source: "boundary",
          paint: { "fill-color": "#1B7837", "fill-opacity": 0.04 },
        });
        map.addLayer({
          id: "boundary",
          type: "line",
          source: "boundary",
          paint: { "line-color": "#14412a", "line-width": 2, "line-dasharray": [3, 2] },
        });
      }
    }
    applyState(map, stateRef.current);
  }, [mapReady, rasters, studyArea, staticManifest]);

  useEffect(() => {
    const map = mapRef.current;
    const bounds = studyAreaBounds(studyArea);
    if (!map || !mapReady || !bounds || hasInitialFit.current) return;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    map.fitBounds(bounds, {
      // Mobile keeps the full study area clear of the compare control, map tools,
      // and the Layers/Statistics actions. Desktop keeps balanced map margins.
      padding: mobile
        ? { top: 72, right: 72, bottom: 144, left: 32 }
        : { top: 64, right: 64, bottom: 48, left: 48 },
      duration: 0,
    });
    hasInitialFit.current = true;
  }, [mapReady, studyArea]);

  useEffect(() => {
    if (mapRef.current && mapReady) applyState(mapRef.current, layerState);
  }, [layerState, mapReady]);

  useEffect(() => {
    if (mapRef.current && mapReady) applyBasemap(mapRef.current, basemap);
  }, [basemap, mapReady]);

  const compareRaster = rasters?.find(
    (item) => item.id === "landcover_2025" && item.available && item.coordinates,
  );
  useEffect(() => {
    const main = mapRef.current;
    if (
      compareMode !== "swipe" ||
      !compareRaster?.coordinates ||
      !compareRef.current ||
      !main ||
      !mapReady
    )
      return;
    let cancelled = false;
    let overlay: MLMap | undefined;
    let sync: (() => void) | undefined;
    let syncResize: (() => void) | undefined;
    Promise.resolve().then(() => {
      if (cancelled || !compareRef.current) return;
      const createdOverlay = new maplibregl.Map({
        container: compareRef.current,
        style: { version: 8, sources: {}, layers: [] },
        center: main.getCenter(),
        zoom: main.getZoom(),
        bearing: main.getBearing(),
        pitch: main.getPitch(),
        interactive: false,
        attributionControl: false,
        canvasContextAttributes: { alpha: true },
      });
      overlay = createdOverlay;
      createdOverlay.on("style.load", () => {
        if (!overlay) return;
        overlay.addSource("compare-2025", {
          type: "image",
          url: rasterImageUrl(compareRaster, staticManifest),
          coordinates: compareRaster.coordinates!,
        });
        overlay.addLayer({ id: "compare-2025", type: "raster", source: "compare-2025" });
        sync?.();
      });
      sync = () => {
        if (!overlay) return;
        overlay.jumpTo({
          center: main.getCenter(),
          zoom: main.getZoom(),
          bearing: main.getBearing(),
          pitch: main.getPitch(),
        });
      };
      syncResize = () => {
        overlay?.resize();
        sync?.();
      };
      main.on("move", sync);
      main.on("resize", syncResize);
    });
    return () => {
      cancelled = true;
      if (sync) main.off("move", sync);
      if (syncResize) main.off("resize", syncResize);
      overlay?.remove();
    };
  }, [compareMode, compareRaster, mapReady, staticManifest]);

  return (
    <>
      <div className="absolute inset-0">
        <div ref={ref} className="h-full w-full" aria-label="Interactive map of Chefchaouen" />
      </div>
      {compareMode === "swipe" && compareRaster && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${swipe * 100}%)` }}
          aria-hidden="true"
        >
          <div ref={compareRef} className="h-full w-full" />
        </div>
      )}
      {mapError && (
        <div
          role="alert"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card/95 px-4 py-3 text-center text-xs text-loss shadow-panel"
        >
          Map display error
          <br />
          <span className="text-[10px] text-muted-foreground">{mapError}</span>
        </div>
      )}
      {rasterNotice && !mapError && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card/95 px-4 py-3 text-center text-xs text-muted-foreground shadow-panel"
        >
          {rasterNotice}
        </div>
      )}
    </>
  );
}

function rasterImageUrl(raster: RasterMetadata, staticManifest?: StaticRasterManifest): string {
  const staticRaster = staticManifest?.rasters[raster.id];
  return staticRaster
    ? `/${staticRaster.displayImage.replace(/^\//, "")}`
    : apiUrl(raster.image_url);
}

function applyState(map: MLMap, state: LayerState) {
  for (const layer of LAYERS) {
    const current = state[layer.id];
    if (!current || !map.getLayer(layer.id)) continue;
    map.setLayoutProperty(layer.id, "visibility", current.visible ? "visible" : "none");
    if (layer.kind === "image") map.setPaintProperty(layer.id, "raster-opacity", current.opacity);
    else if (map.getLayer("boundary-fill")) {
      map.setPaintProperty(layer.id, "line-opacity", current.opacity);
      map.setLayoutProperty("boundary-fill", "visibility", current.visible ? "visible" : "none");
    }
  }
}

function applyBasemap(map: MLMap, basemap: BasemapId) {
  map.setLayoutProperty(
    "basemap-satellite",
    "visibility",
    basemap === "satellite" ? "visible" : "none",
  );
  map.setLayoutProperty(
    "basemap-streets",
    "visibility",
    basemap === "streets" ? "visible" : "none",
  );
}
