import { useEffect, useState } from "react";

import { useQueries, useQuery } from "@tanstack/react-query";

import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import {
  creditOptions,
  futuresOptions,
  groupsOptions,
  indexOptions,
  marketSummaryOptions,
  sectorIndexOptions,
  stockOptions,
} from "@/features/market-overview/api";
import { fromQuery } from "@/features/market-overview/loadable";
import { MarketOverviewView } from "@/features/market-overview/market-overview-view";
import { groupRange, sessionRange } from "@/features/market-overview/model";
import { WATCHLIST_TW } from "@/features/market-overview/watchlist";
import { boardOptions } from "@/features/ops/api";

/** Re-renders every `intervalMs`, so the ranges roll over at Taipei midnight and the board age keeps counting. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Component() {
  const nowMs = useNow(60_000);
  const range = sessionRange(nowMs);
  const groups = groupRange(nowMs);

  const taiex = useQuery(indexOptions("TAIEX", range));
  const tpex = useQuery(indexOptions("TPEX", range));
  const vix = useQuery(indexOptions("VIX", range));
  const summary = useQuery(marketSummaryOptions(range));
  const credit = useQuery(creditOptions(range));
  const futures = useQuery(futuresOptions(range));
  const sectors = useQuery(sectorIndexOptions(range));
  const groupHistory = useQuery(groupsOptions(groups));
  const stocks = useQueries({ queries: WATCHLIST_TW.map((code) => stockOptions(code, range)) });
  const board = useQuery({ ...boardOptions(), ...getMonitoringQueryOptions("ops") });

  return (
    <MarketOverviewView
      nowMs={nowMs}
      sources={{
        board: fromQuery(board),
        credit: fromQuery(credit),
        futures: fromQuery(futures),
        groups: fromQuery(groupHistory),
        sectors: fromQuery(sectors),
        stocks: WATCHLIST_TW.map((code, i) => ({ code, rows: fromQuery(stocks[i]) })),
        summary: fromQuery(summary),
        taiex: fromQuery(taiex),
        tpex: fromQuery(tpex),
        vix: fromQuery(vix),
      }}
    />
  );
}
