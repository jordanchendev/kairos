import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import { EmptyState } from "@/features/monitoring/empty-state";

import { EChartsShell, LazyECharts } from "./echarts-lazy";
import type { FactorAnalysisRun } from "./types";
import { asCentralityResults } from "./types";

type CentralityHeatmapProps = {
  run: FactorAnalysisRun | null;
};

export function CentralityHeatmap({ run }: CentralityHeatmapProps) {
  const results = asCentralityResults(run);

  if (
    !results ||
    results.signal_names.length === 0 ||
    results.correlation_matrix.length === 0
  ) {
    return (
      <EChartsShell
        description="Pairwise signal-overlap matrix with hierarchical clusters."
        eyebrow="Signal Overlap"
        title="Centrality heatmap"
      >
        <EmptyState
          message="Trigger the overlap analysis to inspect correlated sub-signals and cluster boundaries."
          title="No overlap results"
        />
      </EChartsShell>
    );
  }

  const option = createCentralityOption(results);

  return (
    <EChartsShell
      description={`Correlation matrix for ${results.signal_names.length} signal(s) at threshold ${results.threshold}.`}
      eyebrow="Signal Overlap"
      title="Centrality heatmap"
    >
      {typeof window === "undefined" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(results.clusters).map(([clusterId, members]) => (
            <div
              className="rounded-[20px] border border-white/10 bg-white/4 p-4"
              key={clusterId}
            >
              <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Cluster {clusterId}
              </div>
              <div className="mt-3 text-sm text-[hsl(var(--foreground))]">{members.join(", ")}</div>
            </div>
          ))}
        </div>
      ) : (
        <Suspense fallback={<div className="h-80 rounded-[24px] border border-white/8 bg-white/[0.03]" />}>
          <LazyECharts notMerge option={option} style={{ height: 320, width: "100%" }} />
        </Suspense>
      )}
    </EChartsShell>
  );
}

function createCentralityOption(results: NonNullable<ReturnType<typeof asCentralityResults>>): EChartsOption {
  const matrixData = results.correlation_matrix.flatMap((row, rowIndex) =>
    row.map((value, columnIndex) => [columnIndex, rowIndex, value]),
  );

  return {
    animation: false,
    backgroundColor: "transparent",
    grid: { bottom: 80, left: 120, right: 20, top: 24 },
    series: [
      {
        data: matrixData,
        label: {
          color: "#F8FAFC",
          formatter: (params: unknown) => {
            const data = extractTupleData(params);
            return typeof data?.[2] === "number" ? data[2].toFixed(2) : "";
          },
          show: true,
        },
        type: "heatmap",
      },
    ],
    textStyle: { color: "#F8FAFC", fontFamily: "Fira Sans, sans-serif" },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      formatter: (params: unknown) => {
        const data = extractTupleData(params);
        if (!Array.isArray(data) || typeof data[0] !== "number" || typeof data[1] !== "number") {
          return "";
        }
        const x = data[0];
        const y = data[1];
        const value = typeof data[2] === "number" ? data[2].toFixed(2) : "N/A";
        return `${results.signal_names[y]} × ${results.signal_names[x]}<br/>${value}`;
      },
      textStyle: { color: "#F8FAFC" },
    },
    visualMap: {
      calculable: false,
      inRange: { color: ["#7f1d1d", "#0f172a", "#0ea5e9"] },
      max: 1,
      min: -1,
      orient: "horizontal",
      show: false,
    },
    xAxis: {
      axisLabel: { color: "rgba(248,250,252,0.72)", rotate: 20 },
      data: results.signal_names,
      splitArea: { show: true },
      type: "category",
    },
    yAxis: {
      axisLabel: { color: "rgba(248,250,252,0.72)" },
      data: results.signal_names,
      splitArea: { show: true },
      type: "category",
    },
  };
}

function extractTupleData(params: unknown): unknown[] | null {
  if (!params || typeof params !== "object" || !("data" in params)) {
    return null;
  }

  const data = (params as { data?: unknown }).data;
  return Array.isArray(data) ? data : null;
}
