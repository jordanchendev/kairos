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
  });
});
