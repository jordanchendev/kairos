import { cn } from "@/lib/cn";

import type { TrainingRunResponse, TrainingRunStatus } from "./types";

type RunListTableProps = {
  limit: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onSelectRun: (runId: string) => void;
  page: number;
  runs: TrainingRunResponse[];
  selectedRunId: string | null;
  total: number;
};

const STATUS_COLORS: Record<TrainingRunStatus, string> = {
  pending: "bg-zinc-500/15 text-zinc-300",
  running: "bg-blue-500/15 text-blue-300 animate-pulse",
  succeeded: "bg-emerald-500/15 text-emerald-200",
  failed: "bg-red-500/15 text-red-200",
  cancelled: "bg-yellow-500/15 text-yellow-200",
};

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return "\u2014";
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatMetricValue(value: number): string {
  return value.toFixed(4);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RunListTable({
  limit,
  loading,
  onPageChange,
  onSelectRun,
  page,
  runs,
  selectedRunId,
  total,
}: RunListTableProps) {
  const start = page * limit + 1;
  const end = Math.min(page * limit + runs.length, total);
  const hasNext = end < total;
  const hasPrev = page > 0;

  if (loading) {
    return (
      <div className="panel-surface h-[32rem] animate-pulse rounded-[28px]" />
    );
  }

  return (
    <section
      className="panel-surface overflow-hidden rounded-[28px]"
      data-section-id="run-list-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <th className="px-4 py-3">Run ID</th>
              <th className="px-4 py-3">Handler</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3 text-right">IC</th>
              <th className="px-4 py-3 text-right">ICIR</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                className={cn(
                  "cursor-pointer border-b border-white/4 transition-colors hover:bg-white/4",
                  selectedRunId === run.run_id && "bg-[hsla(190,91%,37%,0.08)]",
                )}
                key={run.run_id}
                onClick={() => onSelectRun(run.run_id)}
              >
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--foreground))]">
                  {run.run_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--foreground))]">
                  {run.handler_class}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--foreground))]">
                  {run.model_class}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                  {run.market}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td
                  className="px-4 py-3 text-[hsl(var(--muted-foreground))]"
                  title={run.created_at}
                >
                  {formatRelativeTime(run.created_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  {formatDuration(run.started_at, run.finished_at)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[hsl(var(--foreground))]">
                  {run.metrics?.IC != null
                    ? formatMetricValue(run.metrics.IC)
                    : "\u2014"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[hsl(var(--foreground))]">
                  {run.metrics?.ICIR != null
                    ? formatMetricValue(run.metrics.ICIR)
                    : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Showing {start}&ndash;{end} of {total}
        </span>
        <div className="flex gap-2">
          <button
            className={cn(
              "rounded-[10px] border border-white/12 px-3 py-1 text-xs",
              hasPrev
                ? "text-[hsl(var(--foreground))] hover:bg-white/8"
                : "cursor-not-allowed text-[hsl(var(--muted-foreground))] opacity-50",
            )}
            disabled={!hasPrev}
            onClick={() => hasPrev && onPageChange(page - 1)}
          >
            Previous
          </button>
          <button
            className={cn(
              "rounded-[10px] border border-white/12 px-3 py-1 text-xs",
              hasNext
                ? "text-[hsl(var(--foreground))] hover:bg-white/8"
                : "cursor-not-allowed text-[hsl(var(--muted-foreground))] opacity-50",
            )}
            disabled={!hasNext}
            onClick={() => hasNext && onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: TrainingRunStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide",
        STATUS_COLORS[status],
      )}
    >
      {status}
    </span>
  );
}
