import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getStressTestResultApiRiskStressTestTaskIdGetOptions,
  triggerStressTestApiRiskStressTestRunPostMutation,
} from "@/api/poseidon/@tanstack/react-query.gen";
import type { StressTestStatusResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { StressDetailPanel } from "@/features/risk/stress-detail-panel";
import { StressImpactChart } from "@/features/risk/stress-impact-chart";
import { normalizeStressResult } from "@/features/risk/stress-model";
import { StressScenarioTable, type StressScenarioPreset } from "@/features/risk/stress-scenario-table";

const stressScenarioPresets: StressScenarioPreset[] = [
  {
    description: "Broad equity shock with correlated downside across growth-heavy sleeves.",
    id: "equity_crash_20pct",
    label: "Run",
  },
  {
    description: "Rates-led drawdown that pressures long duration hedges and leverage assumptions.",
    id: "rates_spike_10pct",
    label: "Run",
  },
  {
    description: "Cross-market crypto unwind with secondary spillover into risk-on proxies.",
    id: "crypto_liquidity_gap",
    label: "Run",
  },
];

type StressTestingPageProps = {
  activeScenario: string;
  onSelectScenario?: (scenarioId: string) => void;
  result: StressTestStatusResponse | null;
};

export function StressTestingPage({
  activeScenario,
  onSelectScenario = () => {},
  result,
}: StressTestingPageProps) {
  const normalized = normalizeStressResult(result);

  return (
    <section className="space-y-6" data-page-id="stress-testing">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Risk Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Stress Testing</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Scenario execution, impact review, and shock diagnostics stay on one dense route so downside assumptions remain auditable.
          </p>
        </div>
        <StatusBadge
          label={normalized ? `${normalized.status} result` : "awaiting run"}
          status={normalized ? "up" : "idle"}
        />
      </div>

      <PanelFrame
        description="Keep a small preset catalog visible while iterating on active stress scenarios."
        eyebrow="Scenario Queue"
        title="Scenario catalog"
      >
        <StressScenarioTable activeScenario={activeScenario} onSelectScenario={onSelectScenario} presets={stressScenarioPresets} />
      </PanelFrame>

      {normalized ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <StressImpactChart result={normalized} />
          <StressDetailPanel result={normalized} />
        </div>
      ) : (
        <EmptyState
          message="Trigger a stress scenario to inspect shock vectors and worst-case losses."
          title="No stress result"
        />
      )}
    </section>
  );
}

export function Component() {
  const [activeScenario, setActiveScenario] = useState(stressScenarioPresets[0]?.id ?? "equity_crash_20pct");
  const [taskId, setTaskId] = useState<string | null>(null);

  const triggerMutation = useMutation({
    ...triggerStressTestApiRiskStressTestRunPostMutation(),
    onSuccess: (data) => {
      setTaskId(data.task_id);
    },
  });

  const resultQuery = useQuery({
    ...(taskId
      ? getStressTestResultApiRiskStressTestTaskIdGetOptions({
          path: {
            task_id: taskId,
          },
        })
      : getStressTestResultApiRiskStressTestTaskIdGetOptions({
          path: {
            task_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("overview"),
    enabled: Boolean(taskId),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 5_000 : false),
  });

  const error = triggerMutation.error ?? resultQuery.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Stress test data could not be loaded from Poseidon."} />;
  }

  return (
    <StressTestingPage
      activeScenario={activeScenario}
      onSelectScenario={(scenarioId) => {
        setActiveScenario(scenarioId);
        triggerMutation.mutate({
          body: {
            scenario_name: scenarioId,
          },
        });
      }}
      result={resultQuery.data ?? null}
    />
  );
}
