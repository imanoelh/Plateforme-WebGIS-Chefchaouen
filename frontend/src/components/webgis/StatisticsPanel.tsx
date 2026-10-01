import { Bar, BarChart, CartesianGrid, Cell, Legend as RLegend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown } from "lucide-react";
import { CHANGE_STATS, KPIS, LAND_COVER_STATS, TRANSITIONS, fmtHa } from "@/data/mockStatistics";
import { CHANGE_CLASSES } from "@/data/changeClasses";

const tooltipStyle = { fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)" };

export function KPICards() {
  const items = [
    { label: "Study Area", value: KPIS.studyArea, digits: 1 },
    { label: "Forest 2019", value: KPIS.forest2019 },
    { label: "Forest 2025", value: KPIS.forest2025 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((k) => (
        <div key={k.label} className="rounded-md border bg-card p-2.5">
          <p className="label-caps">{k.label}</p>
          <p className="mt-1 font-mono text-base font-semibold">{fmtHa(k.value, k.digits ?? 2)} <span className="text-xs font-normal text-muted-foreground">ha</span></p>
        </div>
      ))}
      <div className="rounded-md border border-loss/40 bg-loss/10 p-2.5">
        <p className="label-caps">Net Forest Change</p>
        <p className="mt-1 flex items-center gap-1 font-mono text-base font-semibold text-loss">
          <TrendingDown className="h-4 w-4" />−{fmtHa(Math.abs(KPIS.netForestChange))} <span className="text-xs font-normal">ha</span>
        </p>
      </div>
    </div>
  );
}

export function LandCoverChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={LAND_COVER_STATS} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barGap={1}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtHa(v)} ha`} cursor={{ fill: "var(--muted)" }} />
          <RLegend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="y2019" name="2019" fill="var(--chart-1)" radius={[0, 2, 2, 0]} />
          <Bar dataKey="y2025" name="2025" fill="var(--chart-2)" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChangeChart() {
  const color = (n: string) => CHANGE_CLASSES.find((c) => c.name === n)?.color ?? "#999";
  return (
    <div className="flex items-center gap-3">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={CHANGE_STATS} dataKey="value" nameKey="name" innerRadius={34} outerRadius={60} paddingAngle={1} stroke="var(--card)">
              {CHANGE_STATS.map((d) => <Cell key={d.name} fill={color(d.name)} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtHa(v)} ha`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 text-xs">
        {CHANGE_STATS.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-foreground/15" style={{ backgroundColor: color(d.name) }} />
            <span className="flex-1">{d.name}</span>
            <span className="font-mono">{fmtHa(d.value)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t pt-1.5 font-semibold text-loss">
          <span>Net Forest Change</span><span className="font-mono">−{fmtHa(Math.abs(KPIS.netForestChange))} ha</span>
        </li>
      </ul>
    </div>
  );
}

export function TransitionTable() {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted text-left">
          <tr><th className="px-2 py-1.5 font-semibold">From</th><th className="px-2 py-1.5 font-semibold">To</th><th className="px-2 py-1.5 text-right font-semibold">Area (ha)</th></tr>
        </thead>
        <tbody>
          {TRANSITIONS.length === 0 ? (
            <tr><td colSpan={3} className="px-2 py-4 text-center text-muted-foreground">
              Transition matrix will load from <span className="font-mono">transitions_2019_2025_ha.csv</span>
            </td></tr>
          ) : TRANSITIONS.map((t, i) => (
            <tr key={i} className="border-t"><td className="px-2 py-1">{t.from}</td><td className="px-2 py-1">{t.to}</td><td className="px-2 py-1 text-right font-mono">{fmtHa(t.area)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatisticsPanel() {
  return (
    <div className="space-y-5">
      <KPICards />
      <section><h3 className="label-caps mb-2">Land Cover — 2019 vs 2025 (ha)</h3><LandCoverChart /></section>
      <section><h3 className="label-caps mb-2">Changes 2019–2025</h3><ChangeChart /></section>
      <section><h3 className="label-caps mb-2">Land-Cover Transitions</h3><TransitionTable /></section>
    </div>
  );
}
