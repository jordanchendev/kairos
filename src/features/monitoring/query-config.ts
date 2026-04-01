const second = 1000;
const minute = 60 * second;

export const monitoringQueryDefaults = {
  alerts: {
    refetchInterval: 15 * second,
    staleTime: 10 * second,
  },
  infrastructure: {
    refetchInterval: 20 * second,
    staleTime: 10 * second,
  },
  overview: {
    refetchInterval: 30 * second,
    staleTime: 15 * second,
  },
  portfolio: {
    refetchInterval: 90 * second,
    staleTime: 45 * second,
  },
  positions: {
    refetchInterval: 45 * second,
    staleTime: 20 * second,
  },
  signals: {
    refetchInterval: minute,
    staleTime: 30 * second,
  },
} as const;

export type MonitoringQuerySurface = keyof typeof monitoringQueryDefaults;

export function getMonitoringQueryOptions(surface: MonitoringQuerySurface) {
  return {
    refetchOnReconnect: true,
    ...monitoringQueryDefaults[surface],
  };
}
