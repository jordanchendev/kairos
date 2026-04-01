import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { getPerpHoldingsApiPortfolioPerpHoldingsGetOptions } from "@/api/poseidon/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { PerpHoldingsTable } from "@/features/portfolio/perp-holdings-table";
import { formatCompactCurrency, getApiMarket, summarizePerpHoldings } from "@/features/portfolio/portfolio-view-model";
import { useUiStore } from "@/stores/ui-store";

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const apiMarket = getApiMarket(selectedMarket);
  const incompatibleMarket = Boolean(apiMarket && apiMarket !== "crypto_perp");

  const perpQuery = useQuery({
    ...getPerpHoldingsApiPortfolioPerpHoldingsGetOptions(),
    ...getMonitoringQueryOptions("positions"),
  });

  const refresh = () => {
    void perpQuery.refetch();
  };

  if (incompatibleMarket) {
    return (
      <EmptyState
        message="Perp monitoring only applies when the global market filter is All Markets or Crypto Perps."
        title="Perp view hidden by market filter"
      />
    );
  }

  if (perpQuery.error) {
    return (
      <ErrorState
        action={
          <Button className="gap-2" onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        }
        message={perpQuery.error instanceof Error ? perpQuery.error.message : "Poseidon did not return perpetual positions."}
      />
    );
  }

  if (perpQuery.isPending) {
    return (
      <section className="space-y-6" data-page-id="perp-positions">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="panel-surface h-36 animate-pulse rounded-[24px]" key={index} />
          ))}
        </div>
        <div className="panel-surface h-[28rem] animate-pulse rounded-[28px]" />
      </section>
    );
  }

  const holdings = perpQuery.data?.holdings ?? [];
  const summary = summarizePerpHoldings(holdings);

  return (
    <section className="space-y-6" data-page-id="perp-positions">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          delta={`${summary.highRiskCount} rows near liquidation`}
          deltaTone={summary.highRiskCount > 0 ? "danger" : "neutral"}
          detail="Aggregate perp notional across live positions"
          label="Notional Exposure"
          value={formatCompactCurrency(summary.aggregateNotional)}
        />
        <MetricCard
          delta={formatCompactCurrency(summary.totalUnrealizedPnl)}
          deltaTone={summary.totalUnrealizedPnl >= 0 ? "positive" : "danger"}
          detail="Marked from current perp prices"
          label="Unrealized P&L"
          value={formatCompactCurrency(summary.totalUnrealizedPnl)}
        />
        <MetricCard
          delta={formatCompactCurrency(summary.totalFundingCost)}
          deltaTone={summary.totalFundingCost <= 0 ? "positive" : "warning"}
          detail="Cumulative funding cost across open positions"
          label="Funding Cost"
          value={formatCompactCurrency(summary.totalFundingCost)}
        />
        <MetricCard
          detail={`${holdings.length} active positions in scope`}
          label="High-Risk Count"
          value={summary.highRiskCount}
        />
      </div>

      <PanelFrame
        action={
          <div className="flex items-center gap-3">
            <StatusBadge label={selectedMarket} status={summary.highRiskCount > 0 ? "degraded" : "up"} />
            <Button className="gap-2" onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
        description="Margin ratio, liquidation price, leverage, and funding cost stay visible without turning this view into an order entry surface."
        eyebrow="Perp Risk Posture"
        title="Current perpetual positions"
      >
        <PerpHoldingsTable holdings={holdings} summary={summary} />
      </PanelFrame>
    </section>
  );
}
