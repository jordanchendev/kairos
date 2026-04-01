import type { BacktestResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";
import { formatCompactCurrency, formatNumber, formatPercent, formatRatio } from "@/features/portfolio/portfolio-view-model";

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

type BacktestSummaryProps = {
  backtest: BacktestResponse;
  tradesCount: number;
};

export function BacktestSummary({ backtest, tradesCount }: BacktestSummaryProps) {
  const sharpeRatio = readMetricNumber(backtest.metrics, ["sharpe_ratio"]);
  const totalReturn = readMetricNumber(backtest.metrics, ["total_return_pct", "total_return"]);
  const maxDrawdown = readMetricNumber(backtest.metrics, ["max_drawdown", "max_drawdown_pct"]);
  const totalPnl = readMetricNumber(backtest.metrics, ["total_pnl", "net_profit", "final_pnl"]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Strategy" value={backtest.strategy_type} />
      <MetricCard label="Sharpe" value={sharpeRatio === null ? "N/A" : formatRatio(sharpeRatio)} />
      <MetricCard label="Total Return" value={totalReturn === null ? "N/A" : formatPercent(totalReturn)} />
      <MetricCard label="Max Drawdown" value={maxDrawdown === null ? "N/A" : formatPercent(maxDrawdown)} />
      <MetricCard
        detail={totalPnl === null ? undefined : `P&L ${formatCompactCurrency(totalPnl)}`}
        label="Trade Count"
        value={formatNumber(tradesCount)}
      />
    </div>
  );
}
