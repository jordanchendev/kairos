import type { StrategyPerformanceResponse, StrategyResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatCompactCurrency, formatPercent, formatRatio } from "@/features/portfolio/portfolio-view-model";

type StrategyDetailPanelProps = {
  performance: StrategyPerformanceResponse | null;
  strategy: StrategyResponse;
};

export function StrategyDetailPanel({ performance, strategy }: StrategyDetailPanelProps) {
  return (
    <PanelFrame
      action={<StatusBadge label={strategy.active ? "active" : "paused"} status={strategy.active ? "up" : "idle"} />}
      description="Selected strategy detail stays subordinate to the comparison workflow, but still exposes the key backtest aggregates."
      eyebrow="Selected Strategy"
      title={strategy.name}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="best backtest" value={performance?.best?.backtest_id ?? "N/A"} />
          <MetricCard label="Best Sharpe" value={performance?.best ? formatRatio(performance.best.sharpe_ratio) : "N/A"} />
          <MetricCard label="Latest Win Rate" value={performance?.latest ? formatPercent(performance.latest.win_rate) : "N/A"} />
          <MetricCard label="Latest P&amp;L" value={performance?.latest ? formatCompactCurrency(performance.latest.total_pnl) : "N/A"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Strategy Config</div>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(strategy.config, null, 2)}
            </pre>
          </div>

          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Comparison Snapshot</div>
            <div className="mt-3 grid gap-3 text-sm text-[hsl(var(--foreground))]">
              <div className="flex items-center justify-between gap-3">
                <span>Strategy Type</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{strategy.strategy_type}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Backtests</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{performance?.backtest_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Latest Trades</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{performance?.latest?.trade_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Latest Drawdown</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  {formatPercent(performance?.latest?.max_drawdown)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
