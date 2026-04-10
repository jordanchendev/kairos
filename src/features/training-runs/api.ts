// TODO: regen from live API on deploy — replace with generated SDK hooks
// once Poseidon API is deployed with Phase 41 endpoints.

import { client } from "@/api/poseidon/client.gen";

import type {
  TrainingRunDetailResponse,
  TrainingRunListResponse,
} from "./types";

type FetchRunsParams = {
  status?: string;
  market?: string;
  limit?: number;
  offset?: number;
};

/**
 * Fetch paginated training runs from GET /api/v1/models/runs.
 */
export async function fetchTrainingRuns(
  params: FetchRunsParams,
): Promise<TrainingRunListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.market) searchParams.set("market", params.market);
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));
  if (params.offset !== undefined)
    searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  const url = `/api/v1/models/runs${qs ? `?${qs}` : ""}`;

  const response = await client.get({
    url: url as "/api/v1/models/runs",
  });

  return response.data as unknown as TrainingRunListResponse;
}

/**
 * Fetch a single training run detail from GET /api/v1/models/runs/{run_id}.
 */
export async function fetchRunDetail(
  runId: string,
): Promise<TrainingRunDetailResponse> {
  const response = await client.get({
    url: `/api/v1/models/runs/${runId}` as `/api/v1/models/runs/{run_id}`,
  });

  return response.data as unknown as TrainingRunDetailResponse;
}
