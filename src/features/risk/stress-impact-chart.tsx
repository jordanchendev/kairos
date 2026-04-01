import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import { EChartsShell, LazyECharts } from "@/features/risk/echarts-lazy";

import type { StressResultModel } from "./stress-model";

type StressImpactChartProps = {
  result: StressResultModel;
};

export function StressImpactChart({ result }: StressImpactChartProps) {
  const option = createStressImpactOption(result);

  return (
    <EChartsShell
      description="Compares realized portfolio PnL against the scenario's worst-case loss boundary."
      eyebrow="Impact"
      title="Shock impact"
    >
      {typeof window === "undefined" ? (
        <ServerImpactSummary result={result} />
      ) : (
        <Suspense fallback={<ServerImpactSummary result={result} />}>
          <LazyECharts notMerge option={option} style={{ height: 280, width: "100%" }} />
        </Suspense>
      )}
    </EChartsShell>
  );
}

function ServerImpactSummary({ result }: { result: StressResultModel }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[20px] border border-white/10 bg-white/4 p-4">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Portfolio PnL</div>
        <div className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatCurrency(result.portfolioPnl)}</div>
      </div>
      <div className="rounded-[20px] border border-white/10 bg-white/4 p-4">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Worst case loss</div>
        <div className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatCurrency(result.worstCaseLoss)}</div>
      </div>
    </div>
  );
}

function createStressImpactOption(result: StressResultModel): EChartsOption {
  return {
    animation: false,
    backgroundColor: "transparent",
    grid: {
      bottom: 28,
      left: 52,
      right: 20,
      top: 24,
    },
    series: [
      {
        barWidth: 42,
        data: [
          {
            itemStyle: {
              borderRadius: [12, 12, 0, 0],
              color: "rgba(56,189,248,0.85)",
            },
            value: Math.abs(result.portfolioPnl),
          },
          {
            itemStyle: {
              borderRadius: [12, 12, 0, 0],
              color: "rgba(248,113,113,0.82)",
            },
            value: Math.abs(result.worstCaseLoss),
          },
        ],
        type: "bar",
      },
    ],
    textStyle: {
      color: "#F8FAFC",
      fontFamily: "Fira Sans, sans-serif",
    },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      formatter: (params: unknown) => formatImpactTooltip(params),
      textStyle: {
        color: "#F8FAFC",
      },
      trigger: "axis",
    },
    xAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.72)",
        fontSize: 11,
      },
      axisLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.25)",
        },
      },
      data: ["Portfolio PnL", "Worst case loss"],
      type: "category",
    },
    yAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.6)",
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
      },
      splitLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.14)",
        },
      },
      type: "value",
    },
  };
}

function formatImpactTooltip(params: unknown) {
  const first = Array.isArray(params) ? params[0] : params;

  if (!first || typeof first !== "object") {
    return `impact: ${formatCurrency(0)}`;
  }

  const label = "axisValueLabel" in first && typeof first.axisValueLabel === "string" ? first.axisValueLabel : "impact";
  const data = "data" in first && first.data && typeof first.data === "object" ? first.data : null;
  const value = data && "value" in data && typeof data.value === "number" ? data.value : 0;

  return `${label}: ${formatCurrency(value)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
    signDisplay: "exceptZero",
  }).format(value);
}
