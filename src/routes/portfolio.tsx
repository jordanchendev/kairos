import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import {
  getHoldingsApiPortfolioHoldingsGetOptions,
  getPerformanceApiPortfolioPerformanceGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { HoldingsTable } from "@/features/portfolio/holdings-table";
import { PerformanceChart } from "@/features/portfolio/performance-chart";
import { PortfolioMetrics } from "@/features/portfolio/portfolio-metrics";
import {
  filterNavCurveByTimeRange,
  formatCompactCurrency,
  formatPercent,
  getApiMarket,
  summarizeHoldings,
} from "@/features/portfolio/portfolio-view-model";
import { useUiStore } from "@/stores/ui-store";

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const selectedTimeRange = useUiStore((state) => state.selectedTimeRange);
  const apiMarket = getApiMarket(selectedMarket);

  const performanceQuery = useQuery({
    ...getPerformanceApiPortfolioPerformanceGetOptions(apiMarket ? { query: { market: apiMarket } } : undefined),
    ...getMonitoringQueryOptions("portfolio"),
  });
  const holdingsQuery = useQuery({
    ...getHoldingsApiPortfolioHoldingsGetOptions(),
    ...getMonitoringQueryOptions("portfolio"),
  });

  const refreshAll = () => {
    void performanceQuery.refetch();
    void holdingsQuery.refetch();
  };

  const error = performanceQuery.error ?? holdingsQuery.error;

  if (error) {
    return (
      <ErrorState
        action={
          <Button className="gap-2" onClick={refreshAll} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        }
        message={error instanceof Error ? error.message : "Poseidon did not return portfolio monitoring data."}
      />
    );
  }

  if (performanceQuery.isPending || holdingsQuery.isPending) {
    return (
      <section className="space-y-6" data-page-id="portfolio">
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="panel-surface h-36 animate-pulse rounded-[24px]" key={index} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="panel-surface h-[26rem] animate-pulse rounded-[28px]" />
          <div className="panel-surface h-[26rem] animate-pulse rounded-[28px]" />
        </div>
      </section>
    );
  }

  if (!performanceQuery.data) {
    return <EmptyState message="Portfolio performance data is not available yet." title="No portfolio performance" />;
  }

  const filteredHoldings = (holdingsQuery.data?.holdings ?? []).filter((holding) => !apiMarket || holding.market === apiMarket);
  const holdingsSummary = summarizeHoldings(filteredHoldings);
  const visibleNavCurve = filterNavCurveByTimeRange(performanceQuery.data.nav_curve, selectedTimeRange);

  return (
    <section className="space-y-6" data-page-id="portfolio">
      <PortfolioMetrics holdingsSummary={holdingsSummary} performance={performanceQuery.data} />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <PanelFrame
          action={<StatusBadge label={selectedTimeRange} status="up" />}
          description={`Market filter is ${selectedMarket}. Performance query is ${apiMarket ? "market-scoped" : "cross-market"} and charted over the selected window.`}
          eyebrow="Performance Surface"
          title="NAV history"
        >
          <PerformanceChart points={visibleNavCurve} timeRangeLabel={selectedTimeRange} />
        </PanelFrame>

        <PanelFrame
          action={
            <Button className="gap-2" onClick={refreshAll} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          }
          description="Realized context comes from the same Poseidon performance payload; holdings stay filtered client-side when the API does not expose market slicing."
          eyebrow="Operator Context"
          title="Execution posture"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.74)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Realized P&amp;L</div>
              <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {formatCompactCurrency(performanceQuery.data.total_realized_pnl)}
              </div>
              <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{performanceQuery.data.total_trades} realized trades in this sample.</div>
            </div>
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.74)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Live Weight</div>
              <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatPercent(holdingsSummary.totalWeight)}</div>
              <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                {holdingsSummary.holdingsCount} holdings remain visible after the current market filter.
              </div>
            </div>
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.74)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Holdings Value</div>
              <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {formatCompactCurrency(visibleNavCurve.at(-1)?.holdings_value)}
              </div>
              <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Latest marked holdings value from the NAV curve.</div>
            </div>
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.74)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Cash Buffer</div>
              <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatCompactCurrency(visibleNavCurve.at(-1)?.cash)}</div>
              <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Latest cash balance carried in the same window.</div>
            </div>
          </div>
        </PanelFrame>
      </div>

      <PanelFrame
        action={<StatusBadge label={`${filteredHoldings.length} live rows`} status="up" />}
        description="Sortable table of live holdings with market labels, entry marks, and unrealized P&L."
        eyebrow="Current Inventory"
        title="Open holdings"
      >
        <HoldingsTable holdings={filteredHoldings} />
      </PanelFrame>
    </section>
  );
}
