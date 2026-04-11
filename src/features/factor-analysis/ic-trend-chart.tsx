import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { formatRatio } from "@/features/portfolio/portfolio-view-model";

import type { FactorAnalysisRun } from "./types";
import { asICResults } from "./types";

type ICTrendChartProps = {
  horizon: string;
  run: FactorAnalysisRun | null;
};

export function ICTrendChart({ horizon, run }: ICTrendChartProps) {
  const results = asICResults(run);
  const rows = Object.entries(results?.features ?? {})
    .map(([feature, values]) => ({
      feature,
      ic: values[horizon] ?? null,
    }))
    .filter((row) => typeof row.ic === "number");

  if (!results || rows.length === 0) {
    return (
      <PanelFrame
        description="Rank IC by feature for the selected horizon."
        eyebrow="IC Analysis"
        title="IC trend"
      >
        <EmptyState
          message="Run one of the analysis tabs to populate factor diagnostics."
          title="No IC results"
        />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame
      description={`Rank IC across ${results.symbols_used} symbol(s) and ${results.total_observations} observations.`}
      eyebrow="IC Analysis"
      title="IC trend"
    >
      {typeof window === "undefined" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div
              className="rounded-[20px] border border-white/10 bg-white/4 p-4"
              key={row.feature}
            >
              <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{row.feature}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                {horizon}d horizon
              </div>
              <div className="mt-3 text-lg text-[hsl(var(--foreground))]">{formatRatio(row.ic)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-80 rounded-[24px] border border-white/8 bg-white/[0.03] p-4" data-chart-shell="ic-trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
              <XAxis dataKey="feature" stroke="rgba(248,250,252,0.65)" tick={{ fill: "rgba(248,250,252,0.72)", fontSize: 12 }} />
              <YAxis stroke="rgba(248,250,252,0.65)" tick={{ fill: "rgba(248,250,252,0.72)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(248,250,252,0.12)",
                  borderRadius: 16,
                }}
              />
              <Line
                dataKey="ic"
                dot={{ fill: "#38bdf8", r: 4 }}
                stroke="#38bdf8"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelFrame>
  );
}
