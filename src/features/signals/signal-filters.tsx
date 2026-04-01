import type { SignalDateRange } from "@/features/signals/signals-model";

type SignalFiltersProps = {
  dateRange: SignalDateRange;
  market: string;
  marketOptions: string[];
  onDateRangeChange: (value: SignalDateRange) => void;
  onMarketChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStrategyChange: (value: string) => void;
  status: string;
  strategy: string;
  strategyOptions: string[];
};

const dateRangeOptions: SignalDateRange[] = ["24H", "7D", "30D", "ALL"];

export function SignalFilters({
  dateRange,
  market,
  marketOptions,
  onDateRangeChange,
  onMarketChange,
  onStatusChange,
  onStrategyChange,
  status,
  strategy,
  strategyOptions,
}: SignalFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <label className="panel-surface flex items-center gap-3 rounded-full px-4 py-3">
        <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">strategy</span>
        <select className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none" onChange={(event) => onStrategyChange(event.target.value)} value={strategy}>
          {strategyOptions.map((option) => (
            <option className="bg-[hsl(var(--card))]" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="panel-surface flex items-center gap-3 rounded-full px-4 py-3">
        <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">market</span>
        <select className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none" onChange={(event) => onMarketChange(event.target.value)} value={market}>
          {marketOptions.map((option) => (
            <option className="bg-[hsl(var(--card))]" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="panel-surface flex items-center gap-3 rounded-full px-4 py-3">
        <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">status</span>
        <select className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none" onChange={(event) => onStatusChange(event.target.value)} value={status}>
          {["all", "executed", "pending", "rejected", "passed"].map((option) => (
            <option className="bg-[hsl(var(--card))]" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="panel-surface flex items-center gap-3 rounded-full px-4 py-3">
        <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">date range</span>
        <select
          className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none"
          onChange={(event) => onDateRangeChange(event.target.value as SignalDateRange)}
          value={dateRange}
        >
          {dateRangeOptions.map((option) => (
            <option className="bg-[hsl(var(--card))]" key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
