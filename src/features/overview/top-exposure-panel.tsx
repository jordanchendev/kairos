import type { HoldingResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { formatCompactCurrency, formatPercent, getMarketLabel } from "@/features/portfolio/portfolio-view-model";

function getRiskTag(holding: HoldingResponse) {
  if (holding.weight >= 0.25) {
    return "concentration";
  }

  if ((holding.unrealized_pnl ?? 0) < 0) {
    return "drawdown";
  }

  return "stable";
}

type TopExposurePanelProps = {
  holdings: HoldingResponse[];
};

export function TopExposurePanel({ holdings }: TopExposurePanelProps) {
  if (holdings.length === 0) {
    return (
      <PanelFrame description="No holdings are currently contributing exposure for this market scope." eyebrow="Risk Layer" title="Top Exposure">
        <EmptyState message="No live holdings are available." title="No exposure" />
      </PanelFrame>
    );
  }

  const topHoldings = [...holdings].sort((left, right) => right.weight - left.weight).slice(0, 5);

  return (
    <PanelFrame
      className="p-4 lg:p-5"
      description="Largest exposures ranked by portfolio weight, with a lightweight risk tag so concentration and drawdown issues stand out."
      eyebrow="Risk Layer"
      title="Top Exposure"
    >
      <div className="space-y-2">
        {topHoldings.map((holding) => {
          const riskTag = getRiskTag(holding);

          return (
            <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] px-3 py-2.5" key={`${holding.market}:${holding.symbol}`}>
              <div className="space-y-1">
                <div className="font-semibold text-[hsl(var(--foreground))]">{holding.symbol}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{getMarketLabel(holding.market)}</div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-[hsl(var(--foreground))]">{formatPercent(holding.weight)}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{formatCompactCurrency(holding.unrealized_pnl)}</div>
              </div>

              <div className="rounded-full border border-[hsl(var(--border))] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                {riskTag}
              </div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}
