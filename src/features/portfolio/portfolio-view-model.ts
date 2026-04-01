import type { HoldingResponse, NavPointResponse, PerpHoldingResponse } from "@/api/poseidon/types.gen";
import type { MarketOption, TimeRangeOption } from "@/stores/ui-store";

const MARKET_TO_API: Record<MarketOption, string | undefined> = {
  "All Markets": undefined,
  "Crypto Perps": "crypto_perp",
  "TW Equities": "tw_stock",
  "US Equities": "us_stock",
};

const MARKET_LABELS: Record<string, string> = {
  crypto_perp: "Crypto Perps",
  tw_stock: "TW Equities",
  us_stock: "US Equities",
};

const TIME_RANGE_DAY_SPAN: Record<Exclude<TimeRangeOption, "YTD">, number> = {
  "1D": 1,
  "1M": 31,
  "1Q": 92,
  "1W": 7,
};

export type HoldingsSummary = {
  holdingsCount: number;
  totalUnrealizedPnl: number;
  totalWeight: number;
  winners: number;
};

export type LiquidationTone = "danger" | "neutral" | "warning";

export type PerpHoldingsSummary = {
  aggregateNotional: number;
  highRiskCount: number;
  totalFundingCost: number;
  totalUnrealizedPnl: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
});

const signedPercentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  signDisplay: "always",
  style: "percent",
});

const ratioFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const numericFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export function getApiMarket(selectedMarket: MarketOption) {
  return MARKET_TO_API[selectedMarket];
}

export function getMarketLabel(market: string) {
  return MARKET_LABELS[market] ?? market;
}

export function filterNavCurveByTimeRange(points: NavPointResponse[], timeRange: TimeRangeOption) {
  if (points.length <= 1) {
    return points;
  }

  const anchorDate = new Date(points.at(-1)?.date ?? points[0]?.date ?? "");

  if (Number.isNaN(anchorDate.getTime())) {
    return points;
  }

  const startDate = new Date(anchorDate);

  if (timeRange === "YTD") {
    startDate.setUTCMonth(0, 1);
  } else {
    startDate.setUTCDate(anchorDate.getUTCDate() - TIME_RANGE_DAY_SPAN[timeRange] + 1);
  }

  return points.filter((point) => {
    const pointDate = new Date(point.date);
    return !Number.isNaN(pointDate.getTime()) && pointDate >= startDate;
  });
}

export function summarizeHoldings(holdings: HoldingResponse[]): HoldingsSummary {
  return holdings.reduce<HoldingsSummary>(
    (summary, holding) => ({
      holdingsCount: summary.holdingsCount + 1,
      totalUnrealizedPnl: summary.totalUnrealizedPnl + (holding.unrealized_pnl ?? 0),
      totalWeight: summary.totalWeight + holding.weight,
      winners: summary.winners + ((holding.unrealized_pnl ?? 0) > 0 ? 1 : 0),
    }),
    {
      holdingsCount: 0,
      totalUnrealizedPnl: 0,
      totalWeight: 0,
      winners: 0,
    },
  );
}

export function getLiquidationTone(holding: PerpHoldingResponse): LiquidationTone {
  const currentPrice = holding.current_price ?? holding.entry_price;

  if (currentPrice <= 0) {
    if (holding.margin_ratio >= 0.55) {
      return "danger";
    }

    if (holding.margin_ratio >= 0.35) {
      return "warning";
    }

    return "neutral";
  }

  const side = holding.side.toLowerCase();
  const distance =
    side === "short"
      ? (holding.liquidation_price - currentPrice) / currentPrice
      : (currentPrice - holding.liquidation_price) / currentPrice;

  if (distance <= 0.03 || holding.margin_ratio >= 0.55) {
    return "danger";
  }

  if (distance <= 0.08 || holding.margin_ratio >= 0.35) {
    return "warning";
  }

  return "neutral";
}

export function summarizePerpHoldings(holdings: PerpHoldingResponse[]): PerpHoldingsSummary {
  return holdings.reduce<PerpHoldingsSummary>(
    (summary, holding) => ({
      aggregateNotional: summary.aggregateNotional + Math.abs(holding.quantity * (holding.current_price ?? holding.entry_price)),
      highRiskCount: summary.highRiskCount + (getLiquidationTone(holding) === "danger" ? 1 : 0),
      totalFundingCost: summary.totalFundingCost + holding.cumulative_funding_cost,
      totalUnrealizedPnl: summary.totalUnrealizedPnl + holding.unrealized_pnl,
    }),
    {
      aggregateNotional: 0,
      highRiskCount: 0,
      totalFundingCost: 0,
      totalUnrealizedPnl: 0,
    },
  );
}

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

export function formatCompactCurrency(value: number | null | undefined) {
  return compactCurrencyFormatter.format(value ?? 0);
}

export function formatPercent(value: number | null | undefined, signed = false) {
  return (signed ? signedPercentFormatter : percentFormatter).format(value ?? 0);
}

export function formatRatio(value: number | null | undefined) {
  return ratioFormatter.format(value ?? 0);
}

export function formatNumber(value: number | null | undefined) {
  return numericFormatter.format(value ?? 0);
}

export function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}
