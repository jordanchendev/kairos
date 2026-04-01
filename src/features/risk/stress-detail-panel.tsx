import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";

import type { StressResultModel } from "./stress-model";

type StressDetailPanelProps = {
  result: StressResultModel;
};

export function StressDetailPanel({ result }: StressDetailPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard detail={`Scenario type: ${result.scenarioType}`} label="Worst case loss" value={formatCurrency(result.worstCaseLoss)} />
        <MetricCard detail="Simulated portfolio response" label="Portfolio PnL" value={formatCurrency(result.portfolioPnl)} />
        <MetricCard
          detail={result.varResult ? `Method ${result.varResult.method}` : "VaR snapshot unavailable"}
          label="Embedded VaR 95"
          value={result.varResult ? formatPercent(result.varResult.var95) : "n/a"}
        />
      </div>

      <PanelFrame
        description="Shock map emitted by Poseidon for the active scenario."
        eyebrow="Scenario Shocks"
        title="Scenario shocks"
      >
        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Shock</th>
              </tr>
            </thead>
            <tbody>
              {result.shocks.map((shock) => (
                <tr key={shock.label} className="border-t border-white/8 text-[hsl(var(--foreground))]">
                  <td className="px-4 py-3">{shock.label}</td>
                  <td className="px-4 py-3">{formatPercent(shock.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelFrame>
    </div>
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
