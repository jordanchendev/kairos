import type { BacktestResponse, BacktestTradeResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";
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

function formatQuantity(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Math.abs(value) >= 1000) {
    return value.toFixed(0);
  }

  return value.toFixed(2);
}

type BacktestDetailPanelProps = {
  backtest: BacktestResponse;
  trades: BacktestTradeResponse[];
};

export function BacktestDetailPanel({ backtest, trades }: BacktestDetailPanelProps) {
  const recentTrades = trades.slice(0, 8);

  return (
    <PanelFrame
      action={<StatusBadge label={backtest.status} status={getBacktestStatusTone(backtest.status)} />}
      description="Config, walk-forward payload, and recent execution detail stay in-page for quick drill-down."
      eyebrow="Drill Down"
      title="Run Detail"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Created"
            value={
              <span className="block truncate font-mono text-base">{formatDateLabel(backtest.created_at)}</span>
            }
          />
          <MetricCard
            label="Completed"
            value={
              <span className="block truncate font-mono text-base">{formatDateLabel(backtest.completed_at)}</span>
            }
          />
          <MetricCard label="Trades" value={trades.length} />
          <MetricCard
            label="Status"
            value={<span className="text-2xl uppercase tracking-[0.18em]">{backtest.status}</span>}
          />
        </div>

        {backtest.error_message ? (
          <div className="rounded-[18px] border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {backtest.error_message}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Config</div>
            <pre className="mt-3 max-h-[22rem] overflow-auto whitespace-pre-wrap break-all rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 font-mono text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(backtest.config, null, 2)}
            </pre>
          </div>

          <div className="min-w-0 rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Walk Forward</div>
            <pre className="mt-3 max-h-[22rem] overflow-auto whitespace-pre-wrap break-all rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 font-mono text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(backtest.walk_forward ?? { status: "unavailable" }, null, 2)}
            </pre>
          </div>
        </div>

        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Recent Trades</div>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              showing {recentTrades.length} of {trades.length}
            </span>
          </div>

          {recentTrades.length === 0 ? (
            <div className="mt-3 rounded-[18px] border border-[hsl(var(--border))] bg-[rgba(2,6,23,0.5)] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No trades recorded for this run.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-[18px] border border-[hsl(var(--border))]">
              <table className="w-full min-w-[640px] divide-y divide-[hsl(var(--border))] text-sm">
                <thead className="bg-[hsla(225,47%,7%,0.85)] text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">Action</th>
                    <th className="px-4 py-3 text-left font-normal">Symbol</th>
                    <th className="px-4 py-3 text-right font-normal">Qty</th>
                    <th className="px-4 py-3 text-right font-normal">Entry Price</th>
                    <th className="px-4 py-3 text-left font-normal">Entry Time</th>
                    <th className="px-4 py-3 text-right font-normal">P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                  {recentTrades.map((trade) => (
                    <tr className="hover:bg-[hsla(190,91%,37%,0.06)]" key={trade.id}>
                      <td className="px-4 py-3 font-medium uppercase tracking-[0.14em]">{trade.action}</td>
                      <td className="px-4 py-3 font-mono">{trade.symbol}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatQuantity(trade.quantity)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCompactCurrency(trade.entry_price)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        {formatDateLabel(trade.entry_time)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCompactCurrency(trade.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PanelFrame>
  );
}
