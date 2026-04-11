import { client } from "@/api/poseidon/client.gen";

import type {
  CentralityTriggerPayload,
  FactorAnalysisRun,
  FactorAnalysisRunListResponse,
  ICTriggerPayload,
  ShapleyTriggerPayload,
  TriggerResponse,
} from "./types";

type FetchRunsParams = {
  limit?: number;
  market?: string;
  offset?: number;
  run_type?: string;
};

function buildQuery(params: FetchRunsParams) {
  const searchParams = new URLSearchParams();
  if (params.run_type) searchParams.set("run_type", params.run_type);
  if (params.market) searchParams.set("market", params.market);
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchFactorAnalysisRuns(
  params: FetchRunsParams = {},
): Promise<FactorAnalysisRunListResponse> {
  const response = await client.get({
    url: `/api/v1/factor-analysis/runs${buildQuery(params)}` as "/api/v1/factor-analysis/runs",
  });

  return response.data as unknown as FactorAnalysisRunListResponse;
}

export async function fetchFactorAnalysisRun(runId: string): Promise<FactorAnalysisRun> {
  const response = await client.get({
    url: `/api/v1/factor-analysis/runs/${runId}` as "/api/v1/factor-analysis/runs/{run_id}",
  });

  return response.data as unknown as FactorAnalysisRun;
}

export async function triggerICAnalysis(body: ICTriggerPayload): Promise<TriggerResponse> {
  const response = await client.post({
    body,
    url: "/api/v1/factor-analysis/ic",
  });

  return response.data as unknown as TriggerResponse;
}

export async function triggerShapleyAnalysis(body: ShapleyTriggerPayload): Promise<TriggerResponse> {
  const response = await client.post({
    body,
    url: "/api/v1/factor-analysis/shapley",
  });

  return response.data as unknown as TriggerResponse;
}

export async function triggerCentralityAnalysis(body: CentralityTriggerPayload): Promise<TriggerResponse> {
  const response = await client.post({
    body,
    url: "/api/v1/factor-analysis/centrality",
  });

  return response.data as unknown as TriggerResponse;
}
