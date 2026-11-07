import { QueryClient } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  MarketIndexDailyRow,
  TaifexFuturesDailyRow,
  TwCreditMarketRow,
  TwGroupRankingHistoryResponse,
  TwIndexDailyRow,
  TwMarketDailyRow,
  TwMarketSummaryRow,
} from "@/api/thalassa/types.gen";
import { client as thalassaClient } from "@/api/thalassa/client.gen";
import { navigationItems } from "@/app/navigation";
import boardLive from "@/features/ops/fixtures/board-live.json";
import { parseBoard } from "@/features/ops/model";

import { marketSummaryOptions } from "./api";
import credit from "./fixtures/credit-market.json";
import groups from "./fixtures/groups-history.json";
import taiex from "./fixtures/index-taiex.json";
import tpex from "./fixtures/index-tpex.json";
import vix from "./fixtures/index-vix.json";
import tsmc from "./fixtures/market-daily-2330.json";
import summary from "./fixtures/market-summary.json";
import futures from "./fixtures/taifex-tx.json";
import sectors from "./fixtures/tw-index-daily.json";
import { MarketOverviewView, type MarketSources } from "./market-overview-view";
import { formatPct, futuresView, groupRange, groupsView, indexQuote, isPreliminaryTurnover, sessionRange, staleNote, trendClass } from "./model";
import { Signed } from "./panel";

// Real responses through the Kairos proxy on 2026-11-07 (Thalassa main 0822ac1), trimmed to the page's window.
const ready = <T,>(data: T) => ({ data, status: "ready" as const });
const board = parseBoard(boardLive);
const NOW = Date.parse("2026-11-07T10:00:00Z"); // Saturday 18:00 Taipei; the last session is Friday 11-06

function sources(over: Partial<MarketSources> = {}): MarketSources {
  return {
    board: ready(board),
    credit: ready(credit as TwCreditMarketRow[]),
    futures: ready(futures as TaifexFuturesDailyRow[]),
    groups: ready(groups as TwGroupRankingHistoryResponse),
    sectors: ready(sectors as TwIndexDailyRow[]),
    stocks: [{ code: "2330", rows: ready(tsmc as TwMarketDailyRow[]) }],
    summary: ready(summary as TwMarketSummaryRow[]),
    taiex: ready(taiex as MarketIndexDailyRow[]),
    tpex: ready(tpex as MarketIndexDailyRow[]),
    vix: ready(vix as MarketIndexDailyRow[]),
    ...over,
  };
}

function render(s: MarketSources, nowMs = NOW) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MarketOverviewView nowMs={nowMs} sources={s} />
    </MemoryRouter>,
  );
}

/** The markup of one panel (sections do not nest). */
function panel(markup: string, id: string): string {
  const start = markup.indexOf(`data-panel="${id}"`);
  expect(start, `panel ${id}`).toBeGreaterThan(-1);
  return markup.slice(start, markup.indexOf("</section>", start));
}

/** The markup of one ticker tile, from its opening tag to the next tile. */
function tile(markup: string, key: string): string {
  const at = markup.indexOf(`data-tile="${key}"`);
  expect(at, `tile ${key}`).toBeGreaterThan(-1);
  const next = markup.indexOf('data-tile="', at + 10);
  return markup.slice(markup.lastIndexOf("<div", at), next === -1 ? undefined : markup.lastIndexOf("<div", next));
}

