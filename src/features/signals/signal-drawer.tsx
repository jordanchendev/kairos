import { useState } from "react";

import type { JsonValue, SignalResponse, TraceResponse, TraceRow, TraceStage } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { cn } from "@/lib/cn";

import { formatPercent, formatRatio } from "@/features/portfolio/portfolio-view-model";

import { formatSignalTimestamp, getSignalStatusTone, getSignalStrategyValue } from "./signals-model";

export type SignalTraceState = {
  data?: TraceResponse;
  isError: boolean;
  isLoading: boolean;
};

type SignalDrawerProps = {
  isLoading: boolean;
  signal: SignalResponse | null;
  trace?: SignalTraceState;
};

export const TRACE_STAGE_TITLES: Record<TraceStage["name"], string> = {
  campaign_review: "Campaign and paired review",
  decision_events: "Decision and decision events",
  evaluation: "Evaluation snapshot/run",
  execution: "Orders, fills, and reconciliation",
  manifest: "Manifest",
  outcomes: "Outcomes",
  release: "Release version/event",
  research_revision: "Research revision",
  signal_or_no_trade: "Signal or no-trade",
};

function stateTone(state: TraceStage["state"]) {
  switch (state) {
    case "Available":
    case "Filled":
    case "Released":
      return "up" as const;
    case "Provisional":
    case "Inconclusive":
    case "Legacy unresolved":
    case "Paused":
      return "degraded" as const;
    case "Blocked":
    case "Rejected":
    case "Rolled back":
      return "down" as const;
    default:
      return "idle" as const;
  }
}

const monoClass = "font-mono text-xs tabular-nums [overflow-wrap:anywhere]";

function isCounterfactualRow(row: TraceRow) {
  const values = row.values ?? {};
  return values.kind === "counterfactual" || values.counterfactual === true || /^counterfactual/i.test(row.label);
}

function isDshRow(row: TraceRow) {
  return /^dsh\b/i.test(row.label) || (row.values ?? {}).dsh_status !== undefined;
}

