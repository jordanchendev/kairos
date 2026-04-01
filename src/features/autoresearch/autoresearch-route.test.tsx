import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ExperimentResponse } from "@/api/poseidon/types.gen";

const experiments: ExperimentResponse[] = [
  {
    composite_score: 1.82,
    config_json: {
      min_wfe: 0.6,
      n_trials: 60,
      strategy_mode: "bidirectional",
    },
    created_at: "2026-03-31T00:00:00Z",
    id: "exp-001",
    interval: "1h",
    market: "crypto_spot",
    metrics_json: {
      max_drawdown: -0.08,
      sharpe_ratio: 1.93,
      win_rate: 0.61,
    },
    status: "passed",
    study_name: "btc_breakout_alpha",
    wfe_score: 0.74,
  },
  {
    composite_score: 1.22,
    config_json: {
      min_wfe: 0.5,
      n_trials: 40,
    },
    created_at: "2026-03-28T00:00:00Z",
    id: "exp-002",
    interval: "4h",
    market: "us_stock",
    metrics_json: {
      max_drawdown: -0.11,
      sharpe_ratio: 1.24,
      win_rate: 0.52,
    },
    status: "candidate",
    study_name: "aapl_regime_scan",
    wfe_score: 0.58,
  },
];

describe("autoresearch route", () => {
  it("renders sortable experiment review, selected detail, and scatter comparison surface", async () => {
    const routeModule = await import("@/routes/autoresearch");

    expect("AutoResearchPage" in routeModule).toBe(true);

    if (!("AutoResearchPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.AutoResearchPage
        experiments={experiments}
        onSelectExperiment={() => {}}
        selectedExperiment={experiments[0]}
        selectedExperimentId="exp-001"
        selectedMarket="all"
        sortDirection="desc"
        sortKey="compositeScore"
      />,
    );

    expect(markup).toContain("AutoResearch");
    expect(markup).toContain("composite score");
    expect(markup).toContain("btc_breakout_alpha");
    expect(markup).toContain("scatter");
    expect(markup).toContain("data-scatter-surface");
  });

  it("renders an explicit empty state when there are no experiments in scope", async () => {
    const routeModule = await import("@/routes/autoresearch");

    expect("AutoResearchPage" in routeModule).toBe(true);

    if (!("AutoResearchPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.AutoResearchPage
        experiments={[]}
        onSelectExperiment={() => {}}
        selectedExperiment={null}
        selectedExperimentId={null}
        selectedMarket="crypto_spot"
        sortDirection="desc"
        sortKey="compositeScore"
      />,
    );

    expect(markup).toContain("No experiments");
    expect(markup).toContain("No experiment results match the current market scope yet.");
  });
});
