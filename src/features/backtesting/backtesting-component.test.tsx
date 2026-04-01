import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BacktestResponse } from "@/api/poseidon/types.gen";
import type * as ReactQueryModule from "@tanstack/react-query";

const backtests: BacktestResponse[] = [
  {
    completed_at: "2026-03-31T12:00:00Z",
    config: {
      rebalance: "daily",
    },
    created_at: "2026-03-31T10:00:00Z",
    error_message: null,
    id: "bt-001",
    interval: "1d",
    market: "us_stock",
    metrics: {
      sharpe_ratio: 1.93,
      total_return_pct: 0.241,
    },
    status: "completed",
    strategy_id: "strategy-001",
    strategy_type: "MeanReversionV2",
    symbol: "AAPL",
    walk_forward: null,
  },
];

describe("backtesting route compatibility", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders the route instead of an error state when trades and equity endpoints are unavailable", async () => {
    const useQuery = vi
      .fn()
      .mockReturnValueOnce({
        data: backtests,
        error: null,
        isPending: false,
      })
      .mockReturnValueOnce({
        data: backtests[0],
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

    const routeModule = await import("@/routes/backtesting");
    const markup = renderToStaticMarkup(<routeModule.Component />);

    expect(markup).toContain("Backtesting");
    expect(markup).toContain("Chart waiting on data");
    expect(markup).not.toContain("Monitoring data unavailable");
  });
});
