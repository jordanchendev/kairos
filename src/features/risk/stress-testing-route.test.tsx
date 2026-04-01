import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StressTestStatusResponse } from "@/api/poseidon/types.gen";

const completedResult: StressTestStatusResponse = {
  result: {
    computed_at: "2026-04-01T00:05:00Z",
    details: {
      shock_vector: [-0.2, -0.15, 0.05],
      shocks_applied: {
        TLT: 0.05,
        msft: -0.15,
        tw_stock: -0.2,
      },
    },
    portfolio_pnl: -21800,
    scenario_name: "equity_crash_20pct",
    scenario_type: "historical",
    status: "completed",
    var_result: {
      cvar_95: -0.07,
      cvar_99: -0.1,
      method: "historical",
      portfolio_value: 250000,
      var_95: -0.05,
      var_99: -0.09,
    },
    worst_case_loss: -30500,
  },
  status: "completed",
};

describe("stress testing route", () => {
  it("renders scenario selection, impact chart shell, and shock detail panel", async () => {
    const routeModule = await import("@/routes/stress-testing");

    expect("StressTestingPage" in routeModule).toBe(true);

    if (!("StressTestingPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.StressTestingPage activeScenario="equity_crash_20pct" onSelectScenario={() => {}} result={completedResult} />,
    );

    expect(markup).toContain("Stress Testing");
    expect(markup).toContain("equity_crash_20pct");
    expect(markup).toContain("Worst case loss");
    expect(markup).toContain("Scenario shocks");
    expect(markup).toContain("tw_stock");
    expect(markup).toContain("data-echarts-shell");
  });

  it("renders an explicit empty state before any stress result is available", async () => {
    const routeModule = await import("@/routes/stress-testing");

    expect("StressTestingPage" in routeModule).toBe(true);

    if (!("StressTestingPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.StressTestingPage activeScenario="equity_crash_20pct" onSelectScenario={() => {}} result={null} />,
    );

    expect(markup).toContain("No stress result");
    expect(markup).toContain("Trigger a stress scenario to inspect shock vectors and worst-case losses.");
  });
});
