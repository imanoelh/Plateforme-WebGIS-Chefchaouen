import { useEffect, useRef } from "react";
import type { Map as MLMap } from "maplibre-gl";
import {
  BASEMAP_STYLE, LAYERS, MAP_CENTER, MAP_ZOOM, PLACEHOLDER_BOUNDARY, type BasemapId,
  isGeoServerConnected, wfsGeoJsonUrl, wmsTileUrl,
} from "@/config/mapConfig";

export type LayerState = Record<string, { visible: boolean; opacity: number }>;

interface Props {
  layerState: LayerState;
  basemap: BasemapId;
  onReady: (map: MLMap) => void;
  onMove: (lngLat: { lng: number; lat: number } | null) => void;
  onClick: (lngLat: { lng: number; lat: number }, point: { x: number; y: number }) => void;
}

export function MapView({ layerState, basemap, onReady, onMove, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const stateRef = useRef(layerState);
  const basemapRef = useRef(basemap);
  stateRef.current = layerState;
  basemapRef.current = basemap;
  const cb = useRef({ onReady, onMove, onClick });
  cb.current = { onReady, onMove, onClick };

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | undefined;
    import("maplibre-gl").then((mod) => {
      const maplibregl = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
      if (cancelled || !ref.current) return;
      map = new maplibregl.Map({
        container: ref.current,
        style: BASEMAP_STYLE,
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        attributionControl: { compact: false },
      });
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
      mapRef.current = map;
      map.on("load", () => {
        const m = map!;
        const connected = isGeoServerConnected();
        for (const l of LAYERS) {
          if (l.kind === "wms" && connected) {
            m.addSource(l.id, { type: "raster", tiles: [wmsTileUrl(l)], tileSize: 256 });
            m.addLayer({ id: l.id, type: "raster", source: l.id });
          }
          if (l.kind === "geojson") {
            m.addSource(l.id, { type: "geojson", data: connected ? wfsGeoJsonUrl(l) : PLACEHOLDER_BOUNDARY });
            m.addLayer({ id: `${l.id}-fill`, type: "fill", source: l.id, paint: { "fill-color": "#1B7837", "fill-opacity": 0.04 } });
            m.addLayer({ id: l.id, type: "line", source: l.id, paint: { "line-color": "#14412a", "line-width": 2, "line-dasharray": [3, 2] } });
          }
        }
        loadedRef.current = true;
        applyState(m, stateRef.current);
        applyBasemap(m, basemapRef.current);
        cb.current.onReady(m);
      });
      map.on("mousemove", (e) => cb.current.onMove(e.lngLat));
      map.on("mouseout", () => cb.current.onMove(null));
      map.on("click", (e) => cb.current.onClick(e.lngLat, e.point));
    });
    return () => { cancelled = true; map?.remove(); };
  }, []);

  useEffect(() => {
    if (mapRef.current && loadedRef.current) applyState(mapRef.current, layerState);
  }, [layerState]);

  useEffect(() => {
    if (mapRef.current && loadedRef.current) applyBasemap(mapRef.current, basemap);
  }, [basemap]);

  return <div ref={ref} className="absolute inset-0" aria-label="Interactive map of Chefchaouen" />;
}

function applyState(map: MLMap, state: LayerState) {
  for (const l of LAYERS) {
    const s = state[l.id];
    if (!s || !map.getLayer(l.id)) continue;
    const vis = s.visible ? "visible" : "none";
    map.setLayoutProperty(l.id, "visibility", vis);
    if (l.kind === "wms") map.setPaintProperty(l.id, "raster-opacity", s.opacity);
    else {
      map.setPaintProperty(l.id, "line-opacity", s.opacity);
      if (map.getLayer(`${l.id}-fill`)) map.setLayoutProperty(`${l.id}-fill`, "visibility", vis);
    }
  }
}

function applyBasemap(map: MLMap, basemap: BasemapId) {
  map.setLayoutProperty("basemap-satellite", "visibility", basemap === "satellite" ? "visible" : "none");
  map.setLayoutProperty("basemap-streets", "visibility", basemap === "streets" ? "visible" : "none");
}