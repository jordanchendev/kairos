import { useQuery } from "@tanstack/react-query";

import {
  getAlertsApiRiskAlertsGetOptions,
  getHoldingsApiPortfolioHoldingsGetOptions,
  getPerformanceApiPortfolioPerformanceGetOptions,
  healthHealthGetOptions,
  listSignalsSignalsGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { normalizePoseidonHealth } from "@/features/infrastructure/infrastructure-model";
import { OverviewKpis } from "@/features/overview/overview-kpis";
import { RecentSignalsPanel } from "@/features/overview/recent-signals-panel";
import { TopPositionsPanel } from "@/features/overview/top-positions-panel";
import { filterNavCurveByTimeRange, getApiMarket } from "@/features/portfolio/portfolio-view-model";
import { PerformanceChart } from "@/features/portfolio/performance-chart";
import { useUiStore } from "@/stores/ui-store";

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
    ...listSignalsSignalsGetOptions({
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
  const navPoints = filterNavCurveByTimeRange(performanceQuery.data.nav_curve, selectedTimeRange);

  return (
    <section className="space-y-6" data-page-id="overview">
      <OverviewKpis
        alertsCount={alertsQuery.data?.alerts.length ?? 0}
        healthStatus={poseidonHealth.status}
        holdings={holdings}
        performance={performanceQuery.data}
        signalsCount={recentSignals.length}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <PanelFrame
          action={<StatusBadge label={poseidonHealth.status} status={poseidonHealth.status === "ok" ? "up" : "degraded"} />}
          description={`Market scope: ${selectedMarket}. The landing chart follows the global time range and the latest Poseidon healthHealthGet payload.`}
          eyebrow="Landing View"
          title="30-day NAV pulse"
        >
          <PerformanceChart points={navPoints} timeRangeLabel={selectedTimeRange} />
        </PanelFrame>

        <RecentSignalsPanel signals={recentSignals} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TopPositionsPanel holdings={holdings} />
        <PanelFrame
          action={<StatusBadge label={`${alertsQuery.data?.alerts.length ?? 0} live`} status={(alertsQuery.data?.alerts.length ?? 0) > 0 ? "degraded" : "idle"} />}
          description="Open Alerts stay visible on the landing page, but drilldown remains in the dedicated Alerts route."
          eyebrow="Risk Snapshot"
          title="Open Alerts"
        >
          <div className="space-y-3">
            {(alertsQuery.data?.alerts ?? []).slice(0, 5).map((alert) => (
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4" key={alert.id}>
                <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{alert.event_type}</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{JSON.stringify(alert.data)}</div>
              </div>
            ))}
          </div>
        </PanelFrame>
      </div>
    </section>
  );
}
