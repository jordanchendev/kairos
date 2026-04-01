import type { SeriesMarker, Time } from "lightweight-charts";

export type TradeMarkerInput = {
  action: "buy" | "cover" | "sell" | "short";
  price: number;
  time: string;
};

function isBullishAction(action: TradeMarkerInput["action"]) {
  return action === "buy" || action === "cover";
}

function formatMarkerText(action: TradeMarkerInput["action"], price: number) {
  return `${action.toUpperCase()} @ ${price.toFixed(2)}`;
}

export function buildTradeMarkers(trades: readonly TradeMarkerInput[]): SeriesMarker<Time>[] {
  return trades.map((trade) => {
    const bullish = isBullishAction(trade.action);

    return {
      color: bullish ? "#0f9d58" : "#d93025",
      position: bullish ? "belowBar" : "aboveBar",
      shape: bullish ? "arrowUp" : "arrowDown",
      text: formatMarkerText(trade.action, trade.price),
      time: trade.time,
    };
  });
}
