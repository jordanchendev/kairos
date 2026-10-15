import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DecisionResponse,
  HoldingResponse,
  NavPointResponse,
  PerformanceSummaryResponse,
  PerpHoldingResponse,
  PrincipalResponse,
} from "@/api/poseidon/types.gen";

import { Dialog, resolveFocusReturnTarget } from "@/components/ui/dialog";

import {
  ACTION_COPY,
  ActionDialogBody,
  COPY,
  DecisionReviewView,
  classifyFailure,
  consequenceCopy,
  createIdempotencyScope,
  formatRelativeExpiry,
  unwrapMutation,
  decisionLoopRequests,
  sendDecisionAction,
  type DecisionReviewViewProps,
} from "./decision-review-panel";

import { getHoldingsApiPortfolioHoldingsGetOptions } from "@/api/poseidon/@tanstack/react-query.gen";
import { DEVICE_KEY_STORAGE_KEY } from "@/lib/api/runtime";
import {
  TEST_DEVICE_KEY,
  installDeviceKeyHarness,
  jsonResponse,
  runQueryOptions,
} from "@/test/device-key-harness";

import { HoldingsTable } from "./holdings-table";
import { PerformanceChart } from "./performance-chart";
import { PortfolioMetrics } from "./portfolio-metrics";
import { PerpHoldingsTable } from "./perp-holdings-table";
import { summarizeHoldings, summarizePerpHoldings } from "./portfolio-view-model";

const navCurve: NavPointResponse[] = [
  {
    cash: 32000,
    date: "2026-03-24",
    holdings_count: 3,
    holdings_value: 201000,
    total_nav: 233000,
  },
  {
    cash: 36000,
    date: "2026-03-31",
    holdings_count: 4,
    holdings_value: 214000,
    total_nav: 250000,
  },
];

const performance: PerformanceSummaryResponse = {
  max_drawdown_pct: -0.082,
  nav_curve: navCurve,
  sharpe_ratio: 1.86,
  total_realized_pnl: 18420,
  total_return_pct: 0.174,
  total_trades: 28,
};

const holdings: HoldingResponse[] = [
  {
    current_price: 214,
    entry_date: "2026-03-04",
    entry_price: 190,
    market: "us_stock",
    shares: 40,
    stop_loss_pct: 0.08,
    symbol: "AAPL",
    unrealized_pnl: 960,
    weight: 0.24,
  },
  {
    current_price: 1020,
    entry_date: "2026-03-12",
    entry_price: 1095,
    market: "tw_stock",
    shares: 12,
    stop_loss_pct: 0.05,
    symbol: "2330",
    unrealized_pnl: -900,
    weight: 0.18,
  },
];

const perpHoldings: PerpHoldingResponse[] = [
  {
    cumulative_funding_cost: -42,
    current_price: 4220,
    entry_price: 3980,
    leverage: 4,
    liquidation_price: 3880,
    margin_ratio: 0.18,
    quantity: 2.5,
    side: "long",
    symbol: "ETHUSDT",
    unrealized_pnl: 600,
  },
  {
    cumulative_funding_cost: 18,
    current_price: 109500,
    entry_price: 107800,
    leverage: 7,
    liquidation_price: 111200,
    margin_ratio: 0.62,
    quantity: 0.6,
    side: "short",
    symbol: "BTCUSDT",
    unrealized_pnl: -180,
  },
];

describe("portfolio monitoring components", () => {
  it("renders the compact portfolio metrics strip", () => {
    const markup = renderToStaticMarkup(
      <PortfolioMetrics holdingsSummary={summarizeHoldings(holdings)} performance={performance} />,
    );

    expect(markup).toContain("Total Return");
    expect(markup).toContain("Sharpe Ratio");
    expect(markup).toContain("Max Drawdown");
    expect(markup).toContain("Realized P&amp;L");
  });

  it("renders a lightweight performance chart with the latest NAV context", () => {
    const markup = renderToStaticMarkup(<PerformanceChart points={navCurve} timeRangeLabel="1W" />);

    expect(markup).toContain("NAV Trend");
    expect(markup).toContain("Latest NAV");
    expect(markup).toContain("1W window");
  });

  it("renders the holdings table with sortable columns and market labels", () => {
    const markup = renderToStaticMarkup(<HoldingsTable holdings={holdings} />);

    expect(markup).toContain("sortable");
    expect(markup).toContain("Unrealized P&amp;L");
    expect(markup).toContain("AAPL");
    expect(markup).toContain("TW Equities");
  });

  it("renders perp liquidation, margin, and funding posture", () => {
    const markup = renderToStaticMarkup(
      <PerpHoldingsTable holdings={perpHoldings} summary={summarizePerpHoldings(perpHoldings)} />,
    );

    expect(markup).toContain("Liquidation");
    expect(markup).toContain("Margin Ratio");
    expect(markup).toContain("Funding Cost");
    expect(markup).toContain('data-risk="danger"');
  });
});

