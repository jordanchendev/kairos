import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getBacktestApiBacktestBacktestIdGetOptions,
  getBacktestEquityCurveApiBacktestBacktestIdEquityCurveGetOptions,
  getBacktestTradesApiBacktestBacktestIdTradesGetOptions,
  listBacktestsApiBacktestGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import type { BacktestEquityResponse, BacktestResponse, BacktestTradeResponse } from "@/api/poseidon/types.gen";
import { BacktestChartPanel } from "@/features/backtesting/backtest-chart-panel";
import { BacktestDetailPanel } from "@/features/backtesting/backtest-detail-panel";
import { BacktestSelector } from "@/features/backtesting/backtest-selector";
import { BacktestSummary } from "@/features/backtesting/backtest-summary";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { getApiMarket } from "@/features/portfolio/portfolio-view-model";
import { useUiStore } from "@/stores/ui-store";

type BacktestingPageProps = {
  backtests: BacktestResponse[];
  detail: BacktestResponse | null;
  equityCurve: BacktestEquityResponse | null;
  onSelectBacktest?: (backtestId: string) => void;
  selectedBacktestId: string | null;
  selectedMarket: string;
  trades: BacktestTradeResponse[];
};

export function BacktestingPage({
  backtests,
  detail,
  equityCurve,
  onSelectBacktest = () => {},
  selectedBacktestId,
  selectedMarket,
  trades,
}: BacktestingPageProps) {
  if (backtests.length === 0) {
    return (
      <section className="space-y-6" data-page-id="backtesting">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Backtesting</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Selection, equity review, and walk-forward drill-down stay in one dense workspace.
          </p>
        </div>

        <EmptyState
          message="Poseidon has not produced any completed backtest runs yet."
          title="No backtests"
        />
      </section>
    );
  }

  const activeBacktest = detail ?? backtests.find((backtest) => backtest.id === selectedBacktestId) ?? backtests[0];

  return (
    <section className="space-y-6" data-page-id="backtesting">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Backtesting</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Data-dense review for completed runs, with selection and drill-down contained in a single route. Global market scope: {selectedMarket}.
          </p>
        </div>
        <StatusBadge label={`${backtests.length} runs`} status="up" />
      </div>

      <BacktestSummary backtest={activeBacktest} tradesCount={trades.length} />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <PanelFrame
          description="Click into a run to keep the page focused while rotating between completed and failed backtests."
          eyebrow="Run Selector"
          title="Backtest Catalog"
        >
          <BacktestSelector backtests={backtests} onSelectBacktest={onSelectBacktest} selectedBacktestId={activeBacktest.id} />
        </PanelFrame>

        <BacktestDetailPanel backtest={activeBacktest} trades={trades} />
      </div>

      <BacktestChartPanel backtest={activeBacktest} equityCurve={equityCurve} trades={trades} />
    </section>
  );
}

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const apiMarket = getApiMarket(selectedMarket);
  const [selectedBacktestId, setSelectedBacktestId] = useState<string | null>(null);

  const backtestsQuery = useQuery({
    ...listBacktestsApiBacktestGetOptions({
      query: {
        limit: 80,
      },
    }),
    ...getMonitoringQueryOptions("overview"),
  });

  const backtests = useMemo(
    () => (backtestsQuery.data ?? []).filter((backtest) => !apiMarket || backtest.market === apiMarket),
    [apiMarket, backtestsQuery.data],
  );
  const activeBacktestId =
    selectedBacktestId && backtests.some((backtest) => backtest.id === selectedBacktestId)
      ? selectedBacktestId
      : backtests[0]?.id ?? null;

  const detailQuery = useQuery({
    ...(activeBacktestId
      ? getBacktestApiBacktestBacktestIdGetOptions({
          path: {
            backtest_id: activeBacktestId,
          },
        })
      : getBacktestApiBacktestBacktestIdGetOptions({
          path: {
            backtest_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("overview"),
    enabled: Boolean(activeBacktestId),
  });

  const tradesQuery = useQuery({
    ...(activeBacktestId
      ? getBacktestTradesApiBacktestBacktestIdTradesGetOptions({
          path: {
            backtest_id: activeBacktestId,
          },
        })
      : getBacktestTradesApiBacktestBacktestIdTradesGetOptions({
          path: {
            backtest_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("overview"),
    enabled: Boolean(activeBacktestId),
  });

  const equityCurveQuery = useQuery({
    ...(activeBacktestId
      ? getBacktestEquityCurveApiBacktestBacktestIdEquityCurveGetOptions({
          path: {
            backtest_id: activeBacktestId,
          },
        })
      : getBacktestEquityCurveApiBacktestBacktestIdEquityCurveGetOptions({
          path: {
            backtest_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("overview"),
    enabled: Boolean(activeBacktestId),
  });

  const error = backtestsQuery.error ?? detailQuery.error ?? tradesQuery.error ?? equityCurveQuery.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Backtesting data could not be loaded from Poseidon."} />;
  }

  if (backtestsQuery.isPending) {
    return <div className="panel-surface h-[34rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <BacktestingPage
      backtests={backtests}
      detail={detailQuery.data ?? backtests.find((backtest) => backtest.id === activeBacktestId) ?? null}
      equityCurve={equityCurveQuery.data ?? null}
      onSelectBacktest={setSelectedBacktestId}
      selectedBacktestId={activeBacktestId}
      selectedMarket={selectedMarket}
      trades={tradesQuery.data ?? []}
    />
  );
}
