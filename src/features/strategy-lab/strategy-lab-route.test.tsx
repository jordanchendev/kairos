import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  BacktestResponse,
  PrincipalResponse,
  ReleaseEventResponse,
  ReleaseGateResponse,
  ReleasePredicateResponse,
  ReleaseStateCandidate,
  ReleaseStateResponse,
  ReleaseStateVersionIdentity,
  StrategyPerformanceResponse,
  StrategyResponse,
} from "@/api/poseidon/types.gen";
import { listStrategiesApiStrategiesGetOptions } from "@/api/poseidon/@tanstack/react-query.gen";
import { Dialog } from "@/components/ui/dialog";
import { DEVICE_KEY_STORAGE_KEY } from "@/lib/api/runtime";
import { TEST_DEVICE_KEY, installDeviceKeyHarness, jsonResponse, runQueryOptions } from "@/test/device-key-harness";
import {
  GATE_ROWS,
  RELEASE_COPY,
  ReleaseDialogBody,
  ReleaseGateView,
  ReleaseHistory,
  buildPauseBody,
  buildRejectBody,
  buildReleaseBody,
  buildRollbackBody,
  holdoutDisplay,
  isReleaseScopeNotFound,
  releaseLoopMutations,
  releaseLoopRequests,
  releaseConsequence,
  sortEventsNewestFirst,
  type ReleaseGateViewProps,
} from "@/features/strategy-lab/release-gate-panel";

const strategies: StrategyResponse[] = [
  {
    active: true,
    config: {
      lookback: 20,
      regime_filter: true,
    },
    created_at: "2026-03-01T00:00:00Z",
    id: "strategy-001",
    interval: "1d",
    market: "us_stock",
    model_version_id: null,
    name: "Momentum Core",
    strategy_type: "model",
    symbol: "AAPL",
    updated_at: "2026-03-31T00:00:00Z",
  },
  {
    active: false,
    config: {
      breakout_window: 14,
    },
    created_at: "2026-02-10T00:00:00Z",
    id: "strategy-002",
    interval: "4h",
    market: "crypto_perp",
    model_version_id: null,
    name: "Breakout Pulse",
    strategy_type: "rule",
    symbol: "BTCUSDT",
    updated_at: "2026-03-25T00:00:00Z",
  },
];

const selectedPerformance: StrategyPerformanceResponse = {
  backtest_count: 3,
  best: {
    backtest_id: "bt-003",
    completed_at: "2026-03-31T00:00:00Z",
    composite_score: 1.82,
    max_drawdown: -0.06,
    sharpe_ratio: 1.92,
    total_pnl: 24120,
    trade_count: 34,
    win_rate: 0.63,
  },
  latest: {
    backtest_id: "bt-004",
    completed_at: "2026-03-28T00:00:00Z",
    composite_score: 1.57,
    max_drawdown: -0.08,
    sharpe_ratio: 1.61,
    total_pnl: 19840,
    trade_count: 28,
    win_rate: 0.58,
  },
  strategy_id: "strategy-001",
};

const selectedBacktests: BacktestResponse[] = [
  {
    completed_at: "2026-03-10T00:00:00Z",
    config: { lookback: 14 },
    created_at: "2026-03-09T00:00:00Z",
    error_message: null,
    id: "bt-001",
    interval: "1d",
    market: "us_stock",
    metrics: {
      composite_score: 1.11,
      sharpe_ratio: 1.21,
    },
    status: "completed",
    strategy_id: "strategy-001",
    strategy_type: "model",
    symbol: "AAPL",
    walk_forward: null,
  },
  {
    completed_at: "2026-03-24T00:00:00Z",
    config: { lookback: 20 },
    created_at: "2026-03-23T00:00:00Z",
    error_message: null,
    id: "bt-002",
    interval: "1d",
    market: "us_stock",
    metrics: {
      composite_score: 1.66,
      sharpe_ratio: 1.74,
    },
    status: "completed",
    strategy_id: "strategy-001",
    strategy_type: "model",
    symbol: "AAPL",
    walk_forward: null,
  },
];

