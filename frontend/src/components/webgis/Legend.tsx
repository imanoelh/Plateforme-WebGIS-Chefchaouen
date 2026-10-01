import { LAND_COVER_CLASSES } from "@/data/landCoverClasses";
import { CHANGE_CLASSES } from "@/data/changeClasses";
import type { LegendKind } from "@/config/mapConfig";

export function Legend({ kind }: { kind: LegendKind }) {
  if (!kind) return <p className="text-xs text-muted-foreground">Enable a thematic layer to see its legend.</p>;
  const classes = kind === "change" ? CHANGE_CLASSES : LAND_COVER_CLASSES;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold">
        {kind === "change" ? "Forest Change 2019–2025" : "Land Cover (2019 & 2025)"}
      </p>
      <ul className="space-y-1.5">
        {classes.map((c) => (
          <li key={c.name} className="flex items-center gap-2 text-xs">
            <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground/15" style={{ backgroundColor: c.color }} />
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
