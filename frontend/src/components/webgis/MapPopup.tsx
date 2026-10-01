import { X } from "lucide-react";
import { isGeoServerConnected } from "@/config/mapConfig";

export interface FeatureInfo {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  lc2019: string | null;
  lc2025: string | null;
  change: string | null;
}

/** Future: query GeoServer WMS GetFeatureInfo for each raster layer. Returns nulls until connected. */
export async function getFeatureInfo(lngLat: { lng: number; lat: number }, point: { x: number; y: number }): Promise<FeatureInfo> {
  return { lngLat, point, lc2019: null, lc2025: null, change: null };
}

export function MapPopup({ info, onClose }: { info: FeatureInfo; onClose: () => void }) {
  const rows: [string, string | null][] = [["Land Cover 2019", info.lc2019], ["Land Cover 2025", info.lc2025], ["Change", info.change]];
  return (
    <div className="pointer-events-auto absolute z-20 w-60 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border bg-card p-3 text-xs shadow-panel"
      style={{ left: info.point.x, top: info.point.y }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Location information</span>
        <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v ?? "—"}</dd></div>
        ))}
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Coordinates</dt>
          <dd className="font-mono">{info.lngLat.lat.toFixed(4)}, {info.lngLat.lng.toFixed(4)}</dd></div>
      </dl>
      {!isGeoServerConnected() && <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">Class values appear once GeoServer GetFeatureInfo is connected.</p>}
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r bg-card" />
    </div>
  );
}
