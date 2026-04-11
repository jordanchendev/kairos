import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { formatRatio } from "@/features/portfolio/portfolio-view-model";

import type { FactorAnalysisRun } from "./types";
import { asShapleyResults } from "./types";

type ShapleyBarChartProps = {
  run: FactorAnalysisRun | null;
};

export function ShapleyBarChart({ run }: ShapleyBarChartProps) {
  const results = asShapleyResults(run);
  const rows = Object.entries(results?.features ?? {})
    .map(([feature, value]) => ({ feature, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 10);

  if (!results || rows.length === 0) {
    return (
      <PanelFrame
        description="Mean absolute SHAP value per feature for the selected model version."
        eyebrow="Feature Importance"
        title="Shapley bars"
      >
        <EmptyState
          message="Trigger a SHAP analysis to compare feature importance across the trained model."
          title="No SHAP results"
        />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame
      description={`Top feature importances from ${results.num_samples} sample(s).`}
      eyebrow="Feature Importance"
      title="Shapley bars"
    >
      {typeof window === "undefined" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div
              className="rounded-[20px] border border-white/10 bg-white/4 p-4"
              key={row.feature}
            >
              <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{row.feature}</div>
              <div className="mt-3 text-lg text-[hsl(var(--foreground))]">{formatRatio(row.value)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-80 rounded-[24px] border border-white/8 bg-white/[0.03] p-4" data-chart-shell="shapley-bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 24, right: 12 }}>
              <CartesianGrid horizontal stroke="rgba(148,163,184,0.16)" />
              <XAxis stroke="rgba(248,250,252,0.65)" tick={{ fill: "rgba(248,250,252,0.72)", fontSize: 12 }} type="number" />
              <YAxis dataKey="feature" stroke="rgba(248,250,252,0.65)" tick={{ fill: "rgba(248,250,252,0.72)", fontSize: 12 }} type="category" width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(248,250,252,0.12)",
                  borderRadius: 16,
                }}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelFrame>
  );
}
