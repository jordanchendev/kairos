import type { BacktestResponse } from "@/api/poseidon/types.gen";
import { LightweightChart } from "@/features/charts/lightweight-chart";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";

function readMetricNumber(metrics: BacktestResponse["metrics"], keys: string[]) {
  if (!metrics) {
    return null;
  }

  for (const key of keys) {
    const value = metrics[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

type RollingMetricsChartProps = {
  backtests: BacktestResponse[];
  strategyName: string;
};

export function RollingMetricsChart({ backtests, strategyName }: RollingMetricsChartProps) {
  const points = backtests
    .map((backtest) => ({
      time: backtest.completed_at ?? backtest.created_at,
      value: readMetricNumber(backtest.metrics, ["composite_score", "sharpe_ratio"]),
    }))
    .filter((point): point is { time: string; value: number } => typeof point.value === "number")
    .sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime());

  return (
    <PanelFrame
      description="Comparison remains primary; this rolling chart stays subordinate and shows how the selected strategy's backtest quality evolves over time."
      eyebrow="Rolling View"
      title="Rolling Metrics"
    >
      {points.length === 0 ? (
        <EmptyState message="This strategy does not have enough completed backtests to chart a rolling metric yet." title="No rolling metric history" />
      ) : (
        <LightweightChart
          data={points}
          description={`${strategyName} rolling backtest quality over ${points.length} completed runs.`}
          priceLabel="Score"
          title="Rolling Edge"
        />
      )}
    </PanelFrame>
  );
}
