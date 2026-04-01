import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AlertsResponse, HoldingResponse, PerformanceSummaryResponse, SignalResponse } from "@/api/poseidon/types.gen";
import { normalizePoseidonHealth } from "@/features/infrastructure/infrastructure-model";

const performance: PerformanceSummaryResponse = {
  max_drawdown_pct: -0.084,
  nav_curve: [
    {
      cash: 32000,
      date: "2026-03-25",
      holdings_count: 5,
      holdings_value: 188000,
      total_nav: 220000,
    },
    {
      cash: 28000,
      date: "2026-03-31",
      holdings_count: 6,
      holdings_value: 207000,
      total_nav: 235000,
    },
  ],
  sharpe_ratio: 1.62,
  total_realized_pnl: 14200,
  total_return_pct: 0.213,
  total_trades: 31,
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
    current_price: 1210,
    entry_date: "2026-03-06",
    entry_price: 1105,
    market: "us_stock",
    shares: 14,
    stop_loss_pct: 0.09,
    symbol: "NVDA",
    unrealized_pnl: 1470,
    weight: 0.31,
  },
];

const signals: SignalResponse[] = [
  {
    action: "buy",
    confidence: 0.91,
    created_at: "2026-03-31T08:00:00Z",
    id: "signal-a",
    instrument: "spot",
    interval: "1h",
    market: "us_stock",
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
    action: "short",
    confidence: 0.88,
    created_at: "2026-03-31T07:00:00Z",
    id: "signal-b",
    instrument: "perp",
    interval: "4h",
    market: "crypto_spot",
    model_id: null,
    params: { strategy_name: "Crypto Macro" },
    quantity_pct: 0.12,
    reject_reason: null,
    signal_time: "2026-03-31T06:50:00Z",
    status: "passed",
    strategy_id: "strategy-b",
    symbol: "BTCUSDT",
    valid_until: "2026-03-31T10:00:00Z",
  },
];

const alerts: AlertsResponse = {
  alerts: [
    {
      data: {
        component: "redis",
        severity: "high",
      },
      event_type: "system.degraded",
      id: "alert-1",
    },
  ],
  total: 1,
};

describe("overview page", () => {
  it("renders the command-center portfolio and risk layout", async () => {
    const routeModule = await import("@/routes/overview");

    expect("OverviewPage" in routeModule).toBe(true);

    if (!("OverviewPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.OverviewPage
        alerts={alerts}
        holdings={holdings}
        performance={performance}
        poseidonHealth={normalizePoseidonHealth({
          components: {
            celery: { active_tasks: 4, reserved_tasks: 1 },
            data_freshness: { latest_ohlcv: "2026-03-31T08:00:00Z" },
            database: "ok",
            gpu: { available: true, workers: ["celery@gpu-worker"] },
            redis: "degraded",
          },
          status: "degraded",
        })}
        selectedMarket="All Markets"
        selectedTimeRange="1W"
        signals={signals}
      />,
    );

    expect(markup).toContain("Status Rail");
    expect(markup).toContain("Portfolio Pulse");
    expect(markup).toContain("Attention Queue");
    expect(markup).toContain("Top Exposure");
    expect(markup).toContain("Recent Activity");
    expect(markup).toContain('class="space-y-4"');
    expect(markup).toContain('grid gap-4 xl:grid-cols-[1.45fr_0.9fr]');
    expect(markup).toContain('grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6');
  });
});
