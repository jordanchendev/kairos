import { Suspense, type ReactNode } from "react";

import type { EChartsOption } from "echarts";

import { LazyECharts } from "@/features/risk/echarts-lazy";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------------------------------------------ sparkline

type SparklineProps = {
  className?: string;
  /** rank series: smaller is better, drawn at the top */
  invert?: boolean;
  label: string;
  values: readonly (number | null)[];
};

/** Inline SVG line over the series; nulls break the line. Scales to its box, the stroke stays 1px. */
export function Sparkline({ className, invert = false, label, values }: SparklineProps) {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) {
    return <span className={cn("block h-[18px] w-full", className)} data-sparkline="0" />;
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const segments: string[] = [];
  let current = "";
  values.forEach((value, i) => {
    if (value === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    const y = invert ? ((value - min) / span) * 22 + 1 : 23 - ((value - min) / span) * 22;
    current += `${current ? " L" : "M"}${(i * step).toFixed(2)},${y.toFixed(2)}`;
  });
  if (current) segments.push(current);
  return (
    <svg
      aria-label={label}
      className={cn("block h-[18px] w-full overflow-visible text-[hsl(var(--muted-foreground))]", className)}
      data-sparkline={present.length}
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 100 24"
    >
      <path d={segments.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ panel charts

type PanelChartProps = {
  height: number;
  label: string;
  option: () => EChartsOption;
  /** what the chart shows, rendered instead of the canvas where there is no browser (server render, tests) */
  summary: ReactNode;
};

export function PanelChart({ height, label, option, summary }: PanelChartProps) {
  const box = { height, width: "100%" };
  if (typeof window === "undefined") {
    return (
      <div aria-label={label} className="text-[10.5px] text-[hsl(var(--muted-foreground))]" data-chart={label} style={box}>
        {summary}
      </div>
    );
  }
  return (
    <div aria-label={label} data-chart={label} role="img" style={box}>
      <Suspense fallback={<div style={box} />}>
        <LazyECharts notMerge option={option()} style={box} />
      </Suspense>
    </div>
  );
}

