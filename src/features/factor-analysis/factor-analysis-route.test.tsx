import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  CentralityResults,
  FactorAnalysisRun,
  ICResults,
  ShapleyResults,
} from "@/features/factor-analysis/types";

const icResults: ICResults = {
  features: {
    momentum_20: { "1": 0.041, "5": 0.067, "20": 0.093 },
    rsi_14: { "1": 0.019, "5": 0.034, "20": 0.051 },
  },
  symbols_used: 42,
  total_observations: 5400,
};

const shapleyResults: ShapleyResults = {
  features: {
    momentum_20: 0.182,
    rsi_14: 0.104,
    volume_spike: 0.081,
  },
  model_version_id: "model-001",
  num_samples: 500,
};

const centralityResults: CentralityResults = {
  clusters: {
    "1": ["Momentum", "Breakout"],
    "2": ["Mean Reversion"],
  },
  correlation_matrix: [
    [1, 0.82, -0.24],
    [0.82, 1, -0.12],
    [-0.24, -0.12, 1],
  ],
  signal_names: ["Momentum", "Breakout", "Mean Reversion"],
  threshold: 0.7,
};

const runs: FactorAnalysisRun[] = [
  {
    config_json: {
      end_date: "2025-03-31",
      horizons: [1, 5, 20],
      market: "tw_stock",
      start_date: "2025-01-01",
    },
    created_at: "2026-04-11T10:15:00Z",
    error: null,
    id: "run-ic-001",
    market: "tw_stock",
    results_json: icResults as unknown as Record<string, unknown>,
    run_type: "ic",
    status: "succeeded",
    updated_at: "2026-04-11T10:18:00Z",
  },
  {
    config_json: {
      max_samples: 500,
      model_version_id: "model-001",
    },
    created_at: "2026-04-11T11:15:00Z",
    error: null,
    id: "run-shapley-001",
    market: "tw_stock",
    results_json: shapleyResults as unknown as Record<string, unknown>,
    run_type: "shapley",
    status: "succeeded",
    updated_at: "2026-04-11T11:17:00Z",
  },
  {
    config_json: {
      distance_threshold: 0.7,
      end_date: "2025-03-31",
      market: "tw_stock",
      start_date: "2025-01-01",
      sub_signals: [{ label: "Momentum" }],
    },
    created_at: "2026-04-11T12:15:00Z",
    error: null,
    id: "run-centrality-001",
    market: "tw_stock",
    results_json: centralityResults as unknown as Record<string, unknown>,
    run_type: "centrality",
    status: "succeeded",
    updated_at: "2026-04-11T12:18:00Z",
  },
];

describe("factor analysis route", () => {
  it("renders the three analysis tabs, run actions, and run history table", async () => {
    const routeModule = await import("@/routes/factor-analysis");

    expect("FactorAnalysisPage" in routeModule).toBe(true);

    if (!("FactorAnalysisPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.FactorAnalysisPage
        activeRun={runs[0]}
        activeTab="ic"
        isTriggering={false}
        onSelectRun={() => {}}
        onTabChange={() => {}}
        runs={runs}
        selectedMarket="All Markets"
      />,
    );

    expect(markup).toContain("Factor Analysis");
    expect(markup).toContain("IC Analysis");
    expect(markup).toContain("Feature Importance");
    expect(markup).toContain("Signal Overlap");
    expect(markup).toContain("Run Analysis");
    expect(markup).toContain("Run history");
    expect(markup).toContain("momentum_20");
    expect(markup).toContain("tw_stock");
  });

  it("renders an empty state when no runs are available yet", async () => {
    const routeModule = await import("@/routes/factor-analysis");

    expect("FactorAnalysisPage" in routeModule).toBe(true);

    if (!("FactorAnalysisPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.FactorAnalysisPage
        activeRun={null}
        activeTab="ic"
        isTriggering={false}
        onSelectRun={() => {}}
        onTabChange={() => {}}
        runs={[]}
        selectedMarket="TW Equities"
      />,
    );

    expect(markup).toContain("No factor analysis runs");
    expect(markup).toContain("Run one of the analysis tabs");
  });
});
