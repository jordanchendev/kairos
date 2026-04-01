import type { HoldingResponse, PerformanceSummaryResponse } from "@/api/poseidon/types.gen";
import type { PoseidonHealth } from "@/features/infrastructure/infrastructure-model";
import { formatCompactCurrency, formatDateLabel, summarizeHoldings } from "@/features/portfolio/portfolio-view-model";

type OverviewStatusRailProps = {
  alertsCount: number;
  holdings: HoldingResponse[];
  performance: PerformanceSummaryResponse;
  poseidonHealth: PoseidonHealth;
  selectedMarket: string;
  selectedTimeRange: string;
  signalsCount: number;
};

type RailMetric = {
  detail: string;
  label: string;
  value: string;
};

function RailMetricCard({ detail, label, value }: RailMetric) {
  return (
    <article className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.74)] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">{label}</div>
      <div className="mt-1.5 text-base font-semibold text-[hsl(var(--foreground))]">{value}</div>
      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</div>
    </article>
  );
}

export function OverviewStatusRail({
  alertsCount,
  holdings,
  performance,
  poseidonHealth,
  selectedMarket,
  selectedTimeRange,
  signalsCount,
}: OverviewStatusRailProps) {
  const latestNav = performance.nav_curve.at(-1)?.total_nav ?? 0;
  const holdingsSummary = summarizeHoldings(holdings);
  const freshness = poseidonHealth.components.data_freshness.latest_ohlcv;

  const metrics: RailMetric[] = [
    {
      detail: `Window ${selectedTimeRange}`,
      label: "Market Scope",
      value: selectedMarket,
    },
    {
      detail: `${holdingsSummary.holdingsCount} active positions`,
      label: "Total NAV",
      value: formatCompactCurrency(latestNav),
    },
    {
      detail: `${holdingsSummary.winners}/${Math.max(holdingsSummary.holdingsCount, 1)} winners`,
      label: "Unrealized P&L",
      value: formatCompactCurrency(holdingsSummary.totalUnrealizedPnl),
    },
    {
      detail: `${performance.total_trades} realized trades`,
      label: "Signal Rate",
      value: `${signalsCount}`,
    },
    {
      detail: freshness ? `Latest OHLCV ${formatDateLabel(freshness)}` : "Freshness unknown",
      label: "Data Freshness",
      value: freshness ? "LIVE" : "STALE",
    },
    {
      detail: alertsCount > 0 ? `${alertsCount} require action` : "No blocking incidents",
      label: "System Health",
      value: poseidonHealth.status.toUpperCase(),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Command Layer</div>
        <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Status Rail</h2>
        <p className="text-sm leading-5 text-[hsl(var(--muted-foreground))]">
          Cross-market operator context compressed into a single scan line before you drop into charts, risk, or queue work.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <RailMetricCard detail={metric.detail} key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </section>
  );
}
