import { useQuery } from "@tanstack/react-query";

import { healthHealthGetOptions } from "@/api/poseidon/@tanstack/react-query.gen";
import { healthCheckHealthGetOptions } from "@/api/triton/@tanstack/react-query.gen";
import { ErrorState } from "@/features/monitoring/error-state";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { GpuUtilizationPanel } from "@/features/infrastructure/gpu-utilization-panel";
import { normalizePoseidonHealth } from "@/features/infrastructure/infrastructure-model";
import { QueueDepthPanel } from "@/features/infrastructure/queue-depth-panel";
import { ServiceStatusGrid } from "@/features/infrastructure/service-status-grid";

export function Component() {
  const poseidonQuery = useQuery({
    ...healthHealthGetOptions(),
    ...getMonitoringQueryOptions("infrastructure"),
  });
  const tritonQuery = useQuery({
    ...healthCheckHealthGetOptions(),
    ...getMonitoringQueryOptions("infrastructure"),
  });

  if (poseidonQuery.isPending || tritonQuery.isPending) {
    return <div className="panel-surface h-[32rem] animate-pulse rounded-[28px]" />;
  }

  if (!poseidonQuery.data && !tritonQuery.data) {
    return <ErrorState message="Infrastructure health could not be loaded from Poseidon or Triton." />;
  }

  const poseidonHealth = normalizePoseidonHealth(
    poseidonQuery.data ?? {
      components: {
        celery: { active_tasks: 0, reserved_tasks: 0 },
        data_freshness: { latest_ohlcv: null },
        database: `error: ${poseidonQuery.error instanceof Error ? poseidonQuery.error.message : "unavailable"}`,
        gpu: { available: false, note: "Poseidon health unavailable" },
        redis: "error: unavailable",
      },
      status: "down",
    },
  );
  const tritonHealth =
    tritonQuery.data ??
    ({
      gpu_available: false,
      gpu_memory_total_mb: null,
      gpu_memory_used_mb: null,
      queue_cpu_length: 0,
      queue_gpu_length: 0,
      status: "down",
    } as const);

  return (
    <section className="space-y-6" data-page-id="infrastructure">
      <ServiceStatusGrid poseidonHealth={poseidonHealth} tritonHealth={tritonHealth} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <QueueDepthPanel poseidonHealth={poseidonHealth} tritonHealth={tritonHealth} />
        <GpuUtilizationPanel poseidonHealth={poseidonHealth} tritonHealth={tritonHealth} />
      </div>
    </section>
  );
}
