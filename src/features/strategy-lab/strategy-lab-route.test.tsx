import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { BacktestResponse, StrategyPerformanceResponse, StrategyResponse } from "@/api/poseidon/types.gen";

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
            totalPnl: 19840,
          },
          {
            backtestCount: 1,
            latestSharpe: 0.94,
            latestTradeCount: 12,
            latestWinRate: 0.45,
            strategy: strategies[1],
            totalPnl: 4120,
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
