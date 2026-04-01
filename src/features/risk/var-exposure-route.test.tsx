import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CorrelationResponse, ExposureResponse, VaRResponse } from "@/api/poseidon/types.gen";

const varData: VaRResponse = {
  snapshots: [
    {
      as_of: "2026-04-01T00:00:00Z",
      computed_at: "2026-04-01T00:05:00Z",
      cvar_95: -0.07,
      cvar_99: -0.11,
      holding_period: 1,
      method: "historical",
      portfolio_value: 250000,
      var_95: -0.05,
      var_99: -0.09,
    },
    {
      as_of: "2026-04-01T00:00:00Z",
      computed_at: "2026-04-01T00:05:00Z",
      cvar_95: -0.06,
      cvar_99: -0.1,
      holding_period: 1,
      method: "parametric",
      portfolio_value: 250000,
      var_95: -0.04,
      var_99: -0.08,
    },
  ],
};

const exposure: ExposureResponse = {
  exposures: [
    { category: "Tech", value: 120000 },
    { category: "Hedges", value: -42000 },
    { category: "Rates", value: 53000 },
  ],
  total: 131000,
};

const correlation: CorrelationResponse = {
  as_of: "2026-04-01T00:00:00Z",
  computed_at: "2026-04-01T00:05:00Z",
  matrix: [
    [1, 0.82, -0.24],
    [0.82, 1, -0.11],
    [-0.24, -0.11, 1],
  ],
  symbols: ["AAPL", "MSFT", "TLT"],
};

describe("var exposure route", () => {
  it("renders VaR distribution, exposure treemap shell, and correlation matrix", async () => {
    const routeModule = await import("@/routes/var-exposure");

    expect("VarExposurePage" in routeModule).toBe(true);

    if (!("VarExposurePage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.VarExposurePage
        correlation={correlation}
        exposure={exposure}
        selectedMethod="historical"
        varData={varData}
      />,
    );

    expect(markup).toContain("VaR &amp; Exposure");
    expect(markup).toContain("historical");
    expect(markup).toContain("parametric");
    expect(markup).toContain("Worst 95% loss");
    expect(markup).toContain("Tech");
    expect(markup).toContain("Hedges");
    expect(markup).toContain("Correlation matrix");
    expect(markup).toContain("0.82");
    expect(markup).toContain("data-echarts-shell");
  });

  it("renders an explicit empty state when Poseidon returns no VaR or exposure data", async () => {
    const routeModule = await import("@/routes/var-exposure");

    expect("VarExposurePage" in routeModule).toBe(true);

    if (!("VarExposurePage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.VarExposurePage
        correlation={null}
        exposure={null}
        selectedMethod={null}
        varData={null}
      />,
    );

    expect(markup).toContain("No risk snapshots");
    expect(markup).toContain("Poseidon has not published any VaR or exposure payloads yet.");
  });
});
