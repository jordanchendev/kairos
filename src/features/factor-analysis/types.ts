export type FactorAnalysisRunType = "ic" | "shapley" | "centrality";
export type FactorAnalysisStatus = "pending" | "running" | "succeeded" | "failed";
export type FactorAnalysisTab = FactorAnalysisRunType;

export type FactorAnalysisRun = {
  id: string;
  run_type: FactorAnalysisRunType;
  config_json: Record<string, unknown>;
  results_json: Record<string, unknown> | null;
  status: FactorAnalysisStatus;
  market: string;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type FactorAnalysisRunListResponse = {
  runs: FactorAnalysisRun[];
  total: number;
  limit: number;
  offset: number;
};

export type TriggerResponse = {
  id: string;
  status: string;
};

export type ICResults = {
  features: Record<string, Record<string, number | null>>;
  symbols_used: number;
  total_observations: number;
};

export type ShapleyResults = {
  features: Record<string, number>;
  num_samples: number;
  model_version_id: string;
  market?: string;
};

export type CentralityResults = {
  correlation_matrix: number[][];
  signal_names: string[];
  clusters: Record<string, string[]>;
  threshold: number;
  linkage?: number[][];
  symbols_used?: number;
};

export type ICTriggerPayload = {
  market: string;
  start_date: string;
  end_date: string;
  horizons?: number[];
  features?: string[];
  symbols?: string[];
  interval?: string;
};

export type ShapleyTriggerPayload = {
  model_version_id: string;
  max_samples?: number;
};

export type CentralityTriggerPayload = {
  market: string;
  sub_signals: Record<string, unknown>[];
  start_date: string;
  end_date: string;
  symbols?: string[];
  interval?: string;
  distance_threshold?: number;
};

export function asICResults(run: FactorAnalysisRun | null): ICResults | null {
  if (!run?.results_json || run.run_type !== "ic") {
    return null;
  }

  return run.results_json as unknown as ICResults;
}

export function asShapleyResults(run: FactorAnalysisRun | null): ShapleyResults | null {
  if (!run?.results_json || run.run_type !== "shapley") {
    return null;
  }

  return run.results_json as unknown as ShapleyResults;
}

export function asCentralityResults(run: FactorAnalysisRun | null): CentralityResults | null {
  if (!run?.results_json || run.run_type !== "centrality") {
    return null;
  }

  return run.results_json as unknown as CentralityResults;
}
