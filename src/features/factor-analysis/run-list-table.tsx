import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { cn } from "@/lib/cn";

import type { FactorAnalysisRun } from "./types";

type RunListTableProps = {
  onSelectRun: (runId: string) => void;
  runs: FactorAnalysisRun[];
  selectedRunId: string | null;
};

function getStatusTone(status: FactorAnalysisRun["status"]) {
  if (status === "succeeded") return "up" as const;
  if (status === "failed") return "down" as const;
  if (status === "running") return "degraded" as const;
  return "idle" as const;
}

export function RunListTable({ onSelectRun, runs, selectedRunId }: RunListTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
      <div className="hidden grid-cols-[0.9fr_0.9fr_0.8fr_0.9fr_1fr] gap-4 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.88)] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] lg:grid">
        <span>Type</span>
        <span>Market</span>
        <span>Status</span>
        <span>Updated</span>
        <span>Created</span>
      </div>

      <div className="divide-y divide-[hsl(var(--border))]">
        {runs.map((run) => (
          <button
            className={cn(
              "grid w-full cursor-pointer gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-[hsla(190,91%,37%,0.08)] lg:grid-cols-[0.9fr_0.9fr_0.8fr_0.9fr_1fr]",
              selectedRunId === run.id && "bg-[hsla(190,91%,37%,0.12)]",
            )}
            key={run.id}
            onClick={() => onSelectRun(run.id)}
            type="button"
          >
            <div>
              <div className="text-base font-semibold capitalize text-[hsl(var(--foreground))]">{run.run_type}</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {run.id.slice(0, 8)}
              </div>
            </div>
            <div className="text-sm text-[hsl(var(--foreground))]">{getMarketLabel(run.market)}</div>
            <div>
              <StatusBadge label={run.status} status={getStatusTone(run.status)} />
            </div>
            <div className="text-sm text-[hsl(var(--foreground))]">{new Date(run.updated_at).toISOString().slice(0, 16)}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{new Date(run.created_at).toISOString().slice(0, 16)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
