// TODO: regen from live API on deploy — these types mirror the Pydantic schemas
// from poseidon/src/poseidon/api/research_api.py (Phase 41 Plan 01).
// Once the Poseidon API is deployed with the new endpoints and the OpenAPI spec
// is regenerated via `npm run api:generate`, replace these with the generated types.

export type TrainingRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

/**
 * Lightweight training run summary returned in list responses.
 */
export type TrainingRunResponse = {
  run_id: string;
  handler_class: string;
  model_class: string;
  market: string;
  status: TrainingRunStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  metrics: Record<string, number> | null;
};

/**
 * Full training run detail including handler/model params, segments, etc.
 */
export type TrainingRunDetailResponse = TrainingRunResponse & {
  handler_params: Record<string, unknown>;
  model_params: Record<string, unknown>;
  symbols: string[];
  interval: string;
  segments: Record<string, [string, string]>;
  lookback: string | null;
  model_version_id: string | null;
  mlflow_run_id: string | null;
  error: string | null;
  requested_by: string;
  updated_at: string;
};

/**
 * Paginated list response from GET /api/v1/models/runs.
 */
export type TrainingRunListResponse = {
  runs: TrainingRunResponse[];
  total: number;
  limit: number;
  offset: number;
};
