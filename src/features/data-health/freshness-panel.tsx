import type { DataFreshnessResponse } from "@/api/poseidon/types.gen";

type FreshnessPanelProps = {
  records: DataFreshnessResponse[];
  onlyNonGreen: boolean;
};

export function FreshnessPanel({ records, onlyNonGreen }: FreshnessPanelProps) {
  const visible = onlyNonGreen
    ? records.filter((r) => r.status !== "fresh")
    : records;

  const violations = visible.filter((r) => r.status === "violation");
  const unknown = visible.filter((r) => r.status === "unknown");
  const ok = visible.filter((r) => r.status === "fresh");

  return (
    <section
      className="panel-surface space-y-4 rounded-[28px] p-6"
      data-section-id="freshness-panel"
    >
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
          Phase 40 / FRESH-01..04
        </div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          Ingest freshness
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Per-(market, interval) lag vs SLA. Green = within budget,
          yellow = unknown (no successful fetch yet), red = violation
          (HC.io alert pending).
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        <FreshnessTotalsCard label="Within SLA" value={ok.length} variant="ok" />
        <FreshnessTotalsCard
          label="Unknown"
          value={unknown.length}
          variant="unknown"
        />
        <FreshnessTotalsCard
          label="Violations"
          value={violations.length}
          variant="violation"
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((r) => (
          <FreshnessTileRow key={`${r.market}:${r.interval}`} record={r} />
        ))}
      </div>
    </section>
  );
}

type FreshnessTotalsCardProps = {
  label: string;
  value: number;
  variant: "ok" | "unknown" | "violation";
};

function FreshnessTotalsCard({ label, value, variant }: FreshnessTotalsCardProps) {
  const variantClass =
    variant === "violation"
      ? "border-red-500/40 text-red-200"
      : variant === "unknown"
        ? "border-yellow-500/40 text-yellow-200"
        : "border-emerald-500/40 text-emerald-200";
  return (
    <div className={`rounded-[20px] border bg-white/4 p-4 ${variantClass}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

type FreshnessTileRowProps = { record: DataFreshnessResponse };

function FreshnessTileRow({ record }: FreshnessTileRowProps) {
  const lagMinutes = Math.round(record.observed_lag_seconds / 60);
  const slaMinutes = Math.round(record.expected_lag_seconds / 60);
  const statusColor =
    record.status === "violation"
      ? "bg-red-500/15 text-red-200"
      : record.status === "unknown"
        ? "bg-yellow-500/15 text-yellow-200"
        : "bg-emerald-500/15 text-emerald-200";

  return (
    <div className="rounded-[16px] border border-white/8 bg-white/4 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-[hsl(var(--foreground))]">
          {record.market} <span className="opacity-60">&middot;</span> {record.interval}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusColor}`}
        >
          {record.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[hsl(var(--muted-foreground))]">
        <div>
          <div className="opacity-70">Observed lag</div>
          <div className="text-[hsl(var(--foreground))]">{lagMinutes} min</div>
        </div>
        <div>
          <div className="opacity-70">SLA</div>
          <div className="text-[hsl(var(--foreground))]">{slaMinutes} min</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
        Last successful ts:{" "}
        {record.last_successful_ts
          ? new Date(record.last_successful_ts).toISOString()
          : "\u2014"}
      </div>
    </div>
  );
}