const decision: DecisionResponse = {
  account_scope: "paper-main",
  action_metadata: {
    approve_reason: "available",
    can_approve: true,
    can_modify: true,
    can_reject: true,
    modify_reason: "available",
    reject_reason: "available",
  },
  created_at: "2026-10-14T00:00:00Z",
  creation_sha256: "c".repeat(64),
  decision_as_of: "2026-10-14T00:00:00Z",
  evaluation_run_id: "11111111-1111-4111-8111-111111111111",
  event_history: [
    {
      actor_id: "worker-1",
      created_at: "2026-10-14T00:01:00Z",
      event_type: "created",
      expected_revision: 1,
      id: "22222222-2222-4222-8222-222222222222",
    },
  ],
  execution_status: "not_started",
  final_action: "enter",
  final_json: { final_action: "enter", selected_evaluation_ids: ["33333333-3333-4333-8333-333333333333"] },
  id: "44444444-4444-4444-8444-444444444444",
  original_action: "hold",
  original_json: { final_action: "hold", selected_evaluation_ids: [] },
  policy_sha256: "p".repeat(64),
  portfolio_snapshot_json: { cash: 1 },
  reconciliation_status: "not_required",
  revision: 7,
  risk_snapshot_json: { allowed_actions: ["hold", "enter"], hard_failures: [] },
  status: "pending_approval",
  strategy_version_id: "55555555-5555-4555-8555-555555555555",
  updated_at: "2026-10-14T00:01:00Z",
  valid_until: "2026-10-14T06:00:00Z",
};

const approverPrincipal: PrincipalResponse = {
  account_scopes: ["paper-main"],
  actor_id: "human-1",
  can_approve: true,
  can_release: false,
  kind: "human",
  roles: ["approver"],
};

const noop = () => undefined;
const viewTrace = { error: false, loading: false, open: false };
const now = new Date("2026-10-14T03:00:00Z").getTime();

function view(overrides: Partial<DecisionReviewViewProps> = {}) {
  return renderToStaticMarkup(
    <DecisionReviewView
      decisions={[decision]}
      error={false}
      loading={false}
      now={now}
      onAction={noop}
      onRetry={noop}
      onSelect={noop}
      onToggleTrace={noop}
      principal={approverPrincipal}
      selectedId={decision.id}
      trace={viewTrace}
      {...overrides}
    />,
  );
}

