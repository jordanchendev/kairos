import type { StrategyPerformanceResponse, StrategyResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatCompactCurrency, formatPercent, formatRatio } from "@/features/portfolio/portfolio-view-model";

type StrategyDetailPanelProps = {
  performance: StrategyPerformanceResponse | null;
  strategy: StrategyResponse;
};

function shortenBacktestId(id: string | null | undefined): string {
  if (!id) {
    return "N/A";
  }
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function SnapshotRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[hsl(var(--border))] py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="break-all text-right font-mono text-sm text-[hsl(var(--foreground))]">{value}</span>
    </div>
  );
}

export function StrategyDetailPanel({ performance, strategy }: StrategyDetailPanelProps) {
  return (
    <PanelFrame
      action={<StatusBadge label={strategy.active ? "active" : "paused"} status={strategy.active ? "up" : "idle"} />}
      description="Selected strategy detail stays subordinate to the comparison workflow, but still exposes the key backtest aggregates."
      eyebrow="Selected Strategy"
      title={strategy.name}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="best backtest"
            value={
              <span
                className="block truncate font-mono text-2xl"
                title={performance?.best?.backtest_id ?? undefined}
              >
                {shortenBacktestId(performance?.best?.backtest_id)}
              </span>
            }
          />
          <MetricCard label="Best Sharpe" value={performance?.best ? formatRatio(performance.best.sharpe_ratio) : "N/A"} />
          <MetricCard label="Latest Win Rate" value={performance?.latest ? formatPercent(performance.latest.win_rate) : "N/A"} />
          <MetricCard label="Latest P&amp;L" value={performance?.latest ? formatCompactCurrency(performance.latest.total_pnl) : "N/A"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Strategy Config</div>
            <pre className="mt-3 max-h-[22rem] overflow-auto whitespace-pre-wrap break-all rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 font-mono text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(strategy.config, null, 2)}
            </pre>
          </div>

          <div className="min-w-0 rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Comparison Snapshot</div>
            <div className="mt-3">
              <SnapshotRow label="Strategy Type" value={strategy.strategy_type} />
              <SnapshotRow label="Backtests" value={performance?.backtest_count ?? 0} />
              <SnapshotRow label="Latest Trades" value={performance?.latest?.trade_count ?? 0} />
              <SnapshotRow label="Latest Drawdown" value={formatPercent(performance?.latest?.max_drawdown)} />
            </div>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
