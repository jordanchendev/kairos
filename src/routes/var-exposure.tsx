import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getCorrelationApiRiskCorrelationGetOptions,
  getExposureApiRiskExposureGetOptions,
  getVarApiRiskVarGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import type { CorrelationResponse, ExposureResponse, VaRResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { ExposureTreemapPanel } from "@/features/risk/exposure-treemap-panel";
import { summarizeVarSnapshots } from "@/features/risk/var-model";
import { VarDistributionPanel } from "@/features/risk/var-distribution-panel";
import { VarMethodSwitcher } from "@/features/risk/var-method-switcher";
import { useUiStore } from "@/stores/ui-store";

type VarExposurePageProps = {
  correlation: CorrelationResponse | null;
  exposure: ExposureResponse | null;
  onSelectMethod?: (method: string) => void;
  selectedMarket?: string;
  selectedMethod: string | null;
  varData: VaRResponse | null;
};

export function VarExposurePage({
  correlation,
  exposure,
  onSelectMethod = () => {},
  selectedMarket = "all",
  selectedMethod,
  varData,
}: VarExposurePageProps) {
  const summary = summarizeVarSnapshots(varData);
  const activeSnapshot = summary.snapshots.find((snapshot) => snapshot.method === selectedMethod) ?? summary.worstSnapshot;
  const totalExposure = exposure?.total ?? 0;
  const maxCorrelation = getMaxCorrelation(correlation);

  if (summary.snapshots.length === 0 && (exposure?.exposures.length ?? 0) === 0) {
    return (
      <section className="space-y-6" data-page-id="var-exposure">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Risk Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">VaR &amp; Exposure</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Concentration, distribution, and cross-asset correlation will render here once Poseidon emits risk payloads.
          </p>
        </div>

        <EmptyState
          message="Poseidon has not published any VaR or exposure payloads yet."
          title="No risk snapshots"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6" data-page-id="var-exposure">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Risk Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">VaR &amp; Exposure</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Data-dense loss distribution, exposure concentration, and correlation review for the current scope. Global market scope: {selectedMarket}.
          </p>
        </div>
        <StatusBadge label={`${summary.snapshots.length || exposure?.exposures.length || 0} slices`} status="up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          delta={activeSnapshot ? `${formatPercent(activeSnapshot.var99)} tail` : undefined}
          deltaTone="danger"
          detail="Most negative 95% scenario across active VaR methods"
          label="Worst 95% loss"
          value={activeSnapshot ? formatPercent(activeSnapshot.var95) : "n/a"}
        />
        <MetricCard
          detail="Current selected method expected shortfall"
          label="CVaR 95"
          value={activeSnapshot ? formatPercent(activeSnapshot.cvar95) : "n/a"}
        />
        <MetricCard detail="Net exposure across reported buckets" label="Net exposure" value={formatCurrency(totalExposure)} />
        <MetricCard
          detail="Strongest off-diagonal correlation in the current matrix"
          label="Max correlation"
          value={maxCorrelation === null ? "n/a" : maxCorrelation.toFixed(2)}
        />
      </div>

      <PanelFrame
        action={<VarMethodSwitcher methods={summary.methodOptions} onSelectMethod={onSelectMethod} selectedMethod={selectedMethod} />}
        description="Switch methods without losing the surrounding context of exposure and correlation."
        eyebrow="Method Focus"
        title="Scenario selection"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {summary.snapshots.map((snapshot) => {
            const active = snapshot.method === selectedMethod;

            return (
              <button
                key={snapshot.method}
                className={`cursor-pointer rounded-[22px] border p-4 text-left transition duration-200 ${
                  active
                    ? "border-emerald-400/60 bg-emerald-500/10"
                    : "border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/7"
                }`}
                onClick={() => onSelectMethod(snapshot.method)}
                type="button"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{snapshot.method}</div>
                <div className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatPercent(snapshot.var95)}</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">CVaR 95 {formatPercent(snapshot.cvar95)}</div>
              </button>
            );
          })}
        </div>
      </PanelFrame>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <VarDistributionPanel selectedMethod={selectedMethod} summary={summary} />
        <ExposureTreemapPanel exposure={exposure} />
      </div>

      <PanelFrame
        description="Matrix view keeps the strongest asset links visible before deeper stress testing work lands in the next route."
        eyebrow="Cross-Asset"
        title="Correlation matrix"
      >
        {correlation && correlation.symbols.length > 0 ? (
          <div className="overflow-hidden rounded-[20px] border border-white/8">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  {correlation.symbols.map((symbol) => (
                    <th key={symbol} className="px-4 py-3 font-medium">
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.symbols.map((symbol, rowIndex) => (
                  <tr key={symbol} className="border-t border-white/8 text-[hsl(var(--foreground))]">
                    <td className="px-4 py-3 font-medium">{symbol}</td>
                    {correlation.matrix[rowIndex]?.map((value, columnIndex) => (
                      <td key={`${symbol}-${correlation.symbols[columnIndex]}`} className="px-4 py-3">
                        {value.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message="Correlation data will appear here once Poseidon computes a fresh matrix."
            title="No correlation matrix"
          />
        )}
      </PanelFrame>
    </section>
  );
}

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const varQuery = useQuery({
    ...getVarApiRiskVarGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });
  const exposureQuery = useQuery({
    ...getExposureApiRiskExposureGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });
  const correlationQuery = useQuery({
    ...getCorrelationApiRiskCorrelationGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });

  const summary = useMemo(() => summarizeVarSnapshots(varQuery.data ?? null), [varQuery.data]);
  const activeMethod = selectedMethod && summary.methodOptions.includes(selectedMethod) ? selectedMethod : (summary.methodOptions[0] ?? null);
  const error = varQuery.error ?? exposureQuery.error ?? correlationQuery.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Risk metrics could not be loaded from Poseidon."} />;
  }

  if (varQuery.isPending || exposureQuery.isPending || correlationQuery.isPending) {
    return <div className="panel-surface h-[38rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <VarExposurePage
      correlation={correlationQuery.data ?? null}
      exposure={exposureQuery.data ?? null}
      onSelectMethod={setSelectedMethod}
      selectedMarket={selectedMarket}
      selectedMethod={activeMethod}
      varData={varQuery.data ?? null}
    />
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
    signDisplay: "exceptZero",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value < 0 ? "" : "+"}${(value * 100).toFixed(2)}%`;
}

function getMaxCorrelation(correlation: CorrelationResponse | null): number | null {
  if (!correlation) {
    return null;
  }

  let maxValue: number | null = null;

  correlation.matrix.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (rowIndex === columnIndex) {
        return;
      }

      if (maxValue === null || value > maxValue) {
        maxValue = value;
      }
    });
  });

  return maxValue;
}
