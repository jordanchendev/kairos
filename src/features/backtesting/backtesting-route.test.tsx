import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { BacktestEquityResponse, BacktestResponse, BacktestTradeResponse } from "@/api/poseidon/types.gen";

const backtests: BacktestResponse[] = [
  {
    completed_at: "2026-03-31T12:00:00Z",
    config: {
      rebalance: "daily",
      risk_budget: 0.2,
    },
    created_at: "2026-03-31T10:00:00Z",
    error_message: null,
    id: "bt-001",
    interval: "1d",
    market: "us_stock",
    metrics: {
      max_drawdown: -0.084,
      sharpe_ratio: 1.93,
      total_return_pct: 0.241,
      win_rate: 0.61,
    },
    status: "completed",
    strategy_id: "strategy-001",
    strategy_type: "MeanReversionV2",
    symbol: "AAPL",
    walk_forward: {
      in_sample_sharpe: 2.1,
      out_of_sample_sharpe: 1.4,
      segments: 6,
    },
  },
  {
    completed_at: null,
    config: {
      rebalance: "weekly",
    },
    created_at: "2026-03-30T09:00:00Z",
    error_message: "worker timeout",
    id: "bt-002",
    interval: "4h",
    market: "crypto_perp",
    metrics: null,
    status: "failed",
    strategy_id: "strategy-002",
    strategy_type: "BreakoutTrend",
    symbol: "BTCUSDT",
    walk_forward: null,
  },
];

const equityCurve: BacktestEquityResponse = {
  backtest_id: "bt-001",
  count: 3,
  data: [
    {
      drawdown: 0,
      equity: 100000,
      time: "2026-03-01T00:00:00Z",
    },
    {
      drawdown: -0.02,
      equity: 104800,
      time: "2026-03-10T00:00:00Z",
    },
    {
      drawdown: -0.01,
      equity: 124100,
      time: "2026-03-31T00:00:00Z",
    },
  ],
};

const trades: BacktestTradeResponse[] = [
  {
    action: "buy",
    backtest_id: "bt-001",
    entry_price: 189.2,
    entry_time: "2026-03-02T14:30:00Z",
    exit_price: 198.1,
    exit_time: "2026-03-09T14:30:00Z",
    fees: 4.2,
    id: "trade-001",
    pnl: 421.3,
    quantity: 12,
    symbol: "AAPL",
  },
  {
    action: "sell",
    backtest_id: "bt-001",
    entry_price: 203.8,
    entry_time: "2026-03-17T14:30:00Z",
    exit_price: 214.7,
    exit_time: "2026-03-24T14:30:00Z",
    fees: 4.9,
    id: "trade-002",
    pnl: 519.4,
    quantity: 10,
    symbol: "AAPL",
  },
];

describe("backtesting route", () => {
  it("renders selected backtest summary, walk-forward detail, and chart shell", async () => {
    const routeModule = await import("@/routes/backtesting");

    expect("BacktestingPage" in routeModule).toBe(true);

    if (!("BacktestingPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.BacktestingPage
        backtests={backtests}
        detail={backtests[0]}
        equityCurve={equityCurve}
        selectedBacktestId="bt-001"
        selectedMarket="all"
        trades={trades}
      />,
    );

    expect(markup).toContain("Backtesting");
    expect(markup).toContain("MeanReversionV2");
    expect(markup).toContain("walk_forward");
    expect(markup).toContain("2 trades");
    expect(markup).toContain("data-chart-shell");
    expect(markup).toContain("3 points");
  });

  it("renders an explicit empty state when Poseidon returns no backtests", async () => {
    const routeModule = await import("@/routes/backtesting");

    expect("BacktestingPage" in routeModule).toBe(true);

    if (!("BacktestingPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.BacktestingPage
        backtests={[]}
        detail={null}
        equityCurve={null}
        selectedBacktestId={null}
        selectedMarket="all"
        trades={[]}
      />,
    );

    expect(markup).toContain("No backtests");
    expect(markup).toContain("Poseidon has not produced any completed backtest runs yet.");
  });
});
