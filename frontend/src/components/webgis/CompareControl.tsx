import { useRef } from "react";
import { GripVertical, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export type CompareMode = "swipe" | "opacity";

interface BarProps {
  mode: CompareMode;
  onMode: (m: CompareMode) => void;
  blend: number;
  onBlend: (v: number) => void;
  onClose: () => void;
}

export function CompareBar({ mode, onMode, blend, onBlend, onClose }: BarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2 shadow-panel">
      <span className="text-xs font-semibold">Compare</span>
      <div className="flex rounded border p-0.5 text-xs">
        {(["swipe", "opacity"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onMode(m)}
            className={`rounded px-2 py-1 ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "swipe" ? "Swipe" : "Opacity"}
          </button>
        ))}
      </div>
      {mode === "opacity" && (
        <div className="flex w-56 items-center gap-2 text-xs">
          <span className="font-mono">2019</span>
          <Slider
            value={[Math.round(blend * 100)]}
            max={100}
            step={1}
            onValueChange={([v]) => onBlend((v ?? 0) / 100)}
            className="flex-1"
          />
          <span className="font-mono">2025</span>
        </div>
      )}
      <button
        onClick={onClose}
        aria-label="Exit comparison"
        className="rounded p-1 text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Vertical swipe divider; MapView clips the synchronized 2025 raster overlay. */
export function SwipeDivider({
  position,
  onChange,
}: {
  position: number;
  onChange: (p: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const start = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!(e.buttons & 1) || !host.current) return;
    const r = host.current.getBoundingClientRect();
    onChange(Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width)));
  };
  return (
    <div ref={host} className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute left-3 top-3 rounded bg-chrome px-2 py-1 font-mono text-xs text-chrome-foreground">
        2019
      </div>
      <div className="absolute right-3 top-3 rounded bg-chrome px-2 py-1 font-mono text-xs text-chrome-foreground md:right-16">
        2025
      </div>
      <div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-chrome"
        style={{ left: `${position * 100}%` }}
      >
        <div
          onPointerDown={start}
          onPointerMove={move}
          role="slider"
          aria-label="Swipe 2019 / 2025"
          aria-valuenow={Math.round(position * 100)}
          className="pointer-events-auto absolute left-1/2 top-1/2 flex h-10 w-7 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-md bg-chrome text-chrome-foreground shadow-panel"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
