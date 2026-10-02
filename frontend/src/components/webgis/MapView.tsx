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
import { apiUrl, type RasterMetadata, type StudyArea } from "@/lib/webgisApi";

export type LayerState = Record<LayerId, { visible: boolean; opacity: number }>;

const RASTER_IDS: Partial<Record<LayerId, RasterMetadata["id"]>> = {
  lc2019: "landcover_2019",
  lc2025: "landcover_2025",
  change: "change_2019_2025",
};

interface Props {
  layerState: LayerState;
  basemap: BasemapId;
  studyArea: StudyArea | undefined;
  rasters: RasterMetadata[] | undefined;
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
  swipe = 0.5,
  compareMode,
  onReady,
  onMove,
  onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const stateRef = useRef(layerState);
  const basemapRef = useRef(basemap);
  stateRef.current = layerState;
  basemapRef.current = basemap;
  const cb = useRef({ onReady, onMove, onClick });
  cb.current = { onReady, onMove, onClick };

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | undefined;
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
    setMapError(null);
    Promise.resolve()
      .then(() => {
        if (cancelled || !ref.current) return;
        const createdMap = new maplibregl.Map({
          container: ref.current,
          style: BASEMAP_STYLE,
          center: MAP_CENTER,
          zoom: MAP_ZOOM,
          attributionControl: { compact: false },
        });
        map = createdMap;
        createdMap.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
        mapRef.current = createdMap;
        const ready = () => {
          map?.resize();
          setMapError(null);
          setMapReady(true);
          applyBasemap(map!, basemapRef.current);
          cb.current.onReady(map!);
        };
        // `load` is the first event after the initial style, source and canvas are ready.
        createdMap.once("load", ready);
        createdMap.on("error", (event) => {
          console.error("MapLibre error", event.error);
          if (!cancelled) setMapError(event.error?.message ?? "Map tiles could not be loaded");
        });
        createdMap.on("mousemove", (e) => cb.current.onMove(e.lngLat));
        createdMap.on("mouseout", () => cb.current.onMove(null));
        createdMap.on("click", (e) => cb.current.onClick(e.lngLat, e.point));
      })
      .catch((error: unknown) => {
        console.error("MapLibre initialization failed", error);
        setMapError(error instanceof Error ? error.message : "MapLibre could not be initialized");
      });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    for (const layer of LAYERS) {
      if (layer.kind !== "image" || map.getSource(layer.id)) continue;
      const raster = rasters?.find((item) => item.id === RASTER_IDS[layer.id]);
      if (!raster?.available || !raster.coordinates) continue;
      map.addSource(layer.id, {
        type: "image",
        url: apiUrl(raster.image_url),
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
  }, [mapReady, rasters, studyArea]);

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
          url: apiUrl(compareRaster.image_url),
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
  }, [compareMode, compareRaster, mapReady]);

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
    </>
  );
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
