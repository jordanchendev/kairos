import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import type { DataGapResponse } from "@/api/thalassa/types.gen";
import { EChartsShell, LazyECharts } from "@/features/risk/echarts-lazy";

type GapHeatmapProps = {
  gaps: DataGapResponse[];
  onlyNonGreen: boolean;
};

export function GapHeatmap({ gaps, onlyNonGreen }: GapHeatmapProps) {
  // onlyNonGreen for gaps means missing_bars > 0. For ?open_only=true responses
  // every row already has missing_bars > 0, but we honor the prop contract for
  // consistency with the other two panels.
  const visible = onlyNonGreen ? gaps.filter((g) => g.missing_bars > 0) : gaps;
  const option = createGapHeatmapOption(visible);

  return (
    <EChartsShell
      description="Each cell shows missing_bars for one (symbol, interval) gap window. Darker red = more missing bars."
      eyebrow="Phase 40 / COVERAGE-04"
      title="Gap heatmap"
    >
      <div className="space-y-4">
        {typeof window === "undefined" ? (
          <ServerGapList gaps={visible} />
        ) : (
          <Suspense fallback={<ServerGapList gaps={visible} />}>
            <LazyECharts notMerge option={option} style={{ height: 320, width: "100%" }} />
          </Suspense>
        )}

        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3 font-medium">Market</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Interval</th>
                <th className="px-4 py-3 font-medium">Gap window</th>
                <th className="px-4 py-3 font-medium">Missing bars</th>
                <th className="px-4 py-3 font-medium">Detected</th>
                <th className="px-4 py-3 font-medium">Healed</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((gap) => (
                <tr
                  key={gap.gap_id}
                  className="border-t border-white/8 text-[hsl(var(--foreground))]"
                >
                  <td className="px-4 py-3">{gap.market}</td>
                  <td className="px-4 py-3">{gap.symbol}</td>
                  <td className="px-4 py-3">{gap.interval}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(gap.gap_start).toISOString().slice(0, 16)} {"\u2192"}{" "}
                    {new Date(gap.gap_end).toISOString().slice(0, 16)}
                  </td>
                  <td className="px-4 py-3">{gap.missing_bars}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(gap.detected_at).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {gap.healed_at
                      ? new Date(gap.healed_at).toISOString().slice(0, 10)
                      : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </EChartsShell>
  );
}

function ServerGapList({ gaps }: { gaps: DataGapResponse[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {gaps.map((gap) => (
        <div
          key={gap.gap_id}
          className="rounded-[20px] border border-white/10 bg-white/4 p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            {gap.market} &middot; {gap.symbol} &middot; {gap.interval}
          </div>
          <div className="mt-3 text-sm text-[hsl(var(--foreground))]">
            {gap.missing_bars} missing bar(s)
          </div>
        </div>
      ))}
    </div>
  );
}

function createGapHeatmapOption(gaps: DataGapResponse[]): EChartsOption {
  // X axis: one cell per gap row (symbol:interval). Y axis: collapsed
  // to a single "missing_bars" row to keep the visual aligned with the
  // existing data-gap-heatmap recipe in features/risk.
  return {
    animation: false,
    backgroundColor: "transparent",
    grid: { bottom: 56, left: 132, right: 20, top: 24 },
    series: [
      {
        data: gaps.map((gap, columnIndex) => [columnIndex, 0, gap.missing_bars]),
        label: { color: "#F8FAFC", show: true },
        type: "heatmap",
      },
    ],
    textStyle: { color: "#F8FAFC", fontFamily: "Fira Sans, sans-serif" },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      formatter: (params: unknown) => formatGapTooltip(params, gaps),
      textStyle: { color: "#F8FAFC" },
    },
    visualMap: {
      calculable: false,
      inRange: { color: ["#0F172A", "#F59E0B", "#7F1D1D"] },
      max: Math.max(1, ...gaps.map((g) => g.missing_bars)),
      min: 0,
      orient: "horizontal",
      show: false,
    },
    xAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.72)",
        formatter: (_value: string, index: number) =>
          `${gaps[index]?.symbol ?? ""}\n${gaps[index]?.interval ?? ""}`,
      },
      data: gaps.map((g) => `${g.symbol}:${g.interval}`),
      splitArea: { show: true },
      type: "category",
    },
    yAxis: {
      axisLabel: { color: "rgba(248,250,252,0.72)" },
      data: ["missing_bars"],
      splitArea: { show: true },
      type: "category",
    },
  };
}

function formatGapTooltip(params: unknown, gaps: DataGapResponse[]): string {
  if (!params || typeof params !== "object" || !("data" in params)) {
    return "0 missing";
  }
  const data = (params as { data: unknown }).data;
  if (!Array.isArray(data) || typeof data[0] !== "number") return "0 missing";
  const idx = data[0];
  const gap = gaps[idx];
  if (!gap) return `${data[2]} missing`;
  return `${gap.market} &middot; ${gap.symbol} &middot; ${gap.interval}<br/>${gap.missing_bars} missing bar(s)`;
}
