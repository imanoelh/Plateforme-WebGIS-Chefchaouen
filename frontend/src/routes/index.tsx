import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { BarChart3, ChevronLeft, ChevronRight, Columns2, Layers, X } from "lucide-react";
import {
  DEFAULT_BASEMAP,
  LAYERS,
  MAP_CENTER,
  MAP_ZOOM,
  type BasemapId,
  type LegendKind,
  type LayerId,
} from "@/config/mapConfig";
import { apiRetryDelay, retryApiRequest, studyAreaBounds, webgisApi } from "@/lib/webgisApi";
import { MapView, type LayerState } from "@/components/webgis/MapView";
import { CoordinatesDisplay, MapControls } from "@/components/webgis/MapControls";
import { LayerManager } from "@/components/webgis/LayerManager";
import { Legend } from "@/components/webgis/Legend";
import { CompareBar, SwipeDivider, type CompareMode } from "@/components/webgis/CompareControl";
import { StatisticsPanel } from "@/components/webgis/StatisticsPanel";
import { MapPopup, getFeatureInfo, type FeatureInfo } from "@/components/webgis/MapPopup";
import { AboutModal } from "@/components/webgis/AboutModal";
import { Footer, Header } from "@/components/webgis/Header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chefchaouen Forest Change WebGIS — 2019–2025" },
      {
        name: "description",
        content:
          "Interactive WebGIS comparing land cover and forest change in Chefchaouen / Jbel El Kelaa, Morocco, 2019–2025.",
      },
      { property: "og:title", content: "Chefchaouen Forest Change WebGIS — 2019–2025" },
      {
        property: "og:description",
        content:
          "Compare 2019 and 2025 land-cover maps and forest change statistics in the Rif Mountains, Morocco.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebGIS,
});

type MobileSheet = "layers" | "stats" | null;

