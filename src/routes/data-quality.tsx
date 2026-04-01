import { useQuery } from "@tanstack/react-query";

import {
  getProviderHealthApiDataQualityProvidersGetOptions,
  getQualityScoresApiDataQualityScoresGetOptions,
} from "@/api/poseidon/@tanstack/react-query.gen";
import type { QualityScoresResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { DataGapHeatmap } from "@/features/risk/data-gap-heatmap";
import { ProviderHealthGrid } from "@/features/risk/provider-health-grid";
import { normalizeProviderHealth } from "@/features/risk/provider-health-model";
import { QualityScoreTrend } from "@/features/risk/quality-score-trend";

type DataQualityPageProps = {
  providerHealth: unknown;
  scores: QualityScoresResponse;
};

export function DataQualityPage({ providerHealth, scores }: DataQualityPageProps) {
  const providers = normalizeProviderHealth(providerHealth);
  const qualityScores = scores.scores;
  const averageScore =
    qualityScores.length > 0 ? qualityScores.reduce((total, score) => total + score.score, 0) / qualityScores.length : 0;
  const worstProvider = providers[0] ?? null;

  if (providers.length === 0 && qualityScores.length === 0) {
    return (
      <section className="space-y-6" data-page-id="data-quality">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Risk Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Data Quality</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Provider telemetry, score history, and data gap scans will surface here as Poseidon emits diagnostics.
          </p>
        </div>

        <EmptyState
          message="Poseidon has not published provider health or quality score telemetry yet."
          title="No quality telemetry"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6" data-page-id="data-quality">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Risk Route</div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Data Quality</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Provider circuit health, score history, and freshness gaps stay in one route to make ingestion quality auditable.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard detail="Providers currently reporting telemetry" label="Providers" value={providers.length} />
        <MetricCard detail="Average score across returned symbol/interval slices" label="Average score" value={`${(averageScore * 100).toFixed(0)}%`} />
        <MetricCard
          detail={worstProvider ? `${worstProvider.failureCount} failures in current window` : "No provider telemetry yet"}
          label="Highest utilization"
          value={worstProvider ? `${(worstProvider.utilization * 100).toFixed(0)}%` : "n/a"}
        />
      </div>

      <ProviderHealthGrid providers={providers} />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <QualityScoreTrend scores={qualityScores} />
        <DataGapHeatmap scores={qualityScores} />
      </div>
    </section>
  );
}

export function Component() {
  const providerQuery = useQuery({
    ...getProviderHealthApiDataQualityProvidersGetOptions(),
    ...getMonitoringQueryOptions("overview"),
  });
  const qualityQuery = useQuery({
    ...getQualityScoresApiDataQualityScoresGetOptions({
      query: {
        limit: 24,
      },
    }),
    ...getMonitoringQueryOptions("overview"),
  });

  const error = providerQuery.error ?? qualityQuery.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Data quality telemetry could not be loaded from Poseidon."} />;
  }

  if (providerQuery.isPending || qualityQuery.isPending) {
    return <div className="panel-surface h-[38rem] animate-pulse rounded-[28px]" />;
  }

  return <DataQualityPage providerHealth={providerQuery.data ?? null} scores={qualityQuery.data ?? { scores: [] }} />;
}
