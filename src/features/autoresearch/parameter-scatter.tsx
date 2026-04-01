import type { ExperimentResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";

type ParameterScatterProps = {
  experiments: ExperimentResponse[];
  selectedExperimentId: string | null;
};

export function ParameterScatter({ experiments, selectedExperimentId }: ParameterScatterProps) {
  if (experiments.length === 0) {
    return (
      <PanelFrame
        description="The scatter stays empty until Poseidon has enough experiment results to compare."
        eyebrow="Visual Comparison"
        title="Parameter Scatter"
      >
        <EmptyState message="No experiment results are available to compare on the scatter surface yet." title="No scatter data" />
      </PanelFrame>
    );
  }

  const width = 640;
  const height = 280;
  const inset = 32;
  const minComposite = Math.min(...experiments.map((experiment) => experiment.composite_score));
  const maxComposite = Math.max(...experiments.map((experiment) => experiment.composite_score));
  const minWfe = Math.min(...experiments.map((experiment) => experiment.wfe_score));
  const maxWfe = Math.max(...experiments.map((experiment) => experiment.wfe_score));
  const compositeRange = maxComposite - minComposite || 1;
  const wfeRange = maxWfe - minWfe || 1;

  return (
    <PanelFrame
      description="scatter comparison of composite score against WFE keeps experiment ranking legible without overloading the route."
      eyebrow="Visual Comparison"
      title="Parameter Scatter"
    >
      <div
        className="rounded-[24px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_62%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.94))] p-4"
        data-scatter-surface
      >
        <svg aria-label="experiment scatter" className="h-auto w-full" viewBox={`0 0 ${width} ${height}`}>
          <line stroke="rgba(148,163,184,0.2)" x1={inset} x2={inset} y1={inset} y2={height - inset} />
          <line stroke="rgba(148,163,184,0.2)" x1={inset} x2={width - inset} y1={height - inset} y2={height - inset} />

          {experiments.map((experiment) => {
            const x = inset + ((experiment.wfe_score - minWfe) / wfeRange) * (width - inset * 2);
            const y = height - inset - ((experiment.composite_score - minComposite) / compositeRange) * (height - inset * 2);
            const selected = experiment.id === selectedExperimentId;

            return (
              <g key={experiment.id}>
                <circle cx={x} cy={y} fill={selected ? "#f97316" : "#2563EB"} opacity={selected ? 1 : 0.82} r={selected ? 8 : 6} />
                <text fill="#cbd5e1" fontSize="10" textAnchor="middle" x={x} y={y - 12}>
                  {experiment.study_name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          <span>WFE axis</span>
          <span>composite score axis</span>
          <span>{experiments.length} experiments</span>
          <span>selected highlighted in orange</span>
        </div>
      </div>
    </PanelFrame>
  );
}
