import { Suspense } from "react";

import type { EChartsOption } from "echarts";

import type { ExposureResponse } from "@/api/poseidon/types.gen";
import { EChartsShell, LazyECharts } from "@/features/risk/echarts-lazy";

type ExposureTreemapPanelProps = {
  exposure: ExposureResponse | null;
};

type ExposureNode = {
  category: string;
  value: number;
};

export function ExposureTreemapPanel({ exposure }: ExposureTreemapPanelProps) {
  const items = (exposure?.exposures ?? []).slice().sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  const option = createExposureTreemapOption(items);

  return (
    <EChartsShell
      description="Treemap-style allocation view with a table fallback for exact sizing and sign."
      eyebrow="Concentration"
      title="Exposure treemap"
    >
      <div className="space-y-4">
        {typeof window === "undefined" ? (
          <ServerTreemap items={items} />
        ) : (
          <Suspense fallback={<ServerTreemap items={items} />}>
            <LazyECharts notMerge option={option} style={{ height: 280, width: "100%" }} />
          </Suspense>
        )}

        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3 font-medium">Bucket</th>
                <th className="px-4 py-3 font-medium">Exposure</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.category} className="border-t border-white/8 text-[hsl(var(--foreground))]">
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{formatCurrency(item.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </EChartsShell>
  );
}

function ServerTreemap({ items }: { items: ExposureNode[] }) {
  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.category}
          className="rounded-[20px] border-2 border-white/80 p-4"
          style={{
            background:
              item.value >= 0
                ? "linear-gradient(180deg, rgba(34,197,94,0.18), rgba(15,23,42,0.92))"
                : "linear-gradient(180deg, rgba(248,113,113,0.18), rgba(15,23,42,0.92))",
            minHeight: `${96 + Math.round((Math.abs(item.value) / maxValue) * 72)}px`,
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{item.category}</div>
          <div className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">{formatCurrency(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

function createExposureTreemapOption(items: ExposureNode[]): EChartsOption {
  return {
    animation: false,
    backgroundColor: "transparent",
    series: [
      {
        breadcrumb: {
          show: false,
        },
        data: items.map((item) => ({
          itemStyle: {
            borderColor: "#F8FAFC",
            borderWidth: 2,
            color: item.value >= 0 ? "rgba(34,197,94,0.78)" : "rgba(248,113,113,0.72)",
          },
          name: item.category,
          value: Math.abs(item.value),
        })),
        label: {
          color: "#F8FAFC",
          fontFamily: "Fira Sans, sans-serif",
          formatter: "{b}",
        },
        roam: false,
        type: "treemap",
      },
    ],
    textStyle: {
      color: "#F8FAFC",
      fontFamily: "Fira Sans, sans-serif",
    },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      formatter: (params: unknown) => formatTreemapTooltip(params),
      textStyle: {
        color: "#F8FAFC",
      },
    },
  };
}

function formatTreemapTooltip(params: unknown) {
  if (!params || typeof params !== "object") {
    return `bucket: ${formatCurrency(0)}`;
  }

  const data = "data" in params && params.data && typeof params.data === "object" ? params.data : null;
  const name = data && "name" in data && typeof data.name === "string" ? data.name : "bucket";
  const value = data && "value" in data && typeof data.value === "number" ? data.value : 0;

  return `${name}: ${formatCurrency(value)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
    signDisplay: "exceptZero",
  }).format(value);
}
