type FilterBarProps = {
  marketFilter: string | null;
  intervalFilter: string | null;
  onlyNonGreen: boolean;
  onMarketChange: (value: string | null) => void;
  onIntervalChange: (value: string | null) => void;
  onOnlyNonGreenChange: (value: boolean) => void;
};

const MARKET_OPTIONS = [
  { label: "All markets", value: null },
  { label: "crypto_perp", value: "crypto_perp" },
  { label: "crypto_spot", value: "crypto_spot" },
  { label: "tw_stock", value: "tw_stock" },
  { label: "tw_futures", value: "tw_futures" },
  { label: "us_stock", value: "us_stock" },
] as const;

const INTERVAL_OPTIONS = [
  { label: "All intervals", value: null },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
] as const;

export function FilterBar({
  marketFilter,
  intervalFilter,
  onlyNonGreen,
  onMarketChange,
  onIntervalChange,
  onOnlyNonGreenChange,
}: FilterBarProps) {
  return (
    <section
      className="panel-surface flex flex-wrap items-center gap-4 rounded-[24px] p-4"
      data-section-id="filter-bar"
    >
      <div className="flex items-center gap-2">
        <label
          className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]"
          htmlFor="data-health-market-filter"
        >
          Market
        </label>
        <select
          className="rounded-[12px] border border-white/12 bg-white/4 px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
          id="data-health-market-filter"
          onChange={(event) =>
            onMarketChange(event.target.value === "" ? null : event.target.value)
          }
          value={marketFilter ?? ""}
        >
          {MARKET_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label
          className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]"
          htmlFor="data-health-interval-filter"
        >
          Interval
        </label>
        <select
          className="rounded-[12px] border border-white/12 bg-white/4 px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
          id="data-health-interval-filter"
          onChange={(event) =>
            onIntervalChange(event.target.value === "" ? null : event.target.value)
          }
          value={intervalFilter ?? ""}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
        <input
          checked={onlyNonGreen}
          className="h-4 w-4 rounded border-white/20 bg-white/4"
          onChange={(event) => onOnlyNonGreenChange(event.target.checked)}
          type="checkbox"
        />
        Show only non-green
      </label>
    </section>
  );
}
