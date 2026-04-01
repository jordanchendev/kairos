import type { HoldingResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";

import { formatCurrency, formatPercent, getMarketLabel } from "@/features/portfolio/portfolio-view-model";

type TopPositionsPanelProps = {
  holdings: HoldingResponse[];
};

export function TopPositionsPanel({ holdings }: TopPositionsPanelProps) {
  if (holdings.length === 0) {
    return (
      <PanelFrame description="No positions are available for the current portfolio scope." eyebrow="Portfolio" title="Top Positions">
        <EmptyState message="No live holdings are available." title="No positions" />
      </PanelFrame>
    );
  }

  const topHoldings = [...holdings].sort((left, right) => right.weight - left.weight).slice(0, 5);

  return (
    <PanelFrame description="Largest live holdings ranked by portfolio weight." eyebrow="Portfolio" title="Top Positions">
      <div className="space-y-3">
        {topHoldings.map((holding) => (
          <div className="flex items-center justify-between rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] px-4 py-3" key={`${holding.market}:${holding.symbol}`}>
            <div>
              <div className="font-semibold text-[hsl(var(--foreground))]">{holding.symbol}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">{getMarketLabel(holding.market)}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-[hsl(var(--foreground))]">{formatPercent(holding.weight)}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">{formatCurrency(holding.unrealized_pnl)}</div>
            </div>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}
