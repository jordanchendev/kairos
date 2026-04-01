import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { getAlertsApiRiskAlertsGetOptions } from "@/api/poseidon/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import { AlertsFeed } from "@/features/alerts/alerts-feed";
import { deriveAlertSeverity } from "@/features/alerts/alerts-model";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";

export function Component() {
  const [severity, setSeverity] = useState("all");
  const [type, setType] = useState("all");

  const alertsQuery = useQuery({
    ...getAlertsApiRiskAlertsGetOptions({
      query: {
        limit: 100,
      },
    }),
    ...getMonitoringQueryOptions("alerts"),
  });

  const alerts = alertsQuery.data?.alerts ?? [];
  const typeOptions = ["all", ...new Set(alerts.map((alert) => alert.event_type))];
  const filteredAlerts = alerts.filter((alert) => {
    if (severity !== "all" && deriveAlertSeverity(alert) !== severity) {
      return false;
    }

    if (type !== "all" && alert.event_type !== type) {
      return false;
    }

    return true;
  });

  if (alertsQuery.error) {
    return <ErrorState message={alertsQuery.error instanceof Error ? alertsQuery.error.message : "Alerts could not be loaded from Poseidon."} />;
  }

  if (alertsQuery.isPending) {
    return <div className="panel-surface h-[28rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <section className="space-y-6" data-page-id="alerts">
      <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_auto]">
        <label className="panel-surface flex items-center gap-3 rounded-full px-4 py-3">
          <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">severity</span>
          <select className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none" onChange={(event) => setSeverity(event.target.value)} value={severity}>
            {["all", "critical", "warning", "info"].map((option) => (
              <option className="bg-[hsl(var(--card))]" key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="panel-surface flex items-center gap-3 rounded-full px-4 py-3">
          <span className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">type</span>
          <select className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none" onChange={(event) => setType(event.target.value)} value={type}>
            {typeOptions.map((option) => (
              <option className="bg-[hsl(var(--card))]" key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <Button className="gap-2 justify-self-start" onClick={() => void alertsQuery.refetch()} variant="outline">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <PanelFrame
        action={<StatusBadge label={`${filteredAlerts.length} visible`} status={filteredAlerts.length > 0 ? "degraded" : "idle"} />}
        description="Severity-first alert feed with explicit type, timestamp freshness, and concise descriptions from the risk stream."
        eyebrow="Risk Feed"
        title="Unified Alerts"
      >
        {alerts.length === 0 ? (
          <EmptyState message="Poseidon did not return any alert entries." title="No alerts emitted" />
        ) : (
          <AlertsFeed alerts={filteredAlerts} />
        )}
      </PanelFrame>
    </section>
  );
}
