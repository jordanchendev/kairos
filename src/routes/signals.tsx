import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import {
  getSignalSignalsSignalIdGetOptions,
  listSignalsSignalsGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { SignalDrawer } from "@/features/signals/signal-drawer";
import { SignalFilters } from "@/features/signals/signal-filters";
import { filterSignals, getSignalStrategyValue, type SignalDateRange } from "@/features/signals/signals-model";
import { SignalsTable } from "@/features/signals/signals-table";
import { useUiStore } from "@/stores/ui-store";

import { getApiMarket } from "@/features/portfolio/portfolio-view-model";

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const apiMarket = getApiMarket(selectedMarket);
  const [strategy, setStrategy] = useState("all");
  const [market, setMarket] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<SignalDateRange>("7D");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  const signalsQuery = useQuery({
    ...listSignalsSignalsGetOptions({
      query: {
        limit: 120,
        market: apiMarket,
      },
    }),
    ...getMonitoringQueryOptions("signals"),
  });

  const baseSignals = signalsQuery.data ?? [];
  const marketOptions = ["all", ...new Set(baseSignals.map((signal) => signal.market))];
  const strategyOptions = ["all", ...new Set(baseSignals.map(getSignalStrategyValue))];
  const effectiveMarketFilter = market === "all" ? apiMarket ?? "all" : market;
  const filteredSignals = filterSignals(
    baseSignals,
    {
      dateRange,
      market: effectiveMarketFilter,
      status,
      strategy,
    },
    new Date(),
  );
  const activeSignalId = selectedSignalId ?? filteredSignals[0]?.id ?? null;

  const signalDetailQuery = useQuery({
    ...(activeSignalId
      ? getSignalSignalsSignalIdGetOptions({
          path: {
            signal_id: activeSignalId,
          },
        })
      : getSignalSignalsSignalIdGetOptions({
          path: {
            signal_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("signals"),
    enabled: Boolean(activeSignalId),
  });

  const refresh = () => {
    void signalsQuery.refetch();
    if (activeSignalId) {
      void signalDetailQuery.refetch();
    }
  };

  if (signalsQuery.error) {
    return (
      <ErrorState
        action={
          <Button className="gap-2" onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        }
        message={signalsQuery.error instanceof Error ? signalsQuery.error.message : "Signals could not be loaded from Poseidon."}
      />
    );
  }

  if (signalsQuery.isPending) {
    return <div className="panel-surface h-[32rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <section className="space-y-6" data-page-id="signals">
      <SignalFilters
        dateRange={dateRange}
        market={market}
        marketOptions={marketOptions}
        onDateRangeChange={setDateRange}
        onMarketChange={setMarket}
        onStatusChange={setStatus}
        onStrategyChange={setStrategy}
        status={status}
        strategy={strategy}
        strategyOptions={strategyOptions}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <PanelFrame
          action={
            <div className="flex items-center gap-3">
              <StatusBadge label={`${filteredSignals.length} visible`} status="up" />
              <Button className="gap-2" onClick={refresh} variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          }
          description={`Global market scope: ${selectedMarket}. Route-local filters add strategy, market, status, and date range refinement on top.`}
          eyebrow="Signal History"
          title="Live signal stream"
        >
          <SignalsTable onSelectSignal={setSelectedSignalId} selectedSignalId={activeSignalId} signals={filteredSignals} />
        </PanelFrame>

        <SignalDrawer isLoading={signalDetailQuery.isFetching && !signalDetailQuery.data} signal={signalDetailQuery.data ?? null} />
      </div>

      <div className="panel-surface rounded-[24px] p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Scope</div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-[hsl(var(--foreground))]">
          <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1">strategy: {strategy}</span>
          <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1">market: {effectiveMarketFilter === "all" ? "all" : getMarketLabel(effectiveMarketFilter)}</span>
          <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1">status: {status}</span>
          <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1">date range: {dateRange}</span>
        </div>
      </div>
    </section>
  );
}
