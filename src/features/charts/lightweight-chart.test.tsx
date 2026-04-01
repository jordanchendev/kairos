import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TradeMarkerInput } from "./series-markers";

const candles = [
  {
    close: 101_250,
    high: 101_600,
    low: 99_980,
    open: 100_120,
    time: "2026-03-29T00:00:00Z",
    value: 100_900,
  },
  {
    close: 102_100,
    high: 102_450,
    low: 100_820,
    open: 101_250,
    time: "2026-03-30T00:00:00Z",
    value: 101_840,
  },
  {
    close: 103_400,
    high: 103_950,
    low: 101_900,
    open: 102_100,
    time: "2026-03-31T00:00:00Z",
    value: 103_120,
  },
];

const trades: TradeMarkerInput[] = [
  {
    action: "buy",
    price: 100_120,
    time: "2026-03-29T00:00:00Z",
  },
  {
    action: "sell",
    price: 103_400,
    time: "2026-03-31T00:00:00Z",
  },
];

describe("lightweight chart foundation", () => {
  it("renders a reusable chart shell with latest value and marker summary", async () => {
    const chartModule = await import("./lightweight-chart").catch(() => null);

    expect(chartModule).not.toBeNull();

    if (!chartModule) {
      return;
    }

    const markup = renderToStaticMarkup(
      <chartModule.LightweightChart
        data={candles}
        description="BTCUSDT 1D backtest"
        markers={trades}
        priceLabel="Equity"
        title="Backtest Equity"
      />,
    );

    expect(markup).toContain("Backtest Equity");
    expect(markup).toContain("BTCUSDT 1D backtest");
    expect(markup).toContain("Equity");
    expect(markup).toContain("3 points");
    expect(markup).toContain("2 markers");
    expect(markup).toContain("103,120.00");
    expect(markup).toContain("data-chart-shell");
  });

  it("builds trade markers for buy and sell annotations", async () => {
    const markersModule = await import("./series-markers").catch(() => null);

    expect(markersModule).not.toBeNull();

    if (!markersModule) {
      return;
    }

    const markers = markersModule.buildTradeMarkers(trades);

    expect(markers).toEqual([
      {
        color: "#0f9d58",
        position: "belowBar",
        shape: "arrowUp",
        text: "BUY @ 100120.00",
        time: "2026-03-29T00:00:00Z",
      },
      {
        color: "#d93025",
        position: "aboveBar",
        shape: "arrowDown",
        text: "SELL @ 103400.00",
        time: "2026-03-31T00:00:00Z",
      },
    ]);
  });
});
