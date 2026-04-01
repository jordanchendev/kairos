import { useState } from "react";

import type { HoldingResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { cn } from "@/lib/cn";

import { formatCurrency, formatDateLabel, formatPercent, getMarketLabel } from "./portfolio-view-model";

type HoldingsTableProps = {
  holdings: HoldingResponse[];
};

type SortColumn = "market" | "symbol" | "unrealized_pnl" | "weight";
type SortDirection = "asc" | "desc";

const sortButtonClassName =
  "sortable inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("unrealized_pnl");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  if (holdings.length === 0) {
    return <EmptyState message="No live spot holdings match the current market filter." title="No holdings in scope" />;
  }

  const sortedHoldings = [...holdings].sort((left, right) => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    if (sortColumn === "symbol") {
      return left.symbol.localeCompare(right.symbol) * directionMultiplier;
    }

    if (sortColumn === "market") {
      return left.market.localeCompare(right.market) * directionMultiplier;
    }

    if (sortColumn === "weight") {
      return (left.weight - right.weight) * directionMultiplier;
    }

    return ((left.unrealized_pnl ?? 0) - (right.unrealized_pnl ?? 0)) * directionMultiplier;
  });

  function toggleSort(nextColumn: SortColumn) {
    if (nextColumn === sortColumn) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(nextColumn);
    setSortDirection(nextColumn === "symbol" || nextColumn === "market" ? "asc" : "desc");
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
      <div className="grid gap-2 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.85)] px-4 py-3 md:grid-cols-[1.2fr_1fr_0.8fr_1fr]">
        <button className={sortButtonClassName} data-sortable="true" onClick={() => toggleSort("symbol")} type="button">
          Symbol
        </button>
        <button className={sortButtonClassName} data-sortable="true" onClick={() => toggleSort("market")} type="button">
          Market
        </button>
        <button className={sortButtonClassName} data-sortable="true" onClick={() => toggleSort("weight")} type="button">
          Weight
        </button>
        <button className={sortButtonClassName} data-sortable="true" onClick={() => toggleSort("unrealized_pnl")} type="button">
          Unrealized P&amp;L
        </button>
      </div>

      <div className="divide-y divide-[hsl(var(--border))]">
        {sortedHoldings.map((holding) => {
          const unrealizedPnl = holding.unrealized_pnl ?? 0;

          return (
            <article className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_1fr_0.9fr_0.9fr]" key={`${holding.market}:${holding.symbol}`}>
              <div>
                <div className="text-base font-semibold text-[hsl(var(--foreground))]">{holding.symbol}</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Opened {formatDateLabel(holding.entry_date)}</div>
              </div>
              <div className="flex items-center">
                <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  {getMarketLabel(holding.market)}
                </span>
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Weight</div>
                <div className="mt-2 text-base font-medium text-[hsl(var(--foreground))]">{formatPercent(holding.weight)}</div>
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Entry</div>
                <div className="mt-2 text-base font-medium text-[hsl(var(--foreground))]">{formatCurrency(holding.entry_price)}</div>
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Last</div>
                <div className="mt-2 text-base font-medium text-[hsl(var(--foreground))]">{formatCurrency(holding.current_price)}</div>
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Unrealized P&amp;L</div>
                <div className={cn("mt-2 text-base font-semibold", unrealizedPnl >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {formatCurrency(unrealizedPnl)}
                </div>
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Stop</div>
                <div className="mt-2 text-base font-medium text-[hsl(var(--foreground))]">{formatPercent(holding.stop_loss_pct)}</div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
