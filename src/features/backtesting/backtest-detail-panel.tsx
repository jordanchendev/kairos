import type { BacktestResponse, BacktestTradeResponse } from "@/api/poseidon/types.gen";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatCompactCurrency, formatDateLabel } from "@/features/portfolio/portfolio-view-model";

function getBacktestStatusTone(status: string) {
  if (status === "completed") {
    return "up" as const;
  }

  if (status === "failed") {
    return "down" as const;
  }

  if (status === "running") {
    return "degraded" as const;
  }

  return "idle" as const;
}

type BacktestDetailPanelProps = {
  backtest: BacktestResponse;
  trades: BacktestTradeResponse[];
};

export function BacktestDetailPanel({ backtest, trades }: BacktestDetailPanelProps) {
  return (
    <PanelFrame
      action={<StatusBadge label={backtest.status} status={getBacktestStatusTone(backtest.status)} />}
      description="Config, walk-forward payload, and recent execution detail stay in-page for quick drill-down."
      eyebrow="Drill Down"
      title="Run Detail"
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Lifecycle</div>
            <div className="mt-3 grid gap-3 text-sm text-[hsl(var(--foreground))]">
              <div className="flex items-center justify-between gap-3">
                <span>Created</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  {formatDateLabel(backtest.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Completed</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  {formatDateLabel(backtest.completed_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Trades</span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{trades.length} trades</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">config</div>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(backtest.config, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">walk_forward</div>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(backtest.walk_forward ?? { status: "unavailable" }, null, 2)}
            </pre>
          </div>

          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Recent Trades</div>
              {backtest.error_message ? <span className="text-xs text-rose-200">{backtest.error_message}</span> : null}
            </div>
            <div className="mt-3 space-y-3">
              {trades.slice(0, 4).map((trade) => (
                <div className="rounded-[18px] border border-[hsl(var(--border))] bg-[rgba(2,6,23,0.75)] p-3" key={trade.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium uppercase text-[hsl(var(--foreground))]">{trade.action}</span>
                    <span className="text-sm text-[hsl(var(--foreground))]">{formatCompactCurrency(trade.pnl)}</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] sm:grid-cols-2">
                    <span>{trade.symbol}</span>
                    <span>{trade.quantity} qty</span>
                    <span>{formatDateLabel(trade.entry_time)}</span>
                    <span>{formatCompactCurrency(trade.entry_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
