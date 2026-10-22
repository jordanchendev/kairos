import { cn } from "@/lib/cn";

import { STAGE_CELL_LABEL, stageCells, type StageCellState } from "./model";
import type { StageEntry } from "./types";

export const CELL_CLASS: Record<StageCellState, string> = {
  aborted: "border-slate-400/50 bg-slate-500/60",
  error: "border-orange-400 bg-orange-500",
  fail: "border-rose-400 bg-rose-500",
  not_reached: "border-[hsl(var(--border))] bg-transparent opacity-50",
  pass: "border-emerald-400 bg-emerald-500",
  pending: "border-slate-300 bg-transparent",
  running: "border-blue-300 bg-blue-500 animate-pulse motion-reduce:animate-none",
  unsupported: "border-slate-400/60 bg-slate-600/40",
  waiting: "border-amber-300 bg-amber-400",
};

const STRIPES = "repeating-linear-gradient(45deg, rgba(148,163,184,0.55) 0 3px, transparent 3px 6px)";

export function StageCell({ className, stage, state }: { className?: string; stage: string; state: StageCellState }) {
  return (
    <span
      aria-label={`${stage}: ${STAGE_CELL_LABEL[state]}`}
      className={cn("inline-block h-4 min-w-4 flex-1 rounded-[4px] border", CELL_CLASS[state], className)}
      data-state={state}
      role="img"
      style={state === "unsupported" ? { backgroundImage: STRIPES } : undefined}
      title={`${stage}: ${STAGE_CELL_LABEL[state]}`}
    />
  );
}

/** Compact strip: one coloured cell per stage in the run's stage_plan. */
export function StageStrip({ plan, stages }: { plan: readonly string[]; stages: readonly StageEntry[] | undefined }) {
  if (plan.length === 0) return <span className="text-xs text-[hsl(var(--muted-foreground))]">no stage plan</span>;
  return (
    <span className="flex w-40 items-center gap-1" data-testid="stage-strip">
      {stageCells(plan, stages).map(({ stage, state }) => (
        <StageCell key={stage} stage={stage} state={state} />
      ))}
    </span>
  );
}
