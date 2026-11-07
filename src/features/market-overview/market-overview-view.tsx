// 市場總覽 (variant B of the 2026-11-06 design draft, D-20261106-15): status and summary chips, a two-row quote
// ticker, then a 4-column grid. Every source is its own Loadable so one failed Thalassa call blanks one panel only.
import type { Board } from "@/api/ops/types.gen";
import type {
  MarketIndexDailyRow,
  TaifexFuturesDailyRow,
  TwCreditMarketRow,
  TwGroupRankingHistoryResponse,
  TwIndexDailyRow,
  TwMarketDailyRow,
  TwMarketSummaryRow,
} from "@/api/thalassa/types.gen";

import { GroupsPanel, SectorsPanel } from "./groups-sectors";
import { gate, type Gate, type Loadable } from "./loadable";
import { BreadthPanel, FuturesPanel, IndexTurnoverPanel, InstitutionalPanel, MarginPanel } from "./market-panels";
import {
  breadthView,
  creditView,
  daysBetween,
  formatNumber,
  futuresView,
  indexQuote,
  institutionalView,
  SESSIONS,
  stockQuote,
  taipeiDate,
  turnoverView,
  weekday,
  type Quote,
} from "./model";
import { Signed } from "./panel";
import { StatusStrip, SummaryChips, Ticker, type SummaryChip, type TickerTile } from "./ticker";

export type MarketSources = {
  board: Loadable<Board>;
  credit: Loadable<TwCreditMarketRow[]>;
  futures: Loadable<TaifexFuturesDailyRow[]>;
  groups: Loadable<TwGroupRankingHistoryResponse>;
  sectors: Loadable<TwIndexDailyRow[]>;
  /** watchlist order */
  stocks: { code: string; rows: Loadable<TwMarketDailyRow[]> }[];
  summary: Loadable<TwMarketSummaryRow[]>;
  taiex: Loadable<MarketIndexDailyRow[]>;
  tpex: Loadable<MarketIndexDailyRow[]>;
  vix: Loadable<MarketIndexDailyRow[]>;
};

/** US series and FX the draft shows but no Thalassa route carries yet (D-20261106-15: 「未接資料」 for now). */
const UNWIRED_US = [
  ["spx", "S&P 500"],
  ["ixic", "那斯達克"],
  ["sox", "費城半導體"],
  ["dji", "道瓊工業"],
] as const;
const UNWIRED_MACRO = [
  ["dxy", "美元指數"],
  ["us10y", "美債 10 年"],
  ["usdtwd", "美元/新台幣"],
] as const;

function mapLoadable<T, U>(source: Loadable<T>, map: (data: T) => U): Loadable<U> {
  return source.status === "ready" ? { data: map(source.data), status: "ready" } : source;
}

function quoteGate(source: Loadable<MarketIndexDailyRow[]>): Gate<Quote> {
  return gate(source, indexQuote);
}

function tickerTiles(sources: MarketSources, taiex: Gate<Quote>): TickerTile[] {
  const tx = gate(sources.futures, (rows) => futuresView(rows, null).day);
  const stocks: TickerTile[] = sources.stocks.map(({ code, rows }) => {
    const named = rows.status === "ready" ? stockQuote(rows.data) : null;
    return {
      digits: 2,
      key: code,
      kind: "quote",
      label: named?.name ?? code,
      market: "tw",
      quote: rows.status === "ready" ? (named?.quote ? { status: "ready", view: named.quote } : { status: "empty" }) : rows,
    };
  });
  return [
    { digits: 2, key: "taiex", kind: "quote", label: "加權指數", market: "tw", quote: taiex },
    { digits: 2, key: "tpex", kind: "quote", label: "櫃買指數", market: "tw", quote: quoteGate(sources.tpex) },
    { digits: 0, key: "tx", kind: "quote", label: "台指期近月", market: "tw", quote: tx },
    ...stocks,
    ...UNWIRED_US.map(([key, label]): TickerTile => ({ key, kind: "unwired", label })),
    { digits: 2, key: "vix", kind: "quote", label: "VIX", market: "us", quote: quoteGate(sources.vix) },
    ...UNWIRED_MACRO.map(([key, label]): TickerTile => ({ key, kind: "unwired", label })),
  ];
}

