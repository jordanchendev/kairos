import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { fetchRunDetail, fetchTrainingRuns } from "@/features/training-runs/api";
import { RunDetailPanel } from "@/features/training-runs/run-detail-panel";
import { RunListTable } from "@/features/training-runs/run-list-table";
import type { TrainingRunStatus } from "@/features/training-runs/types";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Running", value: "running" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

const MARKET_OPTIONS: { label: string; value: string }[] = [
  { label: "All Markets", value: "" },
  { label: "crypto_perp", value: "crypto_perp" },
  { label: "crypto_spot", value: "crypto_spot" },
  { label: "tw_stock", value: "tw_stock" },
];

const LIMIT = 50;

function TrainingRunsPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [marketFilter, setMarketFilter] = useState<string>("");
  const [page, setPage] = useState(0);

  const {
    data: runsData,
    isLoading,
    error: listError,
  } = useQuery({
    queryKey: ["training-runs", statusFilter, marketFilter, page],
    queryFn: () =>
      fetchTrainingRuns({
        status: statusFilter || undefined,
        market: marketFilter || undefined,
        limit: LIMIT,
        offset: page * LIMIT,
      }),
    ...getMonitoringQueryOptions("overview"),
  });

  const { data: runDetail } = useQuery({
    queryKey: ["training-run-detail", selectedRunId],
    queryFn: () => fetchRunDetail(selectedRunId!),
    enabled: !!selectedRunId,
  });

  if (listError) {
    return (
      <ErrorState
        message={
          listError instanceof Error
            ? listError.message
            : "Training runs could not be loaded from Poseidon."
        }
      />
    );
  }

  const runs = runsData?.runs ?? [];
  const total = runsData?.total ?? 0;
  const empty = !isLoading && runs.length === 0;

  return (
    <section className="space-y-6" data-page-id="training-runs">
      <PageHeader />

      {/* Filter bar */}
      <div
        className="panel-surface flex flex-wrap items-center gap-4 rounded-[24px] p-4"
        data-section-id="filter-bar"
      >
        <div className="flex items-center gap-2">
          <label
            className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]"
            htmlFor="training-status-filter"
          >
            Status
          </label>
          <select
            className="rounded-[12px] border border-white/12 bg-white/4 px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
            id="training-status-filter"
            onChange={(e) => {
              setStatusFilter(e.target.value as TrainingRunStatus | "");
              setPage(0);
            }}
            value={statusFilter}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]"
            htmlFor="training-market-filter"
          >
            Market
          </label>
          <select
            className="rounded-[12px] border border-white/12 bg-white/4 px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
            id="training-market-filter"
            onChange={(e) => {
              setMarketFilter(e.target.value);
              setPage(0);
            }}
            value={marketFilter}
          >
            {MARKET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Run list or empty state */}
      {empty ? (
        <EmptyState
          message="No training runs found. Start a training job via POST /api/v1/models/train or adjust your filters."
          title="No training runs"
        />
      ) : (
        <RunListTable
          limit={LIMIT}
          loading={isLoading}
          onPageChange={setPage}
          onSelectRun={setSelectedRunId}
          page={page}
          runs={runs}
          selectedRunId={selectedRunId}
          total={total}
        />
      )}

      {/* Run detail panel */}
      {selectedRunId && runDetail && (
        <RunDetailPanel onClose={() => setSelectedRunId(null)} run={runDetail} />
      )}
    </section>
  );
}

function PageHeader() {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
        Research Route &middot; Phase 41
      </div>
      <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">
        Training Runs
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        Monitor Qlib model training runs dispatched via the Research API.
        Each row shows handler, model, market, status, and key IC/ICIR metrics.
        Click a row to expand the full configuration, timeline, error logs, and
        metrics detail.
      </p>
    </div>
  );
}

export function Component() {
  return <TrainingRunsPage />;
}
