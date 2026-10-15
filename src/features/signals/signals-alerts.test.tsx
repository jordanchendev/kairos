import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AlertItem, SignalResponse } from "@/api/poseidon/types.gen";

import { AlertsFeed } from "@/features/alerts/alerts-feed";
import { deriveAlertSeverity, getAlertFreshnessLabel, getAlertTimestamp } from "@/features/alerts/alerts-model";

import { readFileSync } from "node:fs";
import path from "node:path";

import type { TraceResponse, TraceStage } from "@/api/poseidon/types.gen";

import { SignalDrawer, SignalTraceStages, TRACE_STAGE_TITLES, defaultExpandedPositions } from "./signal-drawer";
import { SignalFilters } from "./signal-filters";
import { filterSignals } from "./signals-model";
import { SignalsTable } from "./signals-table";

const signals: SignalResponse[] = [
  {
    action: "buy",
    confidence: 0.91,
    created_at: "2026-03-31T08:00:00Z",
    id: "signal-a",
    instrument: "spot",
    interval: "1h",
    market: "us_stock",
    metadata: {},
    model_id: null,
    params: { strategy_name: "Momentum Core" },
    quantity_pct: 0.25,
    reject_reason: null,
    signal_time: "2026-03-31T07:55:00Z",
    status: "executed",
    strategy_id: "strategy-a",
    symbol: "AAPL",
    valid_until: "2026-03-31T09:00:00Z",
  },
  {
    action: "sell",
    confidence: 0.42,
    created_at: "2026-03-20T08:00:00Z",
    id: "signal-b",
    instrument: "spot",
    interval: "4h",
    market: "tw_stock",
    metadata: {},
    model_id: null,
    params: { strategy_name: "Mean Reversion" },
    quantity_pct: 0.1,
    reject_reason: "risk veto",
    signal_time: "2026-03-20T07:55:00Z",
    status: "rejected",
    strategy_id: "strategy-b",
    symbol: "2330",
    valid_until: null,
  },
];

const alerts: AlertItem[] = [
  {
    data: {
      level: "CRITICAL",
      message: "GPU queue depth is above threshold.",
    },
    event_type: "queue_pressure",
    id: "1711600000000-0",
  },
];

describe("signals and alerts monitoring", () => {
  it("filters signals by strategy, market, status, and date range", () => {
    const filtered = filterSignals(
      signals,
      {
        dateRange: "7D",
        market: "us_stock",
        status: "executed",
        strategy: "Momentum Core",
      },
      new Date("2026-04-01T00:00:00Z"),
    );

    expect(filtered.map((signal) => signal.id)).toEqual(["signal-a"]);
  });

  it("derives alert severity and freshness from payloads", () => {
    expect(deriveAlertSeverity(alerts[0])).toBe("critical");
    expect(getAlertTimestamp(alerts[0])).toBe("2024-03-28T04:26:40.000Z");
    expect(getAlertFreshnessLabel(alerts[0], new Date("2024-03-28T04:31:40.000Z"))).toBe("5m ago");
  });

  it("renders route-local signal filters and dense table output", () => {
    const filtersMarkup = renderToStaticMarkup(
      <SignalFilters
        dateRange="7D"
        market="all"
        marketOptions={["all", "us_stock"]}
        onDateRangeChange={() => {}}
        onMarketChange={() => {}}
        onStatusChange={() => {}}
        onStrategyChange={() => {}}
        status="all"
        strategy="all"
        strategyOptions={["all", "strategy-a"]}
      />,
    );
    const tableMarkup = renderToStaticMarkup(
      <SignalsTable onSelectSignal={() => {}} selectedSignalId="signal-a" signals={signals} />,
    );

    expect(filtersMarkup).toContain("strategy");
    expect(filtersMarkup).toContain("date range");
    expect(tableMarkup).toContain("status");
    expect(tableMarkup).toContain("AAPL");
  });

  it("renders signal drilldown and alerts feed with timestamp cues", () => {
    const drawerMarkup = renderToStaticMarkup(<SignalDrawer isLoading={false} signal={signals[0]} />);
    const alertsMarkup = renderToStaticMarkup(<AlertsFeed alerts={alerts} />);

    expect(drawerMarkup).toContain("signal_id");
    expect(drawerMarkup).toContain("Momentum Core");
    expect(alertsMarkup).toContain("severity");
    expect(alertsMarkup).toContain("timestamp");
    expect(alertsMarkup).toContain("fresh");
  });
});

