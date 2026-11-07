import { useQuery } from "@tanstack/react-query";

import {
  getAlertsApiRiskAlertsGetOptions,
  getHoldingsApiPortfolioHoldingsGetOptions,
  getPerformanceApiPortfolioPerformanceGetOptions,
  healthHealthGetOptions,
  listSignalsApiSignalsGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import type { AlertsResponse, HoldingResponse, PerformanceSummaryResponse, SignalResponse } from "@/api/poseidon/types.gen";
import { ErrorState } from "@/features/monitoring/error-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { normalizePoseidonHealth, type PoseidonHealth } from "@/features/infrastructure/infrastructure-model";
import { OverviewAttentionQueue } from "@/features/overview/overview-attention-queue";
import { RecentActivityPanel } from "@/features/overview/recent-activity-panel";
import { OverviewStatusRail } from "@/features/overview/overview-status-rail";
import { TopExposurePanel } from "@/features/overview/top-exposure-panel";
import { filterNavCurveByTimeRange, formatCompactCurrency, formatPercent, getApiMarket, summarizeHoldings } from "@/features/portfolio/portfolio-view-model";
import { PerformanceChart } from "@/features/portfolio/performance-chart";
import { useUiStore } from "@/stores/ui-store";

type OverviewPageProps = {
  alerts: AlertsResponse;
  holdings: HoldingResponse[];
  performance: PerformanceSummaryResponse;
  poseidonHealth: PoseidonHealth;
  selectedMarket: string;
  selectedTimeRange: string;
  signals: SignalResponse[];
};

export function OverviewPage({
  alerts,
  holdings,
  performance,
  poseidonHealth,
  selectedMarket,
  selectedTimeRange,
  signals,
}: OverviewPageProps) {
  const navPoints = filterNavCurveByTimeRange(performance.nav_curve, selectedTimeRange as "1D" | "1W" | "1M" | "1Q" | "YTD");
  const holdingsSummary = summarizeHoldings(holdings);
  const latestNav = performance.nav_curve.at(-1)?.total_nav ?? 0;
  const netExposure = holdings.reduce((total, holding) => total + holding.weight, 0);

  return (
    <section className="space-y-4" data-page-id="overview">
      <OverviewStatusRail
        alertsCount={alerts.alerts.length}
        holdings={holdings}
        performance={performance}
        poseidonHealth={poseidonHealth}
        selectedMarket={selectedMarket}
        selectedTimeRange={selectedTimeRange}
        signalsCount={signals.length}
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
        <PanelFrame
          className="p-4 lg:p-5"
          action={<StatusBadge label={poseidonHealth.status} status={poseidonHealth.status === "ok" ? "up" : "degraded"} />}
          description={`Primary portfolio pulse for ${selectedMarket}. This is the visual anchor; everything else on the page is subordinate to action triage.`}
          eyebrow="Portfolio Core"
          title="Portfolio Pulse"
        >
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
            <PerformanceChart points={navPoints} timeRangeLabel={selectedTimeRange} />

            <div className="grid gap-3">
              <MetricCard className="p-3 lg:p-4" detail={`${holdingsSummary.holdingsCount} positions in scope`} label="Net Exposure" value={formatPercent(netExposure)} />
              <MetricCard className="p-3 lg:p-4" detail={`${performance.total_trades} realized trades`} label="Realized P&L" value={formatCompactCurrency(performance.total_realized_pnl)} />
              <MetricCard className="p-3 lg:p-4" detail={`${signals.length} fresh signals feeding operator flow`} label="Drawdown" value={formatPercent(performance.max_drawdown_pct)} />
              <MetricCard className="p-3 lg:p-4" detail={`${poseidonHealth.components.celery.active_tasks} active / ${poseidonHealth.components.celery.reserved_tasks} reserved`} label="Latest NAV" value={formatCompactCurrency(latestNav)} />
            </div>
          </div>
        </PanelFrame>

        <OverviewAttentionQueue alerts={alerts} poseidonHealth={poseidonHealth} signals={signals} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <TopExposurePanel holdings={holdings} />
        <RecentActivityPanel alerts={alerts} signals={signals} />
      </div>
    </section>
  );
}

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const selectedTimeRange = useUiStore((state) => state.selectedTimeRange);
  const apiMarket = getApiMarket(selectedMarket);

  const performanceQuery = useQuery({
    ...getPerformanceApiPortfolioPerformanceGetOptions(apiMarket ? { query: { market: apiMarket } } : undefined),
    ...getMonitoringQueryOptions("overview"),
  });
  const holdingsQuery = useQuery({
    ...getHoldingsApiPortfolioHoldingsGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });
  const signalsQuery = useQuery({
    ...listSignalsApiSignalsGetOptions({
      query: {
        limit: 6,
        market: apiMarket,
      },
    }),
    ...getMonitoringQueryOptions("overview"),
  });
  const alertsQuery = useQuery({
    ...getAlertsApiRiskAlertsGetOptions({
      query: {
        limit: 20,
      },
    }),
    ...getMonitoringQueryOptions("alerts"),
  });
  const healthQuery = useQuery({
    ...healthHealthGetOptions(),
    ...getMonitoringQueryOptions("infrastructure"),
  });

  const error = performanceQuery.error ?? holdingsQuery.error ?? signalsQuery.error ?? alertsQuery.error ?? healthQuery.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Overview monitoring data could not be loaded."} />;
  }

  if (performanceQuery.isPending || holdingsQuery.isPending || signalsQuery.isPending || alertsQuery.isPending || healthQuery.isPending) {
    return <div className="panel-surface h-[34rem] animate-pulse rounded-[28px]" />;
  }

  if (!performanceQuery.data) {
    return <ErrorState message="Overview is missing portfolio performance data." />;
  }

  const holdings = (holdingsQuery.data?.holdings ?? []).filter((holding) => !apiMarket || holding.market === apiMarket);
  const recentSignals = signalsQuery.data ?? [];
  const poseidonHealth = normalizePoseidonHealth(healthQuery.data);

  return (
    <OverviewPage
      alerts={alertsQuery.data ?? { alerts: [], total: 0 }}
      holdings={holdings}
      performance={performanceQuery.data}
      poseidonHealth={poseidonHealth}
      selectedMarket={selectedMarket}
      selectedTimeRange={selectedTimeRange}
      signals={recentSignals}
    />
  );
}
