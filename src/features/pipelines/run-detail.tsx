import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { JsonTree } from "./json-tree";
import {
  abortAvailability,
  attemptCellState,
  findSummary,
  formatDuration,
  formatTime,
  rerunAvailability,
  runStatusTone,
  shortSha,
  stagePlan,
  STAGE_CELL_LABEL,
} from "./model";
import { StageCell } from "./stage-strip";
import type { RunAction } from "./api";
import type { PipelineEvent, PipelineRun, StageAttempt, StageEntry } from "./types";

export function RunStatusBadge({ status }: { status: PipelineRun["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
        runStatusTone(status),
      )}
      data-status={status}
    >
      {status === "running" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" /> : null}
      {status}
    </span>
  );
}

function ActionButton({
  enabled,
  label,
  onClick,
  tooltip,
  variant,
}: {
  enabled: boolean;
  label: string;
  onClick: () => void;
  tooltip: string | null;
  variant: "destructive" | "outline";
}) {
  // A disabled button swallows hover events, so the explanation lives on the wrapper.
  return (
    <span className="inline-flex" data-disabled-reason={tooltip ?? undefined} title={tooltip ?? undefined}>
      <Button
        aria-disabled={!enabled}
        className="min-h-11"
        disabled={!enabled}
        onClick={onClick}
        variant={variant}
      >
        {label}
      </Button>
    </span>
  );
}

export function RunActionButtons({
  onAction,
  run,
  writable = true,
}: {
  onAction: (kind: RunAction) => void;
  run: Pick<PipelineRun, "status">;
  writable?: boolean;
}) {
  const rerun = rerunAvailability(run.status);
  const abort = abortAvailability(run.status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton
        enabled={writable && rerun.enabled}
        label="Rerun"
        onClick={() => onAction("rerun")}
        tooltip={rerun.tooltip}
        variant="outline"
      />
      <ActionButton
        enabled={writable && abort.enabled}
        label="Abort"
        onClick={() => onAction("abort")}
        tooltip={abort.tooltip}
        variant="destructive"
      />
      {run.status === "failed" ? (
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Fail is final, start a new run in the same family.
        </span>
      ) : null}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">{label}</dt>
      <dd className="mt-0.5 break-all font-mono text-xs text-[hsl(var(--foreground))]">{children}</dd>
    </div>
  );
}

export function RunHeader({ actions, run }: { actions?: ReactNode; run: PipelineRun }) {
  return (
    <header className="space-y-4" data-testid="run-header">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Run #{run.run_no}</h2>
          <RunStatusBadge status={run.status} />
        </div>
        {actions}
      </div>
      <p className="text-sm leading-6 text-[hsl(var(--foreground))]">{run.idea_text}</p>
      {run.reason ? <p className="text-xs text-[hsl(var(--muted-foreground))]">Reason: {run.reason}</p> : null}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Fact label="Family">{shortSha(run.family_id)}</Fact>
        <Fact label="Revision">{run.revision}</Fact>
        <Fact label="Config sha">{shortSha(run.config_sha256)}</Fact>
        <Fact label="Source">{run.source}</Fact>
        <Fact label="Instrument">{[run.market, run.symbol].filter(Boolean).join(" / ") || "-"}</Fact>
        <Fact label="Created">{formatTime(run.created_at)}</Fact>
        <Fact label="Updated">{formatTime(run.updated_at)}</Fact>
        <Fact label="Finished">{formatTime(run.finished_at)}</Fact>
      </dl>
    </header>
  );
}

export type AttemptRef = { attempt: number; stage: string };

