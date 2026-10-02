import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RLegend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown } from "lucide-react";
import type { ChangeArea, DashboardSummary, LandcoverArea, Transition } from "@/lib/webgisApi";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--card)",
};
const fmtHa = (value: number, digits = 2) =>
  value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function KPICards({ summary }: { summary: DashboardSummary }) {
  const forest = (year: "2019" | "2025") =>
    summary.landcover[year].find((item) => item.value === 1)?.area_ha;
  const items = [
    { label: "Study Area", value: summary.study_area?.area_ha, digits: 1 },
    { label: "Forest 2019", value: forest("2019"), digits: 2 },
    { label: "Forest 2025", value: forest("2025"), digits: 2 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border bg-card p-2.5">
          <p className="label-caps">{item.label}</p>
          <p className="mt-1 font-mono text-base font-semibold">
            {item.value == null ? "—" : fmtHa(item.value, item.digits)}{" "}
            <span className="text-xs font-normal text-muted-foreground">ha</span>
          </p>
        </div>
      ))}
      <div className="rounded-md border border-loss/40 bg-loss/10 p-2.5">
        <p className="label-caps">Net Forest Change</p>
        <p className="mt-1 flex items-center gap-1 font-mono text-base font-semibold text-loss">
          {summary.net_forest_change_ha < 0 && <TrendingDown className="h-4 w-4" />}
          {summary.net_forest_change_ha < 0 ? "−" : "+"}
          {fmtHa(Math.abs(summary.net_forest_change_ha))}{" "}
          <span className="text-xs font-normal">ha</span>
        </p>
      </div>
    </div>
  );
}

function LandCoverChart({ landcover }: { landcover: DashboardSummary["landcover"] }) {
  const rows = landcover["2019"].map((item: LandcoverArea) => ({
    name: item.name,
    y2019: item.area_ha,
    y2025: landcover["2025"].find((other) => other.value === item.value)?.area_ha ?? 0,
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
          barGap={1}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
          <YAxis
            type="category"
            dataKey="name"
            width={92}
            tick={{ fontSize: 10 }}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => (typeof value === "number" ? `${fmtHa(value)} ha` : "—")}
            cursor={{ fill: "var(--muted)" }}
          />
          <RLegend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="y2019" name="2019" fill="var(--chart-1)" radius={[0, 2, 2, 0]} />
          <Bar dataKey="y2025" name="2025" fill="var(--chart-2)" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChangeChart({ changes, net }: { changes: ChangeArea[]; net: number }) {
  const rows = changes.map((item) => ({
    name: item.name,
    value: item.area_ha,
    color: item.hex_color ?? "#999",
  }));
  return (
    <div className="flex items-center gap-3">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={34}
              outerRadius={60}
              paddingAngle={1}
              stroke="var(--card)"
            >
              {rows.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => (typeof value === "number" ? `${fmtHa(value)} ha` : "—")}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 text-xs">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm border border-foreground/15"
              style={{ backgroundColor: row.color }}
            />
            <span className="flex-1">{row.name}</span>
            <span className="font-mono">{fmtHa(row.value)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t pt-1.5 font-semibold text-loss">
          <span>Net Forest Change</span>
          <span className="font-mono">
            {net < 0 ? "−" : "+"}
            {fmtHa(Math.abs(net))} ha
          </span>
        </li>
      </ul>
    </div>
  );
}

function TransitionTable({ transitions }: { transitions: Transition[] }) {
  return (
    <div className="max-h-64 overflow-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted text-left">
          <tr>
            <th className="px-2 py-1.5 font-semibold">From</th>
            <th className="px-2 py-1.5 font-semibold">To</th>
            <th className="px-2 py-1.5 text-right font-semibold">Area (ha)</th>
          </tr>
        </thead>
        <tbody>
          {transitions.map((item) => (
            <tr key={item.code} className="border-t">
              <td className="px-2 py-1">{item.from_class}</td>
              <td className="px-2 py-1">{item.to_class}</td>
              <td className="px-2 py-1 text-right font-mono">{fmtHa(item.area_ha)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatisticsPanel({
  summary,
  transitions,
  loading,
  error,
}: {
  summary: DashboardSummary | undefined;
  transitions: Transition[] | undefined;
  loading: boolean;
  error: boolean;
}) {
  if (loading)
    return <p className="text-xs text-muted-foreground">Loading statistics from PostGIS…</p>;
  if (error || !summary || !transitions)
    return (
      <p role="alert" className="text-xs text-loss">
        Statistics unavailable. Check the backend connection.
      </p>
    );
  return (
    <div className="space-y-5">
      <KPICards summary={summary} />
      <section>
        <h3 className="label-caps mb-2">Land Cover — 2019 vs 2025 (ha)</h3>
        <LandCoverChart landcover={summary.landcover} />
      </section>
      <section>
        <h3 className="label-caps mb-2">Changes 2019–2025</h3>
        <ChangeChart changes={summary.changes} net={summary.net_forest_change_ha} />
      </section>
      <section>
        <h3 className="label-caps mb-2">Land-Cover Transitions</h3>
        <TransitionTable transitions={transitions} />
      </section>
      <section>
        <h3 className="label-caps mb-2">Classification accuracy</h3>
        <ul className="space-y-1 text-xs">
          {summary.accuracy.map((item) => (
            <li key={item.year} className="flex justify-between">
              <span>{item.year}</span>
              <span className="font-mono">
                {fmtHa(item.overall_accuracy * 100, 1)}% · κ {item.kappa.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
