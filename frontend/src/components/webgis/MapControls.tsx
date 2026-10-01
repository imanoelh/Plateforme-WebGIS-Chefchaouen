import { Home, Maximize2, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

interface Props { onZoomIn: () => void; onZoomOut: () => void; onHome: () => void; onFullscreen: () => void }

function Btn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick}
      className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
      {children}
    </button>
  );
}

export function MapControls({ onZoomIn, onZoomOut, onHome, onFullscreen }: Props) {
  return (
    <div className="flex flex-col divide-y overflow-hidden rounded-md border bg-card shadow-panel">
      <Btn label="Zoom in" onClick={onZoomIn}><Plus className="h-4 w-4" /></Btn>
      <Btn label="Zoom out" onClick={onZoomOut}><Minus className="h-4 w-4" /></Btn>
      <Btn label="Reset to study area" onClick={onHome}><Home className="h-4 w-4" /></Btn>
      <Btn label="Fullscreen map" onClick={onFullscreen}><Maximize2 className="h-4 w-4" /></Btn>
    </div>
  );
}

export function CoordinatesDisplay({ lngLat }: { lngLat: { lng: number; lat: number } | null }) {
  return (
    <div className="rounded border bg-card/90 px-2 py-1 font-mono text-[11px] text-muted-foreground shadow-panel">
      {lngLat ? `${lngLat.lat.toFixed(5)}° N  ${Math.abs(lngLat.lng).toFixed(5)}° W` : "WGS 84 · EPSG:4326"}
    </div>
  );
}
