import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { HoldingResponse, PerformanceSummaryResponse, SignalResponse } from "@/api/poseidon/types.gen";
import type { HealthResponse as TritonHealthResponse } from "@/api/triton/types.gen";

import { QueueDepthPanel } from "@/features/infrastructure/queue-depth-panel";
import { GpuUtilizationPanel } from "@/features/infrastructure/gpu-utilization-panel";
import { normalizePoseidonHealth } from "@/features/infrastructure/infrastructure-model";
import { ServiceStatusGrid } from "@/features/infrastructure/service-status-grid";
import { OverviewKpis } from "@/features/overview/overview-kpis";
import { RecentSignalsPanel } from "@/features/overview/recent-signals-panel";
import { TopPositionsPanel } from "@/features/overview/top-positions-panel";

const performance: PerformanceSummaryResponse = {
  max_drawdown_pct: -0.06,
  nav_curve: [
    {
      cash: 21000,
      date: "2026-03-31",
      holdings_count: 4,
      holdings_value: 189000,
      total_nav: 210000,
    },
  ],
  sharpe_ratio: 1.42,
  total_realized_pnl: 12100,
  total_return_pct: 0.18,
  total_trades: 22,
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
];

const tritonHealth: TritonHealthResponse = {
  gpu_available: true,
  gpu_memory_total_mb: 24576,
  gpu_memory_used_mb: 9216,
  queue_cpu_length: 2,
  queue_gpu_length: 7,
  status: "ok",
};

describe("overview and infrastructure monitoring", () => {
  it("normalizes Poseidon health payloads for service panels", () => {
    const health = normalizePoseidonHealth({
      components: {
        celery: { active_tasks: 2, reserved_tasks: 3 },
        data_freshness: { latest_ohlcv: "2026-03-31T08:00:00Z" },
        database: "ok",
        gpu: { available: true, workers: ["celery@gpu-worker"] },
        redis: "error: timeout",
      },
      status: "degraded",
    });

    expect(health.components.celery.active_tasks).toBe(2);
    expect(health.components.redis).toBe("error: timeout");
    expect(health.status).toBe("degraded");
  });

  it("renders overview KPI, top positions, and recent signals panels", () => {
    const kpisMarkup = renderToStaticMarkup(
      <OverviewKpis alertsCount={3} healthStatus="degraded" holdings={holdings} performance={performance} signalsCount={signals.length} />,
    );
    const topPositionsMarkup = renderToStaticMarkup(<TopPositionsPanel holdings={holdings} />);
    const recentSignalsMarkup = renderToStaticMarkup(<RecentSignalsPanel signals={signals} />);

    expect(kpisMarkup).toContain("Total NAV");
    expect(kpisMarkup).toContain("Open Alerts");
    expect(kpisMarkup).toContain("Active Positions");
    expect(topPositionsMarkup).toContain("Top Positions");
    expect(recentSignalsMarkup).toContain("Recent Signals");
  });

  it("renders service status, queue depth, and gpu utilization panels", () => {
    const poseidonHealth = normalizePoseidonHealth({
      components: {
        celery: { active_tasks: 2, reserved_tasks: 3 },
        data_freshness: { latest_ohlcv: "2026-03-31T08:00:00Z" },
        database: "ok",
        gpu: { available: false, note: "no GPU workers responding" },
        redis: "error: timeout",
      },
      status: "degraded",
    });

    const servicesMarkup = renderToStaticMarkup(<ServiceStatusGrid poseidonHealth={poseidonHealth} tritonHealth={tritonHealth} />);
    const queueMarkup = renderToStaticMarkup(<QueueDepthPanel poseidonHealth={poseidonHealth} tritonHealth={tritonHealth} />);
    const gpuMarkup = renderToStaticMarkup(<GpuUtilizationPanel poseidonHealth={poseidonHealth} tritonHealth={tritonHealth} />);

    expect(servicesMarkup).toContain("DEGRADED");
    expect(queueMarkup).toContain("queue");
    expect(gpuMarkup).toContain("gpu");
  });
});
