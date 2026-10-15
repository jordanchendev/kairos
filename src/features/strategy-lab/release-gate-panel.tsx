import { useRef, useState, type ReactNode } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

import {
  getPrincipalApiV1PrincipalGetOptions,
  getPrincipalApiV1PrincipalGetQueryKey,
  getReleaseGateApiV1StrategiesStrategyIdReleaseGateGetOptions,
  getReleaseStateApiV1StrategiesStrategyIdReleaseStateGetOptions,
  listReleaseEventsApiV1StrategiesStrategyIdReleaseEventsGetOptions,
  listRollbackTargetsApiV1StrategiesStrategyIdRollbackTargetsGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import {
  pauseStrategyApiV1StrategiesStrategyIdPausePost,
  rejectStrategyApiV1StrategiesStrategyIdRejectPost,
  releaseStrategyApiV1StrategiesStrategyIdReleasePost,
  rollbackStrategyApiV1StrategiesStrategyIdRollbackPost,
} from "@/api/poseidon/sdk.gen";
import type {
  PrincipalResponse,
  ReleaseEventResponse,
  ReleaseGateResponse,
  ReleaseMutationResponse,
  ReleasePredicateResponse,
  ReleaseStateCandidate,
  ReleaseStateResponse,
  ReleaseStateVersionIdentity,
  RollbackTargetResponse,
} from "@/api/poseidon/types.gen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useReturnFocusOnClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { StatusBadge } from "@/features/monitoring/status-badge";
import {
  DecisionMutationError,
  createIdempotencyScope,
  formatUtc,
  resetDeviceKeyQueries,
  unwrapMutation,
  type FailureKind,
} from "@/features/portfolio/decision-review-panel";
import { DeviceKeyDialog, DeviceKeyRequiredNotice, useDeviceKeyPresence } from "@/features/settings/device-key-dialog";
import { hasDeviceKey, poseidonAuthClient } from "@/lib/api/runtime";

export const RELEASE_COPY = {
  conflict: "This record changed in Poseidon. Refresh and review the current revision before retrying.",
  emptyCampaignBody: "This strategy has no release-eligible campaign comparison yet.",
  emptyCampaignTitle: "No frozen campaign",
  emptyHistoryBody: "This strategy has not been released, paused, rolled back, or rejected.",
  emptyHistoryTitle: "No release events",
  gateFailure: "Release blocked. Review every failed predicate below; no state was changed.",
  loadError: "Decision and release data could not be loaded. Retry; no state was changed.",
  permission: "You no longer have permission for this action. No state was changed.",
  success: {
    pause: "Strategy paused. New exposure is blocked; protective exits and reconciliation remain available.",
    reject: "Rejection recorded. The active version pointer did not change.",
    release: "Candidate released. The active version pointer and immutable release event were updated together.",
    rollback: "Rollback recorded. The active version pointer changed; no order was submitted or replayed.",
  },
} as const;

export type ReleaseActionKind = "release" | "pause" | "rollback" | "reject";

export const RELEASE_ACTION_COPY: Record<
  ReleaseActionKind,
  { confirm: string; neutral: string; pending: string; title: string }
> = {
  pause: { confirm: "Pause Strategy", neutral: "Keep Strategy Active", pending: "Pausing…", title: "Pause strategy?" },
  reject: { confirm: "Reject Candidate", neutral: "Keep Candidate", pending: "Rejecting…", title: "Reject candidate?" },
  release: {
    confirm: "Release Candidate",
    neutral: "Keep Incumbent Active",
    pending: "Releasing…",
    title: "Release candidate?",
  },
  rollback: {
    confirm: "Roll Back Strategy",
    neutral: "Keep Current Version",
    pending: "Rolling back…",
    title: "Roll back strategy?",
  },
};

export function versionLabel(version: ReleaseStateVersionIdentity | null | undefined) {
  return version ? `v${version.version_no}` : "none";
}

export type ConsequenceInput = {
  accountScope: string;
  candidate: string;
  current: string;
  incumbent: string;
  strategyName: string;
  target: string;
};

export function releaseConsequence(kind: ReleaseActionKind, input: ConsequenceInput) {
  switch (kind) {
    case "release":
      return `Replace active version ${input.incumbent} with ${input.candidate} for ${input.accountScope}. Poseidon will atomically write the pointer and release event.`;
    case "pause":
      return `Clear the active version for ${input.strategyName}. New exposure and ordinary claims stop; protective exits and reconciliation continue.`;
    case "rollback":
      return `Change the active pointer from ${input.current} to ${input.target}. No target orders will be emitted and no old orders will be replayed.`;
    case "reject":
      return `Record a terminal rejection for ${input.candidate}. Active version ${input.incumbent} will not change.`;
  }
}

/* ---------- holdout and predicates ---------- */

export type HoldoutDisplay = { label: string | null; state: "Passed" | "Blocked" | "Unavailable" };

/** Exact UI-SPEC holdout labels; ownership_mismatch / unavailable fall back to explicit evidence states only. */
export function holdoutDisplay(state: string): HoldoutDisplay {
  switch (state) {
    case "consumed_by_this_campaign":
      return { label: "Consumed by this campaign", state: "Passed" };
    case "consumed_by_another_campaign":
      return { label: "Consumed by another campaign", state: "Blocked" };
    case "reuse_denied":
      return { label: "Reuse denied", state: "Blocked" };
    case "ownership_mismatch":
      return { label: null, state: "Blocked" };
    default:
      return { label: null, state: "Unavailable" };
  }
}

type PredicateState = ReleasePredicateResponse["state"];
const STATE_LABEL: Record<PredicateState, string> = {
  blocked: "Blocked",
  inconclusive: "Inconclusive",
  passed: "Passed",
  unavailable: "Unavailable",
};

function tone(state: PredicateState) {
  return state === "passed" ? ("up" as const) : state === "blocked" ? ("down" as const) : state === "inconclusive" ? ("degraded" as const) : ("idle" as const);
}

export const GATE_ROWS: { codes: ReleasePredicateResponse["code"][]; title: string }[] = [
  { codes: ["candidate_identity"], title: "Frozen strategy-version identity" },
  { codes: ["campaign_identity", "six_cell_evidence"], title: "Campaign contract and terminal paired-trial coverage" },
  { codes: ["review_identity"], title: "Powered review status" },
  { codes: ["reconciliation"], title: "Account reconciliation" },
  { codes: ["policy_identity"], title: "Content/policy hash identity" },
  { codes: ["holdout_ownership"], title: "Holdout ownership/reuse state" },
  { codes: ["incumbent_pointer"], title: "Incumbent matches current active pointer" },
  { codes: ["release_authority"], title: "Actor role and account scope" },
];

const monoClass = "font-mono text-xs tabular-nums [overflow-wrap:anywhere]";

function evidenceEntries(predicate: ReleasePredicateResponse) {
  return Object.entries(predicate.evidence as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0),
  );
}

