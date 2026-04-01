import type { SignalResponse } from "@/api/poseidon/types.gen";

export type SignalDateRange = "24H" | "30D" | "7D" | "ALL";

export type SignalFiltersState = {
  dateRange: SignalDateRange;
  market: string;
  status: string;
  strategy: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

export function getSignalStrategyValue(signal: SignalResponse) {
  const strategyName = signal.params?.strategy_name;
  return typeof strategyName === "string" && strategyName ? strategyName : signal.strategy_id ?? "unassigned";
}

export function filterSignals(signals: SignalResponse[], filters: SignalFiltersState, now = new Date()) {
  return signals.filter((signal) => {
    if (filters.strategy !== "all" && getSignalStrategyValue(signal) !== filters.strategy) {
      return false;
    }

    if (filters.market !== "all" && signal.market !== filters.market) {
      return false;
    }

    if (filters.status !== "all" && signal.status !== filters.status) {
      return false;
    }

    if (filters.dateRange === "ALL") {
      return true;
    }

    const signalTime = new Date(signal.signal_time);

    if (Number.isNaN(signalTime.getTime())) {
      return false;
    }

    const rangeHours = filters.dateRange === "24H" ? 24 : filters.dateRange === "7D" ? 24 * 7 : 24 * 30;

    return signalTime.getTime() >= now.getTime() - rangeHours * 60 * 60 * 1000;
  });
}

export function getSignalStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (["executed", "passed", "filled"].includes(normalizedStatus)) {
    return "up" as const;
  }

  if (["rejected", "failed", "expired"].includes(normalizedStatus)) {
    return "down" as const;
  }

  if (["pending", "queued"].includes(normalizedStatus)) {
    return "degraded" as const;
  }

  return "idle" as const;
}

export function formatSignalTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTimeFormatter.format(parsed);
}
