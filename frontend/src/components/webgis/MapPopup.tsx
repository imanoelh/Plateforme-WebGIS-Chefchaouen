import { X } from "lucide-react";
import { webgisApi } from "@/lib/webgisApi";
import { staticRasterPixelValue, type StaticRasterManifest } from "@/lib/staticRaster";

export interface FeatureInfo {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  lc2019: string | null;
  lc2025: string | null;
  change: string | null;
  loading?: boolean;
  loadingMessage?: string;
  error?: boolean;
  errorMessage?: string;
}

export async function getFeatureInfo(
  lngLat: { lng: number; lat: number },
  point: { x: number; y: number },
  staticManifest?: StaticRasterManifest,
  staticMode: "2019" | "all" = "all",
): Promise<FeatureInfo> {
  if (staticManifest) {
    const lc2019 = await staticRasterPixelValue(
      "landcover_2019",
      staticManifest.rasters.landcover_2019,
      lngLat.lng,
      lngLat.lat,
    );
    if (staticMode === "2019") {
      return { lngLat, point, lc2019: lc2019.class_name, lc2025: null, change: null };
    }
    const [lc2025, change] = await Promise.all([
      staticRasterPixelValue(
        "landcover_2025",
        staticManifest.rasters.landcover_2025,
        lngLat.lng,
        lngLat.lat,
      ),
      staticRasterPixelValue(
        "change_2019_2025",
        staticManifest.rasters.change_2019_2025,
        lngLat.lng,
        lngLat.lat,
      ),
    ]);
    return {
      lngLat,
      point,
      lc2019: lc2019.class_name,
      lc2025: lc2025.class_name,
      change: change.class_name,
    };
  }
  const [lc2019, lc2025, change] = await Promise.all([
    webgisApi.pixelValue("landcover_2019", lngLat.lng, lngLat.lat),
    webgisApi.pixelValue("landcover_2025", lngLat.lng, lngLat.lat),
    webgisApi.pixelValue("change_2019_2025", lngLat.lng, lngLat.lat),
  ]);
  return {
    lngLat,
    point,
    lc2019: lc2019.class_name,
    lc2025: lc2025.class_name,
    change: change.class_name,
  };
}

export function MapPopup({ info, onClose }: { info: FeatureInfo; onClose: () => void }) {
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const mobile = viewportWidth < 768;
  const popupWidth = Math.min(240, Math.max(0, viewportWidth - 16));
  const left = mobile
    ? Math.min(Math.max(info.point.x, popupWidth / 2 + 8), viewportWidth - popupWidth / 2 - 8)
    : info.point.x;
  const arrowLeft = mobile
    ? Math.min(Math.max(info.point.x - (left - popupWidth / 2), 12), popupWidth - 12)
    : popupWidth / 2;
  const rows: [string, string | null][] = [
    ["Land Cover 2019", info.lc2019],
    ["Land Cover 2025", info.lc2025],
    ["Change", info.change],
  ];
  return (
    <div
      className="pointer-events-auto absolute z-20 w-60 max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border bg-card p-3 text-xs shadow-panel"
      style={{ left, top: info.point.y }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="min-w-0 pr-2 font-semibold">Location information</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => {
          const longValue = Boolean(v && v.length > 14);
          return (
            <div
              key={k}
              className={`flex flex-col items-start gap-0.5 ${longValue ? "" : "md:flex-row md:items-start md:justify-between md:gap-2"}`}
            >
              <dt className="min-w-0 text-muted-foreground">{k}</dt>
              <dd
                className={`min-w-0 text-left font-medium ${longValue ? "whitespace-nowrap" : "break-words md:text-right"}`}
              >
                {v ?? "—"}
              </dd>
            </div>
          );
        })}
        <div className="flex flex-col items-start gap-0.5 md:flex-row md:items-start md:justify-between md:gap-2">
          <dt className="min-w-0 text-muted-foreground">Coordinates</dt>
          <dd className="min-w-0 break-words text-left font-mono md:text-right">
            {info.lngLat.lat.toFixed(4)}, {info.lngLat.lng.toFixed(4)}
          </dd>
        </div>
      </dl>
      {info.loading && (
        <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
          {info.loadingMessage ?? "Reading PostGIS raster values…"}
        </p>
      )}
      {info.error && (
        <p role="alert" className="mt-2 border-t pt-2 text-[10px] text-loss">
          {info.errorMessage ?? "Pixel values unavailable. Check the backend connection."}
        </p>
      )}
      <span
        className="absolute top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r bg-card"
        style={{ left: arrowLeft }}
      />
    </div>
  );
}
