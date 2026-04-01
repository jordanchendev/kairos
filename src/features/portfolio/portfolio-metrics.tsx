import { Activity, ArrowUpRight, BriefcaseBusiness, Scale, Wallet } from "lucide-react";

import type { PerformanceSummaryResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";

import type { HoldingsSummary } from "./portfolio-view-model";
import { formatCompactCurrency, formatPercent, formatRatio } from "./portfolio-view-model";

type PortfolioMetricsProps = {
  holdingsSummary: HoldingsSummary;
  performance: PerformanceSummaryResponse;
};

export function PortfolioMetrics({ holdingsSummary, performance }: PortfolioMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
      <MetricCard
        delta={formatPercent(performance.total_return_pct, true)}
        deltaTone={performance.total_return_pct >= 0 ? "positive" : "danger"}
        detail={`${holdingsSummary.winners}/${holdingsSummary.holdingsCount || 0} positions in the green`}
        icon={<ArrowUpRight className="h-5 w-5" />}
        label="Total Return"
        value={formatPercent(performance.total_return_pct)}
      />
      <MetricCard
        detail={`${performance.total_trades} realized trades in sample`}
        icon={<Scale className="h-5 w-5" />}
        label="Sharpe Ratio"
        value={formatRatio(performance.sharpe_ratio)}
      />
      <MetricCard
        delta={formatPercent(performance.max_drawdown_pct, true)}
        deltaTone={performance.max_drawdown_pct <= -0.08 ? "danger" : "warning"}
        detail="Peak-to-trough drawdown in selected surface"
        icon={<Activity className="h-5 w-5" />}
        label="Max Drawdown"
        value={formatPercent(performance.max_drawdown_pct)}
      />
      <MetricCard
        detail={`${formatPercent(holdingsSummary.totalWeight)} deployed across live holdings`}
        icon={<BriefcaseBusiness className="h-5 w-5" />}
        label="Active Holdings"
        value={holdingsSummary.holdingsCount}
      />
      <MetricCard
        delta={formatCompactCurrency(holdingsSummary.totalUnrealizedPnl)}
        deltaTone={holdingsSummary.totalUnrealizedPnl >= 0 ? "positive" : "danger"}
        detail={`${performance.total_trades} closed trades contributing`}
        icon={<Wallet className="h-5 w-5" />}
        label="Realized P&L"
        value={formatCompactCurrency(performance.total_realized_pnl)}
      />
    </div>
  );
}
