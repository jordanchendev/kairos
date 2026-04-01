import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { QualityScoresResponse } from "@/api/poseidon/types.gen";

const providerHealth = {
  providers: {
    ccxt: {
      circuit_state: "open",
      failure_count: 4,
      quota_limit: 1200,
      quota_used: 110,
      window_seconds: 60,
    },
    finmind: {
      circuit_state: "closed",
      failure_count: 0,
      quota_limit: 500,
      quota_used: 120,
      window_seconds: 3600,
    },
  },
};

const scores: QualityScoresResponse = {
  scores: [
    {
      anomaly_free: 0.95,
      completeness: 0.91,
      consistency: 0.88,
      interval: "1h",
      score: 0.9,
      symbol: "BTCUSDT",
      time: "2026-04-01T00:00:00Z",
      timeliness: 0.86,
    },
    {
      anomaly_free: 0.98,
      completeness: 0.96,
      consistency: 0.94,
      interval: "1d",
      score: 0.95,
      symbol: "AAPL",
      time: "2026-04-01T00:00:00Z",
      timeliness: 0.92,
    },
  ],
};

describe("data quality route", () => {
  it("renders provider health, quality trend shell, and gap heatmap", async () => {
    const routeModule = await import("@/routes/data-quality");

    expect("DataQualityPage" in routeModule).toBe(true);

    if (!("DataQualityPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(<routeModule.DataQualityPage providerHealth={providerHealth} scores={scores} />);

    expect(markup).toContain("Data Quality");
    expect(markup).toContain("finmind");
    expect(markup).toContain("ccxt");
    expect(markup).toContain("Quality score trend");
    expect(markup).toContain("Gap heatmap");
    expect(markup).toContain("BTCUSDT");
    expect(markup).toContain("1h");
    expect(markup).toContain("data-echarts-shell");
  });

  it("renders an explicit empty state when no provider or quality score data exists", async () => {
    const routeModule = await import("@/routes/data-quality");

    expect("DataQualityPage" in routeModule).toBe(true);

    if (!("DataQualityPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(<routeModule.DataQualityPage providerHealth={null} scores={{ scores: [] }} />);

    expect(markup).toContain("No quality telemetry");
    expect(markup).toContain("Poseidon has not published provider health or quality score telemetry yet.");
  });
});
