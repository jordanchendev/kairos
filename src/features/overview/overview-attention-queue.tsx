import type { AlertsResponse, SignalResponse } from "@/api/poseidon/types.gen";
import type { PoseidonHealth } from "@/features/infrastructure/infrastructure-model";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { formatSignalTimestamp, getSignalStatusTone } from "@/features/signals/signals-model";

type QueueItem = {
  detail: string;
  id: string;
  label: string;
  status: "degraded" | "down" | "idle" | "up";
  title: string;
};

function deriveQueueItems(alerts: AlertsResponse, poseidonHealth: PoseidonHealth, signals: SignalResponse[]): QueueItem[] {
  const alertItems: QueueItem[] = alerts.alerts.slice(0, 3).map((alert) => ({
    detail: typeof alert.data?.component === "string" ? String(alert.data.component) : "Poseidon alert bus",
    id: `alert:${alert.id}`,
    label: "alert",
    status: "degraded",
    title: alert.event_type,
  }));

  const systemItem =
    poseidonHealth.status !== "ok"
      ? [
          {
            detail: `Redis ${poseidonHealth.components.redis} · DB ${poseidonHealth.components.database}`,
            id: "system-health",
            label: "system",
            status: "degraded" as const,
            title: "Infrastructure degraded",
          },
        ]
      : [];

  const signalItems: QueueItem[] = signals.slice(0, 3).map((signal) => ({
    detail: `${signal.symbol} · ${getMarketLabel(signal.market)} · ${formatSignalTimestamp(signal.signal_time)}`,
    id: `signal:${signal.id}`,
    label: "signal",
    status: getSignalStatusTone(signal.status),
    title: `${signal.action.toUpperCase()} ${signal.symbol}`,
  }));

  return [...alertItems, ...systemItem, ...signalItems];
}

type OverviewAttentionQueueProps = {
  alerts: AlertsResponse;
  poseidonHealth: PoseidonHealth;
  signals: SignalResponse[];
};

export function OverviewAttentionQueue({ alerts, poseidonHealth, signals }: OverviewAttentionQueueProps) {
  const items = deriveQueueItems(alerts, poseidonHealth, signals);

  return (
    <PanelFrame
      className="p-4 lg:p-5"
      description="Mixed priority queue across alerts, degraded systems, and fresh signals. This is the operator's next-action column."
      eyebrow="Decision Layer"
      title="Attention Queue"
    >
      {items.length === 0 ? (
        <EmptyState message="Nothing currently requires operator intervention." title="Queue clear" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] px-3 py-2.5" key={item.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">{item.label}</div>
                  <div className="font-semibold text-[hsl(var(--foreground))]">{item.title}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</div>
                </div>
                <StatusBadge label={item.status} status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelFrame>
  );
}
