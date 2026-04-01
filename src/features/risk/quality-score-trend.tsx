import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import type { QualityScoreResponse } from "@/api/poseidon/types.gen";
import { EChartsShell, LazyECharts } from "@/features/risk/echarts-lazy";

type QualityScoreTrendProps = {
  scores: QualityScoreResponse[];
};

export function QualityScoreTrend({ scores }: QualityScoreTrendProps) {
  const option = createQualityTrendOption(scores);

  return (
    <EChartsShell
      description="Recent quality score history grouped by symbol for quick degradation detection."
      eyebrow="Score Trend"
      title="Quality score trend"
    >
      {typeof window === "undefined" ? (
        <ServerQualityTrend scores={scores} />
      ) : (
        <Suspense fallback={<ServerQualityTrend scores={scores} />}>
          <LazyECharts notMerge option={option} style={{ height: 280, width: "100%" }} />
        </Suspense>
      )}
    </EChartsShell>
  );
}

function ServerQualityTrend({ scores }: { scores: QualityScoreResponse[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scores.slice(0, 4).map((score) => (
        <div key={`${score.symbol}-${score.interval}-${score.time}`} className="rounded-[20px] border border-white/10 bg-white/4 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            {score.symbol} · {score.interval}
          </div>
          <div className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">{(score.score * 100).toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

function createQualityTrendOption(scores: QualityScoreResponse[]): EChartsOption {
  const ordered = scores.slice().reverse();

  return {
    animation: false,
    backgroundColor: "transparent",
    grid: {
      bottom: 28,
      left: 40,
      right: 20,
      top: 24,
    },
    legend: {
      textStyle: {
        color: "#F8FAFC",
      },
      top: 0,
    },
    series: buildSeries(ordered),
    textStyle: {
      color: "#F8FAFC",
      fontFamily: "Fira Sans, sans-serif",
    },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      trigger: "axis",
    },
    xAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.72)",
        fontSize: 11,
      },
      data: ordered.map((score) => score.interval),
      type: "category",
    },
    yAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.6)",
        formatter: (value: number) => `${value.toFixed(0)}%`,
      },
      max: 100,
      splitLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.14)",
        },
      },
      type: "value",
    },
  };
}

function buildSeries(scores: QualityScoreResponse[]) {
  const grouped = new Map<string, Array<[string, number]>>();

  scores.forEach((score) => {
    const current = grouped.get(score.symbol) ?? [];
    current.push([score.interval, score.score * 100]);
    grouped.set(score.symbol, current);
  });

  return Array.from(grouped.entries()).map(([symbol, values], index) => ({
    data: values.map(([, score]) => score),
    itemStyle: {
      color: index % 2 === 0 ? "#22C55E" : "#38BDF8",
    },
    lineStyle: {
      width: 3,
    },
    name: symbol,
    smooth: true,
    type: "line" as const,
  }));
}