describe("strategy lab route", () => {
  it("renders sortable comparison, selected strategy detail, and rolling chart shell", async () => {
    const routeModule = await import("@/routes/strategy-lab");

    expect("StrategyLabPage" in routeModule).toBe(true);

    if (!("StrategyLabPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.StrategyLabPage
        comparisonRows={[
          {
            backtestCount: 3,
            latestSharpe: 1.61,
            latestTradeCount: 28,
            latestWinRate: 0.58,
            strategy: strategies[0],
            latestTotalReturn: 0.198,
          },
          {
            backtestCount: 1,
            latestSharpe: 0.94,
            latestTradeCount: 12,
            latestWinRate: 0.45,
            strategy: strategies[1],
            latestTotalReturn: 0.041,
          },
        ]}
        onSelectStrategy={() => {}}
        selectedBacktests={selectedBacktests}
        selectedMarket="all"
        selectedPerformance={selectedPerformance}
        selectedStrategy={strategies[0]}
        selectedStrategyId="strategy-001"
        sortDirection="desc"
        sortKey="latestSharpe"
      />,
    );

    expect(markup).toContain("Strategy Lab");
    expect(markup).toContain("Sharpe");
    expect(markup).toContain("Momentum Core");
    expect(markup).toContain("best backtest");
    expect(markup).toContain("data-chart-shell");
    expect(markup).toContain("2 points");
  });

  it("renders an explicit empty state when no strategies are in scope", async () => {
    const routeModule = await import("@/routes/strategy-lab");

    expect("StrategyLabPage" in routeModule).toBe(true);

    if (!("StrategyLabPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.StrategyLabPage
        comparisonRows={[]}
        onSelectStrategy={() => {}}
        selectedBacktests={[]}
        selectedMarket="us_stock"
        selectedPerformance={null}
        selectedStrategy={null}
        selectedStrategyId={null}
        sortDirection="desc"
        sortKey="latestSharpe"
      />,
    );

    expect(markup).toContain("No strategies");
    expect(markup).toContain("No strategies match the current market scope yet.");
  });
});

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const version = (n: number, no: number): ReleaseStateVersionIdentity => ({
  account_scope: "paper-main",
  content_sha256: `content-${n}`.padEnd(64, "c"),
  created_at: "2026-10-01T00:00:00Z",
  policy_sha256: `policy-${n}`.padEnd(64, "p"),
  status: "released",
  strategy_version_id: uuid(n),
  version_no: no,
});

const candidate: ReleaseStateCandidate = {
  account_generation: "g1",
  account_scope: "paper-main",
  campaign_created_at: "2026-10-05T00:00:00Z",
  campaign_id: uuid(30),
  candidate: version(2, 2),
  contract_sha256: "contract".padEnd(64, "k"),
  declared_trial_count: 6,
  holdout_reuse_denials: [],
  hypothesis: "Regime filter lifts net Sharpe",
  incumbent_content_sha256: "inc".padEnd(64, "i"),
  incumbent_version_id: uuid(1),
  reconciliation: {
    account_generation: "g1",
    account_scope: "paper-main",
    as_of: "2026-10-06T00:00:00Z",
    policy_sha256: "p".repeat(64),
    reconciliation_id: uuid(40),
    status: "clean",
  },
  reviews: [
    {
      created_at: "2026-10-06T00:00:00Z",
      holdout: { holdout_identity_sha256: null, holdout_use_id: null, owner_campaign_id: null, state: "consumed_by_this_campaign" },
      input_sha256: "input".padEnd(64, "n"),
      result_sha256: "result".padEnd(64, "r"),
      review_id: uuid(50),
      status: "passed",
    },
  ],
  terminal_trial_count: 6,
  trials: [],
};

const releaseState: ReleaseStateResponse = {
  active_version: version(1, 1),
  active_version_id: uuid(1),
  authority_reconciliation: candidate.reconciliation,
  authority_version: version(1, 1),
  candidates: [candidate],
  latest_event_id: null,
  latest_event_type: null,
  pointer_state: "active",
  release_revision: 4,
  strategy_id: uuid(99),
};

const pred = (code: ReleasePredicateResponse["code"], state: ReleasePredicateResponse["state"], reason: string): ReleasePredicateResponse => ({
  code,
  evidence: {},
  reason,
  state,
});
const allCodes: ReleasePredicateResponse["code"][] = GATE_ROWS.flatMap((r) => r.codes);
const eligibleGate: ReleaseGateResponse = { allowed: true, predicates: allCodes.map((c) => pred(c, "passed", `${c} ok`)) };
const blockedGate: ReleaseGateResponse = {
  allowed: false,
  predicates: allCodes.map((c) => pred(c, c === "reconciliation" ? "blocked" : c === "review_identity" ? "inconclusive" : "passed", `${c} reason`)),
};
const releaser: PrincipalResponse = { account_scopes: ["paper-main"], actor_id: "mgr", can_approve: true, can_release: true, kind: "human", roles: ["release_manager"] };
const events: ReleaseEventResponse[] = [
  {
    account_scope: "paper-main",
    actor_id: "mgr",
    campaign_id: uuid(30),
    candidate_version_id: uuid(2),
    created_at: "2026-10-07T00:00:00Z",
    event_type: "release",
    expected_revision: 3,
    from_version_id: uuid(1),
    gate_json: eligibleGate,
    holdout_use_id: null,
    id: uuid(60),
    reason: "newest release " + "long-reason-".repeat(20),
    reconciliation_id: uuid(40),
    resulting_revision: 4,
    review_id: uuid(50),
    source_release_event_id: null,
    strategy_id: uuid(99),
    to_version_id: uuid(2),
  },
  { ...({} as ReleaseEventResponse), ...{ account_scope: "paper-main", actor_id: "mgr", campaign_id: null, candidate_version_id: null, created_at: "2026-10-01T00:00:00Z", event_type: "pause", expected_revision: 1, from_version_id: null, gate_json: eligibleGate, holdout_use_id: null, id: uuid(61), reason: "older pause", reconciliation_id: null, resulting_revision: 2, review_id: null, source_release_event_id: null, strategy_id: uuid(99), to_version_id: null } },
];

function gateView(overrides: Partial<ReleaseGateViewProps> = {}) {
  const props: ReleaseGateViewProps = {
    busy: false,
    events,
    gate: eligibleGate,
    gateError: false,
    notFound: false,
    notice: null,
    onAction: () => {},
    onRefresh: () => {},
    onSelectCandidate: () => {},
    onSelectTarget: () => {},
    principal: releaser,
    selectedCampaignId: null,
    selectedTargetId: null,
    state: releaseState,
    stateError: false,
    stateLoading: false,
    targets: [
      {
        content_sha256: "t".repeat(64),
        eligible: true,
        predicates: [
          pred("rollback_holdings", "passed", "2 holdings"),
          pred("rollback_outstanding_work", "passed", "none outstanding"),
          pred("rollback_reconciliation", "passed", "clean"),
          pred("rollback_policy", "passed", "protective exits continue"),
        ],
        released_revision: 2,
        source_release_event_id: uuid(70),
        strategy_version_id: uuid(1),
        version_no: 1,
      },
    ],
    ...overrides,
  };
  return renderToStaticMarkup(<ReleaseGateView {...props} />);
}

describe("release gate panel", () => {
  it("shows incumbent/candidate identity, frozen campaign and all eight predicate rows", () => {
    const markup = gateView();
    for (const text of ["Incumbent (active pointer)", "Candidate", uuid(1), uuid(2), "Frozen campaign", uuid(30), "Regime filter lifts net Sharpe", "contract".padEnd(64, "k"), "input".padEnd(64, "n"), "Terminal trials", "Coverage", "100%"]) {
      expect(markup).toContain(text);
    }
    for (const row of GATE_ROWS) expect(markup).toContain(row.title);
    expect(GATE_ROWS).toHaveLength(8);
    expect(GATE_ROWS.flatMap((row) => row.codes)).toHaveLength(9);
    expect(markup).toContain("Eligible");
  });

  it("renders every blocker without computing eligibility client-side and hides Release when not allowed", () => {
    const markup = gateView({ gate: blockedGate });
    expect(markup).toContain(RELEASE_COPY.gateFailure);
    expect(markup).toContain("Blocked");
    expect(markup).toContain("Inconclusive");
    expect(markup).toContain("reconciliation reason");
    expect(markup).not.toContain("Release Candidate");
    expect(markup).toContain("Not eligible");
    const source = readFileSync(path.resolve(__dirname, "release-gate-panel.tsx"), "utf8");
    expect(source).not.toMatch(/sharpe|threshold/i);
    expect(source).not.toMatch(/\bfetch\(|setQueryData|onMutate/);
  });

  it("renders every returned predicate code as its own row with Poseidon's state verbatim", () => {
    const codes = [
      "candidate_identity",
      "policy_identity",
      "campaign_identity",
      "incumbent_pointer",
      "six_cell_evidence",
      "review_identity",
      "holdout_ownership",
      "reconciliation",
      "release_authority",
    ] as const;
    const states = ["passed", "blocked", "inconclusive", "unavailable", "passed", "blocked", "inconclusive", "unavailable", "passed"] as const;
    const gate: ReleaseGateResponse = {
      allowed: false,
      predicates: codes.map((code, i) => pred(code, states[i], `reason for ${code}`)),
    };
    const markup = gateView({ gate });
    const labels = { blocked: "Blocked", inconclusive: "Inconclusive", passed: "Passed", unavailable: "Unavailable" };
    codes.forEach((code, i) => {
      const row = markup.match(new RegExp(`<li[^>]*data-predicate-code="${code}"[^>]*>(.*?)</li>`))?.[1] ?? "";
      expect(row).toContain(`reason for ${code}`);
      expect(row).toContain(labels[states[i]]);
    });
    expect(markup.match(/data-predicate-code=/g)).toHaveLength(9);
    // rollback-only codes never appear as release gate rows
    expect(markup).not.toMatch(/data-predicate-code="rollback_/);
  });

  it("renders a missing predicate as Unavailable without invented reason text and never aggregates state", () => {
    const markup = gateView({ gate: { allowed: false, predicates: [pred("candidate_identity", "passed", "ok")] } });
    const missing = markup.match(/<li[^>]*data-predicate-code="policy_identity"[^>]*>(.*?)<\/li>/)?.[1] ?? "";
    expect(missing).toContain("Unavailable");
    expect(missing).not.toMatch(/<div class="mt-2/);
    const source = readFileSync(path.resolve(__dirname, "release-gate-panel.tsx"), "utf8");
    expect(source).not.toMatch(/STATE_RANK|worst|reduce\(/);
  });

  it("maps holdout states to the three exact labels and explicit states otherwise", () => {
    expect(holdoutDisplay("consumed_by_this_campaign")).toEqual({ label: "Consumed by this campaign", state: "Passed" });
    expect(holdoutDisplay("consumed_by_another_campaign")).toEqual({ label: "Consumed by another campaign", state: "Blocked" });
    expect(holdoutDisplay("reuse_denied")).toEqual({ label: "Reuse denied", state: "Blocked" });
    expect(holdoutDisplay("ownership_mismatch")).toEqual({ label: null, state: "Blocked" });
    expect(holdoutDisplay("unavailable")).toEqual({ label: null, state: "Unavailable" });
    expect(gateView()).toContain("Consumed by this campaign");
  });

  it("renders all four controls only for can_release and Read-only access otherwise", () => {
    const full = gateView();
    for (const label of ["Release Candidate", "Pause Strategy", "Roll Back Strategy", "Reject Candidate"]) expect(full).toContain(label);
    const viewer = gateView({ principal: { ...releaser, can_release: false } });
    expect(viewer).toContain("Read-only access");
    for (const label of ["Release Candidate", "Pause Strategy", "Roll Back Strategy", "Reject Candidate"]) expect(viewer).not.toContain(label);
    const paused = gateView({ state: { ...releaseState, pointer_state: "paused" } });
    expect(paused).not.toContain("Pause Strategy");
  });

  it("shows server-provided rollback context and no order submit or replay control", () => {
    const markup = gateView();
    for (const text of ["Rollback target", "Current holdings", "Outstanding intents/orders", "Reconciliation", "Takeover/exit policy", "protective exits continue"]) {
      expect(markup).toContain(text);
    }
    expect(markup).not.toMatch(/submit order|replay orders/i);
    expect(gateView({ targets: [] })).not.toContain("Roll Back Strategy");
  });

  it("renders exact empty states for legacy (404) and loading/error", () => {
    const empty = gateView({ events: [], notFound: true, state: undefined });
    expect(empty).toContain("No frozen campaign");
    expect(empty).toContain(RELEASE_COPY.emptyCampaignBody);
    expect(empty).toContain("No release events");
    expect(empty).toContain(RELEASE_COPY.emptyHistoryBody);
    expect(gateView({ state: undefined, stateLoading: true })).toContain("Loading…");
    expect(gateView({ state: undefined, stateError: true })).toContain(RELEASE_COPY.loadError);
    expect(isReleaseScopeNotFound({ detail: "Strategy release scope not found" })).toBe(true);
    expect(isReleaseScopeNotFound({ response: { status: 404 } })).toBe(true);
    expect(isReleaseScopeNotFound({ detail: "boom" })).toBe(false);
  });

  it("history is newest-first, immutable, with desktop table and sub-1024 cards", () => {
    expect(sortEventsNewestFirst(events).map((e) => e.event_type)).toEqual(["release", "pause"]);
    const markup = renderToStaticMarkup(<ReleaseHistory events={events} />);
    expect(markup.indexOf("newest release")).toBeLessThan(markup.indexOf("older pause"));
    expect(markup).toContain("hidden w-full");
    expect(markup).toContain("lg:table");
    expect(markup).toContain("lg:hidden");
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).not.toMatch(/Edit|Delete/);
  });

  it("uses exact confirmation copy, requires a reason, and shows Refresh Record/Retry", () => {
    const base = { incumbent: "v1", candidate: "v2", current: "v1", target: "v1", accountScope: "paper-main", strategyName: "Momentum Core" };
    expect(releaseConsequence("release", base)).toBe("Replace active version v1 with v2 for paper-main. Poseidon will atomically write the pointer and release event.");
    expect(releaseConsequence("pause", base)).toContain("Clear the active version for Momentum Core.");
    expect(releaseConsequence("rollback", base)).toContain("No target orders will be emitted and no old orders will be replayed.");
    expect(releaseConsequence("reject", base)).toBe("Record a terminal rejection for v2. Active version v1 will not change.");
    const dialog = (kind: "release" | "pause" | "rollback" | "reject", extra = {}) =>
      renderToStaticMarkup(
        <Dialog open>
          <ReleaseDialogBody consequence="c" errorMessage={null} kind={kind} onNeutral={() => {}} onReasonChange={() => {}} onRefresh={() => {}} onSubmit={() => {}} pending={false} reason="" showRefresh={false} showRetry={false} {...extra} />
        </Dialog>,
      );
    expect(dialog("release")).toContain("Release candidate?");
    expect(dialog("release")).toContain("Keep Incumbent Active");
    expect(dialog("pause")).toContain("Keep Strategy Active");
    expect(dialog("rollback")).toContain("Keep Current Version");
    expect(dialog("reject")).toContain("Keep Candidate");
    expect(dialog("reject")).toMatch(/<button[^>]*disabled[^>]*>[^<]*Reject Candidate/);
    expect(dialog("release", { pending: true })).toContain("Releasing…");
    expect(dialog("release", { showRefresh: true, errorMessage: RELEASE_COPY.conflict })).toContain("Refresh Record");
    expect(dialog("release", { showRetry: true })).toContain("Retry");
  });

  it("builds payloads with expected revision/pointer from release-state and no actor fields", () => {
    const rel = buildReleaseBody(releaseState, candidate, uuid(50), uuid(40), "why");
    expect(rel).toEqual({
      campaign_id: uuid(30),
      candidate_version_id: uuid(2),
      expected_active_version_id: uuid(1),
      expected_revision: 4,
      reason: "why",
      reconciliation_id: uuid(40),
      review_id: uuid(50),
    });
    expect(buildPauseBody(releaseState, "r")).toEqual({ expected_active_version_id: uuid(1), expected_revision: 4, reason: "r" });
    expect(buildRollbackBody(releaseState, uuid(1), uuid(40), "r")).toMatchObject({ target_version_id: uuid(1), reconciliation_id: uuid(40), expected_revision: 4 });
    expect(buildRejectBody(releaseState, candidate, "r")).toMatchObject({ candidate_version_id: uuid(2), expected_revision: 4 });
    expect(JSON.stringify([rel])).not.toMatch(/actor/);
  });

  it("is mounted after the existing strategy detail without a new route or store", () => {
    const source = readFileSync(path.resolve(__dirname, "../../routes/strategy-lab.tsx"), "utf8");
    expect(source.indexOf("<StrategyComparisonTable")).toBeLessThan(source.indexOf("<StrategyDetailPanel"));
    expect(source.indexOf("<StrategyDetailPanel")).toBeLessThan(source.indexOf("{releaseGate}"));
    expect(source).not.toMatch(/create\(|zustand/);
  });
});

describe("release gate device-key wiring", () => {
  let harness: ReturnType<typeof installDeviceKeyHarness>;
  const strategyId = uuid(99);

  beforeEach(() => {
    harness = installDeviceKeyHarness();
    harness.storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);
  });

  afterEach(() => {
    harness.restore();
  });

  it("sends principal, release-state, release-gate, release-events and rollback-targets reads to /poseidon-auth", async () => {
    harness.respond(() => jsonResponse({}));

    await runQueryOptions(releaseLoopRequests.principal());
    await runQueryOptions(releaseLoopRequests.state(strategyId));
    await runQueryOptions(
      releaseLoopRequests.gate(strategyId, {
        campaign_id: uuid(30),
        candidate_version_id: uuid(2),
        reconciliation_id: uuid(40),
        review_id: uuid(50),
      }),
    );
    await runQueryOptions(releaseLoopRequests.events(strategyId));
    await runQueryOptions(releaseLoopRequests.rollbackTargets(strategyId, uuid(40)));

    const paths = harness.requests.map((request) => new URL(request.url).pathname);
    expect(paths).toEqual([
      "/poseidon-auth/api/v1/principal",
      `/poseidon-auth/api/v1/strategies/${strategyId}/release-state`,
      `/poseidon-auth/api/v1/strategies/${strategyId}/release-gate`,
      `/poseidon-auth/api/v1/strategies/${strategyId}/release-events`,
      `/poseidon-auth/api/v1/strategies/${strategyId}/rollback-targets`,
    ]);
    for (const request of harness.requests) {
      expect(request.headers.get("X-API-Key")).toBe(TEST_DEVICE_KEY);
    }
  });

  it("sends release, pause, rollback and reject to /poseidon-auth with the device key and idempotency key", async () => {
    harness.respond(() => jsonResponse({}));
    const common = { idempotencyKey: "idem-release", strategyId };

    await releaseLoopMutations.release({ ...common, body: buildReleaseBody(releaseState, candidate, uuid(50), uuid(40), "go") });
    await releaseLoopMutations.pause({ ...common, body: buildPauseBody(releaseState, "hold") });
    await releaseLoopMutations.rollback({ ...common, body: buildRollbackBody(releaseState, uuid(1), uuid(40), "back") });
    await releaseLoopMutations.reject({ ...common, body: buildRejectBody(releaseState, candidate, "no") });

    expect(harness.requests.map((request) => new URL(request.url).pathname)).toEqual([
      `/poseidon-auth/api/v1/strategies/${strategyId}/release`,
      `/poseidon-auth/api/v1/strategies/${strategyId}/pause`,
      `/poseidon-auth/api/v1/strategies/${strategyId}/rollback`,
      `/poseidon-auth/api/v1/strategies/${strategyId}/reject`,
    ]);
    for (const request of harness.requests) {
      expect(request.method).toBe("POST");
      expect(request.headers.get("X-API-Key")).toBe(TEST_DEVICE_KEY);
      expect(request.headers.get("Idempotency-Key")).toBe("idem-release");
      expect(JSON.parse(request.body)).toMatchObject({ expected_revision: 4 });
    }
  });

  it("keeps 409/422 failures typed through the device-key client", async () => {
    harness.respond(() => jsonResponse({ detail: "stale" }, 409));
    await expect(
      releaseLoopMutations.pause({ body: buildPauseBody(releaseState, "hold"), idempotencyKey: "k", strategyId }),
    ).rejects.toMatchObject({ kind: "conflict" });
    harness.respond(() => jsonResponse({ detail: "gate" }, 422));
    await expect(
      releaseLoopMutations.release({
        body: buildReleaseBody(releaseState, candidate, uuid(50), uuid(40), "go"),
        idempotencyKey: "k",
        strategyId,
      }),
    ).rejects.toMatchObject({ kind: "unprocessable" });
  });

  it("keeps the non-loop strategy list on the legacy /poseidon route without the device key", async () => {
    harness.respond(() => jsonResponse([]));

    await runQueryOptions(listStrategiesApiStrategiesGetOptions());

    expect(harness.requests[0]?.url.startsWith("http://kairos.test/poseidon/")).toBe(true);
    expect(harness.requests[0]?.headers.get("X-API-Key")).not.toBe(TEST_DEVICE_KEY);
  });

  it("renders the device-key prompt instead of release data and history when no key is stored", () => {
    const markup = renderToStaticMarkup(
      gateView({ deviceKeyRequired: <p>Device key required for decision review and release actions</p> }),
    );

    expect(markup).toContain("Device key required for decision review and release actions");
    expect(markup).not.toContain("Release history");
    expect(markup).not.toContain("Incumbent (active pointer)");
    expect(renderToStaticMarkup(gateView())).toContain("Incumbent (active pointer)");
  });

  it("keeps exactly the four Phase 100 release mutations and adds no bootstrap call", () => {
    const source = readFileSync(path.resolve(__dirname, "release-gate-panel.tsx"), "utf8");
    expect(source.match(/StrategiesStrategyId(?:Release|Pause|Rollback|Reject)Post\(/g)?.length).toBe(4);
    expect(source).not.toMatch(/bootstrap/i);
  });
});
