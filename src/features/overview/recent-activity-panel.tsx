import type { AlertsResponse, SignalResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { formatSignalTimestamp } from "@/features/signals/signals-model";

type ActivityItem = {
  detail: string;
  id: string;
  kicker: string;
  title: string;
};

function buildActivityItems(alerts: AlertsResponse, signals: SignalResponse[]) {
  const signalItems: ActivityItem[] = signals.map((signal) => ({
    detail: `${signal.action.toUpperCase()} · ${getMarketLabel(signal.market)} · ${formatSignalTimestamp(signal.signal_time)}`,
    id: `signal:${signal.id}`,
    kicker: "signal",
    title: `${signal.symbol} ${signal.status}`,
  }));

  const alertItems: ActivityItem[] = alerts.alerts.map((alert) => ({
    detail: typeof alert.data?.severity === "string" ? `${String(alert.data.severity)} severity` : "active now",
    id: `alert:${alert.id}`,
    kicker: "alert",
    title: alert.event_type,
  }));

  return [...alertItems, ...signalItems].slice(0, 6);
}

type RecentActivityPanelProps = {
  alerts: AlertsResponse;
  signals: SignalResponse[];
};

export function RecentActivityPanel({ alerts, signals }: RecentActivityPanelProps) {
  const items = buildActivityItems(alerts, signals);

  return (
    <PanelFrame
      className="p-4 lg:p-5"
      description="Short-form event feed for what just changed across the live system, without forcing a jump into dedicated routes."
      eyebrow="Timeline"
      title="Recent Activity"
    >
      {items.length === 0 ? (
        <EmptyState message="No recent signals or alerts are available." title="No recent activity" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] px-3 py-2.5" key={item.id}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">{item.kicker}</div>
              <div className="mt-1 font-semibold text-[hsl(var(--foreground))]">{item.title}</div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</div>
            </div>
          ))}
        </div>
      )}
    </PanelFrame>
  );
}
