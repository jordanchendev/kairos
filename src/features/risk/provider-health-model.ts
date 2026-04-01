type ProviderHealthRecord = {
  circuit_state?: string;
  failure_count?: number;
  quota_limit?: number;
  quota_used?: number;
  window_seconds?: number;
};

type ProviderHealthPayload = {
  providers?: Record<string, ProviderHealthRecord>;
};

export type ProviderHealthModel = {
  circuitState: string;
  failureCount: number;
  key: string;
  quotaLimit: number;
  quotaUsed: number;
  utilization: number;
  windowSeconds: number;
};

export function normalizeProviderHealth(payload: unknown): ProviderHealthModel[] {
  const providers = readProviderMap(payload);

  return Object.entries(providers)
    .map(([key, value]) => {
      const quotaLimit = toFiniteNumber(value.quota_limit);
      const quotaUsed = toFiniteNumber(value.quota_used);

      return {
        circuitState: typeof value.circuit_state === "string" ? value.circuit_state : "unknown",
        failureCount: toFiniteNumber(value.failure_count),
        key,
        quotaLimit,
        quotaUsed,
        utilization: quotaLimit > 0 ? quotaUsed / quotaLimit : 0,
        windowSeconds: toFiniteNumber(value.window_seconds),
      };
    })
    .sort((left, right) => {
      if (right.utilization !== left.utilization) {
        return right.utilization - left.utilization;
      }

      if (right.failureCount !== left.failureCount) {
        return right.failureCount - left.failureCount;
      }

      return left.key.localeCompare(right.key);
    });
}

function readProviderMap(payload: unknown): Record<string, ProviderHealthRecord> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const providers = (payload as ProviderHealthPayload).providers;

  if (!providers || typeof providers !== "object") {
    return {};
  }

  return providers;
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