describe("market overview with the live 2026-11-06 data", () => {
  const markup = render(sources());

  it("names the latest session and the window", () => {
    expect(markup).toContain('data-page-id="market-overview"');
    expect(markup).toContain('data-reference-date="2026-11-06"');
    expect(markup).toContain("2026-11-06（五）");
    expect(markup).toContain("近 40 個交易日");
    expect(markup).not.toContain("data-quiet-days");
  });

  it("fills every panel from its route with that panel's date", () => {
    for (const id of ["taiex", "breadth", "institutional", "margin", "futures", "groups", "sectors"]) {
      expect(panel(markup, id), id).toContain('data-state="ready"');
      expect(panel(markup, id), id).toContain('<time dateTime="2026-11-06">');
      expect(panel(markup, id), id).not.toContain("data-stale");
    }
    const index = panel(markup, "taiex");
    expect(index).toContain("39,701.64");
    expect(index).toContain("▼−1,873.08");
    expect(index).toContain("▼−4.51%");
    expect(index).toContain("13,211 億");
    expect(index).not.toContain("data-preliminary"); // revised: fetched 11-07, final
    expect(panel(markup, "breadth")).toMatch(/data-sign="up">105</);
    expect(panel(markup, "breadth")).toMatch(/data-sign="down">952</);
    expect(panel(markup, "institutional")).toContain("▼−911.9");
    expect(panel(markup, "institutional")).toContain("▲+266.9");
    expect(panel(markup, "margin")).toContain("5,341 億");
    expect(panel(markup, "margin")).toContain("151.9%");
  });

  it("reads TX day against the previous settlement and the night session by its start date", () => {
    const fut = panel(markup, "futures");
    expect(fut).toContain("TX 日盤 202611");
    expect(fut).toContain("39,786");
    expect(fut).toContain("▼−2,096");
    expect(fut).toContain("▲+84"); // basis to TAIEX 39,701.64
    expect(fut).toContain('data-night-start="2026-11-05"');
    expect(fut).toContain("11-05 夜盤");
    expect(fut).toContain("▼−2,946");
    expect(fut).toContain('data-unwired="外資台指期淨未平倉"');
  });

  it("ranks groups and sectors and draws their history", () => {
    const g = panel(markup, "groups");
    expect([...g.matchAll(/data-group="([^"]+)"/g)].map((m) => m[1]).slice(0, 3)).toEqual(["PCB 材料", "PCB 板廠", "散熱"]);
    expect(g).toContain("表 2026-10-30-v1");
    expect(g).toMatch(/data-sparkline="10"/);
    const s = panel(markup, "sectors");
    expect(s).toContain("上市 33 類");
    expect([...s.matchAll(/data-sector="([^"]+)"/g)][0][1]).toBe("資訊服務");
    expect(s).toContain("▲+3.37%");
  });

  it("puts quotes with sparklines in the ticker and marks the series nothing feeds yet", () => {
    expect(tile(markup, "taiex")).toMatch(/data-sparkline="40"/);
    expect(tile(markup, "2330")).toContain("台積電");
    expect(tile(markup, "2330")).toContain("2,135.00");
    expect(tile(markup, "2330")).toContain("▼−4.69%");
    expect(tile(markup, "tx")).toContain("39,786");
    expect(tile(markup, "vix")).toContain("美 11-06");
    for (const key of ["spx", "ixic", "sox", "dji", "dxy", "us10y", "usdtwd"]) {
      expect(tile(markup, key)).toContain("未接資料");
    }
  });

  it("shows the system strip from board.json", () => {
    expect(markup).toContain('data-status-strip="ready"');
    expect(markup).toContain("0 條</b> 需要處理（共 6）");
    expect(markup).toContain('href="/ops"');
  });

  it("carries no forecast or trading-advice wording", () => {
    expect(markup).not.toMatch(/目標價|建議|買進|賣出|看多|看空/);
  });
});

describe("red up, green down", () => {
  it("colours through the Taiwan trend tokens and keeps the arrow", () => {
    expect(trendClass(1)).toBe("trend-up");
    expect(trendClass(-1)).toBe("trend-down");
    expect(trendClass(0)).not.toMatch(/trend-/);
    expect(formatPct(2.5)).toBe("▲+2.50%");
    expect(formatPct(-2.5)).toBe("▼−2.50%");
    expect(formatPct(0)).toBe("0.00%");
    const up = renderToStaticMarkup(<Signed digits={1} value={12.34} />);
    const down = renderToStaticMarkup(<Signed digits={1} value={-12.34} />);
    expect(up).toMatch(/class="[^"]*trend-up[^"]*" data-sign="up">▲\+12\.3</);
    expect(down).toMatch(/class="[^"]*trend-down[^"]*" data-sign="down">▼−12\.3</);
    // a whole-market fall: the TAIEX tile is green, an up sector tile is tinted with --trend-up
    const markup = render(sources());
    expect(tile(markup, "taiex")).toMatch(/trend-down[^"]*" data-sign="down">▼−4\.51%/);
    expect(markup).toMatch(/data-sector="資訊服務"[^>]*style="background:hsl\(var\(--trend-up\)/);
    expect(markup).toMatch(/data-sector="電子零組件"[^>]*style="background:hsl\(var\(--trend-down\)/);
  });
});

describe("a session not yet fully published", () => {
  // Monday 11-09 14:00 Taipei: TAIEX has closed, TWSE has posted the preliminary turnover but not breadth or the
  // institutional totals; credit comes in the evening.
  const monday = "2026-11-09";
  const listed = (summary as TwMarketSummaryRow[]).find((row) => row.market === "twse" && row.date === "2026-11-06")!;
  const partial: TwMarketSummaryRow = {
    ...listed,
    date: monday,
    down: null,
    down_limit: null,
    fetched_at: "2026-11-09T06:00:00Z",
    final: false,
    institutional: null,
    missing: ["breadth", "institutional"],
    turnover: 1_100_000_000_000,
    up: null,
    up_limit: null,
    unchanged: null,
  };
  const taiexMonday = [...(taiex as MarketIndexDailyRow[]), { close: 40100.5, high: null, index_name: "TAIEX", low: null, open: null, trade_date: monday }];
  const markup = render(
    sources({ summary: ready([...(summary as TwMarketSummaryRow[]), partial]), taiex: ready(taiexMonday) }),
    Date.parse("2026-11-09T06:10:00Z"),
  );

  it("moves the page to the new session and marks the turnover preliminary", () => {
    expect(markup).toContain('data-reference-date="2026-11-09"');
    const index = panel(markup, "taiex");
    expect(index).toContain('<time dateTime="2026-11-09">');
    expect(index).toContain("11,000 億");
    expect(index).toContain('data-preliminary="true"');
    expect(markup).toMatch(/data-chip="turnover"[\s\S]*?初值/);
  });

  it("keeps the last published session, with its date, where the new one is missing", () => {
    for (const id of ["breadth", "institutional", "margin"]) {
      const p = panel(markup, id);
      expect(p, id).toContain('data-stale="true"');
      expect(p, id).toContain("11-09 尚未公布");
      expect(p, id).toContain('<time dateTime="2026-11-06">');
    }
    expect(panel(markup, "institutional")).toContain("▼−911.9");
    // TX and the watchlist have no 11-09 row either: the tile says which date it shows
    expect(tile(markup, "2330")).toContain('data-stale="true"');
    expect(tile(markup, "2330")).toContain("11-06");
    expect(tile(markup, "vix")).not.toContain("data-stale"); // a US date is never compared with Taipei's
  });
});

describe("panel states", () => {
  it("shows a failed route in its own panel and leaves the others alone", () => {
    const markup = render(sources({ credit: { message: "/tw/credit/market 回應 HTTP 502", status: "error" } }));
    const margin = panel(markup, "margin");
    expect(margin).toContain('data-state="error"');
    expect(margin).toContain('role="alert"');
    expect(margin).toContain("/tw/credit/market 回應 HTTP 502");
    expect(panel(markup, "taiex")).toContain('data-state="ready"');
    expect(markup).toMatch(/data-chip="maintenance"[\s\S]*?—/);
  });

  it("shows loading and empty states, and a ticker tile that could not load", () => {
    const markup = render(
      sources({
        board: { message: "讀不到 /ops/board.json", status: "error" },
        groups: { status: "loading" },
        sectors: ready([]),
        stocks: [{ code: "2330", rows: { message: "/tw/market-daily?symbol=2330 連不上", status: "error" } }],
      }),
    );
    expect(panel(markup, "groups")).toContain('data-state="loading"');
    expect(panel(markup, "sectors")).toContain('data-state="empty"');
    expect(panel(markup, "sectors")).toContain("這段期間沒有資料");
    expect(tile(markup, "2330")).toContain('data-state="error"');
    expect(tile(markup, "2330")).toContain("讀不到");
    expect(markup).toContain('data-status-strip="error"');
    expect(markup).toContain("看板讀不到");
  });

  it("says when the latest session is more than four days old", () => {
    expect(render(sources(), Date.parse("2026-11-12T02:00:00Z"))).toContain('data-quiet-days="6"');
  });

  it("keeps the TAIEX chart when the market summary fails, saying the turnover is missing", () => {
    const index = panel(render(sources({ summary: { message: "/tw/market-summary 回應 HTTP 500", status: "error" } })), "taiex");
    expect(index).toContain('data-state="ready"');
    expect(index).toContain("成交值讀不到（/tw/market-summary 回應 HTTP 500）");
  });
});

describe("model", () => {
  const row = (summary as TwMarketSummaryRow[]).find((r) => r.market === "twse" && r.date === "2026-11-06")!;

  it("treats turnover as preliminary only before TWSE's 16:30 revision", () => {
    expect(isPreliminaryTurnover(row)).toBe(false); // final
    expect(isPreliminaryTurnover({ ...row, fetched_at: "2026-11-06T07:00:00Z", final: false })).toBe(true); // 15:00
    expect(isPreliminaryTurnover({ ...row, fetched_at: "2026-11-06T09:10:00Z", final: false })).toBe(false); // 17:10
    expect(isPreliminaryTurnover({ ...row, fetched_at: null, final: false })).toBe(true);
    expect(isPreliminaryTurnover({ ...row, final: false, turnover: null })).toBe(false);
  });

  it("files a night session after the latest day session under its start date", () => {
    const rows = futures as TaifexFuturesDailyRow[];
    const day = rows.find((r) => r.trade_date === "2026-11-06" && r.session === "day" && r.contract_month === "202611")!;
    const nextNight: TaifexFuturesDailyRow = { ...day, close: 40100, session: "night", settlement: null, trade_date: "2026-11-09", volume: 50000 };
    const view = futuresView([...rows, nextNight], indexQuote(taiex as MarketIndexDailyRow[]));
    expect(view.night?.startDate).toBe("2026-11-06");
    expect(view.night?.prevSettlement).toBe(39652);
    expect(view.night?.change).toBe(448);
  });

  it("says how many sessions the rank history really holds", () => {
    const history = groups as TwGroupRankingHistoryResponse;
    expect(groupsView(history)?.rankSessions).toBe(10);
    const short = { ...history, days: history.days.slice(-8) };
    const view = groupsView(short);
    expect(view?.rankSessions).toBe(8);
    expect(view?.rows[0].rankSeries).toHaveLength(8);
    expect(panel(render(sources({ groups: ready(short) })), "groups")).toContain("名次走勢＝近 8 個交易日的名次");
    expect(groupRange(Date.parse("2026-11-06T16:30:00Z"))).toEqual({ end: "2026-11-07", start: "2026-10-08" });
  });

  it("asks for 75 calendar days ending on the Taipei date", () => {
    expect(sessionRange(Date.parse("2026-11-06T16:30:00Z"))).toEqual({ end: "2026-11-07", start: "2026-08-24" });
    expect(staleNote("2026-11-06", "2026-11-06")).toBeNull();
    expect(staleNote("2026-11-05", "2026-11-06")).toBe("11-06 尚未公布");
  });
});

describe("Thalassa reads", () => {
  afterEach(() => vi.unstubAllGlobals());
  const range = { end: "2026-11-07", start: "2026-08-24" };
  const fetchSummary = () => new QueryClient({ defaultOptions: { queries: { retry: false } } }).fetchQuery(marketSummaryOptions(range));
  const answer = (body: string, status: number, type = "application/json") =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { headers: { "Content-Type": type }, status })));

  it("returns the rows and names the route when it fails", async () => {
    thalassaClient.setConfig({ baseUrl: "http://kairos.test/thalassa" });
    answer(JSON.stringify(summary), 200);
    expect(await fetchSummary()).toHaveLength((summary as unknown[]).length);
    answer(JSON.stringify({ detail: "range too long for this query" }), 422);
    await expect(fetchSummary()).rejects.toThrow("/tw/market-summary 回應 HTTP 422：range too long for this query");
    answer("<!doctype html><html></html>", 200, "text/html");
    await expect(fetchSummary()).rejects.toThrow("/tw/market-summary 回的不是預期的 JSON");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(fetchSummary()).rejects.toThrow("/tw/market-summary 連不上（Failed to fetch）");
  });
});

describe("navigation", () => {
  it("opens on 市場總覽 and keeps the old Overview as a system page", () => {
    expect(navigationItems.find((item) => item.path === "/")?.title).toBe("市場總覽");
    expect(navigationItems.find((item) => item.path === "/system-overview")?.pageId).toBe("system-overview");
  });
});
