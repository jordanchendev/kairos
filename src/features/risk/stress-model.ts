import type { StressTestStatusResponse } from "@/api/poseidon/types.gen";

export type StressResultModel = {
  computedAt: string | null;
  portfolioPnl: number;
  scenarioName: string;
  scenarioType: string;
  shockVector: number[];
  shocks: Array<{ label: string; value: number }>;
  status: string;
  varResult: {
    cvar95: number;
    cvar99: number;
    method: string;
    portfolioValue: number;
    var95: number;
    var99: number;
  } | null;
  worstCaseLoss: number;
};

export function normalizeStressResult(payload: StressTestStatusResponse | null | undefined): StressResultModel | null {
  const result = payload?.result;

  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;
  const details = isObject(record.details) ? record.details : {};
  const shocksApplied = isObject(details.shocks_applied) ? details.shocks_applied : {};
  const varResult = isObject(record.var_result) ? record.var_result : null;

  return {
    computedAt: typeof record.computed_at === "string" ? record.computed_at : null,
    portfolioPnl: toFiniteNumber(record.portfolio_pnl),
    scenarioName: typeof record.scenario_name === "string" ? record.scenario_name : "unknown",
    scenarioType: typeof record.scenario_type === "string" ? record.scenario_type : "unknown",
    shockVector: Array.isArray(details.shock_vector) ? details.shock_vector.map((value) => toFiniteNumber(value)) : [],
    shocks: Object.entries(shocksApplied)
      .map(([label, value]) => ({ label, value: toFiniteNumber(value) }))
      .sort((left, right) => Math.abs(right.value) - Math.abs(left.value)),
    status: typeof record.status === "string" ? record.status : payload?.status ?? "unknown",
    varResult: varResult
      ? {
          cvar95: toFiniteNumber(varResult.cvar_95),
          cvar99: toFiniteNumber(varResult.cvar_99),
          method: typeof varResult.method === "string" ? varResult.method : "unknown",
          portfolioValue: toFiniteNumber(varResult.portfolio_value),
          var95: toFiniteNumber(varResult.var_95),
          var99: toFiniteNumber(varResult.var_99),
        }
      : null,
    worstCaseLoss: toFiniteNumber(record.worst_case_loss),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