describe("pending decision review", () => {
  it("is mounted between the metrics and NAV/holdings panels in the portfolio route", () => {
    const source = readFileSync(path.resolve(__dirname, "../../routes/portfolio.tsx"), "utf8");
    const metrics = source.indexOf("<PortfolioMetrics");
    const panel = source.indexOf("<DecisionReviewPanel");
    const nav = source.indexOf('title="NAV history"');
    expect(metrics).toBeGreaterThan(-1);
    expect(panel).toBeGreaterThan(metrics);
    expect(nav).toBeGreaterThan(panel);
  });

  it("renders every required list and detail field", () => {
    const markup = view();
    for (const text of [
      "Pending decisions",
      decision.strategy_version_id,
      "paper-main",
      decision.id,
      "Revision 7",
      "2026-10-14 06:00 UTC",
      "expires in 3h",
      "Original action",
      "Final action",
      "Execution",
      "Reconciliation",
      "Policy digest",
      "Original recommendation",
      "Final recommendation",
      "Event history",
      "View trace",
    ]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain("Approve Decision");
    expect(markup).toContain("Modify Decision");
    expect(markup).toContain("Reject Decision");
    expect(markup).not.toMatch(/submit order|actor id input/i);
  });

  it("renders exact empty, loading, error states", () => {
    expect(view({ decisions: [] })).toContain(COPY.emptyTitle);
    expect(view({ decisions: [] })).toContain(COPY.emptyBody);
    expect(view({ decisions: undefined, loading: true })).toContain('aria-busy="true"');
    expect(view({ decisions: undefined, loading: true })).toContain("Loading…");
    const errorMarkup = view({ decisions: undefined, error: true });
    expect(errorMarkup).toContain(COPY.loadError);
    expect(errorMarkup).toContain("Retry");
  });

  it("hides controls for viewers, terminal and expired decisions with an explicit reason", () => {
    const viewer = view({ principal: { ...approverPrincipal, can_approve: false } });
    expect(viewer).toContain("Read-only access");
    expect(viewer).not.toContain("Approve Decision");
    expect(viewer).not.toContain("Reject Decision");

    const expired = view({
      decisions: [
        {
          ...decision,
          action_metadata: {
            approve_reason: "decision_expired",
            can_approve: false,
            can_modify: false,
            can_reject: false,
            modify_reason: "decision_expired",
            reject_reason: "decision_expired",
          },
        },
      ],
    });
    expect(expired).toContain("This decision has expired.");
    expect(expired).not.toContain("Approve Decision");
  });

  it("uses exact dialog copy and requires a reason for modify and reject", () => {
    const base = {
      decision,
      errorMessage: null,
      finalAction: "enter",
      onFinalActionChange: noop,
      onNeutral: noop,
      onReasonChange: noop,
      onRefresh: noop,
      onSubmit: noop,
      pending: false,
      reason: "",
      showRefresh: false,
      showRetry: false,
    };
    const approve = renderToStaticMarkup(<Dialog open><ActionDialogBody {...base} action="approve" /></Dialog>);
    expect(approve).toContain("Approve decision?");
    expect(approve).toContain(consequenceCopy("approve", decision.id));
    expect(approve).toContain("Keep Pending");

    const reject = renderToStaticMarkup(<Dialog open><ActionDialogBody {...base} action="reject" /></Dialog>);
    expect(reject).toContain(ACTION_COPY.reject.title);
    expect(reject).toContain("Reason");
    expect(reject).toMatch(/<button[^>]*disabled[^>]*>[^<]*Reject Decision/);

    const modify = renderToStaticMarkup(<Dialog open><ActionDialogBody {...base} action="modify" reason="because" /></Dialog>);
    expect(modify).toContain("Original: hold");
    expect(modify).toContain("Save Decision Changes");
    expect(modify).not.toContain("Actor");
    // soft choices come only from the generated risk snapshot's allowed actions
    expect(modify).toContain('value="hold"');
    expect(modify).not.toContain('value="exit"');

    const pending = renderToStaticMarkup(<Dialog open><ActionDialogBody {...base} action="approve" pending /></Dialog>);
    expect(pending).toContain("Approving…");
  });

  it("shows Refresh Record on conflict and Retry on network failure", () => {
    const body = (flags: { showRefresh: boolean; showRetry: boolean }, errorMessage: string) =>
      renderToStaticMarkup(
        <Dialog open>
        <ActionDialogBody
          action="approve"
          decision={decision}
          errorMessage={errorMessage}
          finalAction="enter"
          onFinalActionChange={noop}
          onNeutral={noop}
          onReasonChange={noop}
          onRefresh={noop}
          onSubmit={noop}
          pending={false}
          reason=""
          {...flags}
        />
        </Dialog>,
      );
    const conflict = body({ showRefresh: true, showRetry: false }, COPY.conflict);
    expect(conflict).toContain("Refresh Record");
    expect(conflict).toContain(COPY.conflict);
    expect(body({ showRefresh: false, showRetry: true }, COPY.networkError)).toContain("Retry");
  });

  it("formats relative expiry for future and past instants", () => {
    expect(formatRelativeExpiry("2026-10-14T03:30:00Z", now)).toBe("expires in 30m");
    expect(formatRelativeExpiry("2026-10-14T01:00:00Z", now)).toBe("expired 2h ago");
  });
});

describe("decision mutation protocol", () => {
  it("reuses one idempotency key for an unchanged payload and resets only on change or reset", () => {
    let n = 0;
    const scope = createIdempotencyScope(() => `key-${++n}`);
    expect(scope.keyFor("a")).toBe("key-1");
    expect(scope.keyFor("a")).toBe("key-1"); // network retry / double click
    expect(scope.keyFor("b")).toBe("key-2"); // payload change
    scope.reset(); // success or neutral dismissal
    expect(scope.keyFor("b")).toBe("key-3");
  });

  it("classifies 403/404/409/422 and everything else as network", () => {
    expect(classifyFailure(403)).toBe("forbidden");
    expect(classifyFailure(404)).toBe("not_found");
    expect(classifyFailure(409)).toBe("conflict");
    expect(classifyFailure(422)).toBe("unprocessable");
    expect(classifyFailure(500)).toBe("network");
    expect(classifyFailure(undefined)).toBe("network");
  });

  it("surfaces HTTP status from generated SDK results and never fabricates success", async () => {
    await expect(unwrapMutation(async () => ({ data: { ok: 1 } }))).resolves.toEqual({ ok: 1 });
    await expect(
      unwrapMutation(async () => ({ error: { detail: "stale" }, response: { status: 409 } })),
    ).rejects.toMatchObject({ detail: "stale", kind: "conflict" });
    await expect(
      unwrapMutation(async () => ({ error: { detail: "gate" }, response: { status: 422 } })),
    ).rejects.toMatchObject({ detail: "gate", kind: "unprocessable" });
    await expect(unwrapMutation(async () => ({ error: {}, response: { status: 403 } }))).rejects.toMatchObject({
      kind: "forbidden",
    });
    await expect(unwrapMutation(async () => ({ error: {}, response: { status: 404 } }))).rejects.toMatchObject({
      kind: "not_found",
    });
    const failing = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(unwrapMutation(failing)).rejects.toMatchObject({ kind: "network" });
  });

  it("panel source uses generated helpers only: no raw fetch, order submission, or optimistic cache writes", () => {
    const source = readFileSync(path.resolve(__dirname, "decision-review-panel.tsx"), "utf8");
    expect(source).not.toMatch(/\bfetch\(/);
    expect(source).not.toMatch(/setQueryData|onMutate/);
    expect(source).not.toMatch(/createOrder|submitOrder|place_order/i);
    expect(source).toContain("expected_revision: decision.revision");
    expect(source).toContain('"Idempotency-Key"');
    expect(source).toContain("invalidateQueries");
  });
});

describe("dialog focus return and close target", () => {
  const target = (over: Partial<{ disabled: boolean; isConnected: boolean }> = {}) => ({
    disabled: false,
    focus: () => undefined,
    isConnected: true,
    ...over,
  });

  it("returns focus to the captured trigger, else the fallback, else nothing", () => {
    const trigger = target();
    const fallback = target();
    expect(resolveFocusReturnTarget(trigger, fallback)).toBe(trigger);
    expect(resolveFocusReturnTarget(target({ disabled: true }), fallback)).toBe(fallback);
    expect(resolveFocusReturnTarget(target({ isConnected: false }), fallback)).toBe(fallback);
    expect(resolveFocusReturnTarget(null, fallback)).toBe(fallback);
    expect(resolveFocusReturnTarget(null, null)).toBeNull();
    expect(resolveFocusReturnTarget(target({ isConnected: false }), target({ isConnected: false }))).toBeNull();
  });

  it("wires every action dialog (approve/modify/reject; release/pause/rollback/reject) through the focus-return hook", () => {
    const decision = readFileSync(path.resolve(__dirname, "decision-review-panel.tsx"), "utf8");
    const release = readFileSync(path.resolve(__dirname, "../strategy-lab/release-gate-panel.tsx"), "utf8");
    expect(decision).toContain("useReturnFocusOnClose(dialogAction !== null, listRef)");
    expect(release).toContain("useReturnFocusOnClose(action !== null, containerRef)");
  });

  it("gives the dialog close button a 44px hit target", () => {
    const dialog = readFileSync(path.resolve(__dirname, "../../components/ui/dialog.tsx"), "utf8");
    expect(dialog).toContain("h-11 w-11");
    expect(dialog).not.toContain("h-9 w-9");
  });
});

describe("decision review device-key wiring", () => {
  let harness: ReturnType<typeof installDeviceKeyHarness>;

  beforeEach(() => {
    harness = installDeviceKeyHarness();
    harness.storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);
  });

  afterEach(() => {
    harness.restore();
  });

  it("sends principal, pending-decision list and trace reads to /poseidon-auth with the device key", async () => {
    harness.respond(() => jsonResponse({}));

    await runQueryOptions(decisionLoopRequests.principal());
    await runQueryOptions(decisionLoopRequests.pendingDecisions());
    await runQueryOptions(decisionLoopRequests.trace(decision.id));

    expect(harness.requests.map((request) => request.url)).toEqual([
      "http://kairos.test/poseidon-auth/api/v1/principal",
      "http://kairos.test/poseidon-auth/api/v1/decisions/?status=pending_approval",
      `http://kairos.test/poseidon-auth/api/v1/traces/decisions/${decision.id}`,
    ]);
    for (const request of harness.requests) {
      expect(request.headers.get("X-API-Key")).toBe(TEST_DEVICE_KEY);
    }
  });

  it("sends approve, modify and reject to /poseidon-auth with the device key, idempotency key and revision", async () => {
    harness.respond(() => jsonResponse({ ...decision, status: "approved" }));

    await sendDecisionAction({ action: "approve", decision, finalAction: "enter", idempotencyKey: "idem-1", reason: "" });
    await sendDecisionAction({ action: "modify", decision, finalAction: "hold", idempotencyKey: "idem-2", reason: "smaller" });
    await sendDecisionAction({ action: "reject", decision, finalAction: "enter", idempotencyKey: "idem-3", reason: "no" });

    const [approve, modify, reject] = harness.requests;
    expect(approve?.url).toBe(`http://kairos.test/poseidon-auth/api/v1/decisions/${decision.id}/approve`);
    expect(JSON.parse(approve?.body ?? "{}")).toEqual({ expected_revision: 7 });
    expect(modify?.url).toBe(`http://kairos.test/poseidon-auth/api/v1/decisions/${decision.id}/approve`);
    expect(JSON.parse(modify?.body ?? "{}")).toEqual({ expected_revision: 7, final_action: "hold", override_reason: "smaller" });
    expect(reject?.url).toBe(`http://kairos.test/poseidon-auth/api/v1/decisions/${decision.id}/reject`);
    expect(JSON.parse(reject?.body ?? "{}")).toEqual({ expected_revision: 7, reason: "no" });
    for (const [index, request] of harness.requests.entries()) {
      expect(request.method).toBe("POST");
      expect(request.headers.get("X-API-Key")).toBe(TEST_DEVICE_KEY);
      expect(request.headers.get("Idempotency-Key")).toBe(`idem-${index + 1}`);
    }
  });

  it("keeps 403/404/409/422 classification through the device-key client and never retries on /poseidon", async () => {
    for (const [status, kind] of [
      [403, "forbidden"],
      [404, "not_found"],
      [409, "conflict"],
      [422, "unprocessable"],
    ] as const) {
      harness.respond(() => jsonResponse({ detail: `status ${status}` }, status));
      await expect(
        sendDecisionAction({ action: "approve", decision, finalAction: "enter", idempotencyKey: "idem", reason: "" }),
      ).rejects.toMatchObject({ kind });
    }
    expect(harness.requests).toHaveLength(4);
    expect(harness.requests.every((request) => request.url.startsWith("http://kairos.test/poseidon-auth/"))).toBe(true);
  });

  it("keeps non-loop portfolio reads on the legacy /poseidon route without the device key", async () => {
    harness.respond(() => jsonResponse([]));

    await runQueryOptions(getHoldingsApiPortfolioHoldingsGetOptions());

    expect(harness.requests[0]?.url.startsWith("http://kairos.test/poseidon/")).toBe(true);
    expect(harness.requests[0]?.headers.get("X-API-Key")).not.toBe(TEST_DEVICE_KEY);
  });
});

describe("decision review panel without a device key", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@tanstack/react-query");
    vi.resetModules();
  });

  async function renderPanel(withKey: boolean) {
    const harnessModule = await import("@/test/device-key-harness");
    const harness = harnessModule.installDeviceKeyHarness();
    if (withKey) harness.storage.setItem("kairos.poseidon.deviceKey", harnessModule.TEST_DEVICE_KEY);
    const captured = harnessModule.captureComponentQueries();
    const { DecisionReviewPanel } = await import("./decision-review-panel");
    const markup = renderToStaticMarkup(<DecisionReviewPanel />);
    return { captured, harness, harnessModule, markup };
  }

  it("sends no loop request and shows the device-key prompt", async () => {
    const { captured, harness, markup } = await renderPanel(false);
    try {
      expect(markup).toContain("Device key required for decision review and release actions");
      expect(markup).toContain('aria-haspopup="dialog"');
      expect(captured.length).toBeGreaterThanOrEqual(3);
      expect(captured.every((query) => query.enabled === false)).toBe(true);
      expect(harness.requests).toHaveLength(0);
    } finally {
      harness.restore();
    }
  });

  it("enables principal and pending-decision queries on /poseidon-auth once a key is stored", async () => {
    const { captured, harness, harnessModule, markup } = await renderPanel(true);
    try {
      expect(markup).not.toContain("Device key required");
      const enabled = captured.filter((query) => query.enabled === true).map(harnessModule.queryIdOf);
      expect(enabled).toEqual(["getPrincipalApiV1PrincipalGet", "listDecisionsApiV1DecisionsGet"]);
      for (const query of captured) {
        await harnessModule.runQueryOptions(query);
      }
      expect(harness.requests.length).toBe(captured.length);
      for (const request of harness.requests) {
        expect(request.url.startsWith("http://kairos.test/poseidon-auth/api/v1/")).toBe(true);
        expect(request.headers.get("X-API-Key")).toBe(harnessModule.TEST_DEVICE_KEY);
      }
    } finally {
      harness.restore();
    }
  });
});
