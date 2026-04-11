import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { getApiMarket } from "@/features/portfolio/portfolio-view-model";
import { useUiStore } from "@/stores/ui-store";

import {
  fetchFactorAnalysisRun,
  fetchFactorAnalysisRuns,
  triggerCentralityAnalysis,
  triggerICAnalysis,
  triggerShapleyAnalysis,
} from "@/features/factor-analysis/api";
import { RunAnalysisPanel } from "@/features/factor-analysis/run-analysis-panel";
import { RunListTable } from "@/features/factor-analysis/run-list-table";
import type {
  CentralityTriggerPayload,
  FactorAnalysisRun,
  FactorAnalysisTab,
  ICTriggerPayload,
  ShapleyTriggerPayload,
} from "@/features/factor-analysis/types";

type FactorAnalysisPageProps = {
  activeRun: FactorAnalysisRun | null;
  activeTab: FactorAnalysisTab;
  isTriggering: boolean;
  onSelectRun: (runId: string) => void;
  onTabChange: (tab: FactorAnalysisTab) => void;
  runs: FactorAnalysisRun[];
  selectedMarket: string;
  onTrigger?: (
    tab: FactorAnalysisTab,
    payload: ICTriggerPayload | ShapleyTriggerPayload | CentralityTriggerPayload,
  ) => void;
};

const TAB_META: Record<FactorAnalysisTab, { description: string; title: string }> = {
  centrality: {
    description: "Correlation heatmap + hierarchical clusters for overlapping sub-signals.",
    title: "Signal Overlap",
  },
  ic: {
    description: "Rank IC diagnostics for feature quality across selected horizons.",
    title: "IC Analysis",
  },
  shapley: {
    description: "Feature-importance view for trained model versions via SHAP.",
    title: "Feature Importance",
  },
};

export function FactorAnalysisPage({
  activeRun,
  activeTab,
  isTriggering,
  onSelectRun,
  onTabChange,
  runs,
  selectedMarket,
  onTrigger = () => {},
}: FactorAnalysisPageProps) {
  const tabRuns = runs.filter((run) => run.run_type === activeTab);

  return (
    <section className="space-y-6" data-page-id="factor-analysis">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
          Research Route &middot; Phase 47
        </div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Factor Analysis</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Compare factor quality, model feature importance, and sub-signal overlap in one research surface. Global market scope: {selectedMarket}.
        </p>
      </div>

      <PanelFrame
        description={TAB_META[activeTab].description}
        eyebrow="Analysis Tabs"
        title={TAB_META[activeTab].title}
      >
        <div className="flex flex-wrap gap-3">
          {(Object.keys(TAB_META) as FactorAnalysisTab[]).map((tab) => (
            <button
              className={
                tab === activeTab
                  ? "rounded-full border border-sky-400/40 bg-sky-400/15 px-4 py-2 text-sm font-medium text-sky-100"
                  : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              }
              key={tab}
              onClick={() => onTabChange(tab)}
              type="button"
            >
              {TAB_META[tab].title}
            </button>
          ))}
        </div>
      </PanelFrame>

      <RunAnalysisPanel
        activeTab={activeTab}
        isTriggering={isTriggering}
        onTrigger={onTrigger}
        run={activeRun}
        selectedMarket={selectedMarket}
      />

      <PanelFrame
        description="Past factor-analysis runs across IC, SHAP, and overlap workflows."
        eyebrow="History"
        title="Run history"
      >
        {runs.length === 0 ? (
          <EmptyState
            message="Run one of the analysis tabs to persist results and populate the historical comparison table."
            title="No factor analysis runs"
          />
        ) : (
          <>
            {tabRuns.length === 0 ? (
              <EmptyState
                className="mb-4"
                message={`No ${TAB_META[activeTab].title.toLowerCase()} runs match the current scope yet.`}
                title="No runs for this tab"
              />
            ) : null}
            <RunListTable onSelectRun={onSelectRun} runs={runs} selectedRunId={activeRun?.id ?? null} />
          </>
        )}
      </PanelFrame>
    </section>
  );
}

export function Component() {
  const queryClient = useQueryClient();
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const apiMarket = getApiMarket(selectedMarket);
  const [activeTab, setActiveTab] = useState<FactorAnalysisTab>("ic");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryFn: () =>
      fetchFactorAnalysisRuns({
        limit: 50,
        market: apiMarket,
        offset: 0,
      }),
    queryKey: ["factor-analysis-runs", apiMarket],
    ...getMonitoringQueryOptions("overview"),
  });

  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data]);

  const activeRunFromList = useMemo(() => {
    if (selectedRunId) {
      const explicit = runs.find((run) => run.id === selectedRunId);
      if (explicit) return explicit;
    }

    return runs.find((run) => run.run_type === activeTab) ?? runs[0] ?? null;
  }, [activeTab, runs, selectedRunId]);

  const activeRunId = activeRunFromList?.id ?? null;
  const detailQuery = useQuery({
    enabled: Boolean(activeRunId),
    queryFn: () => fetchFactorAnalysisRun(activeRunId!),
    queryKey: ["factor-analysis-run", activeRunId],
  });

  const triggerMutation = useMutation({
    mutationFn: async ({
      payload,
      tab,
    }: {
      payload: ICTriggerPayload | ShapleyTriggerPayload | CentralityTriggerPayload;
      tab: FactorAnalysisTab;
    }) => {
      if (tab === "ic") {
        return triggerICAnalysis(payload as ICTriggerPayload);
      }
      if (tab === "shapley") {
        return triggerShapleyAnalysis(payload as ShapleyTriggerPayload);
      }
      return triggerCentralityAnalysis(payload as CentralityTriggerPayload);
    },
    onSuccess: async (response, variables) => {
      setActiveTab(variables.tab);
      setSelectedRunId(response.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["factor-analysis-runs"] }),
        queryClient.invalidateQueries({ queryKey: ["factor-analysis-run", response.id] }),
      ]);
    },
  });

  const error =
    runsQuery.error ??
    (detailQuery.error && activeRunId ? detailQuery.error : null) ??
    triggerMutation.error;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : "Factor analysis data could not be loaded from Poseidon."
        }
      />
    );
  }

  if (runsQuery.isPending) {
    return <div className="panel-surface h-[34rem] animate-pulse rounded-[28px]" />;
  }

  return (
    <FactorAnalysisPage
      activeRun={detailQuery.data ?? activeRunFromList}
      activeTab={activeTab}
      isTriggering={triggerMutation.isPending}
      onSelectRun={setSelectedRunId}
      onTabChange={(tab) => {
        setActiveTab(tab);
        const firstForTab = runs.find((run) => run.run_type === tab);
        setSelectedRunId(firstForTab?.id ?? null);
      }}
      onTrigger={(tab, payload) => triggerMutation.mutate({ payload, tab })}
      runs={runs}
      selectedMarket={selectedMarket}
    />
  );
}
