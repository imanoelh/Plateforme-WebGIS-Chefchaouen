import { Eye, EyeOff, Focus } from "lucide-react";
import {
  BASEMAPS,
  LAYERS,
  LAYER_GROUPS,
  type BasemapId,
  type LayerConfig,
  type LayerId,
} from "@/config/mapConfig";
import { Slider } from "@/components/ui/slider";
import type { LayerState } from "./MapView";

interface ItemProps {
  layer: LayerConfig;
  state: { visible: boolean; opacity: number };
  onToggle: () => void;
  onOpacity: (v: number) => void;
  onZoom: () => void;
  available: boolean;
  loading: boolean;
  comparisonActive: boolean;
}

export function LayerItem({
  layer,
  state,
  onToggle,
  onOpacity,
  onZoom,
  available,
  loading,
  comparisonActive,
}: ItemProps) {
  const locked = comparisonActive && layer.kind === "image";
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`l-${layer.id}`}
          checked={state.visible}
          onChange={onToggle}
          disabled={!available || locked}
          className="h-4 w-4 accent-primary"
        />
        <label htmlFor={`l-${layer.id}`} className="flex-1 cursor-pointer text-sm font-medium">
          {layer.title}
        </label>
        <button
          onClick={onZoom}
          aria-label={`Zoom to ${layer.title}`}
          title="Zoom to layer"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Focus className="h-3.5 w-3.5" />
        </button>
        {state.visible ? (
          <Eye className="h-3.5 w-3.5 text-primary" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 pl-6">
        <span className="w-12 text-[11px] text-muted-foreground">Opacity</span>
        <Slider
          value={[Math.round(state.opacity * 100)]}
          max={100}
          step={5}
          disabled={!state.visible || !available || locked}
          onValueChange={([v]) => onOpacity((v ?? 0) / 100)}
          className="flex-1"
        />
        <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">
          {Math.round(state.opacity * 100)}%
        </span>
      </div>
      {!available && (
        <p className="mt-1.5 pl-6 text-[10px] text-muted-foreground">
          {loading ? "Loading from PostGIS…" : "Layer unavailable — check API"}
        </p>
      )}
    </div>
  );
}

interface Props {
  layerState: LayerState;
  basemap: BasemapId;
  onBasemapChange: (basemap: BasemapId) => void;
  onToggle: (id: LayerId) => void;
  onOpacity: (id: LayerId, v: number) => void;
  onZoom: () => void;
  availableLayers: Set<string>;
  loading: boolean;
  comparisonActive: boolean;
}

export function LayerManager({
  layerState,
  basemap,
  onBasemapChange,
  onToggle,
  onOpacity,
  onZoom,
  availableLayers,
  loading,
  comparisonActive,
}: Props) {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="label-caps mb-2">Basemap</h3>
        <div className="grid grid-cols-2 gap-2">
          {BASEMAPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onBasemapChange(item.id)}
              aria-pressed={basemap === item.id}
              className={`rounded-md border px-2 py-2 text-left transition-colors ${basemap === item.id ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-accent"}`}
            >
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="block text-[10px] text-muted-foreground">{item.description}</span>
            </button>
          ))}
        </div>
      </section>
      {comparisonActive && (
        <p className="text-xs text-muted-foreground">
          Use the comparison bar to control the 2019 / 2025 layers.
        </p>
      )}
      {LAYER_GROUPS.map((g) => (
        <section key={g}>
          <h3 className="label-caps mb-2">{g}</h3>
          <div className="space-y-2">
            {LAYERS.filter((l) => l.group === g).map((l) => (
              <LayerItem
                key={l.id}
                layer={l}
                state={layerState[l.id]}
                onToggle={() => onToggle(l.id)}
                onOpacity={(v) => onOpacity(l.id, v)}
                onZoom={onZoom}
                available={availableLayers.has(l.id)}
                loading={loading}
                comparisonActive={comparisonActive}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
