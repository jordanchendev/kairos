import type { BacktestResponse } from "@/api/poseidon/types.gen";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { cn } from "@/lib/cn";

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

type BacktestSelectorProps = {
  backtests: BacktestResponse[];
  onSelectBacktest: (backtestId: string) => void;
  selectedBacktestId: string | null;
};

export function BacktestSelector({ backtests, onSelectBacktest, selectedBacktestId }: BacktestSelectorProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
      <div className="border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.85)] px-4 py-3 text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
        Recent Runs
      </div>

      <div className="grid grid-cols-1 divide-y divide-[hsl(var(--border))] md:grid-cols-2 md:divide-y-0 md:[&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(n+3)]:border-[hsl(var(--border))] md:[&>*:nth-child(odd)]:border-r md:[&>*:nth-child(odd)]:border-[hsl(var(--border))] xl:grid-cols-3 xl:[&>*:nth-child(n+4)]:border-t xl:[&>*:nth-child(n+1)]:border-r xl:[&>*:nth-child(3n)]:border-r-0">
        {backtests.map((backtest) => (
          <button
            className={cn(
              "min-w-0 cursor-pointer px-4 py-4 text-left transition-colors duration-200 hover:bg-[hsla(190,91%,37%,0.08)]",
              selectedBacktestId === backtest.id && "bg-[hsla(190,91%,37%,0.12)]",
            )}
            key={backtest.id}
            onClick={() => onSelectBacktest(backtest.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-[hsl(var(--foreground))]" title={backtest.symbol || backtest.id}>
                  {backtest.symbol || "—"}
                </div>
                <div className="mt-1 truncate font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  {backtest.strategy_type}
                </div>
              </div>
              <StatusBadge label={backtest.status} status={getBacktestStatusTone(backtest.status)} />
            </div>

            <div className="mt-3 grid gap-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] sm:grid-cols-3">
              <span className="truncate">{getMarketLabel(backtest.market)}</span>
              <span className="truncate">{backtest.interval}</span>
              <span className="truncate">{backtest.completed_at ?? backtest.created_at}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
