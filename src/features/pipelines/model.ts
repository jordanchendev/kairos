import type { PipelineRun, PipelineRunStatus, StageAttempt, StageEntry } from "./types";

export const RUN_STATUSES: PipelineRunStatus[] = [
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "unsupported",
  "error",
  "aborted",
];

export const RERUNNABLE: ReadonlySet<PipelineRunStatus> = new Set(["error", "aborted", "unsupported"]);
export const ABORTABLE: ReadonlySet<PipelineRunStatus> = new Set(["queued", "running", "waiting"]);

export const FAST_POLL_MS = 5_000;
export const SLOW_POLL_MS = 60_000;

/** 5 s while any visible run is queued/running, otherwise 60 s. */
export function pollInterval(statuses: readonly (PipelineRunStatus | undefined)[]): number {
  return statuses.some((status) => status === "queued" || status === "running") ? FAST_POLL_MS : SLOW_POLL_MS;
}

export type StageCellState =
  | "pass"
  | "fail"
  | "unsupported"
  | "error"
  | "running"
  | "waiting"
  | "pending"
  | "aborted"
  | "not_reached";

export const STAGE_CELL_LABEL: Record<StageCellState, string> = {
  aborted: "aborted",
  error: "error",
  fail: "fail",
  not_reached: "not reached",
  pass: "pass",
  pending: "pending",
  running: "running",
  unsupported: "unsupported",
  waiting: "waiting",
};

export function attemptCellState(attempt: StageAttempt | null | undefined): StageCellState {
  if (!attempt) return "not_reached";
  switch (attempt.status) {
    case "running":
      return "running";
    case "waiting":
      return "waiting";
    case "pending":
      return "pending";
    case "aborted":
      return "aborted";
    default:
      return attempt.verdict ?? "error";
  }
}

export function stagePlan(run: Pick<PipelineRun, "config_json">): string[] {
  const plan = run.config_json?.stage_plan;
  return Array.isArray(plan) ? plan.filter((stage): stage is string => typeof stage === "string") : [];
}

/** One cell per stage in the run's plan, in plan order; stages without an attempt are "not reached". */
export function stageCells(plan: readonly string[], stages: readonly StageEntry[] | undefined) {
  const byName = new Map((stages ?? []).map((entry) => [entry.stage, entry]));
  return plan.map((stage) => {
    const entry = byName.get(stage);
    return { entry, stage, state: attemptCellState(entry?.latest) };
  });
}

export const RERUN_TOOLTIP: Record<"failed" | "other", string> = {
  failed: "Fail is final: start a new run in the same family instead of rerunning.",
  other: "Only runs that ended in error, aborted or unsupported can be rerun.",
};

export function rerunAvailability(status: PipelineRunStatus): { enabled: boolean; tooltip: string | null } {
  if (RERUNNABLE.has(status)) return { enabled: true, tooltip: null };
  return { enabled: false, tooltip: status === "failed" ? RERUN_TOOLTIP.failed : RERUN_TOOLTIP.other };
}

export function abortAvailability(status: PipelineRunStatus): { enabled: boolean; tooltip: string | null } {
  if (ABORTABLE.has(status)) return { enabled: true, tooltip: null };
  return { enabled: false, tooltip: "Only queued, running or waiting runs can be aborted." };
}

export function truncate(text: string, max: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function shortSha(sha: string | null | undefined, length = 8) {
  return sha ? sha.slice(0, length) : "-";
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  return `${Math.floor(seconds / 60)} m ${Math.round(seconds % 60)} s`;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const lines = value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    return lines.length > 0 ? lines.join("\n") : null;
  }
  return null;
}

/** Gate reports carry a one-line verdict summary; look at the report first, then the artifact itself. */
export function findSummary(artifact: StageAttempt["artifact_json"]): string | null {
  if (!artifact || typeof artifact !== "object") return null;
  const report = artifact.report;
  if (report && typeof report === "object" && !Array.isArray(report)) {
    const fromReport = asString((report as Record<string, unknown>).summary);
    if (fromReport) return fromReport;
  }
  return asString(artifact.summary);
}

const STATUS_TONE: Record<PipelineRunStatus, string> = {
  aborted: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  error: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  failed: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  queued: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  running: "border-blue-500/40 bg-blue-500/15 text-blue-200",
  unsupported: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  waiting: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

export function runStatusTone(status: PipelineRunStatus) {
  return STATUS_TONE[status] ?? STATUS_TONE.aborted;
}
