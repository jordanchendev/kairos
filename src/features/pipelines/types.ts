import type { RunStatus } from "@/api/pipeline/types.gen";

// The runner's OpenAPI responses are untyped (`unknown`), so the response shapes live here.
// Source of truth: poseidon `pipeline/service.py` run_json / attempt_json / event_json.

export type PipelineRunStatus = RunStatus;
export type StageVerdict = "pass" | "fail" | "unsupported" | "error";
export type StageStatus = "pending" | "running" | "waiting" | "completed" | "aborted";

export type PipelineRun = {
  abort_requested_at: string | null;
  config_json: { stage_plan?: string[]; [key: string]: unknown };
  config_sha256: string;
  created_at: string;
  created_by: string;
  current_stage: string | null;
  family_id: string;
  finished_at: string | null;
  id: string;
  idea_text: string;
  input_spec_json: unknown;
  market: string | null;
  reason: string | null;
  revision: number;
  run_no: number;
  source: string;
  status: PipelineRunStatus;
  symbol: string | null;
  updated_at: string;
};

export type StageAttempt = {
  artifact_json?: { files?: ArtifactFile[]; report?: unknown; [key: string]: unknown } | null;
  artifact_sha256: string | null;
  artifact_uri: string | null;
  attempt: number;
  code_version: string | null;
  created_at: string;
  error_json?: unknown;
  finished_at: string | null;
  heartbeat_at: string | null;
  id: string;
  input_sha256: string | null;
  lease_expires_at: string | null;
  reason: string | null;
  seq: number;
  stage: string;
  started_at: string | null;
  status: StageStatus;
  trigger: "advance" | "retry" | "rerun";
  verdict: StageVerdict | null;
  wait_until: string | null;
};

export type ArtifactFile = { bytes?: number; name: string; sha256?: string };

export type StageEntry = {
  attempts: StageAttempt[];
  latest: StageAttempt | null;
  seq: number;
  stage: string;
};

export type PipelineList = { items: PipelineRun[]; limit: number; offset: number };
export type PipelineStages = { run_id: string; stages: StageEntry[] };

export type PipelineEvent = {
  actor_id: string | null;
  created_at: string;
  event_type: string;
  expected_revision: number | null;
  id: string;
  payload_json: unknown;
  stage_run_id: string | null;
};
export type PipelineEvents = { items: PipelineEvent[]; run_id: string };
