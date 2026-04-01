import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { listExperimentsApiAutoresearchExperimentsGetOptions } from "@/api/poseidon/@tanstack/react-query.gen";
import type { ExperimentResponse } from "@/api/poseidon/types.gen";
import { ExperimentDetailPanel } from "@/features/autoresearch/experiment-detail-panel";
import { ExperimentTable, type ExperimentSortKey } from "@/features/autoresearch/experiment-table";
import { ParameterScatter } from "@/features/autoresearch/parameter-scatter";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { getApiMarket } from "@/features/portfolio/portfolio-view-model";
import { useUiStore } from "@/stores/ui-store";

function sortExperiments(experiments: ExperimentResponse[], sortKey: ExperimentSortKey, sortDirection: "asc" | "desc") {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...experiments].sort((left, right) => {
    const leftValue =
      sortKey === "createdAt" ? new Date(left.created_at).getTime() : sortKey === "compositeScore" ? left.composite_score : left.wfe_score;
    const rightValue =
      sortKey === "createdAt"
        ? new Date(right.created_at).getTime()
        : sortKey === "compositeScore"
          ? right.composite_score
          : right.wfe_score;

    if (leftValue === rightValue) {
      return left.study_name.localeCompare(right.study_name);
    }

    return leftValue > rightValue ? direction : -direction;
  });
}

export type AutoResearchPageProps = {
  experiments: ExperimentResponse[];
  onSelectExperiment: (experimentId: string) => void;
  selectedExperiment: ExperimentResponse | null;
  selectedExperimentId: string | null;
  selectedMarket: string;
  sortDirection: "asc" | "desc";
  sortKey: ExperimentSortKey;
  onSortChange?: (sortKey: ExperimentSortKey) => void;
};

export function AutoResearchPage({
  experiments,
  onSelectExperiment,
  selectedExperiment,
  selectedExperimentId,
  selectedMarket,
  sortDirection,
  sortKey,
  onSortChange = () => {},
}: AutoResearchPageProps) {
  if (experiments.length === 0) {
    return (
      <section className="space-y-6" data-page-id="autoresearch">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">AutoResearch</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Experiment review stays comparison-first, with drill-down and scatter analysis kept in the same workspace.
          </p>
        </div>

        <EmptyState message="No experiment results match the current market scope yet." title="No experiments" />
      </section>
    );
  }

  if (!selectedExperiment) {
    return <ErrorState message="Experiment selection is missing detail context." />;
  }

  return (
    <section className="space-y-6" data-page-id="autoresearch">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">AutoResearch</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Review-first experiment dashboard with sortable rankings and a subordinate comparison scatter. Global market scope: {selectedMarket}.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelFrame
          description="Sortable experiment scanning surface with row highlighting and explicit click selection."
          eyebrow="Experiment Review"
          title="Experiment Grid"
        >
          <ExperimentTable
            experiments={experiments}
            onSelectExperiment={onSelectExperiment}
            onSortChange={onSortChange}
            selectedExperimentId={selectedExperimentId}
            sortDirection={sortDirection}
            sortKey={sortKey}
          />
        </PanelFrame>

        <ExperimentDetailPanel experiment={selectedExperiment} />
      </div>

      <ParameterScatter experiments={experiments} selectedExperimentId={selectedExperimentId} />
    </section>
  );
}

export function Component() {
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const apiMarket = getApiMarket(selectedMarket);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ExperimentSortKey>("compositeScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const experimentsQuery = useQuery({
    ...listExperimentsApiAutoresearchExperimentsGetOptions({
      query: {
        limit: 80,
      },
    }),
    ...getMonitoringQueryOptions("overview"),
  });

  const experiments = useMemo(
    () => sortExperiments((experimentsQuery.data ?? []).filter((experiment) => !apiMarket || experiment.market === apiMarket), sortKey, sortDirection),
    [apiMarket, experimentsQuery.data, sortDirection, sortKey],
  );
  const activeExperimentId =
    selectedExperimentId && experiments.some((experiment) => experiment.id === selectedExperimentId)
      ? selectedExperimentId
      : experiments[0]?.id ?? null;
  const selectedExperiment = experiments.find((experiment) => experiment.id === activeExperimentId) ?? null;

  if (experimentsQuery.error) {
    return <ErrorState message={experimentsQuery.error instanceof Error ? experimentsQuery.error.message : "AutoResearch experiments could not be loaded from Poseidon."} />;
  }

  if (experimentsQuery.isPending) {
    return <div className="panel-surface h-[34rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <AutoResearchPage
      experiments={experiments}
      onSelectExperiment={setSelectedExperimentId}
      onSortChange={(nextSortKey) => {
        if (nextSortKey === sortKey) {
          setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
          return;
        }

        setSortKey(nextSortKey);
        setSortDirection("desc");
      }}
      selectedExperiment={selectedExperiment}
      selectedExperimentId={activeExperimentId}
      selectedMarket={selectedMarket}
      sortDirection={sortDirection}
      sortKey={sortKey}
    />
  );
}
