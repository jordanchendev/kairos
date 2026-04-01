import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AlertItem, SignalResponse } from "@/api/poseidon/types.gen";

import { AlertsFeed } from "@/features/alerts/alerts-feed";
import { deriveAlertSeverity, getAlertFreshnessLabel, getAlertTimestamp } from "@/features/alerts/alerts-model";

import { SignalDrawer } from "./signal-drawer";
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
