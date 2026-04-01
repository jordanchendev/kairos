type PoseidonHealthComponents = {
  celery: {
    active_tasks: number;
    reserved_tasks: number;
  };
  data_freshness: {
    latest_ohlcv: string | null;
  };
  database: string;
  gpu: {
    available: boolean;
    note?: string;
    workers?: string[];
  };
  redis: string;
};

export type PoseidonHealth = {
  components: PoseidonHealthComponents;
  status: string;
};

const defaultPoseidonHealth: PoseidonHealth = {
  components: {
    celery: {
      active_tasks: 0,
      reserved_tasks: 0,
    },
    data_freshness: {
      latest_ohlcv: null,
    },
    database: "unknown",
    gpu: {
      available: false,
      note: "unavailable",
      workers: [],
    },
    redis: "unknown",
  },
  status: "unknown",
};

export function normalizePoseidonHealth(value: unknown): PoseidonHealth {
  if (!value || typeof value !== "object") {
    return defaultPoseidonHealth;
  }

  const rawStatus = "status" in value && typeof value.status === "string" ? value.status : defaultPoseidonHealth.status;
  const rawComponents = "components" in value && value.components && typeof value.components === "object" ? value.components : {};
  const rawCelery = "celery" in rawComponents && rawComponents.celery && typeof rawComponents.celery === "object" ? rawComponents.celery : {};
  const rawGpu = "gpu" in rawComponents && rawComponents.gpu && typeof rawComponents.gpu === "object" ? rawComponents.gpu : {};
  const rawFreshness =
    "data_freshness" in rawComponents && rawComponents.data_freshness && typeof rawComponents.data_freshness === "object"
      ? rawComponents.data_freshness
      : {};

  return {
    components: {
      celery: {
        active_tasks: "active_tasks" in rawCelery && typeof rawCelery.active_tasks === "number" ? rawCelery.active_tasks : 0,
        reserved_tasks: "reserved_tasks" in rawCelery && typeof rawCelery.reserved_tasks === "number" ? rawCelery.reserved_tasks : 0,
      },
      data_freshness: {
        latest_ohlcv:
          "latest_ohlcv" in rawFreshness && typeof rawFreshness.latest_ohlcv === "string" ? rawFreshness.latest_ohlcv : null,
      },
      database: "database" in rawComponents && typeof rawComponents.database === "string" ? rawComponents.database : "unknown",
      gpu: {
        available: "available" in rawGpu && typeof rawGpu.available === "boolean" ? rawGpu.available : false,
        note: "note" in rawGpu && typeof rawGpu.note === "string" ? rawGpu.note : undefined,
        workers:
          "workers" in rawGpu && Array.isArray(rawGpu.workers)
            ? rawGpu.workers.filter((worker): worker is string => typeof worker === "string")
            : [],
      },
      redis: "redis" in rawComponents && typeof rawComponents.redis === "string" ? rawComponents.redis : "unknown",
    },
    status: rawStatus,
  };
}

export function getHealthStateLabel(status: string | boolean) {
  if (typeof status === "boolean") {
    return status ? "UP" : "DOWN";
  }

  const normalized = status.toLowerCase();

  if (normalized === "ok" || normalized === "up") {
    return "UP";
  }

  if (normalized === "degraded") {
    return "DEGRADED";
  }

  if (normalized.startsWith("error") || normalized === "down") {
    return "DOWN";
  }

  return "DEGRADED";
}