function WebGIS() {
  const mapRef = useRef<MLMap | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const popupRequest = useRef(0);
  const summaryQuery = useQuery({
    queryKey: ["webgis", "summary"],
    queryFn: webgisApi.summary,
    staleTime: 300_000,
    retry: retryApiRequest,
    retryDelay: apiRetryDelay,
  });
  const transitionsQuery = useQuery({
    queryKey: ["webgis", "transitions"],
    queryFn: webgisApi.transitions,
    staleTime: 300_000,
    retry: retryApiRequest,
    retryDelay: apiRetryDelay,
  });
  const legendQuery = useQuery({
    queryKey: ["webgis", "legend"],
    queryFn: webgisApi.legend,
    staleTime: 300_000,
    retry: retryApiRequest,
    retryDelay: apiRetryDelay,
  });
  const studyAreaQuery = useQuery({
    queryKey: ["webgis", "study-area"],
    queryFn: webgisApi.studyArea,
    staleTime: 300_000,
    retry: retryApiRequest,
    retryDelay: apiRetryDelay,
  });
  const rastersQuery = useQuery({
    queryKey: ["webgis", "rasters"],
    queryFn: webgisApi.rasters,
    staleTime: 300_000,
    retry: retryApiRequest,
    retryDelay: apiRetryDelay,
  });
  const [layers, setLayers] = useState<LayerState>(
    () =>
      Object.fromEntries(
        LAYERS.map((l) => [l.id, { visible: l.defaultVisible, opacity: l.defaultOpacity }]),
      ) as LayerState,
  );
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sheet, setSheet] = useState<MobileSheet>(null);
  const [compare, setCompare] = useState<CompareMode | null>(null);
  const [swipe, setSwipe] = useState(0.5);
  const [blend, setBlend] = useState(0.5);
  const [about, setAbout] = useState<"about" | "methodology" | null>(null);
  const [cursor, setCursor] = useState<{ lng: number; lat: number } | null>(null);
  const [popup, setPopup] = useState<FeatureInfo | null>(null);

  const effective = useMemo<LayerState>(() => {
    if (!compare) return layers;
    const next = {
      ...layers,
      lc2019: { ...layers.lc2019, visible: true },
      lc2025: { ...layers.lc2025, visible: true },
      change: { ...layers.change, visible: false },
    };
    if (compare === "opacity") {
      // The lower image stays opaque; the 2025 image blends over it.
      next.lc2019.opacity = 1;
      next.lc2025.opacity = blend;
    } else {
      next.lc2019.opacity = 1;
      next.lc2025.visible = false;
    }
    return next;
  }, [layers, compare, blend]);
  const panelLayerState = useMemo<LayerState>(
    () =>
      compare === "swipe"
        ? { ...effective, lc2025: { ...effective.lc2025, visible: true, opacity: 1 } }
        : effective,
    [compare, effective],
  );

  const availableLayers = useMemo(() => {
    const available = new Set<string>();
    for (const raster of rastersQuery.data ?? []) {
      if (!raster.available || !raster.coordinates) continue;
      if (raster.id === "landcover_2019") available.add("lc2019");
      if (raster.id === "landcover_2025") available.add("lc2025");
      if (raster.id === "change_2019_2025") available.add("change");
    }
    if (studyAreaQuery.data?.features.length) available.add("boundary");
    return available;
  }, [rastersQuery.data, studyAreaQuery.data]);

  const legendKind: LegendKind = effective.change.visible
    ? "change"
    : effective.lc2019.visible || effective.lc2025.visible
      ? "landcover"
      : null;

  const home = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = studyAreaBounds(studyAreaQuery.data);
    if (bounds) map.fitBounds(bounds, { padding: 40, duration: 800 });
    else map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM });
  }, [studyAreaQuery.data]);
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shellRef.current?.requestFullscreen?.();
  };
  const onClick = async (lngLat: { lng: number; lat: number }, point: { x: number; y: number }) => {
    const request = ++popupRequest.current;
    setPopup({ lngLat, point, lc2019: null, lc2025: null, change: null, loading: true });
    try {
      const info = await getFeatureInfo(lngLat, point);
      if (request === popupRequest.current) setPopup(info);
    } catch {
      if (request === popupRequest.current)
        setPopup({ lngLat, point, lc2019: null, lc2025: null, change: null, error: true });
    }
  };

  const closePopup = useCallback(() => {
    // Invalidate an in-flight pixel lookup before unmounting the React popup.
    popupRequest.current++;
    setPopup(null);
  }, []);

  const openMobileSheet = (nextSheet: Exclude<MobileSheet, null>) => {
    closePopup();
    setSheet(nextSheet);
  };

  const openStatisticsPanel = () => {
    closePopup();
    setRightOpen(true);
  };

  const toggle = (id: LayerId) =>
    setLayers((s) => ({ ...s, [id]: { ...s[id], visible: !s[id].visible } }));
  const opacity = (id: LayerId, v: number) =>
    setLayers((s) => ({ ...s, [id]: { ...s[id], opacity: v } }));
  const statsProps = {
    summary: summaryQuery.data,
    transitions: transitionsQuery.data,
    loading: summaryQuery.isPending || transitionsQuery.isPending,
    error: summaryQuery.isError || transitionsQuery.isError,
  };
  const compareAvailable = availableLayers.has("lc2019") && availableLayers.has("lc2025");

  const layersPanel = (
    <>
      <LayerManager
        layerState={panelLayerState}
        basemap={basemap}
        onBasemapChange={setBasemap}
        onToggle={toggle}
        onOpacity={opacity}
        onZoom={home}
        availableLayers={availableLayers}
        loading={rastersQuery.isPending || studyAreaQuery.isPending}
        comparisonActive={compare !== null}
      />
      <section className="mt-5 border-t pt-4">
        <h3 className="label-caps mb-2">Legend</h3>
        <Legend
          kind={legendKind}
          entries={legendQuery.data}
          loading={legendQuery.isPending}
          error={legendQuery.isError}
        />
      </section>
    </>
  );

  return (
    <div className="webgis-app-shell flex h-screen flex-col overflow-hidden">
      <Header
        onAbout={() => setAbout("about")}
        onMethodology={() => setAbout("methodology")}
        onFullscreen={fullscreen}
      />
      <div className="flex min-h-0 flex-1">
        {/* Left: Layers */}
        <aside
          className={`hidden shrink-0 flex-col border-r bg-background transition-[width] md:flex ${leftOpen ? "w-72" : "w-0 border-r-0"}`}
        >
          {leftOpen && (
            <>
              <PanelHead
                icon={<Layers className="h-4 w-4" />}
                title="Layers"
                onCollapse={() => setLeftOpen(false)}
                side="left"
              />
              <div className="flex-1 overflow-y-auto p-3">{layersPanel}</div>
              <div className="border-t p-3">
                <Footer />
              </div>
            </>
          )}
        </aside>

        {/* Map */}
        <main ref={shellRef} className="relative min-w-0 flex-1 bg-muted">
          <MapView
            layerState={effective}
            basemap={basemap}
            studyArea={studyAreaQuery.data}
            rasters={rastersQuery.data}
            compareMode={compare}
            swipe={swipe}
            onReady={(m) => (mapRef.current = m)}
            onMove={setCursor}
            onClick={onClick}
          />
          {compare === "swipe" && compareAvailable && (
            <SwipeDivider position={swipe} onChange={setSwipe} />
          )}
          {popup && (
            <MapPopup
              info={popup}
              onClose={closePopup}
            />
          )}
          {(rastersQuery.isError || studyAreaQuery.isError) && (
            <p
              role="alert"
              className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded bg-card px-3 py-2 text-xs text-loss shadow-panel"
            >
              Map data unavailable — check the API at localhost:8001.
            </p>
          )}

          {!leftOpen && <Reopen side="left" label="Layers" onClick={() => setLeftOpen(true)} />}
          {!rightOpen && (
            <Reopen side="right" label="Statistics" onClick={openStatisticsPanel} />
          )}

          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
            {compare ? (
              <CompareBar
                mode={compare}
                onMode={setCompare}
                blend={blend}
                onBlend={setBlend}
                onClose={() => setCompare(null)}
              />
            ) : (
              <button
                onClick={() => setCompare("swipe")}
                disabled={!compareAvailable}
                className="flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-panel transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Columns2 className="h-4 w-4" />
                <span className="md:hidden">Compare</span>
                <span className="hidden md:inline">Compare 2019 / 2025</span>
              </button>
            )}
          </div>

          <div className="absolute right-3 top-16 z-10 md:top-3">
            <MapControls
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onHome={home}
              onFullscreen={fullscreen}
            />
          </div>
          <div className="absolute bottom-8 right-3 z-10 hidden sm:block">
            <CoordinatesDisplay lngLat={cursor} />
          </div>

          {/* Mobile floating buttons */}
          <div className="webgis-mobile-actions absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:hidden">
            <FabBtn
              icon={<Layers className="h-4 w-4" />}
              label="Layers"
              onClick={() => openMobileSheet("layers")}
            />
            <FabBtn
              icon={<BarChart3 className="h-4 w-4" />}
              label="Statistics"
              onClick={() => openMobileSheet("stats")}
            />
          </div>
          {sheet && (
            <div className="absolute inset-x-0 bottom-0 z-30 flex max-h-[60%] flex-col rounded-t-xl border-t bg-background shadow-panel md:hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-semibold">
                  {sheet === "layers" ? "Layers & Legend" : "Statistics"}
                </span>
                <button onClick={() => setSheet(null)} aria-label="Close panel">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                {sheet === "layers" ? layersPanel : <StatisticsPanel {...statsProps} />}
              </div>
            </div>
          )}
          {/* Tablet: stats overlay drawer */}
          {rightOpen && (
            <aside className="absolute inset-y-0 right-0 z-20 hidden w-80 flex-col border-l bg-background shadow-panel md:flex xl:hidden">
              <PanelHead
                icon={<BarChart3 className="h-4 w-4" />}
                title="Statistics"
                onCollapse={() => setRightOpen(false)}
                side="right"
              />
              <div className="flex-1 overflow-y-auto p-3">
                <StatisticsPanel {...statsProps} />
              </div>
            </aside>
          )}
        </main>

        {/* Right: Statistics (desktop) */}
        {rightOpen && (
          <aside className="hidden w-[23rem] shrink-0 flex-col border-l bg-background xl:flex">
            <PanelHead
              icon={<BarChart3 className="h-4 w-4" />}
              title="Statistics"
              onCollapse={() => setRightOpen(false)}
              side="right"
            />
            <div className="flex-1 overflow-y-auto p-3">
              <StatisticsPanel {...statsProps} />
            </div>
          </aside>
        )}
      </div>
      <AboutModal
        open={about !== null}
        onOpenChange={(o) => !o && setAbout(null)}
        section={about ?? "about"}
        accuracy={summaryQuery.data?.accuracy}
      />
    </div>
  );
}

function PanelHead({
  icon,
  title,
  onCollapse,
  side,
}: {
  icon: React.ReactNode;
  title: string;
  onCollapse: () => void;
  side: "left" | "right";
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
      <span className="flex items-center gap-2 text-sm font-semibold text-primary">
        {icon}
        {title}
      </span>
      <button
        onClick={onCollapse}
        aria-label={`Collapse ${title}`}
        className="rounded p-1 text-muted-foreground hover:bg-accent"
      >
        {side === "left" ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function Reopen({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-3 z-10 hidden items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium shadow-panel hover:bg-accent md:flex ${side === "left" ? "left-3" : "right-16"}`}
    >
      {side === "left" ? <Layers className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function FabBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-panel"
    >
      {icon}
      {label}
    </button>
  );
}
