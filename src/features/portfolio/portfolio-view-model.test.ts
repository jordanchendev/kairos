import { describe, expect, it } from "vitest";

import type { HoldingResponse, NavPointResponse, PerpHoldingResponse } from "@/api/poseidon/types.gen";

import {
  filterNavCurveByTimeRange,
  getApiMarket,
  getLiquidationTone,
  summarizeHoldings,
  summarizePerpHoldings,
} from "./portfolio-view-model";

const navCurve: NavPointResponse[] = [
  {
    cash: 32000,
    date: "2026-01-02",
    holdings_count: 2,
    holdings_value: 180000,
    total_nav: 212000,
  },
  {
    cash: 35000,
    date: "2026-03-25",
    holdings_count: 3,
    holdings_value: 201000,
    total_nav: 236000,
  },
  {
    cash: 36000,
    date: "2026-03-31",
    holdings_count: 4,
    holdings_value: 214000,
    total_nav: 250000,
  },
];

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

describe("portfolio view model", () => {
  it("maps UI market selections to Poseidon market keys", () => {
    expect(getApiMarket("All Markets")).toBeUndefined();
    expect(getApiMarket("TW Equities")).toBe("tw_stock");
    expect(getApiMarket("US Equities")).toBe("us_stock");
    expect(getApiMarket("Crypto Perps")).toBe("crypto_perp");
  });

  it("filters NAV history to the selected time range using the latest point as anchor", () => {
    expect(filterNavCurveByTimeRange(navCurve, "1W").map((point) => point.date)).toEqual(["2026-03-25", "2026-03-31"]);
    expect(filterNavCurveByTimeRange(navCurve, "YTD").map((point) => point.date)).toEqual([
      "2026-01-02",
      "2026-03-25",
      "2026-03-31",
    ]);
  });

  it("summarizes spot holdings into operator-facing totals", () => {
    expect(summarizeHoldings(holdings)).toEqual({
      holdingsCount: 2,
      totalUnrealizedPnl: 60,
      totalWeight: 0.42,
      winners: 1,
    });
  });

  it("summarizes perp positions into exposure, funding, and liquidation posture", () => {
    expect(summarizePerpHoldings(perpHoldings)).toEqual({
      aggregateNotional: 76250,
      highRiskCount: 1,
      totalFundingCost: -24,
      totalUnrealizedPnl: 420,
    });
  });

  it("marks liquidation posture by proximity for long and short positions", () => {
    expect(getLiquidationTone(perpHoldings[0])).toBe("neutral");
    expect(getLiquidationTone(perpHoldings[1])).toBe("danger");
  });
});
