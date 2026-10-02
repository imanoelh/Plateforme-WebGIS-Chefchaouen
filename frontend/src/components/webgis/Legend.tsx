import type { LegendKind } from "@/config/mapConfig";
import type { LegendEntry } from "@/lib/webgisApi";

export function Legend({
  kind,
  entries,
  loading,
  error,
}: {
  kind: LegendKind;
  entries: LegendEntry[] | undefined;
  loading: boolean;
  error: boolean;
}) {
  if (!kind)
    return (
      <p className="text-xs text-muted-foreground">Enable a thematic layer to see its legend.</p>
    );
  if (loading) return <p className="text-xs text-muted-foreground">Loading legend…</p>;
  if (error || !entries)
    return (
      <p role="alert" className="text-xs text-loss">
        Legend unavailable.
      </p>
    );
  const classes = entries.filter((entry) => entry.layer === kind).sort((a, b) => a.value - b.value);
  return (
    <div>
      <p className="mb-2 text-xs font-semibold">
        {kind === "change" ? "Forest Change 2019–2025" : "Land Cover (2019 & 2025)"}
      </p>
      <ul className="space-y-1.5">
        {classes.map((entry) => (
          <li key={entry.value} className="flex items-center gap-2 text-xs">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground/15"
              style={{ backgroundColor: entry.hex_color }}
            />
            {entry.class_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
