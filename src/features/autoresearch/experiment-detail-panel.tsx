import type { ExperimentResponse } from "@/api/poseidon/types.gen";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatRatio } from "@/features/portfolio/portfolio-view-model";

function getExperimentStatusTone(status: string) {
  if (status === "passed" || status === "success") {
    return "up" as const;
  }

  if (status === "failed" || status === "rejected") {
    return "down" as const;
  }

  return "degraded" as const;
}

export function ExperimentDetailPanel({ experiment }: { experiment: ExperimentResponse }) {
  return (
    <PanelFrame
      action={<StatusBadge label={experiment.status} status={getExperimentStatusTone(experiment.status)} />}
      description="Selected experiment detail stays read-first and comparison-oriented; run controls remain intentionally subordinate."
      eyebrow="Selected Experiment"
      title={experiment.study_name}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Composite" value={formatRatio(experiment.composite_score)} />
          <MetricCard label="WFE" value={formatRatio(experiment.wfe_score)} />
          <MetricCard label="Status" value={experiment.status} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Config</div>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(experiment.config_json, null, 2)}
            </pre>
          </div>

          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Metrics</div>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[rgba(2,6,23,0.9)] p-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
              {JSON.stringify(experiment.metrics_json, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
