import type { AlertItem } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { cn } from "@/lib/cn";

import { deriveAlertSeverity, formatAlertTimestamp, getAlertDescription, getAlertFreshnessLabel } from "./alerts-model";

type AlertsFeedProps = {
  alerts: AlertItem[];
};

const severityClassName = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  info: "border-sky-500/25 bg-sky-500/8 text-sky-100",
  warning: "border-amber-500/25 bg-amber-500/8 text-amber-100",
} as const;

export function AlertsFeed({ alerts }: AlertsFeedProps) {
  if (alerts.length === 0) {
    return <EmptyState message="No alerts matched the current severity/type filter." title="No alerts in scope" />;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const severity = deriveAlertSeverity(alert);

        return (
          <article className={cn("rounded-[24px] border p-4", severityClassName[severity])} key={alert.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] opacity-80">severity</div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-[0.18em]">{severity}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] opacity-80">type</div>
                <div className="mt-1 text-sm font-semibold">{alert.event_type}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] opacity-80">timestamp</div>
                <div className="mt-1 text-sm">{formatAlertTimestamp(alert)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] opacity-80">fresh</div>
                <div className="mt-1 text-sm">{getAlertFreshnessLabel(alert)}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 opacity-90">{getAlertDescription(alert)}</p>
          </article>
        );
      })}
    </div>
  );
}
