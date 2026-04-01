import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { HoldingResponse, NavPointResponse, PerformanceSummaryResponse, PerpHoldingResponse } from "@/api/poseidon/types.gen";

import { HoldingsTable } from "./holdings-table";
import { PerformanceChart } from "./performance-chart";
import { PortfolioMetrics } from "./portfolio-metrics";
import { PerpHoldingsTable } from "./perp-holdings-table";
import { summarizeHoldings, summarizePerpHoldings } from "./portfolio-view-model";

const navCurve: NavPointResponse[] = [
  {
    cash: 32000,
    date: "2026-03-24",
    holdings_count: 3,
    holdings_value: 201000,
    total_nav: 233000,
  },
  {
    cash: 36000,
    date: "2026-03-31",
    holdings_count: 4,
    holdings_value: 214000,
    total_nav: 250000,
  },
];

const performance: PerformanceSummaryResponse = {
  max_drawdown_pct: -0.082,
  nav_curve: navCurve,
  sharpe_ratio: 1.86,
  total_realized_pnl: 18420,
  total_return_pct: 0.174,
  total_trades: 28,
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

describe("portfolio monitoring components", () => {
  it("renders the compact portfolio metrics strip", () => {
    const markup = renderToStaticMarkup(
      <PortfolioMetrics holdingsSummary={summarizeHoldings(holdings)} performance={performance} />,
    );

    expect(markup).toContain("Total Return");
    expect(markup).toContain("Sharpe Ratio");
    expect(markup).toContain("Max Drawdown");
    expect(markup).toContain("Realized P&amp;L");
  });

  it("renders a lightweight performance chart with the latest NAV context", () => {
    const markup = renderToStaticMarkup(<PerformanceChart points={navCurve} timeRangeLabel="1W" />);

    expect(markup).toContain("NAV Trend");
    expect(markup).toContain("Latest NAV");
    expect(markup).toContain("1W window");
  });

  it("renders the holdings table with sortable columns and market labels", () => {
    const markup = renderToStaticMarkup(<HoldingsTable holdings={holdings} />);

    expect(markup).toContain("sortable");
    expect(markup).toContain("Unrealized P&amp;L");
    expect(markup).toContain("AAPL");
    expect(markup).toContain("TW Equities");
  });

  it("renders perp liquidation, margin, and funding posture", () => {
    const markup = renderToStaticMarkup(
      <PerpHoldingsTable holdings={perpHoldings} summary={summarizePerpHoldings(perpHoldings)} />,
    );

    expect(markup).toContain("Liquidation");
    expect(markup).toContain("Margin Ratio");
    expect(markup).toContain("Funding Cost");
    expect(markup).toContain('data-risk="danger"');
  });
});
