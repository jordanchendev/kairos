import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import { MetricCard } from "@/features/monitoring/metric-card";

import { EChartsShell, LazyECharts } from "./echarts-lazy";
import type { VarSnapshotModel, VarSnapshotSummary } from "./var-model";

type VarDistributionPanelProps = {
  selectedMethod: string | null;
  summary: VarSnapshotSummary;
};

export function VarDistributionPanel({ selectedMethod, summary }: VarDistributionPanelProps) {
  const activeSnapshot = summary.snapshots.find((snapshot) => snapshot.method === selectedMethod) ?? summary.worstSnapshot;
  const option = createVarDistributionOption(summary.snapshots);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          delta={activeSnapshot ? `${formatPercent(activeSnapshot.var99)} tail` : undefined}
          deltaTone="danger"
          detail="Most negative 95% scenario across available methods"
          label="Worst 95% loss"
          value={activeSnapshot ? formatPercent(activeSnapshot.var95) : "n/a"}
        />
        <MetricCard
          detail="Expected shortfall under the selected method"
          label="CVaR 95"
          value={activeSnapshot ? formatPercent(activeSnapshot.cvar95) : "n/a"}
        />
        <MetricCard
          detail={activeSnapshot ? `${activeSnapshot.holdingPeriod} day horizon` : "Awaiting snapshot selection"}
          label="Portfolio value"
          value={activeSnapshot ? formatCurrency(activeSnapshot.portfolioValue) : "n/a"}
        />
      </div>

      <EChartsShell
        description="Histogram shell for comparing the worst-case daily loss profile across VaR methods."
        eyebrow="Distribution"
        title="VaR distribution"
      >
        {typeof window === "undefined" ? (
          <ServerHistogram summary={summary} />
        ) : (
          <Suspense fallback={<ServerHistogram summary={summary} />}>
            <LazyECharts notMerge option={option} style={{ height: 280, width: "100%" }} />
          </Suspense>
        )}
      </EChartsShell>
    </div>
  );
}

function ServerHistogram({ summary }: { summary: VarSnapshotSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {summary.snapshots.map((snapshot) => (
        <div key={snapshot.method} className="rounded-[20px] border border-white/10 bg-white/4 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{snapshot.method}</div>
          <div className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatPercent(snapshot.var95)}</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">CVaR 95 {formatPercent(snapshot.cvar95)}</div>
        </div>
      ))}
    </div>
  );
}

function createVarDistributionOption(snapshots: VarSnapshotModel[]): EChartsOption {
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
        barWidth: 36,
        data: snapshots.map((snapshot) => ({
          itemStyle: {
            borderRadius: [12, 12, 0, 0],
            color: snapshot.var95 === Math.min(...snapshots.map((item) => item.var95)) ? "#22C55E" : "#38BDF8",
          },
          value: Math.abs(snapshot.var95) * 100,
        })),
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
      textStyle: {
        color: "#F8FAFC",
      },
      trigger: "axis",
      valueFormatter: (value) => `${typeof value === "number" ? value.toFixed(2) : value}%`,
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
      data: snapshots.map((snapshot) => snapshot.method),
      type: "category",
    },
    yAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.6)",
        formatter: (value: number) => `${value.toFixed(0)}%`,
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value < 0 ? "" : "+"}${(value * 100).toFixed(2)}%`;
}
