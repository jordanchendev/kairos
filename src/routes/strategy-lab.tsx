import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getStrategyApiStrategiesStrategyIdGetOptions,
  getStrategyPerformanceApiStrategiesStrategyIdPerformanceGetOptions,
  listBacktestsApiBacktestGetOptions,
  listStrategiesApiStrategiesGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import type { BacktestResponse, StrategyPerformanceResponse, StrategyResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import {
  RollingMetricsChart,
} from "@/features/strategy-lab/rolling-metrics-chart";
import {
  StrategyComparisonTable,
  type StrategyComparisonRow,
  type StrategySortKey,
} from "@/features/strategy-lab/strategy-comparison-table";
import { StrategyDetailPanel } from "@/features/strategy-lab/strategy-detail-panel";
import { getApiMarket } from "@/features/portfolio/portfolio-view-model";
import { isPoseidonNotFoundError } from "@/lib/api/poseidon-compat";
import { useUiStore } from "@/stores/ui-store";

function readMetricNumber(metrics: BacktestResponse["metrics"], keys: string[]) {
  if (!metrics) {
    return null;
  }

  for (const key of keys) {
    const value = metrics[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function deriveComparisonRows(strategies: StrategyResponse[], backtests: BacktestResponse[]): StrategyComparisonRow[] {
  const backtestsByStrategy = new Map<string, BacktestResponse[]>();

  for (const backtest of backtests) {
    if (!backtest.strategy_id) {
      continue;
    }

    const current = backtestsByStrategy.get(backtest.strategy_id) ?? [];
    current.push(backtest);
    backtestsByStrategy.set(backtest.strategy_id, current);
  }

  return strategies.map((strategy) => {
    const strategyBacktests = (backtestsByStrategy.get(strategy.id) ?? []).sort(
      (left, right) => new Date(right.completed_at ?? right.created_at).getTime() - new Date(left.completed_at ?? left.created_at).getTime(),
    );
    const latest = strategyBacktests[0] ?? null;

    return {
      backtestCount: strategyBacktests.length,
      latestSharpe: readMetricNumber(latest?.metrics ?? null, ["sharpe_ratio"]),
      latestTradeCount: readMetricNumber(latest?.metrics ?? null, ["trade_count", "total_trades"]),
      latestWinRate: readMetricNumber(latest?.metrics ?? null, ["win_rate"]),
      strategy,
      totalPnl: readMetricNumber(latest?.metrics ?? null, ["total_pnl", "total_realized_pnl", "net_profit"]),
    };
  });
}

function sortRows(rows: StrategyComparisonRow[], sortKey: StrategySortKey, sortDirection: "asc" | "desc") {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = left[sortKey] ?? Number.NEGATIVE_INFINITY;
    const rightValue = right[sortKey] ?? Number.NEGATIVE_INFINITY;

    if (leftValue === rightValue) {
      return left.strategy.name.localeCompare(right.strategy.name);
    }

    return leftValue > rightValue ? direction : -direction;
  });
}

export type StrategyLabPageProps = {
  comparisonRows: StrategyComparisonRow[];
  onSelectStrategy: (strategyId: string) => void;
  selectedBacktests: BacktestResponse[];
  selectedMarket: string;
  selectedPerformance: StrategyPerformanceResponse | null;
  selectedStrategy: StrategyResponse | null;
  selectedStrategyId: string | null;
  sortDirection: "asc" | "desc";
  sortKey: StrategySortKey;
  onSortChange?: (sortKey: StrategySortKey) => void;
};

export function StrategyLabPage({
  comparisonRows,
  onSelectStrategy,
  selectedBacktests,
  selectedMarket,
  selectedPerformance,
  selectedStrategy,
  selectedStrategyId,
  sortDirection,
  sortKey,
  onSortChange = () => {},
}: StrategyLabPageProps) {
  if (comparisonRows.length === 0) {
    return (
      <section className="space-y-6" data-page-id="strategy-lab">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Strategy Lab</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Comparison-first research surface for ranking practical strategy outcomes.
          </p>
        </div>

        <EmptyState message="No strategies match the current market scope yet." title="No strategies" />
      </section>
    );
  }

  if (!selectedStrategy) {
    return <ErrorState message="Strategy selection is missing detail context." />;
  }

  return (
    <section className="space-y-6" data-page-id="strategy-lab">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Strategy Lab</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Comparison-first strategy workspace with drill-down kept subordinate to ranking and selection. Global market scope: {selectedMarket}.
        </p>
      </div>

      <PanelFrame
        description="Sortable comparison table with row highlighting and click-driven selection, aligned with the shared data-dense Phase 31 language."
        eyebrow="Comparison Surface"
        title="Ranked Strategy Grid"
      >
        <StrategyComparisonTable
          onSelectStrategy={onSelectStrategy}
          onSortChange={onSortChange}
          rows={comparisonRows}
          selectedStrategyId={selectedStrategyId}
          sortDirection={sortDirection}
          sortKey={sortKey}
        />
      </PanelFrame>

      <StrategyDetailPanel performance={selectedPerformance} strategy={selectedStrategy} />

      <RollingMetricsChart backtests={selectedBacktests} strategyName={selectedStrategy.name} />
    </section>
  );
}

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const apiMarket = getApiMarket(selectedMarket);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<StrategySortKey>("latestSharpe");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const strategiesQuery = useQuery({
    ...listStrategiesApiStrategiesGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });
  const backtestsQuery = useQuery({
    ...listBacktestsApiBacktestGetOptions({
      query: {
        limit: 200,
      },
    }),
    ...getMonitoringQueryOptions("overview"),
  });

  const strategies = useMemo(
    () => (strategiesQuery.data ?? []).filter((strategy) => !apiMarket || strategy.market === apiMarket),
    [apiMarket, strategiesQuery.data],
  );
  const backtests = useMemo(
    () => (backtestsQuery.data ?? []).filter((backtest) => !apiMarket || backtest.market === apiMarket),
    [apiMarket, backtestsQuery.data],
  );
  const comparisonRows = useMemo(() => sortRows(deriveComparisonRows(strategies, backtests), sortKey, sortDirection), [
    backtests,
    sortDirection,
    sortKey,
    strategies,
  ]);
  const activeStrategyId =
    selectedStrategyId && comparisonRows.some((row) => row.strategy.id === selectedStrategyId)
      ? selectedStrategyId
      : comparisonRows[0]?.strategy.id ?? null;

  const selectedStrategyQuery = useQuery({
    ...(activeStrategyId
      ? getStrategyApiStrategiesStrategyIdGetOptions({
          path: {
            strategy_id: activeStrategyId,
          },
        })
      : getStrategyApiStrategiesStrategyIdGetOptions({
          path: {
            strategy_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("overview"),
    enabled: Boolean(activeStrategyId),
  });
  const selectedPerformanceQuery = useQuery({
    ...(activeStrategyId
      ? getStrategyPerformanceApiStrategiesStrategyIdPerformanceGetOptions({
          path: {
            strategy_id: activeStrategyId,
          },
        })
      : getStrategyPerformanceApiStrategiesStrategyIdPerformanceGetOptions({
          path: {
            strategy_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("overview"),
    enabled: Boolean(activeStrategyId),
  });

  const error =
    strategiesQuery.error ??
    backtestsQuery.error ??
    selectedStrategyQuery.error ??
    (isPoseidonNotFoundError(selectedPerformanceQuery.error) ? null : selectedPerformanceQuery.error);

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Strategy comparison data could not be loaded from Poseidon."} />;
  }

  if (strategiesQuery.isPending || backtestsQuery.isPending) {
    return <div className="panel-surface h-[34rem] animate-pulse rounded-[28px]" />;
  }

  const selectedStrategy =
    selectedStrategyQuery.data ?? comparisonRows.find((row) => row.strategy.id === activeStrategyId)?.strategy ?? null;
  const selectedBacktests = backtests
    .filter((backtest) => backtest.strategy_id === activeStrategyId)
    .sort((left, right) => new Date(left.completed_at ?? left.created_at).getTime() - new Date(right.completed_at ?? right.created_at).getTime());

  return (
    <StrategyLabPage
      comparisonRows={comparisonRows}
      onSelectStrategy={setSelectedStrategyId}
      onSortChange={(nextSortKey) => {
        if (nextSortKey === sortKey) {
          setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
          return;
        }

        setSortKey(nextSortKey);
        setSortDirection("desc");
      }}
      selectedBacktests={selectedBacktests}
      selectedMarket={selectedMarket}
      selectedPerformance={selectedPerformanceQuery.data ?? null}
      selectedStrategy={selectedStrategy}
      selectedStrategyId={activeStrategyId}
      sortDirection={sortDirection}
      sortKey={sortKey}
    />
  );
}
