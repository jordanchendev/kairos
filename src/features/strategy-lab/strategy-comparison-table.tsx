import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { StrategyResponse } from "@/api/poseidon/types.gen";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatCompactCurrency, formatPercent, formatRatio, getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { cn } from "@/lib/cn";

export type StrategySortKey = "backtestCount" | "latestSharpe" | "latestTradeCount" | "latestWinRate" | "totalPnl";

export type StrategyComparisonRow = {
  backtestCount: number;
  latestSharpe: number | null;
  latestTradeCount: number | null;
  latestWinRate: number | null;
  strategy: StrategyResponse;
  totalPnl: number | null;
};

type StrategyComparisonTableProps = {
  onSelectStrategy: (strategyId: string) => void;
  onSortChange: (sortKey: StrategySortKey) => void;
  rows: StrategyComparisonRow[];
  selectedStrategyId: string | null;
  sortDirection: "asc" | "desc";
  sortKey: StrategySortKey;
};

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5" />;
  }

  return direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

function HeaderButton({
  active,
  children,
  direction,
  onClick,
}: {
  active: boolean;
  children: string;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap uppercase tracking-[0.22em] transition-colors duration-200 hover:text-[hsl(var(--foreground))]",
        active && "text-[hsl(var(--foreground))]",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{children}</span>
      <SortIcon active={active} direction={direction} />
    </button>
  );
}

export function StrategyComparisonTable({
  onSelectStrategy,
  onSortChange,
  rows,
  selectedStrategyId,
  sortDirection,
  sortKey,
}: StrategyComparisonTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
      <div className="hidden grid-cols-[1.3fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-4 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.88)] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] lg:grid">
        <span>Strategy</span>
        <HeaderButton active={sortKey === "latestSharpe"} direction={sortDirection} onClick={() => onSortChange("latestSharpe")}>
          Sharpe
        </HeaderButton>
        <HeaderButton active={sortKey === "latestWinRate"} direction={sortDirection} onClick={() => onSortChange("latestWinRate")}>
          Win Rate
        </HeaderButton>
        <HeaderButton active={sortKey === "latestTradeCount"} direction={sortDirection} onClick={() => onSortChange("latestTradeCount")}>
          Trades
        </HeaderButton>
        <HeaderButton active={sortKey === "totalPnl"} direction={sortDirection} onClick={() => onSortChange("totalPnl")}>
          P&amp;L
        </HeaderButton>
        <HeaderButton active={sortKey === "backtestCount"} direction={sortDirection} onClick={() => onSortChange("backtestCount")}>
          Backtests
        </HeaderButton>
      </div>

      <div className="divide-y divide-[hsl(var(--border))]">
        {rows.map((row) => (
          <button
            className={cn(
              "grid w-full cursor-pointer gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-[hsla(190,91%,37%,0.08)] lg:grid-cols-[1.3fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr]",
              selectedStrategyId === row.strategy.id && "bg-[hsla(190,91%,37%,0.12)]",
            )}
            key={row.strategy.id}
            onClick={() => onSelectStrategy(row.strategy.id)}
            type="button"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="break-all text-base font-semibold text-[hsl(var(--foreground))]" title={row.strategy.name}>
                  {row.strategy.name}
                </div>
                <StatusBadge label={row.strategy.active ? "active" : "paused"} status={row.strategy.active ? "up" : "idle"} />
              </div>
              <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {row.strategy.symbol} · {getMarketLabel(row.strategy.market)} · {row.strategy.interval}
              </div>
            </div>

            <div className="text-sm text-[hsl(var(--foreground))]">{formatRatio(row.latestSharpe)}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{formatPercent(row.latestWinRate)}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{row.latestTradeCount ?? 0}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{formatCompactCurrency(row.totalPnl)}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{row.backtestCount}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
