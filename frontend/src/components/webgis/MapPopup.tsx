import { X } from "lucide-react";
import { webgisApi } from "@/lib/webgisApi";

export interface FeatureInfo {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  lc2019: string | null;
  lc2025: string | null;
  change: string | null;
  loading?: boolean;
  error?: boolean;
}

export async function getFeatureInfo(
  lngLat: { lng: number; lat: number },
  point: { x: number; y: number },
): Promise<FeatureInfo> {
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
  const rows: [string, string | null][] = [
    ["Land Cover 2019", info.lc2019],
    ["Land Cover 2025", info.lc2025],
    ["Change", info.change],
  ];
  return (
    <div
      className="pointer-events-auto absolute z-20 w-60 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border bg-card p-3 text-xs shadow-panel"
      style={{ left: info.point.x, top: info.point.y }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Location information</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v ?? "—"}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Coordinates</dt>
          <dd className="font-mono">
            {info.lngLat.lat.toFixed(4)}, {info.lngLat.lng.toFixed(4)}
          </dd>
        </div>
      </dl>
      {info.loading && (
        <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
          Reading PostGIS raster values…
        </p>
      )}
      {info.error && (
        <p role="alert" className="mt-2 border-t pt-2 text-[10px] text-loss">
          Pixel values unavailable. Check the backend connection.
        </p>
      )}
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r bg-card" />
    </div>
  );
}
