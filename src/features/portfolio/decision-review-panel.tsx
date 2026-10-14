import { useEffect, useRef, useState, type ReactNode } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

import {
  getDecisionTraceApiV1TracesDecisionsDecisionIdGetOptions,
  getPrincipalApiV1PrincipalGetOptions,
  getPrincipalApiV1PrincipalGetQueryKey,
  listDecisionsApiV1DecisionsGetOptions,
  listDecisionsApiV1DecisionsGetQueryKey,
} from "@/api/poseidon/@tanstack/react-query.gen";
import {
  approveDecisionApiV1DecisionsDecisionIdApprovePost,
  rejectDecisionApiV1DecisionsDecisionIdRejectPost,
} from "@/api/poseidon/sdk.gen";
import type { DecisionResponse, PrincipalResponse, TraceResponse } from "@/api/poseidon/types.gen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { cn } from "@/lib/cn";

export const COPY = {
  conflict: "This record changed in Poseidon. Refresh and review the current revision before retrying.",
  emptyBody: "No decisions in this account scope require review. Refresh after the next evaluation run.",
  emptyTitle: "No pending decisions",
  loadError: "Decision and release data could not be loaded. Retry; no state was changed.",
  networkError: "Decision and release data could not be loaded. Retry; no state was changed.",
  permission: "You no longer have permission for this action. No state was changed.",
  successApprove: "Decision approved. It is eligible for the existing paper execution path; Kairos did not submit an order.",
  successModify: "Decision changes saved and approved. Kairos did not submit an order.",
  successReject: "Decision rejected. It is terminal; Kairos did not submit an order.",
} as const;

export type DecisionActionKind = "approve" | "modify" | "reject";

type ActionCopy = {
  confirm: string;
  neutral: string;
  pending: string;
  title: string;
};

export const ACTION_COPY: Record<DecisionActionKind, ActionCopy> = {
  approve: { confirm: "Approve Decision", neutral: "Keep Pending", pending: "Approving…", title: "Approve decision?" },
  modify: {
    confirm: "Save Decision Changes",
    neutral: "Keep Current Decision",
    pending: "Saving…",
    title: "Modify decision?",
  },
  reject: { confirm: "Reject Decision", neutral: "Keep Decision", pending: "Rejecting…", title: "Reject decision?" },
};

export function consequenceCopy(action: DecisionActionKind, decisionId: string) {
  switch (action) {
    case "approve":
      return "This makes the decision eligible for the existing paper execution path. Kairos will not submit an order.";
    case "modify":
      return `Save soft-choice changes for decision ${decisionId} with the required reason. Hard risk limits and actor identity cannot change; Kairos will not submit an order.`;
    case "reject":
      return `Decision ${decisionId} becomes terminal and cannot be approved. No order will be submitted.`;
  }
}

const UNAVAILABLE_REASON: Record<string, string> = {
  account_scope_not_authorized: "Your principal is not authorized for this account scope.",
  available: "Available.",
  decision_expired: "This decision has expired.",
  role_not_authorized: "Your role is not authorized for this action.",
  status_not_pending: "This decision is no longer pending approval.",
};

export function describeUnavailable(reason: string) {
  return UNAVAILABLE_REASON[reason] ?? reason;
}

/** HTTP-level failure classes the UI-SPEC defines distinct recovery for. */
export type FailureKind = "forbidden" | "not_found" | "conflict" | "unprocessable" | "network";

export function classifyFailure(status: number | undefined): FailureKind {
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "unprocessable";
  return "network";
}

export class DecisionMutationError extends Error {
  readonly kind: FailureKind;
  readonly detail: string | null;

  constructor(kind: FailureKind, detail: string | null) {
    super(detail ?? kind);
    this.kind = kind;
    this.detail = detail;
  }
}

type SdkResult<T> = { data?: T; error?: unknown; response?: { status: number } };

/**
 * Unwraps a generated-SDK call made with throwOnError=false so the HTTP status survives
 * (the generated mutation helper only throws the parsed body, which loses 403/404/409/422).
 */
export async function unwrapMutation<T>(call: () => Promise<SdkResult<T>>): Promise<T> {
  let result: SdkResult<T>;
  try {
    result = await call();
  } catch {
    throw new DecisionMutationError("network", null);
  }
  if (result.error !== undefined || result.data === undefined) {
    const status = result.response?.status;
    const body = result.error as { detail?: unknown } | undefined;
    const detail = typeof body?.detail === "string" ? body.detail : null;
    throw new DecisionMutationError(classifyFailure(status), detail);
  }
  return result.data;
}

