import { cn } from "@/lib/cn";

import { RUN_STATUSES, formatTime, stagePlan, truncate } from "./model";
import { RunStatusBadge } from "./run-detail";
import { StageStrip } from "./stage-strip";
import type { PipelineRun, PipelineRunStatus, StageEntry } from "./types";

export function StatusFilter({
  onChange,
  value,
}: {
  onChange: (status: PipelineRunStatus | null) => void;
  value: PipelineRunStatus | null;
}) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
      Status
      <select
        className="h-10 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm normal-case tracking-normal text-[hsl(var(--foreground))]"
        onChange={(event) => onChange(event.target.value === "" ? null : (event.target.value as PipelineRunStatus))}
        value={value ?? ""}
      >
        <option value="">All</option>
        {RUN_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RunList({
  onSelect,
  runs,
  selectedId,
  stagesByRun,
}: {
  onSelect: (runId: string) => void;
  runs: readonly PipelineRun[];
  selectedId: string | null;
  stagesByRun: Readonly<Record<string, readonly StageEntry[] | undefined>>;
}) {
  return (
    <div className="overflow-x-auto" data-testid="run-list">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
            <th className="px-3 py-2 font-semibold">Run</th>
            <th className="px-3 py-2 font-semibold">Idea</th>
            <th className="px-3 py-2 font-semibold">Source</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Stages</th>
            <th className="px-3 py-2 font-semibold">Created</th>
            <th className="px-3 py-2 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const selected = run.id === selectedId;
            return (
              <tr
                aria-selected={selected}
                className={cn(
                  "border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]",
                  selected && "bg-[hsl(var(--muted))]",
                )}
                data-run-no={run.run_no}
                key={run.id}
              >
                <td className="px-3 py-2">
                  <button
                    aria-label={`Open run ${run.run_no}`}
                    className="min-h-11 rounded-lg px-2 font-mono font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    onClick={() => onSelect(run.id)}
                    type="button"
                  >
                    #{run.run_no}
                  </button>
                </td>
                <td className="max-w-[22rem] px-3 py-2" title={run.idea_text}>
                  {truncate(run.idea_text, 80)}
                </td>
                <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">{run.source}</td>
                <td className="px-3 py-2">
                  <RunStatusBadge status={run.status} />
                </td>
                <td className="px-3 py-2">
                  <StageStrip plan={stagePlan(run)} stages={stagesByRun[run.id]} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {formatTime(run.created_at)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {formatTime(run.updated_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
