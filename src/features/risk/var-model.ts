import type { VaRResponse, VaRSnapshotResponse } from "@/api/poseidon/types.gen";

export type VarSnapshotModel = {
  asOf: string | null;
  computedAt: string | null;
  cvar95: number;
  cvar99: number;
  holdingPeriod: number;
  method: string;
  portfolioValue: number;
  var95: number;
  var99: number;
};

export type VarSnapshotSummary = {
  methodOptions: string[];
  snapshots: VarSnapshotModel[];
  worstSnapshot: VarSnapshotModel | null;
};

export function normalizeVarSnapshot(snapshot: VaRSnapshotResponse): VarSnapshotModel {
  return {
    asOf: snapshot.as_of ?? null,
    computedAt: snapshot.computed_at ?? null,
    cvar95: snapshot.cvar_95,
    cvar99: snapshot.cvar_99,
    holdingPeriod: snapshot.holding_period,
    method: snapshot.method,
    portfolioValue: snapshot.portfolio_value,
    var95: snapshot.var_95,
    var99: snapshot.var_99,
  };
}

export function summarizeVarSnapshots(payload: VaRResponse | null | undefined): VarSnapshotSummary {
  const snapshots = (payload?.snapshots ?? []).map(normalizeVarSnapshot);
  const methodOptions = [...new Set(snapshots.map((snapshot) => snapshot.method))].sort((left, right) => left.localeCompare(right));
  const worstSnapshot =
    snapshots.reduce<VarSnapshotModel | null>((worst, snapshot) => {
      if (!worst || snapshot.var95 < worst.var95) {
        return snapshot;
      }

      return worst;
    }, null) ?? null;

  return {
    methodOptions,
    snapshots,
    worstSnapshot,
  };
}
