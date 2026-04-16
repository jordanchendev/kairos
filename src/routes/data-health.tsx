import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getCoverageApiV1CoverageGetOptions,
  getFreshnessApiV1FreshnessGetOptions,
  getGapsApiV1GapsGetOptions,
} from "@/api/thalassa/@tanstack/react-query.gen";
import type {
  DataCoverageResponse,
  DataFreshnessResponse,
  DataGapResponse,
} from "@/api/thalassa/types.gen";
import { CoverageMatrix } from "@/features/data-health/coverage-matrix";
import { FilterBar } from "@/features/data-health/filter-bar";
import { FreshnessPanel } from "@/features/data-health/freshness-panel";
import { GapHeatmap } from "@/features/data-health/gap-heatmap";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";

type DataHealthPageProps = {
  freshness: DataFreshnessResponse[];
  coverage: DataCoverageResponse[];
  gaps: DataGapResponse[];
  marketFilter: string | null;
  intervalFilter: string | null;
  onlyNonGreen: boolean;
  onMarketChange: (value: string | null) => void;
  onIntervalChange: (value: string | null) => void;
  onOnlyNonGreenChange: (value: boolean) => void;
};

export function DataHealthPage({
  freshness,
  coverage,
  gaps,
  marketFilter,
  intervalFilter,
  onlyNonGreen,
  onMarketChange,
  onIntervalChange,
  onOnlyNonGreenChange,
}: DataHealthPageProps) {
  const empty =
    freshness.length === 0 && coverage.length === 0 && gaps.length === 0;

  return (
    <section className="space-y-6" data-page-id="data-health">
      <PageHeader />
      <FilterBar
        intervalFilter={intervalFilter}
        marketFilter={marketFilter}
        onIntervalChange={onIntervalChange}
        onlyNonGreen={onlyNonGreen}
        onMarketChange={onMarketChange}
        onOnlyNonGreenChange={onOnlyNonGreenChange}
      />
      {empty ? (
        <EmptyState
          message="Thalassa has not published freshness, coverage, or gap telemetry yet. Wait for the next data_gap_audit / ingest_freshness_watchdog beat tick or relax your filter."
          title="No data health telemetry"
        />
      ) : (
        <>
          <FreshnessPanel onlyNonGreen={onlyNonGreen} records={freshness} />
          <CoverageMatrix onlyNonGreen={onlyNonGreen} rows={coverage} />
          <GapHeatmap gaps={gaps} onlyNonGreen={onlyNonGreen} />
        </>
      )}
    </section>
  );
}

function PageHeader() {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
        Risk Route &middot; Phase 40
      </div>
      <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">
        Data Health
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        Freshness vs SLA, coverage matrix, and detected gap windows. Top to
        bottom in urgency order &mdash; the freshness panel answers &ldquo;is anything
        on fire?&rdquo;, coverage answers &ldquo;what history do we have?&rdquo;, and the
        heatmap answers &ldquo;what windows are missing?&rdquo;. Use the filter bar to
        scope to a single market or interval, or hide green rows during
        incident triage.
      </p>
    </div>
  );
}

export function Component() {
  const [marketFilter, setMarketFilter] = useState<string | null>(null);
  const [intervalFilter, setIntervalFilter] = useState<string | null>(null);
  const [onlyNonGreen, setOnlyNonGreen] = useState<boolean>(false);

  // Thread market+interval into the generated hooks as server-side query params.
  // Note: undefined (not null) so hey-api drops the param entirely when "All" is selected.
  const queryParams = {
    market: marketFilter ?? undefined,
    interval: intervalFilter ?? undefined,
  };

  const freshnessQuery = useQuery({
    ...getFreshnessApiV1FreshnessGetOptions({ query: queryParams }),
    ...getMonitoringQueryOptions("overview"),
  });
  const coverageQuery = useQuery({
    ...getCoverageApiV1CoverageGetOptions({ query: queryParams }),
    ...getMonitoringQueryOptions("overview"),
  });
  const gapsQuery = useQuery({
    ...getGapsApiV1GapsGetOptions({ query: queryParams }),
    ...getMonitoringQueryOptions("overview"),
  });

  const error = freshnessQuery.error ?? coverageQuery.error ?? gapsQuery.error;
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : "Data health telemetry could not be loaded from Thalassa."
        }
      />
    );
  }

  if (
    freshnessQuery.isPending ||
    coverageQuery.isPending ||
    gapsQuery.isPending
  ) {
    return <div className="panel-surface h-[42rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <DataHealthPage
      coverage={coverageQuery.data ?? []}
      freshness={freshnessQuery.data ?? []}
      gaps={gapsQuery.data ?? []}
      intervalFilter={intervalFilter}
      marketFilter={marketFilter}
      onIntervalChange={setIntervalFilter}
      onlyNonGreen={onlyNonGreen}
      onMarketChange={setMarketFilter}
      onOnlyNonGreenChange={setOnlyNonGreen}
    />
  );
}
