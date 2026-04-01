import type { PerpHoldingResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { cn } from "@/lib/cn";

import type { PerpHoldingsSummary } from "./portfolio-view-model";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  getLiquidationTone,
} from "./portfolio-view-model";

type PerpHoldingsTableProps = {
  holdings: PerpHoldingResponse[];
  summary: PerpHoldingsSummary;
};

const riskToneClassName = {
  danger: "border-rose-500/25 bg-rose-500/8",
  neutral: "border-transparent bg-transparent",
  warning: "border-amber-500/20 bg-amber-500/7",
} as const;

export function PerpHoldingsTable({ holdings, summary }: PerpHoldingsTableProps) {
  if (holdings.length === 0) {
    return <EmptyState message="No live perpetual positions are active for the current filter." title="No perp exposure in scope" />;
  }

  const sortedHoldings = [...holdings].sort((left, right) => right.margin_ratio - left.margin_ratio);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Aggregate Exposure</div>
          <div className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">{formatCompactCurrency(summary.aggregateNotional)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Funding Cost</div>
          <div className={cn("mt-2 text-xl font-semibold", summary.totalFundingCost <= 0 ? "text-emerald-300" : "text-amber-200")}>
            {formatCurrency(summary.totalFundingCost)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">High-Risk Rows</div>
          <div className={cn("mt-2 text-xl font-semibold", summary.highRiskCount > 0 ? "text-rose-300" : "text-[hsl(var(--foreground))]")}>
            {summary.highRiskCount}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
        <div className="hidden grid-cols-[1.1fr_0.6fr_0.7fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-4 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.85)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] lg:grid">
          <span>Symbol</span>
          <span>Side</span>
          <span>Leverage</span>
          <span>Notional</span>
          <span>Margin Ratio</span>
          <span>Liquidation</span>
          <span>Funding Cost</span>
          <span>Unrealized P&amp;L</span>
        </div>

        <div className="divide-y divide-[hsl(var(--border))]">
          {sortedHoldings.map((holding) => {
            const tone = getLiquidationTone(holding);
            const notional = Math.abs(holding.quantity * (holding.current_price ?? holding.entry_price));

            return (
              <article
                className={cn("grid gap-4 border-l-2 px-4 py-4 lg:grid-cols-[1.1fr_0.6fr_0.7fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr]", riskToneClassName[tone])}
                data-risk={tone}
                key={holding.symbol}
              >
                <div>
                  <div className="text-base font-semibold text-[hsl(var(--foreground))]">{holding.symbol}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{formatNumber(holding.quantity)} contracts</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Side</div>
                  <div className={cn("mt-1 inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]", holding.side === "long" ? "bg-emerald-500/12 text-emerald-200" : "bg-rose-500/12 text-rose-200")}>
                    {holding.side}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Leverage</div>
                  <div className="mt-1 text-base font-medium text-[hsl(var(--foreground))]">{formatNumber(holding.leverage)}x</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Notional</div>
                  <div className="mt-1 text-base font-medium text-[hsl(var(--foreground))]">{formatCompactCurrency(notional)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Margin Ratio</div>
                  <div className={cn("mt-1 text-base font-semibold", tone === "danger" ? "text-rose-300" : tone === "warning" ? "text-amber-200" : "text-[hsl(var(--foreground))]")}>
                    {formatPercent(holding.margin_ratio)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Liquidation</div>
                  <div className="mt-1 text-base font-medium text-[hsl(var(--foreground))]">{formatCurrency(holding.liquidation_price)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Funding Cost</div>
                  <div className={cn("mt-1 text-base font-medium", holding.cumulative_funding_cost <= 0 ? "text-emerald-300" : "text-amber-200")}>
                    {formatCurrency(holding.cumulative_funding_cost)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Unrealized P&amp;L</div>
                  <div className={cn("mt-1 text-base font-semibold", holding.unrealized_pnl >= 0 ? "text-emerald-300" : "text-rose-300")}>
                    {formatCurrency(holding.unrealized_pnl)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
