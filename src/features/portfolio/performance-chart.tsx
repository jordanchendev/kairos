import type { NavPointResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";

import { formatCompactCurrency, formatDateLabel, formatPercent } from "./portfolio-view-model";

type PerformanceChartProps = {
  points: NavPointResponse[];
  timeRangeLabel: string;
};

export function PerformanceChart({ points, timeRangeLabel }: PerformanceChartProps) {
  if (points.length === 0) {
    return <EmptyState message="Poseidon has not emitted NAV snapshots for this slice yet." title="No NAV history" />;
  }

  const width = 640;
  const height = 220;
  const inset = 18;
  const values = points.map((point) => point.total_nav);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const step = points.length === 1 ? 0 : (width - inset * 2) / (points.length - 1);

  const line = points
    .map((point, index) => {
      const x = inset + step * index;
      const y = height - inset - ((point.total_nav - minValue) / valueRange) * (height - inset * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const latestPoint = points.at(-1) ?? points[0];
  const startPoint = points[0];
  const change = startPoint && latestPoint ? (latestPoint.total_nav - startPoint.total_nav) / Math.max(startPoint.total_nav, 1) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">NAV Trend</div>
          <div className="mt-1.5 text-[1.7rem] font-semibold text-[hsl(var(--foreground))]">{formatCompactCurrency(latestPoint.total_nav)}</div>
          <div className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
            Latest NAV on {formatDateLabel(latestPoint.date)} across the {timeRangeLabel} window
          </div>
        </div>
        <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsla(190,91%,37%,0.08)] px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">Latest NAV</div>
          <div className="mt-1.5 text-base font-semibold text-[hsl(var(--foreground))]">{formatCompactCurrency(latestPoint.total_nav)}</div>
          <div className="mt-1 text-sm text-emerald-200">{formatPercent(change, true)} vs first point</div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsla(190,91%,37%,0.1),transparent)] p-3">
        <svg aria-label="NAV trend chart" className="h-auto w-full" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="nav-line-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsla(190,91%,62%,0.28)" />
              <stop offset="100%" stopColor="hsla(190,91%,62%,0.02)" />
            </linearGradient>
          </defs>
          <path d={`${line} L ${width - inset} ${height - inset} L ${inset} ${height - inset} Z`} fill="url(#nav-line-fill)" />
          <path d={line} fill="none" stroke="hsla(190,91%,62%,0.95)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        </svg>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          <span>{formatDateLabel(points[0]?.date)}</span>
          <span>{formatCompactCurrency(maxValue)} high</span>
          <span>{formatCompactCurrency(minValue)} low</span>
          <span>{formatDateLabel(latestPoint.date)}</span>
        </div>
      </div>
    </div>
  );
}