/**
 * One idempotency key per unchanged payload: reused for retries, replaced only when the payload
 * signature changes or the scope is reset (success / neutral dismissal).
 */
export function createIdempotencyScope(generate: () => string = () => crypto.randomUUID()) {
  let signature: string | null = null;
  let key: string | null = null;
  return {
    keyFor(nextSignature: string) {
      if (key === null || signature !== nextSignature) {
        signature = nextSignature;
        key = generate();
      }
      return key;
    },
    reset() {
      signature = null;
      key = null;
    },
  };
}

export function formatUtc(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function formatRelativeExpiry(iso: string, now: number) {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "expiry unknown";
  const diffMinutes = Math.round((target - now) / 60000);
  const abs = Math.abs(diffMinutes);
  const unit = abs >= 1440 ? `${Math.round(abs / 1440)}d` : abs >= 60 ? `${Math.round(abs / 60)}h` : `${abs}m`;
  return diffMinutes >= 0 ? `expires in ${unit}` : `expired ${unit} ago`;
}

function statusTone(status: DecisionResponse["status"]) {
  if (status === "approved") return "up" as const;
  if (status === "pending_approval") return "degraded" as const;
  if (status === "rejected" || status === "risk_blocked") return "down" as const;
  return "idle" as const;
}

const monoClass = "font-mono text-xs tabular-nums [overflow-wrap:anywhere]";

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{label}</div>
      <div className="text-sm [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

export type DecisionListProps = {
  decisions: DecisionResponse[];
  now: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
};

export function DecisionList({ decisions, now, onSelect, selectedId }: DecisionListProps) {
  return (
    <ul aria-label="Pending decisions" className="space-y-3">
      {decisions.map((decision) => {
        const selected = decision.id === selectedId;
        return (
          <li key={decision.id}>
            <button
              aria-pressed={selected}
              className={cn(
                "min-h-11 w-full rounded-[20px] border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
                selected
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--muted))]"
                  : "border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)]",
              )}
              onClick={() => onSelect(decision.id)}
              type="button"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Strategy version">
                  <span className={monoClass}>{decision.strategy_version_id}</span>
                </Field>
                <Field label="Account scope">{decision.account_scope}</Field>
                <Field label="Decision ID">
                  <span className={monoClass}>{decision.id}</span>
                </Field>
                <Field label="Status">
                  <StatusBadge className="text-xs font-semibold" label={decision.status} status={statusTone(decision.status)} />
                  <span className="ml-2">Revision {decision.revision}</span>
                </Field>
                <Field label="Expiry">
                  {formatUtc(decision.valid_until)} · {formatRelativeExpiry(decision.valid_until, now)}
                </Field>
                <Field label="Original action">{decision.original_action}</Field>
                <Field label="Final action">{decision.final_action}</Field>
                <Field label="Execution">
                  <StatusBadge className="text-xs font-semibold" label={decision.execution_status} status="idle" />
                </Field>
                <Field label="Reconciliation">
                  <StatusBadge className="text-xs font-semibold" label={decision.reconciliation_status} status="idle" />
                </Field>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export type DecisionDetailProps = {
  busy: boolean;
  decision: DecisionResponse;
  onAction: (action: DecisionActionKind) => void;
  onToggleTrace: () => void;
  principal: PrincipalResponse | undefined;
  trace: { data?: TraceResponse; error: boolean; loading: boolean; open: boolean };
};

export function DecisionDetail({ busy, decision, onAction, onToggleTrace, principal, trace }: DecisionDetailProps) {
  const meta = decision.action_metadata;
  const canAct = principal?.can_approve === true;
  const anyAvailable = canAct && (meta.can_approve || meta.can_modify || meta.can_reject);
  const terminalReason = !meta.can_approve && !meta.can_modify && !meta.can_reject ? describeUnavailable(meta.approve_reason) : null;

  return (
    <div className="space-y-4" data-testid="decision-detail">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Policy digest">
          <span className={monoClass}>{decision.policy_sha256}</span>
        </Field>
        <Field label="Selected evaluations">
          <span className={monoClass}>{decision.final_json.selected_evaluation_ids.join(", ") || "None"}</span>
        </Field>
        <Field label="Original recommendation">
          {decision.original_json.final_action}
          {decision.original_json.override_reason ? ` — ${decision.original_json.override_reason}` : ""}
        </Field>
        <Field label="Final recommendation">
          {decision.final_json.final_action}
          {decision.final_json.override_reason ? ` — ${decision.final_json.override_reason}` : ""}
        </Field>
        <Field label="Risk snapshot">
          Allowed: {decision.risk_snapshot_json.allowed_actions.join(", ") || "none"}
          {decision.risk_snapshot_json.hard_failures.length > 0
            ? ` · Hard failures: ${decision.risk_snapshot_json.hard_failures.join(", ")}`
            : ""}
        </Field>
        <Field label="Portfolio snapshot">
          {Object.keys(decision.portfolio_snapshot_json).length} frozen fields
        </Field>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Event history</div>
        {decision.event_history.length === 0 ? (
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">No events recorded.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {decision.event_history.map((event) => (
              <li className="text-sm [overflow-wrap:anywhere]" key={event.id}>
                {formatUtc(event.created_at)} · {event.event_type} · actor <span className={monoClass}>{event.actor_id}</span> · revision {event.expected_revision}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button aria-expanded={trace.open} className="min-h-11 gap-2" onClick={onToggleTrace} variant="outline">
          View trace
        </Button>
      </div>
      {trace.open ? (
        <div aria-busy={trace.loading} className="rounded-[20px] border border-[hsl(var(--border))] p-4" role="region" aria-label="Decision trace">
          {trace.loading ? (
            <p className="text-sm">Loading…</p>
          ) : trace.error || !trace.data ? (
            <p className="text-sm">{COPY.loadError}</p>
          ) : (
            <ol className="space-y-2">
              {trace.data.stages.map((stage) => (
                <li className="text-sm [overflow-wrap:anywhere]" key={stage.position}>
                  {stage.position}. {stage.name} · <span className="font-semibold">{stage.state}</span> · {stage.reason}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}

      {principal && !canAct ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Read-only access</p>
      ) : terminalReason ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Actions unavailable: {terminalReason}</p>
      ) : anyAvailable ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {meta.can_approve ? (
            <Button className="min-h-11" disabled={busy} onClick={() => onAction("approve")}>
              Approve Decision
            </Button>
          ) : null}
          {meta.can_modify ? (
            <Button className="min-h-11" disabled={busy} onClick={() => onAction("modify")} variant="outline">
              Modify Decision
            </Button>
          ) : null}
          {meta.can_reject ? (
            <Button className="min-h-11 sm:ml-4" disabled={busy} onClick={() => onAction("reject")} variant="destructive">
              Reject Decision
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type DecisionReviewViewProps = {
  busy?: boolean;
  decisions: DecisionResponse[] | undefined;
  error: boolean;
  loading: boolean;
  notice?: ReactNode;
  now: number;
  onAction: (action: DecisionActionKind) => void;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onToggleTrace: () => void;
  principal: PrincipalResponse | undefined;
  selectedId: string | null;
  selectionError?: string | null;
  trace: DecisionDetailProps["trace"];
};

/** Presentational panel (also used directly by static-markup tests). */
export function DecisionReviewView(props: DecisionReviewViewProps) {
  const { decisions, error, loading, now, onRetry, principal, selectedId } = props;
  const selected = decisions?.find((decision) => decision.id === selectedId) ?? null;

  return (
    <PanelFrame
      action={
        <Button className="min-h-11 gap-2" onClick={onRetry} variant="outline">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </Button>
      }
      description="Review frozen pending decisions in place. Kairos never submits an order; approval only makes a decision eligible for the existing paper execution path."
      eyebrow="Decision Review"
      title="Pending decisions"
      typography="phase100"
    >
      <div aria-busy={loading} className="space-y-4">
        {props.notice}
        {error ? (
          <ErrorState
            action={
              <Button className="min-h-11" onClick={onRetry} variant="outline">
                Retry
              </Button>
            }
            message={COPY.loadError}
          />
        ) : loading ? (
          <div className="panel-surface h-40 rounded-[24px] motion-safe:animate-pulse">
            <span className="p-4 text-sm">Loading…</span>
          </div>
        ) : !decisions || decisions.length === 0 ? (
          <EmptyState message={COPY.emptyBody} title={COPY.emptyTitle} />
        ) : (
          <>
            <MetricCard
              className="max-w-xs"
              label="Pending"
              typography="phase100"
              value={decisions.length}
            />
            {principal && !principal.can_approve ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Read-only access</p>
            ) : null}
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
              <DecisionList decisions={decisions} now={now} onSelect={props.onSelect} selectedId={selectedId} />
              {props.selectionError ? (
                <ErrorState message={props.selectionError} title="Decision unavailable" />
              ) : selected ? (
                <DecisionDetail
                  busy={props.busy ?? false}
                  decision={selected}
                  onAction={props.onAction}
                  onToggleTrace={props.onToggleTrace}
                  principal={principal}
                  trace={props.trace}
                />
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Select a decision to review its frozen evidence.</p>
              )}
            </div>
          </>
        )}
      </div>
    </PanelFrame>
  );
}

export type ActionDialogBodyProps = {
  action: DecisionActionKind;
  decision: DecisionResponse;
  errorMessage: string | null;
  finalAction: string;
  onFinalActionChange: (value: string) => void;
  onNeutral: () => void;
  onReasonChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
  pending: boolean;
  reason: string;
  showRefresh: boolean;
  showRetry: boolean;
};

export function ActionDialogBody(props: ActionDialogBodyProps) {
  const { action, decision, pending } = props;
  const copy = ACTION_COPY[action];
  const needsReason = action !== "approve";
  const reasonMissing = needsReason && props.reason.trim() === "";
  const modifyUnchanged = action === "modify" && props.finalAction === decision.final_action;
  const softChoices = decision.risk_snapshot_json.allowed_actions;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{copy.title}</DialogTitle>
        <DialogDescription>{consequenceCopy(action, decision.id)}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <p className="text-sm [overflow-wrap:anywhere]">
          Revision {decision.revision} · <span className={monoClass}>{decision.id}</span>
        </p>
        {action === "modify" ? (
          <div className="space-y-2">
            <p className="text-sm">Original: {decision.original_json.final_action}</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.22em]" htmlFor="decision-final-action">
              Final action
            </label>
            <select
              className="min-h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 text-sm"
              disabled={pending}
              id="decision-final-action"
              onChange={(event) => props.onFinalActionChange(event.target.value)}
              value={props.finalAction}
            >
              {softChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {needsReason ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.22em]" htmlFor="decision-reason">
              Reason
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent p-3 text-sm"
              disabled={pending}
              id="decision-reason"
              onChange={(event) => props.onReasonChange(event.target.value)}
              required
              value={props.reason}
            />
          </div>
        ) : null}
        {props.errorMessage ? (
          <p className="text-sm text-rose-200" role="alert">
            {props.errorMessage}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus className="min-h-11" disabled={pending} onClick={props.onNeutral} variant="outline">
            {copy.neutral}
          </Button>
          {props.showRefresh ? (
            <Button className="min-h-11 gap-2" onClick={props.onRefresh} variant="outline">
              Refresh Record
            </Button>
          ) : null}
          {props.showRetry ? (
            <Button className="min-h-11" disabled={pending} onClick={props.onSubmit} variant="outline">
              Retry
            </Button>
          ) : null}
          <Button
            className="min-h-11 gap-2"
            disabled={pending || reasonMissing || modifyUnchanged || props.showRefresh}
            onClick={props.onSubmit}
            variant={action === "reject" ? "destructive" : "default"}
          >
            {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : null}
            {pending ? copy.pending : copy.confirm}
          </Button>
        </div>
      </div>
    </>
  );
}

type DecisionActionDialogProps = {
  action: DecisionActionKind;
  decision: DecisionResponse;
  onClose: () => void;
  onFailure: (kind: FailureKind) => void;
  onPendingChange: (pending: boolean) => void;
  onRefresh: () => void;
  onSuccess: (message: string) => void;
};

function DecisionActionDialog({
  action,
  decision,
  onClose,
  onFailure,
  onPendingChange,
  onRefresh,
  onSuccess,
}: DecisionActionDialogProps) {
  const scope = useRef(createIdempotencyScope());
  const inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const [finalAction, setFinalAction] = useState<string>(decision.final_action);
  const [failure, setFailure] = useState<{ detail: string | null; kind: FailureKind } | null>(null);

  const mutation = useMutation({
    mutationFn: async (vars: { key: string }) => {
      if (action === "reject") {
        return unwrapMutation(() =>
          rejectDecisionApiV1DecisionsDecisionIdRejectPost({
            body: { expected_revision: decision.revision, reason: reason.trim() },
            headers: { "Idempotency-Key": vars.key },
            path: { decision_id: decision.id },
          }),
        );
      }
      return unwrapMutation(() =>
        approveDecisionApiV1DecisionsDecisionIdApprovePost({
          body:
            action === "modify"
              ? {
                  expected_revision: decision.revision,
                  final_action: finalAction as DecisionResponse["final_action"],
                  override_reason: reason.trim(),
                }
              : { expected_revision: decision.revision },
          headers: { "Idempotency-Key": vars.key },
          path: { decision_id: decision.id },
        }),
      );
    },
  });

  const submit = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    onPendingChange(true);
    setFailure(null);
    const signature = JSON.stringify([action, decision.id, decision.revision, finalAction, reason.trim()]);
    const key = scope.current.keyFor(signature);
    mutation.mutate(
      { key },
      {
        onError: (error) => {
          const typed = error instanceof DecisionMutationError ? error : new DecisionMutationError("network", null);
          setFailure({ detail: typed.detail, kind: typed.kind });
          onFailure(typed.kind);
        },
        onSettled: () => {
          inFlight.current = false;
          onPendingChange(false);
        },
        onSuccess: () => {
          scope.current.reset();
          onSuccess(
            action === "approve" ? COPY.successApprove : action === "modify" ? COPY.successModify : COPY.successReject,
          );
        },
      },
    );
  };

  const neutral = () => {
    scope.current.reset();
    onClose();
  };

  let errorMessage: string | null = null;
  if (failure) {
    errorMessage =
      failure.kind === "forbidden"
        ? COPY.permission
        : failure.kind === "conflict"
          ? COPY.conflict
          : failure.kind === "unprocessable"
            ? (failure.detail ?? "Poseidon rejected this change; no state was changed.")
            : COPY.networkError;
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) neutral();
      }}
      open
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <ActionDialogBody
          action={action}
          decision={decision}
          errorMessage={errorMessage}
          finalAction={finalAction}
          onFinalActionChange={setFinalAction}
          onNeutral={neutral}
          onReasonChange={setReason}
          onRefresh={onRefresh}
          onSubmit={submit}
          pending={mutation.isPending}
          reason={reason}
          showRefresh={failure?.kind === "conflict"}
          showRetry={failure?.kind === "network"}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DecisionReviewPanel() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DecisionActionKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const principalQuery = useQuery({
    ...getPrincipalApiV1PrincipalGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });
  const decisionsQuery = useQuery({
    ...listDecisionsApiV1DecisionsGetOptions({ query: { status: "pending_approval" } }),
    ...getMonitoringQueryOptions("overview"),
  });
  const decisions = decisionsQuery.data;
  const selected = decisions?.find((decision) => decision.id === selectedId) ?? null;

  const traceQuery = useQuery({
    ...getDecisionTraceApiV1TracesDecisionsDecisionIdGetOptions({ path: { decision_id: selectedId ?? "" } }),
    ...getMonitoringQueryOptions("overview"),
    enabled: traceOpen && selectedId !== null,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: listDecisionsApiV1DecisionsGetQueryKey({ query: { status: "pending_approval" } }) }),
      queryClient.invalidateQueries({ queryKey: getPrincipalApiV1PrincipalGetQueryKey() }),
    ]);

  const refresh = () => {
    void decisionsQuery.refetch();
    void principalQuery.refetch();
  };

  const handleFailure = (kind: FailureKind) => {
    if (kind === "forbidden") {
      setNotice(COPY.permission);
      void invalidate();
    } else if (kind === "not_found") {
      setDialogAction(null);
      setSelectionError(`Decision ${selectedId ?? ""} was not found in Poseidon. No state was changed.`);
      void invalidate();
      listRef.current?.focus();
    }
  };

  const view = (
    <div ref={listRef} tabIndex={-1}>
      <DecisionReviewView
        busy={busy}
        decisions={decisions}
        error={decisionsQuery.isError}
        loading={decisionsQuery.isPending}
        notice={
          notice ? (
            <p className="text-sm" role="status">
              {notice}
            </p>
          ) : null
        }
        now={now}
        onAction={setDialogAction}
        onRetry={refresh}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectionError(null);
          setTraceOpen(false);
          setNotice(null);
        }}
        onToggleTrace={() => setTraceOpen((open) => !open)}
        principal={principalQuery.data}
        selectedId={selectedId}
        selectionError={selectionError}
        trace={{ data: traceQuery.data, error: traceQuery.isError, loading: traceQuery.isPending && traceOpen, open: traceOpen }}
      />
    </div>
  );

  return (
    <>
      {view}
      {dialogAction && selected ? (
        <DecisionActionDialog
          action={dialogAction}
          decision={selected}
          key={`${dialogAction}:${selected.id}`}
          onClose={() => setDialogAction(null)}
          onFailure={handleFailure}
          onPendingChange={setBusy}
          onRefresh={refresh}
          onSuccess={(message) => {
            setDialogAction(null);
            setNotice(message);
            void invalidate();
          }}
        />
      ) : null}
    </>
  );
}