function summaryChips(sources: MarketSources): SummaryChip[] {
  const rows = sources.summary.status === "ready" ? sources.summary.data : [];
  const turnover = turnoverView(rows);
  const breadth = breadthView(rows);
  const flows = institutionalView(rows);
  const credit = sources.credit.status === "ready" ? creditView(sources.credit.data) : null;
  const dash = <span className="text-[hsl(var(--muted-foreground))]">—</span>;
  return [
    {
      date: turnover?.date ?? null,
      key: "turnover",
      label: "成交金額",
      value: turnover ? (
        <>
          <b className="font-semibold tabular-nums">{formatNumber(turnover.yi)} 億</b>
          {turnover.preliminary ? <span className="text-[10px] text-amber-300">初值</span> : null}
          <Signed digits={1} pct value={turnover.vsAvg5Pct} />
          <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">vs 前 5 日均</span>
        </>
      ) : (
        dash
      ),
    },
    {
      date: breadth?.date ?? null,
      key: "breadth",
      label: "上漲占比",
      value: breadth ? (
        <>
          <b className="font-semibold tabular-nums">{formatNumber(breadth.upShare, 1)}%</b>
          <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
            {breadth.up} 漲 / {breadth.down} 跌
          </span>
        </>
      ) : (
        dash
      ),
    },
    {
      date: flows?.date ?? null,
      key: "foreign",
      label: "外資",
      value: flows ? (
        <>
          <Signed className="font-semibold" digits={0} suffix=" 億" value={flows.foreign} />
          {flows.foreignStreak > 1 ? (
            <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
              連 {flows.foreignStreak} 日{flows.foreign > 0 ? "買超" : "賣超"}
            </span>
          ) : null}
        </>
      ) : (
        dash
      ),
    },
    {
      date: flows?.date ?? null,
      key: "institutional",
      label: "三大法人合計",
      value: flows ? <Signed className="font-semibold" digits={0} suffix=" 億" value={flows.total} /> : dash,
    },
    {
      date: credit?.date ?? null,
      key: "maintenance",
      label: "融資維持率",
      value: credit ? (
        <>
          <b className="font-semibold tabular-nums">{formatNumber(credit.ratio, 1)}%</b>
          <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">估算</span>
        </>
      ) : (
        dash
      ),
    },
  ];
}

/** The page's latest session: TAIEX's last close, else the market summary's last date. */
function referenceDateOf(taiex: Gate<Quote>, summary: Loadable<TwMarketSummaryRow[]>): string | null {
  if (taiex.status === "ready") return taiex.view.date;
  if (summary.status !== "ready") return null;
  return summary.data.reduce<string | null>((max, row) => (max === null || row.date > max ? row.date : max), null);
}

/** More than this many calendar days without a session (a long weekend is four) gets a notice. */
const QUIET_DAYS = 4;

export function MarketOverviewView({ nowMs, sources }: { nowMs: number; sources: MarketSources }) {
  const taiex = quoteGate(sources.taiex);
  const referenceDate = referenceDateOf(taiex, sources.summary);
  const taiexQuote = taiex.status === "ready" ? taiex.view : null;
  const quietDays = referenceDate ? daysBetween(referenceDate, taipeiDate(nowMs)) : null;
  return (
    <section className="@container space-y-2 text-[12px] leading-[1.35] tabular-nums" data-page-id="market-overview">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="m-0 text-[15px] font-semibold text-[hsl(var(--foreground))]">市場總覽</h1>
        <span className="text-[hsl(var(--muted-foreground))]" data-reference-date={referenceDate ?? ""}>
          {referenceDate ? (
            <>
              台股 <b className="font-semibold text-[hsl(var(--foreground))]">{referenceDate}（{weekday(referenceDate)}）</b> 收盤 · 近 {SESSIONS} 個交易日
            </>
          ) : (
            "台股最新交易日讀取中"
          )}
        </span>
        {quietDays !== null && quietDays > QUIET_DAYS ? (
          <span className="text-[11px] text-amber-300" data-quiet-days={quietDays}>
            最新交易日距今 {quietDays} 天
          </span>
        ) : null}
        <div className="ml-auto">
          <StatusStrip board={sources.board} nowMs={nowMs} />
        </div>
      </header>

      <SummaryChips chips={summaryChips(sources)} />
      <Ticker referenceDate={referenceDate} tiles={tickerTiles(sources, taiex)} />

      <div className="grid grid-cols-1 gap-2 @3xl:grid-cols-2 @5xl:grid-cols-4">
        <IndexTurnoverPanel referenceDate={referenceDate} summary={sources.summary} taiex={mapLoadable(sources.taiex, indexQuote)} />
        <BreadthPanel referenceDate={referenceDate} summary={sources.summary} />
        <InstitutionalPanel referenceDate={referenceDate} summary={sources.summary} />
        <MarginPanel credit={sources.credit} referenceDate={referenceDate} />
        <FuturesPanel futures={sources.futures} referenceDate={referenceDate} taiex={taiexQuote} />
        <GroupsPanel groups={sources.groups} referenceDate={referenceDate} />
        <SectorsPanel referenceDate={referenceDate} sectors={sources.sectors} />
      </div>
    </section>
  );
}
