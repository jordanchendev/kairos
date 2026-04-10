import { X } from "lucide-react";

import { cn } from "@/lib/cn";

import { MetricsViewer } from "./metrics-viewer";
import type { TrainingRunDetailResponse, TrainingRunStatus } from "./types";

type RunDetailPanelProps = {
  onClose: () => void;
  run: TrainingRunDetailResponse;
};

const STATUS_COLORS: Record<TrainingRunStatus, string> = {
  pending: "bg-zinc-500/15 text-zinc-300",
  running: "bg-blue-500/15 text-blue-300 animate-pulse",
  succeeded: "bg-emerald-500/15 text-emerald-200",
  failed: "bg-red-500/15 text-red-200",
  cancelled: "bg-yellow-500/15 text-yellow-200",
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

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

export function RunDetailPanel({ onClose, run }: RunDetailPanelProps) {
  return (
    <section
      className="panel-surface space-y-6 rounded-[28px] p-6"
      data-section-id="run-detail-panel"
    >
      {/* Header */}
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
            Run Detail
          </div>
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-lg font-semibold text-[hsl(var(--foreground))]">
              {run.run_id}
            </h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide",
                STATUS_COLORS[run.status],
              )}
            >
              {run.status}
            </span>
          </div>
        </div>
        <button
          className="rounded-[12px] border border-white/12 p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-white/8 hover:text-[hsl(var(--foreground))]"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close detail panel</span>
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <DetailSection title="Configuration">
          <DetailRow label="Handler" value={run.handler_class} />
          <DetailRow label="Model" value={run.model_class} />
          <DetailRow label="Market" value={run.market} />
          <DetailRow label="Interval" value={run.interval} />
          <DetailRow label="Symbols" value={run.symbols.join(", ")} />
          <DetailRow label="Lookback" value={run.lookback ?? "\u2014"} />
          <DetailRow label="Requested by" value={run.requested_by} />
          {Object.keys(run.segments).length > 0 && (
            <div className="mt-2">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Segments
              </div>
              <div className="mt-1 space-y-1">
                {Object.entries(run.segments).map(([name, [start, end]]) => (
                  <div
                    className="flex items-center gap-2 text-xs text-[hsl(var(--foreground))]"
                    key={name}
                  >
                    <span className="font-medium">{name}:</span>
                    <span className="font-mono">
                      {start} &rarr; {end}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(run.handler_params).length > 0 && (
            <JsonBlock label="Handler Params" value={run.handler_params} />
          )}
          {Object.keys(run.model_params).length > 0 && (
            <JsonBlock label="Model Params" value={run.model_params} />
          )}
        </DetailSection>

        {/* Timeline */}
        <DetailSection title="Timeline">
          <DetailRow label="Created" value={formatTimestamp(run.created_at)} />
          <DetailRow label="Started" value={formatTimestamp(run.started_at)} />
          <DetailRow label="Finished" value={formatTimestamp(run.finished_at)} />
          <DetailRow
            label="Duration"
            value={formatDuration(run.started_at, run.finished_at)}
          />
          <DetailRow label="Updated" value={formatTimestamp(run.updated_at)} />

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              Model Version
            </div>
            <div className="mt-1 text-sm text-[hsl(var(--foreground))]">
              {run.model_version_id ? (
                <span className="font-mono text-xs">{run.model_version_id}</span>
              ) : (
                <span className="text-[hsl(var(--muted-foreground))]">
                  {run.status === "succeeded" ? "Pending promotion" : "Not promoted"}
                </span>
              )}
            </div>
          </div>

          {run.mlflow_run_id && (
            <DetailRow label="MLflow Run ID" value={run.mlflow_run_id} mono />
          )}
        </DetailSection>
      </div>

      {/* Error */}
      {run.error && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-red-300">
            Error
          </div>
          <pre className="max-h-64 overflow-auto rounded-[16px] border border-red-500/25 bg-red-500/8 p-4 font-mono text-xs leading-5 text-red-100">
            {run.error}
          </pre>
        </div>
      )}

      {/* Metrics */}
      <MetricsViewer metrics={run.metrics} />
    </section>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  mono,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-[hsl(var(--muted-foreground))]">{label}</span>
      <span
        className={cn(
          "text-right text-sm text-[hsl(var(--foreground))]",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown>;
}) {
  return (
    <div className="mt-2">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
      <pre className="mt-1 max-h-40 overflow-auto rounded-[12px] border border-white/8 bg-white/4 p-3 font-mono text-xs leading-5 text-[hsl(var(--foreground))]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
