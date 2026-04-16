import type { DataCoverageResponse } from "@/api/thalassa/types.gen";

type CoverageMatrixProps = {
  rows: DataCoverageResponse[];
  onlyNonGreen: boolean;
};

export function CoverageMatrix({ rows, onlyNonGreen }: CoverageMatrixProps) {
  const visible = onlyNonGreen ? rows.filter((row) => row.health !== "green") : rows;

  return (
    <section
      className="panel-surface space-y-4 rounded-[28px] p-6"
      data-section-id="coverage-matrix"
    >
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
          Phase 39 / COVERAGE-01..02
        </div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          Coverage matrix
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Per-(market, symbol, interval) row counts and completeness from
          data_coverage_mv.
        </p>
      </header>
      <div className="overflow-hidden rounded-[20px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-4 py-3 font-medium">Market</th>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Interval</th>
              <th className="px-4 py-3 font-medium">First ts</th>
              <th className="px-4 py-3 font-medium">Last ts</th>
              <th className="px-4 py-3 font-medium">Rows</th>
              <th className="px-4 py-3 font-medium">Completeness</th>
              <th className="px-4 py-3 font-medium">Health</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={`${row.market}-${row.symbol}-${row.interval}`}
                className="border-t border-white/8 text-[hsl(var(--foreground))]"
              >
                <td className="px-4 py-3">{row.market}</td>
                <td className="px-4 py-3">{row.symbol}</td>
                <td className="px-4 py-3">{row.interval}</td>
                <td className="px-4 py-3 text-xs">
                  {row.first_ts ? new Date(row.first_ts).toISOString().slice(0, 10) : "\u2014"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.last_ts ? new Date(row.last_ts).toISOString().slice(0, 10) : "\u2014"}
                </td>
                <td className="px-4 py-3">{row.row_count}</td>
                <td className="px-4 py-3">
                  {(row.completeness_pct * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3">
                  <HealthBadge health={row.health} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HealthBadge({ health }: { health: string }) {
  const cls =
    health === "green"
      ? "bg-emerald-500/15 text-emerald-200"
      : health === "yellow"
        ? "bg-yellow-500/15 text-yellow-200"
        : "bg-red-500/15 text-red-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${cls}`}>
      {health}
    </span>
  );
}
