import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import type { QualityScoreResponse } from "@/api/poseidon/types.gen";
import { EChartsShell, LazyECharts } from "@/features/risk/echarts-lazy";

type DataGapHeatmapProps = {
  scores: QualityScoreResponse[];
};

export function DataGapHeatmap({ scores }: DataGapHeatmapProps) {
  const option = createGapHeatmapOption(scores);

  return (
    <EChartsShell
      description="Heatmap uses completeness, consistency, anomaly-free, and timeliness as operational signal rows."
      eyebrow="Gap Scan"
      title="Gap heatmap"
    >
      <div className="space-y-4">
        {typeof window === "undefined" ? (
          <ServerGapGrid scores={scores} />
        ) : (
          <Suspense fallback={<ServerGapGrid scores={scores} />}>
            <LazyECharts notMerge option={option} style={{ height: 300, width: "100%" }} />
          </Suspense>
        )}

        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Interval</th>
                <th className="px-4 py-3 font-medium">Completeness</th>
                <th className="px-4 py-3 font-medium">Timeliness</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={`${score.symbol}-${score.interval}-${score.time}`} className="border-t border-white/8 text-[hsl(var(--foreground))]">
                  <td className="px-4 py-3">{score.symbol}</td>
                  <td className="px-4 py-3">{score.interval}</td>
                  <td className="px-4 py-3">{(score.completeness * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3">{(score.timeliness * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </EChartsShell>
  );
}

function ServerGapGrid({ scores }: { scores: QualityScoreResponse[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {scores.map((score) => (
        <div key={`${score.symbol}-${score.interval}-${score.time}`} className="rounded-[20px] border border-white/10 bg-white/4 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            {score.symbol} · {score.interval}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-[hsl(var(--foreground))]">
            <div>Completeness {(score.completeness * 100).toFixed(0)}%</div>
            <div>Timeliness {(score.timeliness * 100).toFixed(0)}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function createGapHeatmapOption(scores: QualityScoreResponse[]): EChartsOption {
  const metrics = ["completeness", "consistency", "anomaly_free", "timeliness"];

  return {
    animation: false,
    backgroundColor: "transparent",
    grid: {
      bottom: 48,
      left: 92,
      right: 20,
      top: 24,
    },
    series: [
      {
        data: scores.flatMap((score, columnIndex) => [
          [columnIndex, 0, Math.round(score.completeness * 100)],
          [columnIndex, 1, Math.round(score.consistency * 100)],
          [columnIndex, 2, Math.round(score.anomaly_free * 100)],
          [columnIndex, 3, Math.round(score.timeliness * 100)],
        ]),
        label: {
          color: "#F8FAFC",
          show: true,
        },
        type: "heatmap",
      },
    ],
    textStyle: {
      color: "#F8FAFC",
      fontFamily: "Fira Sans, sans-serif",
    },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      formatter: (params: unknown) => formatHeatmapTooltip(params),
      textStyle: {
        color: "#F8FAFC",
      },
    },
    visualMap: {
      calculable: false,
      inRange: {
        color: ["#7F1D1D", "#0F172A", "#22C55E"],
      },
      max: 100,
      min: 0,
      orient: "horizontal",
      show: false,
    },
    xAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.72)",
        formatter: (_value: string, index: number) => `${scores[index]?.symbol ?? ""}\n${scores[index]?.interval ?? ""}`,
      },
      data: scores.map((score) => `${score.symbol}:${score.interval}`),
      splitArea: {
        show: true,
      },
      type: "category",
    },
    yAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.72)",
      },
      data: metrics,
      splitArea: {
        show: true,
      },
      type: "category",
    },
  };
}

function formatHeatmapTooltip(params: unknown) {
  if (!params || typeof params !== "object") {
    return "0%";
  }

  const data = "data" in params ? params.data : null;
  const value = Array.isArray(data) && typeof data[2] === "number" ? data[2] : 0;

  return `${value}%`;
}