function renderValue(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function TraceRowView({ row }: { row: TraceRow }) {
  const values = row.values ?? {};
  if (isDshRow(row)) {
    const reasons = values.reasons ?? values.reason;
    return (
      <li className="rounded-xl border border-[hsl(var(--border))] p-3 text-sm [overflow-wrap:anywhere]">
        <div className="font-semibold">DSH: Disabled</div>
        <div className="text-[hsl(var(--muted-foreground))]">
          Research narrative metadata only.{reasons !== undefined ? ` Reasons: ${renderValue(reasons)}` : ""}
        </div>
      </li>
    );
  }
  const counterfactual = isCounterfactualRow(row);
  const assumption = typeof values.assumption_version === "string" ? values.assumption_version : null;
  return (
    <li
      className={cn(
        "rounded-xl border p-3 text-sm [overflow-wrap:anywhere]",
        counterfactual ? "border-dashed border-amber-400/60 text-amber-200" : "border-solid border-[hsl(var(--border))]",
      )}
    >
      <div className="font-semibold">
        {counterfactual ? `Counterfactual · ${assumption ?? "assumption version unavailable"}` : "Actual"} — {row.label}
      </div>
      <div>
        State: {row.state}
        {row.timestamp ? ` · ${formatSignalTimestamp(row.timestamp)}` : ""}
      </div>
      <dl className="mt-1 grid gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr]">
        {Object.entries(values)
          .filter(([key]) => key !== "assumption_version")
          .map(([key, value]) => (
            <div className="contents" key={key}>
              <dt className="text-[hsl(var(--muted-foreground))]">{key}</dt>
              <dd className={monoClass}>{renderValue(value)}</dd>
            </div>
          ))}
        {Object.entries(row.identities ?? {}).map(([key, value]) => (
          <div className="contents" key={`id-${key}`}>
            <dt className="text-[hsl(var(--muted-foreground))]">{key}</dt>
            <dd className={monoClass}>{value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export function defaultExpandedPositions(stages: TraceStage[]) {
  const expanded = new Set<number>();
  const signalStage = stages.find((stage) => stage.name === "signal_or_no_trade");
  if (signalStage) expanded.add(signalStage.position);
  const blocked = stages.find((stage) => stage.state === "Blocked" || stage.state === "Unavailable");
  if (blocked) expanded.add(blocked.position);
  return expanded;
}

export function SignalTraceStages({
  initialExpanded,
  narrativeConfidence,
  trace,
}: {
  initialExpanded?: Set<number>;
  narrativeConfidence?: number | null;
  trace: TraceResponse;
}) {
  const stages = [...trace.stages].sort((a, b) => a.position - b.position);
  const [expanded, setExpanded] = useState<Set<number>>(() => initialExpanded ?? defaultExpandedPositions(stages));
  const toggle = (position: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });

  return (
    <div>
      {typeof narrativeConfidence === "number" ? (
        <p className="mb-3 text-sm">
          Narrative confidence: {formatPercent(narrativeConfidence)} — Not a probability of profit
        </p>
      ) : null}
      <ol className="space-y-3">
        {stages.map((stage) => {
          const open = expanded.has(stage.position);
          const panelId = `trace-stage-${stage.position}`;
          return (
            <li key={stage.position}>
              <h3>
                <button
                  aria-controls={panelId}
                  aria-expanded={open}
                  className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  onClick={() => toggle(stage.position)}
                  type="button"
                >
                  <span>
                    {stage.position}. {TRACE_STAGE_TITLES[stage.name]}
                  </span>
                  <StatusBadge className="text-xs font-semibold" label={stage.state} status={stateTone(stage.state)} />
                </button>
              </h3>
              {open ? (
                <div className="mt-2 space-y-2 px-1 text-sm [overflow-wrap:anywhere]" id={panelId}>
                  <div>
                    {stage.timestamp ? formatSignalTimestamp(stage.timestamp) : "No timestamp"} · {stage.reason}
                  </div>
                  {Object.entries(stage.identities ?? {}).length > 0 ? (
                    <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr]">
                      {Object.entries(stage.identities ?? {}).map(([key, value]) => (
                        <div className="contents" key={key}>
                          <dt className="text-[hsl(var(--muted-foreground))]">{key}</dt>
                          <dd className={monoClass}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {(stage.rows ?? []).length > 0 ? (
                    <ul className="space-y-2">
                      {(stage.rows ?? []).map((row, index) => (
                        <TraceRowView key={`${row.label}-${index}`} row={row} />
                      ))}
                    </ul>
                  ) : null}
                  {stage.raw_payload !== undefined && stage.raw_payload !== null ? (
                    <pre className="whitespace-pre-wrap rounded-xl border border-[hsl(var(--border))] p-3 font-mono text-xs [overflow-wrap:anywhere]">
                      {JSON.stringify(stage.raw_payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SignalTraceSection({ narrativeConfidence, trace }: { narrativeConfidence?: number | null; trace: SignalTraceState }) {
  return (
    <div aria-busy={trace.isLoading} className="mt-4 rounded-[22px] border border-[hsl(var(--border))] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">End-to-end trace</div>
      <div className="mt-3">
        {trace.isLoading ? (
          <p className="text-sm">Loading…</p>
        ) : trace.isError || !trace.data ? (
          <p className="text-sm">Decision and release data could not be loaded. Retry; no state was changed.</p>
        ) : (
          <SignalTraceStages narrativeConfidence={narrativeConfidence} trace={trace.data} />
        )}
      </div>
    </div>
  );
}

export function SignalDrawer({ isLoading, signal, trace }: SignalDrawerProps) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="panel-surface h-full min-h-[22rem] rounded-[28px] p-4 motion-safe:animate-pulse">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!signal) {
    return <EmptyState message="Select a row to inspect route-local signal details." title="No signal selected" />;
  }

  return (
    <PanelFrame
      action={<StatusBadge label={signal.status} status={getSignalStatusTone(signal.status)} />}
      description="Detail view stays inspection-only. The current API does not expose linked execution P&L or exit fills on this route yet."
      eyebrow="signal_id"
      title={signal.id}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Strategy</div>
          <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">{getSignalStrategyValue(signal)}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Confidence</div>
          <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">{formatPercent(signal.confidence)}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Signal Time</div>
          <div className="mt-2 text-sm text-[hsl(var(--foreground))]">{formatSignalTimestamp(signal.signal_time)}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Expiry</div>
          <div className="mt-2 text-sm text-[hsl(var(--foreground))]">{signal.valid_until ? formatSignalTimestamp(signal.valid_until) : "No expiry"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Outcome Context</div>
        <div className="mt-3 grid gap-3 text-sm text-[hsl(var(--foreground))] sm:grid-cols-3">
          <div>Action: {signal.action}</div>
          <div>Quantity: {formatRatio(signal.quantity_pct ?? 0)}</div>
          <div>Reject Reason: {signal.reject_reason ?? "None"}</div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-xs text-[hsl(var(--muted-foreground))]">
          {JSON.stringify(signal.params, null, 2)}
        </pre>
      </div>

      {trace ? (
        <SignalTraceSection
          narrativeConfidence={typeof signal.metadata?.narrative_confidence === "number" ? signal.metadata.narrative_confidence : null}
          trace={trace}
        />
      ) : null}
    </PanelFrame>
  );
}
