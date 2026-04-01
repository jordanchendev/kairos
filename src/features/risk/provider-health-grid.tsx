import { StatusBadge } from "@/features/monitoring/status-badge";
import { PanelFrame } from "@/features/monitoring/panel-frame";

import type { ProviderHealthModel } from "./provider-health-model";

type ProviderHealthGridProps = {
  providers: ProviderHealthModel[];
};

export function ProviderHealthGrid({ providers }: ProviderHealthGridProps) {
  return (
    <PanelFrame
      description="Provider circuits and quota windows stay visible as the top-level operational readout."
      eyebrow="Providers"
      title="Provider health"
    >
      <div className="overflow-hidden rounded-[20px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Circuit</th>
              <th className="px-4 py-3 font-medium">Quota</th>
              <th className="px-4 py-3 font-medium">Failures</th>
              <th className="px-4 py-3 font-medium">Window</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.key} className="border-t border-white/8 text-[hsl(var(--foreground))]">
                <td className="px-4 py-3 font-medium">{provider.key}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={provider.circuitState}
                    status={provider.circuitState === "closed" ? "up" : provider.circuitState === "open" ? "degraded" : "idle"}
                  />
                </td>
                <td className="px-4 py-3">
                  {provider.quotaUsed}/{provider.quotaLimit} ({(provider.utilization * 100).toFixed(0)}%)
                </td>
                <td className="px-4 py-3">{provider.failureCount}</td>
                <td className="px-4 py-3">{provider.windowSeconds}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelFrame>
  );
}
