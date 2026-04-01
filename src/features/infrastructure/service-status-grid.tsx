import type { HealthResponse as TritonHealthResponse } from "@/api/triton/types.gen";
import { StatusBadge } from "@/features/monitoring/status-badge";

import { getHealthStateLabel, type PoseidonHealth } from "./infrastructure-model";

type ServiceStatusGridProps = {
  poseidonHealth: PoseidonHealth;
  tritonHealth: TritonHealthResponse;
};

const stateToBadge = {
  DEGRADED: "degraded",
  DOWN: "down",
  UP: "up",
} as const;

type ServiceState = keyof typeof stateToBadge;

export function ServiceStatusGrid({ poseidonHealth, tritonHealth }: ServiceStatusGridProps) {
  const services: Array<{ label: string; state: ServiceState }> = [
    { label: "Poseidon API", state: getHealthStateLabel(poseidonHealth.status) as ServiceState },
    { label: "Poseidon DB", state: getHealthStateLabel(poseidonHealth.components.database) as ServiceState },
    { label: "Poseidon Redis", state: getHealthStateLabel(poseidonHealth.components.redis) as ServiceState },
    {
      label: "Poseidon Celery",
      state: poseidonHealth.components.celery.active_tasks > 20 ? "DEGRADED" : "UP",
    },
    { label: "Triton API", state: getHealthStateLabel(tritonHealth.status) as ServiceState },
    { label: "Triton GPU", state: getHealthStateLabel(tritonHealth.gpu_available) as ServiceState },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <article className="panel-surface rounded-[24px] p-4" key={service.label}>
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{service.label}</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xl font-semibold text-[hsl(var(--foreground))]">{service.state}</div>
            <StatusBadge label={service.state} status={stateToBadge[service.state]} />
          </div>
        </article>
      ))}
    </div>
  );
}
