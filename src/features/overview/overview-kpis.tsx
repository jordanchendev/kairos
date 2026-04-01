import type { HoldingResponse, PerformanceSummaryResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";

import { formatCompactCurrency, formatPercent } from "@/features/portfolio/portfolio-view-model";

type OverviewKpisProps = {
  alertsCount: number;
  healthStatus: string;
  holdings: HoldingResponse[];
  performance: PerformanceSummaryResponse;
  signalsCount: number;
};

export function OverviewKpis({ alertsCount, healthStatus, holdings, performance, signalsCount }: OverviewKpisProps) {
  const latestNav = performance.nav_curve.at(-1)?.total_nav ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
      <MetricCard detail={formatPercent(performance.total_return_pct, true)} label="Total NAV" value={formatCompactCurrency(latestNav)} />
      <MetricCard detail={`${holdings.length} current holdings`} label="Active Positions" value={holdings.length} />
      <MetricCard detail={`${performance.total_trades} signals realized to trades`} label="Recent Signals" value={signalsCount} />
      <MetricCard delta={alertsCount > 0 ? `${alertsCount} need attention` : "No live alerts"} deltaTone={alertsCount > 0 ? "warning" : "positive"} label="Open Alerts" value={alertsCount} />
      <MetricCard delta={healthStatus.toUpperCase()} deltaTone={healthStatus === "ok" ? "positive" : "warning"} label="System Health" value={healthStatus.toUpperCase()} />
    </div>
  );
}