const stageNames: TraceStage["name"][] = [
  "signal_or_no_trade",
  "manifest",
  "research_revision",
  "evaluation",
  "decision_events",
  "execution",
  "outcomes",
  "campaign_review",
  "release",
];
const orderedTitles = [
  "Signal or no-trade",
  "Manifest",
  "Research revision",
  "Evaluation snapshot/run",
  "Decision and decision events",
  "Orders, fills, and reconciliation",
  "Outcomes",
  "Campaign and paired review",
  "Release version/event",
];

function makeTrace(overrides: Record<number, Partial<TraceStage>> = {}): TraceResponse {
  return {
    account_scope: "paper-main",
    anchor_id: "11111111-1111-4111-8111-111111111111",
    anchor_type: "signal",
    stages: stageNames.map((name, index) => ({
      name,
      position: index + 1,
      reason: `reason-${name}`,
      state: "Available" as const,
      timestamp: "2026-03-31T08:00:00Z",
      ...overrides[index + 1],
    })) as TraceResponse["stages"],
  };
}

const render = (trace: TraceResponse, extra: { narrativeConfidence?: number | null } = {}) =>
  renderToStaticMarkup(<SignalTraceStages trace={trace} {...extra} />);

describe("SignalDrawer nine-stage trace", () => {
  it("renders the exact nine stage headings in order for filled and no-trade traces", () => {
    for (const trace of [makeTrace(), makeTrace({ 1: { state: "No trade" } })]) {
      const markup = render(trace);
      let cursor = -1;
      orderedTitles.forEach((title, index) => {
        const at = markup.indexOf(`${index + 1}. ${title}`);
        expect(at).toBeGreaterThan(cursor);
        cursor = at;
      });
    }
    expect(Object.values(TRACE_STAGE_TITLES)).toEqual(expect.arrayContaining(orderedTitles));
  });

  it("renders every explicit evidence state as a label", () => {
    const states = ["No trade", "Not required", "Unavailable", "Provisional", "Inconclusive", "Legacy unresolved"] as const;
    const trace = makeTrace(Object.fromEntries(states.map((state, i) => [i + 1, { state }])));
    const markup = render(trace);
    for (const state of states) expect(markup).toContain(state);
  });

  it("expands the signal stage and first blocked/unavailable stage by default; others collapsed", () => {
    const trace = makeTrace({ 4: { state: "Unavailable" }, 7: { state: "Blocked" } });
    expect([...defaultExpandedPositions(trace.stages)].sort()).toEqual([1, 4]);
    const markup = render(trace);
    expect(markup).toContain('id="trace-stage-1"');
    expect(markup).toContain('id="trace-stage-4"');
    expect(markup).not.toContain('id="trace-stage-7"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toMatch(/<button[^>]*aria-controls="trace-stage-2"/);
  });

  it("separates actual and counterfactual rows with the full assumption version", () => {
    const trace = makeTrace({
      7: {
        rows: [
          { label: "Return", state: "Available", values: { kind: "trade", value: 0.02 } },
          { label: "Counterfactual \u00b7 slippage-v3.2", state: "Provisional", values: { assumption_version: "slippage-v3.2", kind: "trade", value: 0.01 } },
        ],
        state: "Provisional",
      },
    });
    const markup = renderToStaticMarkup(<SignalTraceStages initialExpanded={new Set([7])} trace={trace} />);
    expect(markup).toContain("Actual — Return");
    // outcome kind alone never tags a row as counterfactual
    expect(markup.match(/border-dashed/g)).toHaveLength(1);
    expect(markup).toContain("Counterfactual · slippage-v3.2");
    expect(markup).toContain("border-dashed");
    expect(markup).toContain("border-solid");
  });

  it("forward-compatible contract (not current Poseidon output): DSH renders only from explicit dsh_status data, without controls", () => {
    const trace = makeTrace({
      3: { rows: [{ label: "DSH", state: "Not required", values: { dsh_status: "disabled", reasons: "provider_disabled" } }] },
    });
    const markup = renderToStaticMarkup(
      <SignalTraceStages initialExpanded={new Set([3])} narrativeConfidence={0.7} trace={trace} />,
    );
    expect(markup).toContain("Narrative confidence");
    expect(markup).toContain("Not a probability of profit");
    expect(markup).toContain("DSH: Disabled");
    expect(markup).toContain("provider_disabled");
    expect(markup).not.toMatch(/enable|retry provider|approve|release candidate|submit order/i);
  });

  it("renders nothing DSH-related when no row carries DSH data", () => {
    expect(render(makeTrace())).not.toMatch(/DSH/);
  });

  it("prefers per-row Narrative confidence over signal metadata and keeps the qualification", () => {
    const trace = makeTrace({
      1: {
        rows: [
          {
            label: "Signal",
            state: "Available",
            values: { "Narrative confidence": 0.81, confidence_note: "Not a probability of profit" },
          },
        ],
      },
    });
    const markup = render(trace, { narrativeConfidence: 0.2 });
    expect(markup).toContain("Narrative confidence: 0.81 — Not a probability of profit");
    expect(markup).not.toContain("20%");
  });

  it("renders the exact Legacy unresolved label for legacy signals with other stages Unavailable", () => {
    const overrides: Record<number, Partial<TraceStage>> = { 1: { state: "Legacy unresolved" } };
    for (let i = 2; i <= 9; i++) overrides[i] = { state: "Unavailable" };
    const markup = render(makeTrace(overrides));
    expect(markup).toContain("Legacy unresolved");
    expect(markup).toContain("Unavailable");
  });

  it("wraps long identities and raw payloads and shows legacy unresolved", () => {
    const long = "x".repeat(200);
    const trace = makeTrace({ 2: { identities: { digest: long }, raw_payload: { k: long }, state: "Legacy unresolved" } });
    const markup = renderToStaticMarkup(<SignalTraceStages initialExpanded={new Set([2])} trace={trace} />);
    expect(markup).toContain(long);
    expect(markup).toContain("whitespace-pre-wrap");
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).toContain("Legacy unresolved");
  });

  it("drawer shows trace loading (aria-busy), error and loaded states; no handwritten client", () => {
    const loading = renderToStaticMarkup(
      <SignalDrawer isLoading={false} signal={signals[0]} trace={{ isError: false, isLoading: true }} />,
    );
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading…");
    const failed = renderToStaticMarkup(
      <SignalDrawer isLoading={false} signal={signals[0]} trace={{ isError: true, isLoading: false }} />,
    );
    expect(failed).toContain("Retry; no state was changed.");
    const loaded = renderToStaticMarkup(
      <SignalDrawer
        isLoading={false}
        signal={{ ...signals[0], metadata: { narrative_confidence: 0.6 } }}
        trace={{ data: makeTrace(), isError: false, isLoading: false }}
      />,
    );
    expect(loaded).toContain("End-to-end trace");
    expect(loaded).toContain("Narrative confidence");

    const source = readFileSync(path.resolve(__dirname, "signal-drawer.tsx"), "utf8");
    expect(source).not.toMatch(/\bfetch\(|overflow-x-auto|useMutation|Idempotency/);
  });
});

describe("signal trace device-key wiring", () => {
  beforeEach(() => {
    // Fixture signals fall inside the route's default 7D window.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("@tanstack/react-query");
    vi.doUnmock("@/stores/ui-store");
    vi.resetModules();
  });

  async function renderRoute(withKey: boolean) {
    const harnessModule = await import("@/test/device-key-harness");
    const harness = harnessModule.installDeviceKeyHarness();
    if (withKey) harness.storage.setItem("kairos.poseidon.deviceKey", harnessModule.TEST_DEVICE_KEY);
    const captured = harnessModule.captureComponentQueries((query) => {
      const id = harnessModule.queryIdOf(query);
      if (id === "listSignalsApiSignalsGet") return signals;
      if (id === "getSignalApiSignalsSignalIdGet") return signals[0];
      return undefined;
    });
    vi.doMock("@/stores/ui-store", () => ({
      useUiStore: (selector: (state: { selectedMarket: string }) => string) => selector({ selectedMarket: "all" }),
    }));
    const routeModule = await import("@/routes/signals");
    const markup = renderToStaticMarkup(<routeModule.Component />);
    const byId = (id: string) => captured.find((query) => harnessModule.queryIdOf(query) === id);
    return { byId, captured, harness, harnessModule, markup };
  }

  it("shows the device-key prompt in the trace area and sends no trace request without a key", async () => {
    const { byId, harness, harnessModule, markup } = await renderRoute(false);
    try {
      expect(markup).toContain("End-to-end trace");
      expect(markup).toContain("Device key required for decision review and release actions");
      expect(markup).not.toContain("Retry; no state was changed.");
      expect(byId("getSignalTraceApiV1TracesSignalsSignalIdGet")?.enabled).toBe(false);

      // Non-loop reads keep working on the legacy route and never carry a device key.
      await harnessModule.runQueryOptions(byId("listSignalsApiSignalsGet")!);
      await harnessModule.runQueryOptions(byId("getSignalApiSignalsSignalIdGet")!);
      expect(harness.requests.map((request) => new URL(request.url).pathname)).toEqual([
        "/poseidon/api/signals",
        "/poseidon/api/signals/signal-a",
      ]);
    } finally {
      harness.restore();
    }
  });

  it("sends the trace query to /poseidon-auth with the key while list/detail stay on /poseidon without it", async () => {
    const { byId, harness, harnessModule, markup } = await renderRoute(true);
    try {
      expect(markup).not.toContain("Device key required");
      const trace = byId("getSignalTraceApiV1TracesSignalsSignalIdGet")!;
      expect(trace.enabled).toBe(true);

      await harnessModule.runQueryOptions(trace);
      await harnessModule.runQueryOptions(byId("listSignalsApiSignalsGet")!);
      await harnessModule.runQueryOptions(byId("getSignalApiSignalsSignalIdGet")!);

      const [traceRequest, listRequest, detailRequest] = harness.requests;
      expect(traceRequest?.url).toBe("http://kairos.test/poseidon-auth/api/v1/traces/signals/signal-a");
      expect(traceRequest?.headers.get("X-API-Key")).toBe(harnessModule.TEST_DEVICE_KEY);
      for (const request of [listRequest, detailRequest]) {
        expect(request?.url.startsWith("http://kairos.test/poseidon/")).toBe(true);
        expect(request?.headers.get("X-API-Key")).not.toBe(harnessModule.TEST_DEVICE_KEY);
      }
    } finally {
      harness.restore();
    }
  });

  it("drawer renders a trace notice in place of the load error", () => {
    const markup = renderToStaticMarkup(
      <SignalDrawer isLoading={false} signal={signals[0]} trace={{ isError: true, isLoading: false, notice: <p>key prompt</p> }} />,
    );
    expect(markup).toContain("key prompt");
    expect(markup).not.toContain("Retry; no state was changed.");
  });
});
