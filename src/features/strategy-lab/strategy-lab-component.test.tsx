import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BacktestResponse, StrategyResponse } from "@/api/poseidon/types.gen";
import type * as ReactQueryModule from "@tanstack/react-query";

const strategies: StrategyResponse[] = [
  {
    active: true,
    config: {
      lookback: 20,
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
];

const backtests: BacktestResponse[] = [
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

describe("strategy lab route compatibility", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("keeps the route usable when the strategy performance endpoint is unavailable", async () => {
    const useQuery = vi
      .fn()
      .mockReturnValueOnce({
        data: strategies,
        error: null,
        isPending: false,
      })
      .mockReturnValueOnce({
        data: backtests,
        error: null,
        isPending: false,
      })
      .mockReturnValueOnce({
        data: strategies[0],
        error: null,
        isPending: false,
      })
      .mockReturnValueOnce({
        data: undefined,
        error: {
          detail: "Not Found",
          status_code: 404,
        },
        isPending: false,
      });

    vi.doMock("@tanstack/react-query", async (importOriginal) => {
      const actual = (await importOriginal()) as typeof ReactQueryModule;

      return {
        ...actual,
        useQuery,
      };
    });
    vi.doMock("@/features/strategy-lab/release-gate-panel", () => ({
      ReleaseGatePanel: ({ strategyId }: { strategyId: string }) => <div data-release-gate-for={strategyId} />,
    }));
    vi.doMock("@/stores/ui-store", () => ({
      useUiStore: (selector: (state: { selectedMarket: string }) => string) =>
        selector({ selectedMarket: "all" }),
    }));

    const routeModule = await import("@/routes/strategy-lab");
    const markup = renderToStaticMarkup(<routeModule.Component />);

    expect(markup).toContain("Strategy Lab");
    expect(markup).toContain("Momentum Core");
    expect(markup).toContain("N/A");
    expect(markup).not.toContain("Monitoring data unavailable");
    // ranked grid first, release evidence after the existing detail flow
    expect(markup.indexOf("Ranked Strategy Grid")).toBeLessThan(markup.indexOf('data-release-gate-for="strategy-001"'));
  });
});

describe("release gate panel device-key gating", () => {
  beforeEach(() => {
    // The compatibility test above stubs the panel itself; render the real one here.
    vi.doUnmock("@/features/strategy-lab/release-gate-panel");
    vi.doUnmock("@/stores/ui-store");
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
    const { ReleaseGatePanel } = await import("@/features/strategy-lab/release-gate-panel");
    const markup = renderToStaticMarkup(<ReleaseGatePanel strategyId="strategy-001" strategyName="Momentum Core" />);
    return { captured, harness, harnessModule, markup };
  }

  it("sends no loop request without a device key and shows the prompt", async () => {
    const { captured, harness, markup } = await renderPanel(false);
    try {
      expect(markup).toContain("Device key required for decision review and release actions");
      expect(markup).not.toContain("Release history");
      expect(captured.length).toBe(5);
      expect(captured.every((query) => query.enabled === false)).toBe(true);
      expect(harness.requests).toHaveLength(0);
    } finally {
      harness.restore();
    }
  });

  it("routes every release query through /poseidon-auth with the stored key", async () => {
    const { captured, harness, harnessModule, markup } = await renderPanel(true);
    try {
      expect(markup).not.toContain("Device key required");
      expect(captured.filter((query) => query.enabled === true).map(harnessModule.queryIdOf)).toEqual([
        "getPrincipalApiV1PrincipalGet",
        "getReleaseStateApiV1StrategiesStrategyIdReleaseStateGet",
        "listReleaseEventsApiV1StrategiesStrategyIdReleaseEventsGet",
      ]);
      for (const query of captured) {
        await harnessModule.runQueryOptions(query);
      }
      expect(harness.requests).toHaveLength(5);
      for (const request of harness.requests) {
        expect(request.url.startsWith("http://kairos.test/poseidon-auth/api/v1/")).toBe(true);
        expect(request.headers.get("X-API-Key")).toBe(harnessModule.TEST_DEVICE_KEY);
      }
    } finally {
      harness.restore();
    }
  });
});