export function StageColumns({
  onSelectAttempt,
  plan,
  selected,
  stages,
}: {
  onSelectAttempt: (ref: AttemptRef) => void;
  plan: readonly string[];
  selected: AttemptRef | null;
  stages: readonly StageEntry[] | undefined;
}) {
  const byName = new Map((stages ?? []).map((entry) => [entry.stage, entry]));
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" data-testid="stage-columns">
      {plan.map((stage) => {
        const entry: StageEntry | undefined = byName.get(stage);
        const latest = entry?.latest ?? null;
        const state = attemptCellState(latest);
        return (
          <section
            aria-label={`Stage ${stage}`}
            className="w-44 shrink-0 space-y-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)] p-3"
            key={stage}
          >
            <h3 className="truncate font-mono text-xs font-semibold" title={stage}>
              {stage}
            </h3>
            <div className="flex items-center gap-2">
              <StageCell className="h-5 flex-none" stage={stage} state={state} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">{STAGE_CELL_LABEL[state]}</span>
            </div>
            {latest ? (
              <div className="space-y-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                <div>
                  attempt {latest.attempt} · {latest.trigger}
                </div>
                <div>{formatDuration(latest.started_at, latest.finished_at) ?? "in progress"}</div>
                <div className="font-mono">code {shortSha(latest.code_version, 7)}</div>
                {latest.reason ? <div className="break-words text-[hsl(var(--foreground))]">{latest.reason}</div> : null}
              </div>
            ) : (
              <div className="text-[11px] text-[hsl(var(--muted-foreground))]">Not reached</div>
            )}
            {entry && entry.attempts.length > 0 ? (
              <ul className="space-y-1 border-t border-[hsl(var(--border))] pt-2" aria-label={`${stage} attempts`}>
                {entry.attempts.map((attempt) => {
                  const active = selected?.stage === stage && selected.attempt === attempt.attempt;
                  const attemptState = attemptCellState(attempt);
                  return (
                    <li key={attempt.id}>
                      <button
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-[hsl(var(--muted))]",
                          active && "bg-[hsl(var(--muted))] ring-1 ring-[hsl(var(--ring))]",
                        )}
                        onClick={() => onSelectAttempt({ attempt: attempt.attempt, stage })}
                        type="button"
                      >
                        <StageCell className="h-3 min-w-3 flex-none" stage={`${stage} #${attempt.attempt}`} state={attemptState} />
                        <span>
                          #{attempt.attempt} {STAGE_CELL_LABEL[attemptState]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function AttemptReport({ attempt }: { attempt: StageAttempt }) {
  const artifact = attempt.artifact_json ?? null;
  const summary = findSummary(artifact);
  const files = artifact?.files ?? [];
  return (
    <div className="space-y-4" data-testid="attempt-report">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono font-semibold">
          {attempt.stage} #{attempt.attempt}
        </span>
        <span className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {STAGE_CELL_LABEL[attemptCellState(attempt)]}
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          artifact {shortSha(attempt.artifact_sha256)} · input {shortSha(attempt.input_sha256)}
        </span>
      </div>
      {summary ? (
        <p
          className="whitespace-pre-line rounded-xl border border-[hsl(var(--ring)/0.4)] bg-[hsl(var(--accent)/0.12)] px-4 py-3 text-sm font-semibold"
          data-testid="gate-summary"
        >
          {summary}
        </p>
      ) : null}
      {attempt.reason ? <p className="text-sm text-[hsl(var(--muted-foreground))]">Reason: {attempt.reason}</p> : null}
      {files.length > 0 ? (
        <div>
          <h4 className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Files</h4>
          <ul className="mt-1 space-y-0.5 font-mono text-xs" data-testid="file-manifest">
            {files.map((file) => (
              <li key={file.name}>
                {file.name}
                {typeof file.bytes === "number" ? ` · ${file.bytes} B` : ""}
                {file.sha256 ? ` · ${shortSha(file.sha256)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {artifact?.report !== undefined ? (
        <div>
          <h4 className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Report</h4>
          <div className="mt-1 rounded-xl border border-[hsl(var(--border))] p-3">
            <JsonTree value={artifact.report} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">This attempt has no report.</p>
      )}
      {attempt.error_json ? (
        <div>
          <h4 className="text-[11px] uppercase tracking-[0.2em] text-rose-200">Error</h4>
          <div className="mt-1 rounded-xl border border-rose-500/30 p-3">
            <JsonTree value={attempt.error_json} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function eventBody(payload: unknown): unknown {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    // The run snapshot echoed in `response` is already shown in the header.
    const { response, ...rest } = payload as Record<string, unknown>;
    void response;
    return rest;
  }
  return payload;
}

export function EventsTimeline({ events }: { events: readonly PipelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-[hsl(var(--muted-foreground))]">No events yet.</p>;
  return (
    <ol className="space-y-3 border-l border-[hsl(var(--border))] pl-4" data-testid="events-timeline">
      {events.map((event) => {
        const body = eventBody(event.payload_json);
        const hasBody = body !== null && typeof body === "object" && Object.keys(body).length > 0;
        return (
          <li className="relative" key={event.id}>
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--ring))]" />
            <div className="flex flex-wrap items-baseline gap-x-3 text-xs">
              <span className="font-mono font-semibold">{event.event_type}</span>
              <span className="text-[hsl(var(--muted-foreground))]">{formatTime(event.created_at)}</span>
              <span className="text-[hsl(var(--muted-foreground))]">{event.actor_id ?? "system"}</span>
              {event.expected_revision !== null ? (
                <span className="text-[hsl(var(--muted-foreground))]">rev {event.expected_revision}</span>
              ) : null}
            </div>
            {hasBody ? (
              <div className="mt-1">
                <JsonTree defaultOpenDepth={0} value={body} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export type RunDetailViewProps = {
  actions?: ReactNode;
  attempt: StageAttempt | null;
  attemptError?: string | null;
  events: readonly PipelineEvent[];
  onSelectAttempt: (ref: AttemptRef) => void;
  run: PipelineRun;
  selected: AttemptRef | null;
  stages: readonly StageEntry[] | undefined;
};

export function RunDetailView({
  actions,
  attempt,
  attemptError,
  events,
  onSelectAttempt,
  run,
  selected,
  stages,
}: RunDetailViewProps) {
  return (
    <div className="space-y-6" data-testid="run-detail">
      <RunHeader actions={actions} run={run} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Stages</h3>
        <StageColumns onSelectAttempt={onSelectAttempt} plan={stagePlan(run)} selected={selected} stages={stages} />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Attempt report</h3>
        {attemptError ? (
          <p className="text-sm text-rose-200" role="alert">
            {attemptError}
          </p>
        ) : attempt ? (
          <AttemptReport attempt={attempt} />
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Select an attempt to view its report.</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Events</h3>
        <EventsTimeline events={events} />
      </section>
    </div>
  );
}