export function PredicateRows({ gate }: { gate: ReleaseGateResponse | undefined }) {
  return (
    <div aria-label="Release gate predicates" className="space-y-4" role="group">
      {GATE_ROWS.map((group) => (
        <section aria-label={group.title} className="space-y-2" key={group.title}>
          <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{group.title}</h4>
          <ul className="space-y-3">
            {group.codes.map((code) => {
              const predicate = gate?.predicates.find((candidate) => candidate.code === code);
              return (
                <li className="rounded-[20px] border border-[hsl(var(--border))] p-4" data-predicate-code={code} key={code}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{code}</span>
                    {predicate ? (
                      <StatusBadge className="text-xs font-semibold" label={STATE_LABEL[predicate.state]} status={tone(predicate.state)} />
                    ) : (
                      <StatusBadge className="text-xs font-semibold" label="Unavailable" status="idle" />
                    )}
                  </div>
                  {predicate ? (
                    <div className="mt-2 space-y-1 text-sm [overflow-wrap:anywhere]">
                      <div>{predicate.reason}</div>
                      <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr]">
                        {evidenceEntries(predicate).map(([key, value]) => (
                          <div className="contents" key={key}>
                            <dt className="text-[hsl(var(--muted-foreground))]">{key}</dt>
                            <dd className={monoClass}>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------- payload builders (pure) ---------- */

type Pointer = { expected_active_version_id: string | null; expected_revision: number };

export function pointerOf(state: ReleaseStateResponse): Pointer {
  return { expected_active_version_id: state.active_version_id, expected_revision: state.release_revision };
}

export function buildReleaseBody(state: ReleaseStateResponse, candidate: ReleaseStateCandidate, reviewId: string, reconciliationId: string, reason: string) {
  return {
    ...pointerOf(state),
    campaign_id: candidate.campaign_id,
    candidate_version_id: candidate.candidate.strategy_version_id,
    reason,
    reconciliation_id: reconciliationId,
    review_id: reviewId,
  };
}

export function buildPauseBody(state: ReleaseStateResponse, reason: string) {
  return { ...pointerOf(state), reason };
}

export function buildRollbackBody(state: ReleaseStateResponse, targetId: string, reconciliationId: string, reason: string) {
  return { ...pointerOf(state), reason, reconciliation_id: reconciliationId, target_version_id: targetId };
}

export function buildRejectBody(state: ReleaseStateResponse, candidate: ReleaseStateCandidate, reason: string) {
  return { ...pointerOf(state), candidate_version_id: candidate.candidate.strategy_version_id, reason };
}

export function latestReview(candidate: ReleaseStateCandidate) {
  return [...candidate.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function sortEventsNewestFirst(events: ReleaseEventResponse[]) {
  return [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export type ReleaseGateQuery = {
  campaign_id: string;
  candidate_version_id: string;
  reconciliation_id: string;
  review_id: string;
};

/**
 * Every release-loop request goes through the device-key client (D-09): `/poseidon-auth/...`
 * with the browser-local key. The legacy `/poseidon` route carries no human authority.
 */
export const releaseLoopRequests = {
  events: (strategyId: string) =>
    listReleaseEventsApiV1StrategiesStrategyIdReleaseEventsGetOptions({ client: poseidonAuthClient, path: { strategy_id: strategyId } }),
  gate: (strategyId: string, query: ReleaseGateQuery) =>
    getReleaseGateApiV1StrategiesStrategyIdReleaseGateGetOptions({ client: poseidonAuthClient, path: { strategy_id: strategyId }, query }),
  principal: () => getPrincipalApiV1PrincipalGetOptions({ client: poseidonAuthClient }),
  principalKey: () => getPrincipalApiV1PrincipalGetQueryKey({ client: poseidonAuthClient }),
  rollbackTargets: (strategyId: string, reconciliationId: string) =>
    listRollbackTargetsApiV1StrategiesStrategyIdRollbackTargetsGetOptions({
      client: poseidonAuthClient,
      path: { strategy_id: strategyId },
      query: { reconciliation_id: reconciliationId },
    }),
  state: (strategyId: string) =>
    getReleaseStateApiV1StrategiesStrategyIdReleaseStateGetOptions({ client: poseidonAuthClient, path: { strategy_id: strategyId } }),
};

type ReleaseMutationInput<TBody> = { body: TBody; idempotencyKey: string; strategyId: string };

/** The four Phase 100 release mutations, all sent with the device key. */
export const releaseLoopMutations = {
  pause: ({ body, idempotencyKey, strategyId }: ReleaseMutationInput<ReturnType<typeof buildPauseBody>>) =>
    unwrapMutation(() =>
      pauseStrategyApiV1StrategiesStrategyIdPausePost({
        body,
        client: poseidonAuthClient,
        headers: { "Idempotency-Key": idempotencyKey },
        path: { strategy_id: strategyId },
      }),
    ),
  reject: ({ body, idempotencyKey, strategyId }: ReleaseMutationInput<ReturnType<typeof buildRejectBody>>) =>
    unwrapMutation(() =>
      rejectStrategyApiV1StrategiesStrategyIdRejectPost({
        body,
        client: poseidonAuthClient,
        headers: { "Idempotency-Key": idempotencyKey },
        path: { strategy_id: strategyId },
      }),
    ),
  release: ({ body, idempotencyKey, strategyId }: ReleaseMutationInput<ReturnType<typeof buildReleaseBody>>) =>
    unwrapMutation(() =>
      releaseStrategyApiV1StrategiesStrategyIdReleasePost({
        body,
        client: poseidonAuthClient,
        headers: { "Idempotency-Key": idempotencyKey },
        path: { strategy_id: strategyId },
      }),
    ),
  rollback: ({ body, idempotencyKey, strategyId }: ReleaseMutationInput<ReturnType<typeof buildRollbackBody>>) =>
    unwrapMutation(() =>
      rollbackStrategyApiV1StrategiesStrategyIdRollbackPost({
        body,
        client: poseidonAuthClient,
        headers: { "Idempotency-Key": idempotencyKey },
        path: { strategy_id: strategyId },
      }),
    ),
};

export function isReleaseScopeNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { detail?: unknown; response?: { status?: unknown }; status?: unknown };
  return (
    candidate.status === 404 ||
    candidate.response?.status === 404 ||
    (typeof candidate.detail === "string" && candidate.detail === "Strategy release scope not found")
  );
}

/* ---------- presentation ---------- */

function IdentityCard({ heading, version, extra }: { extra?: ReactNode; heading: string; version: ReleaseStateVersionIdentity | null }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[hsl(var(--border))] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{heading}</div>
      {version ? (
        <dl className="mt-2 space-y-1 text-sm [overflow-wrap:anywhere]">
          <div>Version {version.version_no} · {version.status}</div>
          <div className={monoClass}>{version.strategy_version_id}</div>
          <div>
            Content hash: <span className={monoClass}>{version.content_sha256}</span>
          </div>
          <div>
            Policy hash: <span className={monoClass}>{version.policy_sha256}</span>
          </div>
          {extra}
        </dl>
      ) : (
        <p className="mt-2 text-sm">No active version</p>
      )}
    </div>
  );
}

export type ReleaseGateViewProps = {
  busy: boolean;
  /** Device-key settings trigger shown next to Refresh. */
  deviceKeyControl?: ReactNode;
  /** When set (no device key stored), replaces the panel body; no loop data is shown or requested. */
  deviceKeyRequired?: ReactNode;
  events: ReleaseEventResponse[] | undefined;
  gate: ReleaseGateResponse | undefined;
  gateError: boolean;
  notFound: boolean;
  notice: ReactNode;
  onAction: (kind: ReleaseActionKind) => void;
  onRefresh: () => void;
  onSelectCandidate: (campaignId: string) => void;
  onSelectTarget: (versionId: string) => void;
  principal: PrincipalResponse | undefined;
  selectedCampaignId: string | null;
  selectedTargetId: string | null;
  state: ReleaseStateResponse | undefined;
  stateError: boolean;
  stateLoading: boolean;
  targets: RollbackTargetResponse[] | undefined;
};

export function ReleaseGateView(props: ReleaseGateViewProps) {
  const { gate, principal, state } = props;
  const candidates = state ? [...state.candidates].sort((a, b) => b.campaign_created_at.localeCompare(a.campaign_created_at)) : [];
  const candidate = candidates.find((c) => c.campaign_id === props.selectedCampaignId) ?? candidates[0] ?? null;
  const review = candidate ? latestReview(candidate) : null;
  const canRelease = principal?.can_release === true;
  const target = props.targets?.find((t) => t.strategy_version_id === props.selectedTargetId) ?? props.targets?.[0] ?? null;

  const refresh = (
    <Button className="min-h-11 gap-2" onClick={props.onRefresh} variant="outline">
      <RefreshCw aria-hidden="true" className="h-4 w-4" />
      Refresh
    </Button>
  );

  let body: ReactNode;
  if (props.deviceKeyRequired) {
    body = props.deviceKeyRequired;
  } else if (props.stateError) {
    body = <ErrorState action={<Button className="min-h-11" onClick={props.onRefresh} variant="outline">Retry</Button>} message={RELEASE_COPY.loadError} />;
  } else if (props.stateLoading) {
    body = (
      <div className="panel-surface h-40 rounded-[24px] p-4 motion-safe:animate-pulse">
        <span className="text-sm">Loading…</span>
      </div>
    );
  } else if (props.notFound || !state || !candidate) {
    body = <EmptyState message={RELEASE_COPY.emptyCampaignBody} title={RELEASE_COPY.emptyCampaignTitle} />;
  } else {
    const holdout = review ? holdoutDisplay(review.holdout.state) : null;
    body = (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <IdentityCard
            extra={<div>Pointer: {state.pointer_state} · revision {state.release_revision}</div>}
            heading="Incumbent (active pointer)"
            version={state.active_version ?? state.authority_version}
          />
          <IdentityCard heading="Candidate" version={candidate.candidate} />
        </div>

        {candidates.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Candidate campaigns">
            {candidates.map((c) => (
              <Button
                aria-pressed={c.campaign_id === candidate.campaign_id}
                className="min-h-11"
                key={c.campaign_id}
                onClick={() => props.onSelectCandidate(c.campaign_id)}
                variant={c.campaign_id === candidate.campaign_id ? "default" : "outline"}
              >
                {versionLabel(c.candidate)} · {c.campaign_id.slice(0, 8)}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="rounded-[20px] border border-[hsl(var(--border))] p-4 text-sm [overflow-wrap:anywhere]">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Frozen campaign</div>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt>Campaign ID</dt>
            <dd className={monoClass}>{candidate.campaign_id}</dd>
            <dt>Hypothesis</dt>
            <dd>{candidate.hypothesis}</dd>
            <dt>Contract digest</dt>
            <dd className={monoClass}>{candidate.contract_sha256}</dd>
            <dt>Exact review input</dt>
            <dd className={monoClass}>{review?.input_sha256 ?? "Unavailable"}</dd>
            <dt>Review status</dt>
            <dd>{review ? review.status : "Unavailable"}</dd>
            <dt>Holdout</dt>
            <dd>
              {holdout ? `${holdout.label ? `${holdout.label} · ` : ""}${holdout.state}` : "Unavailable"}
            </dd>
          </dl>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Terminal trials"
              typography="phase100"
              value={`${candidate.terminal_trial_count}${candidate.declared_trial_count !== null ? ` / ${candidate.declared_trial_count}` : ""}`}
            />
            <MetricCard
              label="Coverage"
              typography="phase100"
              value={
                candidate.declared_trial_count
                  ? `${Math.round((candidate.terminal_trial_count / candidate.declared_trial_count) * 100)}%`
                  : "Unavailable"
              }
            />
          </div>
          {candidate.holdout_reuse_denials.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {candidate.holdout_reuse_denials.map((denial) => (
                <li key={denial.campaign_event_id}>
                  Reuse denied · {formatUtc(denial.created_at)} · owner <span className={monoClass}>{denial.owner_campaign_id ?? "unknown"}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {props.gateError ? (
          <ErrorState message={RELEASE_COPY.loadError} title="Release gate unavailable" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">Release gate</h3>
              {gate ? (
                <StatusBadge className="text-xs font-semibold" label={gate.allowed ? "Eligible" : "Not eligible"} status={gate.allowed ? "up" : "down"} />
              ) : (
                <StatusBadge className="text-xs font-semibold" label="Unavailable" status="idle" />
              )}
            </div>
            {gate && !gate.allowed ? <p className="text-sm">{RELEASE_COPY.gateFailure}</p> : null}
            <PredicateRows gate={gate} />
          </>
        )}

        {props.targets && props.targets.length > 0 && target ? (
          <div className="space-y-3 rounded-[20px] border border-[hsl(var(--border))] p-4 text-sm [overflow-wrap:anywhere]">
            <label className="block text-xs font-semibold uppercase tracking-[0.22em]" htmlFor="rollback-target">
              Rollback target
            </label>
            <select
              className="min-h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 text-sm"
              id="rollback-target"
              onChange={(event) => props.onSelectTarget(event.target.value)}
              value={target.strategy_version_id}
            >
              {props.targets.map((t) => (
                <option key={t.strategy_version_id} value={t.strategy_version_id}>
                  Version {t.version_no} · released revision {t.released_revision}
                </option>
              ))}
            </select>
            <ul className="space-y-1" aria-label="Rollback context">
              {(["rollback_holdings", "rollback_outstanding_work", "rollback_reconciliation", "rollback_policy"] as const).map((code) => {
                const predicate = target.predicates.find((p) => p.code === code);
                const heading =
                  code === "rollback_holdings"
                    ? "Current holdings"
                    : code === "rollback_outstanding_work"
                      ? "Outstanding intents/orders"
                      : code === "rollback_reconciliation"
                        ? "Reconciliation"
                        : "Takeover/exit policy";
                const active = predicate?.evidence.active_order_ids?.length;
                return (
                  <li key={code}>
                    <span className="font-semibold">{heading}:</span> {predicate ? `${STATE_LABEL[predicate.state]} — ${predicate.reason}` : "Unavailable"}
                    {code === "rollback_outstanding_work" && active !== undefined ? ` (${active} active orders)` : ""}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {props.notice}

        {principal && !canRelease ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Read-only access</p>
        ) : canRelease ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {gate?.allowed && review ? (
              <Button className="min-h-11" disabled={props.busy} onClick={() => props.onAction("release")}>
                Release Candidate
              </Button>
            ) : null}
            {state.pointer_state === "active" ? (
              <Button className="min-h-11" disabled={props.busy} onClick={() => props.onAction("pause")} variant="outline">
                Pause Strategy
              </Button>
            ) : null}
            {target ? (
              <Button className="min-h-11" disabled={props.busy} onClick={() => props.onAction("rollback")} variant="outline">
                Roll Back Strategy
              </Button>
            ) : null}
            <Button className="min-h-11 sm:ml-4" disabled={props.busy} onClick={() => props.onAction("reject")} variant="destructive">
              Reject Candidate
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="release-gate">
      <PanelFrame
        action={
          props.deviceKeyRequired ? undefined : (
            <div className="flex flex-wrap gap-2">
              {props.deviceKeyControl}
              {refresh}
            </div>
          )
        }
        description="Frozen campaign evidence and backend gate predicates. Poseidon is authoritative; Kairos never computes eligibility."
        eyebrow="Release Gate"
        title="Release candidate"
        typography="phase100"
      >
        <div aria-busy={props.deviceKeyRequired ? false : props.stateLoading}>{body}</div>
      </PanelFrame>
      {props.deviceKeyRequired ? null : <ReleaseHistory events={props.events} />}
    </div>
  );
}

export function ReleaseHistory({ events }: { events: ReleaseEventResponse[] | undefined }) {
  const sorted = events ? sortEventsNewestFirst(events) : [];
  return (
    <PanelFrame eyebrow="Release history" title="Release history" typography="phase100">
      {sorted.length === 0 ? (
        <EmptyState message={RELEASE_COPY.emptyHistoryBody} title={RELEASE_COPY.emptyHistoryTitle} />
      ) : (
        <>
          <table className="hidden w-full text-left text-sm lg:table">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em]">
                <th>Event time</th>
                <th>Event type</th>
                <th>From version</th>
                <th>To version</th>
                <th>Actor ID</th>
                <th>Reason / gate summary</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((event) => (
                <tr className="align-top [overflow-wrap:anywhere]" key={event.id}>
                  <td>{formatUtc(event.created_at)}</td>
                  <td>{event.event_type}</td>
                  <td className={monoClass}>{event.from_version_id ?? "none"}</td>
                  <td className={monoClass}>{event.to_version_id ?? "none"}</td>
                  <td>{event.actor_id}</td>
                  <td>
                    <HistoryDetail event={event} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="space-y-3 lg:hidden">
            {sorted.map((event) => (
              <li className="space-y-1 rounded-[20px] border border-[hsl(var(--border))] p-4 text-sm [overflow-wrap:anywhere]" key={event.id}>
                <div><span className="font-semibold">Event time:</span> {formatUtc(event.created_at)}</div>
                <div><span className="font-semibold">Event type:</span> {event.event_type}</div>
                <div><span className="font-semibold">From version:</span> <span className={monoClass}>{event.from_version_id ?? "none"}</span></div>
                <div><span className="font-semibold">To version:</span> <span className={monoClass}>{event.to_version_id ?? "none"}</span></div>
                <div><span className="font-semibold">Actor ID:</span> {event.actor_id}</div>
                <HistoryDetail event={event} />
              </li>
            ))}
          </ul>
        </>
      )}
    </PanelFrame>
  );
}

function HistoryDetail({ event }: { event: ReleaseEventResponse }) {
  return (
    <details>
      <summary className="min-h-11 cursor-pointer">{event.reason}</summary>
      <ul className="space-y-1">
        {event.gate_json.predicates.map((predicate) => (
          <li key={predicate.code}>
            {predicate.code}: {STATE_LABEL[predicate.state]} — {predicate.reason}
          </li>
        ))}
      </ul>
      <div className={monoClass}>
        campaign {event.campaign_id ?? "none"} · review {event.review_id ?? "none"} · reconciliation {event.reconciliation_id ?? "none"}
      </div>
    </details>
  );
}

/* ---------- action dialog ---------- */

export type ReleaseDialogBodyProps = {
  consequence: string;
  errorMessage: string | null;
  kind: ReleaseActionKind;
  onNeutral: () => void;
  onReasonChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
  pending: boolean;
  reason: string;
  showRefresh: boolean;
  showRetry: boolean;
};

export function ReleaseDialogBody(props: ReleaseDialogBodyProps) {
  const copy = RELEASE_ACTION_COPY[props.kind];
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{copy.title}</DialogTitle>
        <DialogDescription>{props.consequence}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.22em]" htmlFor="release-reason">
          Reason
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent p-3 text-sm"
          disabled={props.pending}
          id="release-reason"
          maxLength={1024}
          onChange={(event) => props.onReasonChange(event.target.value)}
          required
          value={props.reason}
        />
        {props.errorMessage ? (
          <p className="text-sm text-rose-200" role="alert">
            {props.errorMessage}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus className="min-h-11" disabled={props.pending} onClick={props.onNeutral} variant="outline">
            {copy.neutral}
          </Button>
          {props.showRefresh ? (
            <Button className="min-h-11" onClick={props.onRefresh} variant="outline">
              Refresh Record
            </Button>
          ) : null}
          {props.showRetry ? (
            <Button className="min-h-11" disabled={props.pending} onClick={props.onSubmit} variant="outline">
              Retry
            </Button>
          ) : null}
          <Button
            className="min-h-11 gap-2"
            disabled={props.pending || props.reason.trim() === "" || props.showRefresh}
            onClick={props.onSubmit}
            variant={props.kind === "reject" ? "destructive" : "default"}
          >
            {props.pending ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : null}
            {props.pending ? copy.pending : copy.confirm}
          </Button>
        </div>
      </div>
    </>
  );
}

export type ReleaseActionSpec = {
  consequence: string;
  kind: ReleaseActionKind;
  /** Stable description of the unchanged payload; a change here mints a new idempotency key. */
  payloadSignature: string;
  send: (key: string, reason: string) => Promise<ReleaseMutationResponse>;
};

function ReleaseActionDialog({
  onClose,
  onFailure,
  onPendingChange,
  onRefresh,
  onSuccess,
  spec,
}: {
  onClose: () => void;
  onFailure: (kind: FailureKind) => void;
  onPendingChange: (pending: boolean) => void;
  onRefresh: () => void;
  onSuccess: (message: string) => void;
  spec: ReleaseActionSpec;
}) {
  const scope = useRef(createIdempotencyScope());
  const inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<{ detail: string | null; kind: FailureKind } | null>(null);
  const mutation = useMutation({ mutationFn: (vars: { key: string }) => spec.send(vars.key, reason.trim()) });

  const submit = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    onPendingChange(true);
    setFailure(null);
    const key = scope.current.keyFor(JSON.stringify([spec.payloadSignature, reason.trim()]));
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
          onSuccess(RELEASE_COPY.success[spec.kind]);
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
        ? RELEASE_COPY.permission
        : failure.kind === "conflict"
          ? RELEASE_COPY.conflict
          : failure.kind === "unprocessable"
            ? RELEASE_COPY.gateFailure
            : RELEASE_COPY.loadError;
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) neutral();
      }}
      open
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <ReleaseDialogBody
          consequence={spec.consequence}
          errorMessage={errorMessage}
          kind={spec.kind}
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

/* ---------- container ---------- */

export function ReleaseGatePanel({ strategyId, strategyName }: { strategyId: string; strategyName: string }) {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [action, setAction] = useState<ReleaseActionSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useReturnFocusOnClose(action !== null, containerRef);
  const cadence = getMonitoringQueryOptions("overview");

  // Re-render when the device key is saved or cleared; without it no loop request is sent.
  useDeviceKeyPresence();
  const principalQuery = useQuery({ ...releaseLoopRequests.principal(), ...cadence, enabled: hasDeviceKey() });
  const stateQuery = useQuery({
    ...releaseLoopRequests.state(strategyId),
    ...cadence,
    enabled: hasDeviceKey(),
    retry: false,
  });
  const eventsQuery = useQuery({
    ...releaseLoopRequests.events(strategyId),
    ...cadence,
    enabled: hasDeviceKey(),
    retry: false,
  });

  const state = stateQuery.data;
  const notFound = isReleaseScopeNotFound(stateQuery.error);
  const candidates = state ? [...state.candidates].sort((a, b) => b.campaign_created_at.localeCompare(a.campaign_created_at)) : [];
  const candidate = candidates.find((c) => c.campaign_id === selectedCampaignId) ?? candidates[0] ?? null;
  const review = candidate ? latestReview(candidate) : null;
  const reconciliationId = candidate?.reconciliation?.reconciliation_id ?? null;
  const gateReady = Boolean(candidate && review && reconciliationId);

  const gateQuery = useQuery({
    ...releaseLoopRequests.gate(strategyId, {
      campaign_id: candidate?.campaign_id ?? "pending",
      candidate_version_id: candidate?.candidate.strategy_version_id ?? "pending",
      reconciliation_id: reconciliationId ?? "pending",
      review_id: review?.review_id ?? "pending",
    }),
    ...cadence,
    enabled: gateReady && hasDeviceKey(),
    retry: false,
  });
  const authorityReconciliationId = state?.authority_reconciliation?.reconciliation_id ?? null;
  const targetsQuery = useQuery({
    ...releaseLoopRequests.rollbackTargets(strategyId, authorityReconciliationId ?? "pending"),
    ...cadence,
    enabled: Boolean(authorityReconciliationId) && hasDeviceKey(),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ predicate: (query) => String((query.queryKey[0] as { _id?: string })?._id ?? "").match(/ReleaseState|ReleaseGate|ReleaseEvents|RollbackTargets|Principal/) !== null });

  const refresh = () => {
    if (!hasDeviceKey()) return;
    void stateQuery.refetch();
    void eventsQuery.refetch();
    void principalQuery.refetch();
    if (gateReady) void gateQuery.refetch();
    if (authorityReconciliationId) void targetsQuery.refetch();
  };

  const onDeviceKeyChange = () => {
    setNotice(null);
    void resetDeviceKeyQueries(queryClient);
  };

  const handleFailure = (kind: FailureKind) => {
    if (kind === "forbidden") {
      setNotice(RELEASE_COPY.permission);
      void queryClient.invalidateQueries({ queryKey: releaseLoopRequests.principalKey() });
    }
    if (kind === "conflict" || kind === "unprocessable") void invalidate();
  };

  const open = (kind: ReleaseActionKind) => {
    if (!state) return;
    const incumbent = versionLabel(state.active_version);
    const target = targetsQuery.data?.find((t) => t.strategy_version_id === selectedTargetId) ?? targetsQuery.data?.[0] ?? null;
    const base: ConsequenceInput = {
      accountScope: candidate?.account_scope ?? state.authority_version?.account_scope ?? "this account scope",
      candidate: versionLabel(candidate?.candidate),
      current: incumbent,
      incumbent,
      strategyName,
      target: target ? `v${target.version_no}` : "target",
    };
    const sig = JSON.stringify([kind, state.release_revision, state.active_version_id, candidate?.campaign_id, review?.review_id, reconciliationId, target?.strategy_version_id]);
    const common = { consequence: releaseConsequence(kind, base), kind, payloadSignature: sig };
    if (kind === "release" && candidate && review && reconciliationId) {
      setAction({
        ...common,
        send: (key, reason) =>
          releaseLoopMutations.release({
            body: buildReleaseBody(state, candidate, review.review_id, reconciliationId, reason),
            idempotencyKey: key,
            strategyId,
          }),
      });
    } else if (kind === "pause") {
      setAction({
        ...common,
        send: (key, reason) => releaseLoopMutations.pause({ body: buildPauseBody(state, reason), idempotencyKey: key, strategyId }),
      });
    } else if (kind === "rollback" && target && authorityReconciliationId) {
      setAction({
        ...common,
        send: (key, reason) =>
          releaseLoopMutations.rollback({
            body: buildRollbackBody(state, target.strategy_version_id, authorityReconciliationId, reason),
            idempotencyKey: key,
            strategyId,
          }),
      });
    } else if (kind === "reject" && candidate) {
      setAction({
        ...common,
        send: (key, reason) => releaseLoopMutations.reject({ body: buildRejectBody(state, candidate, reason), idempotencyKey: key, strategyId }),
      });
    }
  };

  return (
    <>
      <div ref={containerRef} tabIndex={-1}>
      <ReleaseGateView
        busy={busy}
        deviceKeyControl={<DeviceKeyDialog onChange={onDeviceKeyChange} />}
        deviceKeyRequired={hasDeviceKey() ? null : <DeviceKeyRequiredNotice onChange={onDeviceKeyChange} />}
        events={eventsQuery.data}
        gate={gateQuery.data}
        gateError={gateQuery.isError}
        notFound={notFound}
        notice={
          notice ? (
            <p className="text-sm" role="status">
              {notice}
            </p>
          ) : null
        }
        onAction={open}
        onRefresh={refresh}
        onSelectCandidate={(id) => {
          setSelectedCampaignId(id);
          setNotice(null);
        }}
        onSelectTarget={setSelectedTargetId}
        principal={principalQuery.data}
        selectedCampaignId={selectedCampaignId}
        selectedTargetId={selectedTargetId}
        state={state}
        stateError={stateQuery.isError && !notFound}
        stateLoading={stateQuery.isPending}
        targets={targetsQuery.data}
      />
      </div>
      {action ? (
        <ReleaseActionDialog
          key={action.payloadSignature}
          onClose={() => setAction(null)}
          onFailure={handleFailure}
          onPendingChange={setBusy}
          onRefresh={refresh}
          onSuccess={(message) => {
            setAction(null);
            setNotice(message);
            void invalidate();
          }}
          spec={action}
        />
      ) : null}
    </>
  );
}
