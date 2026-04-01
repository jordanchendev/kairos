import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("phase 32 risk foundation", () => {
  it("normalizes provider health and risk payloads into route-safe models", async () => {
    const providerModule = await import("./provider-health-model").catch(() => null);
    const riskModule = await import("./var-model").catch(() => null);

    expect(providerModule).not.toBeNull();
    expect(riskModule).not.toBeNull();

    if (!providerModule || !riskModule) {
      return;
    }

    const providers = providerModule.normalizeProviderHealth({
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
    });
    const varSummary = riskModule.summarizeVarSnapshots({
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
    });

    expect(providers).toEqual([
      {
        circuitState: "closed",
        failureCount: 0,
        key: "finmind",
        quotaLimit: 500,
        quotaUsed: 120,
        utilization: 0.24,
        windowSeconds: 3600,
      },
      {
        circuitState: "open",
        failureCount: 4,
        key: "ccxt",
        quotaLimit: 1200,
        quotaUsed: 110,
        utilization: 110 / 1200,
        windowSeconds: 60,
      },
    ]);
    expect(varSummary.worstSnapshot?.method).toBe("historical");
    expect(varSummary.methodOptions).toEqual(["historical", "parametric"]);
  });

  it("renders a reusable lazy ECharts shell for risk routes", async () => {
    const chartsModule = await import("./echarts-lazy").catch(() => null);

    expect(chartsModule).not.toBeNull();

    if (!chartsModule) {
      return;
    }

    const markup = renderToStaticMarkup(
      <chartsModule.EChartsShell description="Phase 32 chart boundary" title="Risk Histogram">
        <div>chart payload</div>
      </chartsModule.EChartsShell>,
    );

    expect(markup).toContain("Risk Histogram");
    expect(markup).toContain("Phase 32 chart boundary");
    expect(markup).toContain("chart payload");
    expect(markup).toContain("data-echarts-shell");
    expect("LazyECharts" in chartsModule).toBe(true);
  });
});
