import type { HealthResponse as TritonHealthResponse } from "@/api/triton/types.gen";
import { PanelFrame } from "@/features/monitoring/panel-frame";

import type { PoseidonHealth } from "./infrastructure-model";

type QueueDepthPanelProps = {
  poseidonHealth: PoseidonHealth;
  tritonHealth: TritonHealthResponse;
};

export function QueueDepthPanel({ poseidonHealth, tritonHealth }: QueueDepthPanelProps) {
  return (
    <PanelFrame description="Cross-service queue depth helps spot ingestion or inference back-pressure before jobs stall." eyebrow="Queues" title="queue depth">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Poseidon Active</div>
          <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{poseidonHealth.components.celery.active_tasks}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Poseidon Reserved</div>
          <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{poseidonHealth.components.celery.reserved_tasks}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Triton GPU / CPU queue</div>
          <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
            {tritonHealth.queue_gpu_length} / {tritonHealth.queue_cpu_length}
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
