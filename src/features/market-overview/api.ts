// One query per Thalassa route the page reads, all GETs through the Kairos proxy (/thalassa/*, key injected by Caddy).
import { queryOptions } from "@tanstack/react-query";

import {
  creditMarketApiV1TwCreditMarketGetQueryKey,
  groupRankingHistoryApiV1TwGroupsRankingHistoryGetQueryKey,
  indexDailyApiV1RefdataIndexDailyGetQueryKey,
  indexDailyApiV1TwIndexDailyGetQueryKey,
  marketDailyApiV1TwMarketDailyGetQueryKey,
  marketSummaryApiV1TwMarketSummaryGetQueryKey,
  taifexFuturesDailyApiV1RefdataTaifexFuturesDailyGetQueryKey,
} from "@/api/thalassa/@tanstack/react-query.gen";
import {
  creditMarketApiV1TwCreditMarketGet,
  groupRankingHistoryApiV1TwGroupsRankingHistoryGet,
  indexDailyApiV1RefdataIndexDailyGet,
  indexDailyApiV1TwIndexDailyGet,
  marketDailyApiV1TwMarketDailyGet,
  marketSummaryApiV1TwMarketSummaryGet,
  taifexFuturesDailyApiV1RefdataTaifexFuturesDailyGet,
} from "@/api/thalassa/sdk.gen";
import type { IndexDailyApiV1RefdataIndexDailyGetData, TwGroupRankingHistoryResponse } from "@/api/thalassa/types.gen";

import type { DateRange } from "./model";

export class ThalassaReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThalassaReadError";
  }
}

type SdkResult<T> = { data?: T; error?: unknown; response?: Response };

function errorDetail(error: unknown): string {
  if (error && typeof error === "object" && "detail" in error && typeof error.detail === "string") return `：${error.detail}`;
  return "";
}

const isList = (data: unknown) => Array.isArray(data);

/**
 * Runs one SDK call and turns every failure into a message naming the route: a network error (the client returns it
 * with no response), an HTTP error, or a 200 that is not the expected shape (an SPA index.html when the proxy route
 * is missing). An aborted call rethrows as it is, so TanStack Query treats it as a cancel.
 */
async function read<T>(route: string, signal: AbortSignal, call: () => Promise<SdkResult<T>>, isShape: (data: unknown) => boolean): Promise<T> {
  const result = await call();
  if (!result.response) {
    if (signal.aborted) throw result.error;
    const reason = result.error instanceof Error ? result.error.message : "network error";
    throw new ThalassaReadError(`${route} 連不上（${reason}）`);
  }
  if (result.error !== undefined || !result.response.ok) {
    throw new ThalassaReadError(`${route} 回應 HTTP ${result.response.status}${errorDetail(result.error)}`);
  }
  if (!isShape(result.data)) throw new ThalassaReadError(`${route} 回的不是預期的 JSON`);
  return result.data as T;
}

const MINUTE = 60_000;
/** The series change a few times a day (close, 16:30 revision, evening credit); five minutes is plenty. */
const freshness = { refetchInterval: 5 * MINUTE, refetchOnReconnect: true, staleTime: 2 * MINUTE } as const;

export type IndexName = IndexDailyApiV1RefdataIndexDailyGetData["query"]["index_name"];

export function indexOptions(indexName: IndexName, range: DateRange) {
  const options = { query: { end: range.end, index_name: indexName, start: range.start } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) =>
      read(`/refdata/index-daily?index_name=${options.query.index_name}`, signal, () => indexDailyApiV1RefdataIndexDailyGet({ ...options, signal }), isList),
    queryKey: indexDailyApiV1RefdataIndexDailyGetQueryKey(options),
  });
}

export function marketSummaryOptions(range: DateRange) {
  const options = { query: { end: range.end, start: range.start } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) => read("/tw/market-summary", signal, () => marketSummaryApiV1TwMarketSummaryGet({ ...options, signal }), isList),
    queryKey: marketSummaryApiV1TwMarketSummaryGetQueryKey(options),
  });
}

export function creditOptions(range: DateRange) {
  const options = { query: { end: range.end, start: range.start } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) => read("/tw/credit/market", signal, () => creditMarketApiV1TwCreditMarketGet({ ...options, signal }), isList),
    queryKey: creditMarketApiV1TwCreditMarketGetQueryKey(options),
  });
}

export function futuresOptions(range: DateRange) {
  const options = { query: { end: range.end, product: "TX", start: range.start } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) =>
      read("/refdata/taifex-futures-daily?product=TX", signal, () => taifexFuturesDailyApiV1RefdataTaifexFuturesDailyGet({ ...options, signal }), isList),
    queryKey: taifexFuturesDailyApiV1RefdataTaifexFuturesDailyGetQueryKey(options),
  });
}

export function sectorIndexOptions(range: DateRange) {
  const options = { query: { end: range.end, start: range.start } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) => read("/tw/index-daily", signal, () => indexDailyApiV1TwIndexDailyGet({ ...options, signal }), isList),
    queryKey: indexDailyApiV1TwIndexDailyGetQueryKey(options),
  });
}

const isGroupHistory = (data: unknown) =>
  typeof data === "object" && data !== null && Array.isArray((data as TwGroupRankingHistoryResponse).days);

export function groupsOptions(range: DateRange) {
  const options = { query: { end: range.end, start: range.start } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) =>
      read("/tw/groups/ranking/history", signal, () => groupRankingHistoryApiV1TwGroupsRankingHistoryGet({ ...options, signal }), isGroupHistory),
    queryKey: groupRankingHistoryApiV1TwGroupsRankingHistoryGetQueryKey(options),
  });
}

export function stockOptions(symbol: string, range: DateRange) {
  const options = { query: { end: range.end, start: range.start, symbol } };
  return queryOptions({
    ...freshness,
    queryFn: ({ signal }) => read(`/tw/market-daily?symbol=${options.query.symbol}`, signal, () => marketDailyApiV1TwMarketDailyGet({ ...options, signal }), isList),
    queryKey: marketDailyApiV1TwMarketDailyGetQueryKey(options),
  });
}
