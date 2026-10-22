import { queryOptions } from "@tanstack/react-query";

import {
  abortPipelineApiV1PipelinesRunIdAbortPost,
  getPipelineApiV1PipelinesRunIdGet,
  getPipelineEventsApiV1PipelinesRunIdEventsGet,
  getPipelineStagesApiV1PipelinesRunIdStagesGet,
  getStageAttemptApiV1PipelinesRunIdStagesStageAttemptsAttemptGet,
  listPipelinesApiV1PipelinesGet,
  rerunPipelineApiV1PipelinesRunIdRerunPost,
} from "@/api/pipeline/sdk.gen";

import type {
  PipelineEvents,
  PipelineList,
  PipelineRun,
  PipelineRunStatus,
  PipelineStages,
  StageAttempt,
} from "./types";

export type PipelineFailureKind = "conflict" | "forbidden" | "invalid" | "network" | "not_found" | "server";

export class PipelineApiError extends Error {
  readonly detail: string | null;
  readonly kind: PipelineFailureKind;
  readonly status: number | null;

  constructor(kind: PipelineFailureKind, status: number | null, detail: string | null) {
    super(detail ?? `pipeline request failed (${kind})`);
    this.name = "PipelineApiError";
    this.detail = detail;
    this.kind = kind;
    this.status = status;
  }
}

export function classifyStatus(status: number | null): PipelineFailureKind {
  if (status === null) return "network";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "invalid";
  return "server";
}

type SdkResult = { data?: unknown; error?: unknown; response?: Response };

function unwrap<T>(result: SdkResult): T {
  const status = result.response?.status ?? null;
  if (result.error !== undefined || status === null || status >= 400) {
    const body = result.error as { detail?: unknown } | undefined;
    const detail = typeof body?.detail === "string" ? body.detail : null;
    throw new PipelineApiError(classifyStatus(status), status, detail);
  }
  return result.data as T;
}

async function call<T>(request: () => Promise<SdkResult>): Promise<T> {
  let result: SdkResult;
  try {
    result = await request();
  } catch {
    throw new PipelineApiError("network", null, null);
  }
  return unwrap<T>(result);
}

export const pipelineKeys = {
  all: ["pipelines"] as const,
  attempt: (runId: string, stage: string, attempt: number) => ["pipelines", "attempt", runId, stage, attempt] as const,
  events: (runId: string) => ["pipelines", "events", runId] as const,
  list: (status: PipelineRunStatus | null) => ["pipelines", "list", status ?? "all"] as const,
  run: (runId: string) => ["pipelines", "run", runId] as const,
  stages: (runId: string) => ["pipelines", "stages", runId] as const,
};

type Poll = { refetchInterval?: number };

export function listRunsOptions(status: PipelineRunStatus | null, poll: Poll = {}) {
  return queryOptions({
    ...poll,
    queryFn: () =>
      call<PipelineList>(() =>
        listPipelinesApiV1PipelinesGet({ query: { limit: 50, ...(status ? { status } : {}) } }),
      ),
    queryKey: pipelineKeys.list(status),
  });
}

export function runOptions(runId: string, poll: Poll = {}) {
  return queryOptions({
    ...poll,
    queryFn: () => call<PipelineRun>(() => getPipelineApiV1PipelinesRunIdGet({ path: { run_id: runId } })),
    queryKey: pipelineKeys.run(runId),
  });
}

export function stagesOptions(runId: string, poll: Poll = {}) {
  return queryOptions({
    ...poll,
    queryFn: () =>
      call<PipelineStages>(() => getPipelineStagesApiV1PipelinesRunIdStagesGet({ path: { run_id: runId } })),
    queryKey: pipelineKeys.stages(runId),
  });
}

export function eventsOptions(runId: string, poll: Poll = {}) {
  return queryOptions({
    ...poll,
    queryFn: () =>
      call<PipelineEvents>(() =>
        getPipelineEventsApiV1PipelinesRunIdEventsGet({ path: { run_id: runId }, query: { limit: 200 } }),
      ),
    queryKey: pipelineKeys.events(runId),
  });
}

export function attemptOptions(runId: string, stage: string, attempt: number) {
  return queryOptions({
    queryFn: () =>
      call<StageAttempt>(() =>
        getStageAttemptApiV1PipelinesRunIdStagesStageAttemptsAttemptGet({
          path: { attempt, run_id: runId, stage },
        }),
      ),
    queryKey: pipelineKeys.attempt(runId, stage, attempt),
  });
}

export type RunAction = "abort" | "rerun";

export type RunActionInput = {
  expectedRevision: number;
  idempotencyKey: string;
  kind: RunAction;
  reason: string;
  runId: string;
};

/** Writes always carry the Idempotency-Key header and the revision the operator last saw. */
export function sendRunAction({ expectedRevision, idempotencyKey, kind, reason, runId }: RunActionInput) {
  const headers = { "Idempotency-Key": idempotencyKey };
  const body = { expected_revision: expectedRevision, reason };
  return call<PipelineRun>(() =>
    kind === "rerun"
      ? rerunPipelineApiV1PipelinesRunIdRerunPost({ body, headers, path: { run_id: runId } })
      : abortPipelineApiV1PipelinesRunIdAbortPost({ body, headers, path: { run_id: runId } }),
  );
}
