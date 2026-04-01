import type { HealthResponse as TritonHealthResponse } from "@/api/triton/types.gen";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";

import { formatNumber } from "@/features/portfolio/portfolio-view-model";

import type { PoseidonHealth } from "./infrastructure-model";

type GpuUtilizationPanelProps = {
  poseidonHealth: PoseidonHealth;
  tritonHealth: TritonHealthResponse;
};

export function GpuUtilizationPanel({ poseidonHealth, tritonHealth }: GpuUtilizationPanelProps) {
  const gpuWorkers = poseidonHealth.components.gpu.workers ?? [];
  const memoryUsedPct =
    tritonHealth.gpu_memory_total_mb && tritonHealth.gpu_memory_used_mb
      ? tritonHealth.gpu_memory_used_mb / tritonHealth.gpu_memory_total_mb
      : 0;

  return (
    <PanelFrame
      action={<StatusBadge label={tritonHealth.gpu_available ? "gpu up" : "gpu down"} status={tritonHealth.gpu_available ? "up" : "down"} />}
      description="Operator-facing gpu panel for worker availability and approximate VRAM pressure."
      eyebrow="Compute"
      title="gpu utilization"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Poseidon GPU workers</div>
          <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{gpuWorkers.length}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Triton VRAM Used</div>
          <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{formatNumber(tritonHealth.gpu_memory_used_mb)} MB</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Approx. Utilization</div>
          <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{(memoryUsedPct * 100).toFixed(0)}%</div>
        </div>
      </div>
    </PanelFrame>
  );
}
