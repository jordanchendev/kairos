import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client as opsClient } from "@/api/ops/client.gen";
import type { Board, Pipeline } from "@/api/ops/types.gen";
import { Component as OpsPage } from "@/routes/ops";

import { boardOptions } from "./api";
import { OpsBoardView } from "./board-view";
import live from "./fixtures/board-live.json";
import { OpsBoardError, feedView, formatRelative, formatTaipei, formatUtc, parseBoard, sortPipelines } from "./model";

// The live board as stormtrooper wrote it on 2026-11-05 (six pipelines, all ok, feed ok).
const liveBoard = parseBoard(live);
const NOW = Date.parse(liveBoard.now);
const minutes = (n: number) => NOW + n * 60_000;

function pipeline(id: string, over: Partial<Pipeline> = {}): Pipeline {
  const base = liveBoard.pipelines.find((row) => row.id === id);
  if (!base) throw new Error(`no ${id} in the fixture`);
  return { ...base, ...over };
}

function board(over: Partial<Board> = {}): Board {
  return { ...liveBoard, ...over };
}

function render(b: Board, nowMs = NOW, fetchFailed = false) {
  return renderToStaticMarkup(<OpsBoardView board={b} fetchFailed={fetchFailed} nowMs={nowMs} />);
}

function order(markup: string) {
  return [...markup.matchAll(/data-pipeline-id="([^"]+)"/g)].map((match) => match[1]);
}

// research-scout failed and needs attention; the brief is late but still inside its grace.
const failedScout = pipeline("research-scout", {
  label: "失敗",
  needs_attention: true,
  reason: "11-05 00:30Z 那次 error：timeout",
  state: "failed",
});
const lateBrief = pipeline("market-brief", {
  label: "逾時",
  needs_attention: false,
  reason: "us-postmarket 尚未寫入 state.json（寬限到 11-05 21:25Z）",
  state: "late",
});
const redBoard = board({
  needs_attention: ["research-scout"],
  pipelines: liveBoard.pipelines.map((row) =>
    row.id === "research-scout" ? failedScout : row.id === "market-brief" ? lateBrief : row,
  ),
});

describe("parseBoard", () => {
  it("accepts the live board and rejects what a missing mount would answer", () => {
    expect(liveBoard.pipelines.map((row) => row.id)).toEqual([
      "market-brief",
      "research-runner",
      "strategy-pipeline",
      "research-scout",
      "thalassa-freshness",
      "preopen-watcher",
    ]);
    expect(() => parseBoard("<!doctype html><html></html>")).toThrow(OpsBoardError);
    expect(() => parseBoard(null)).toThrow(OpsBoardError);
    expect(() => parseBoard({ now: "2026-11-05T15:00:00Z", needs_attention: [], pipelines: {} })).toThrow(OpsBoardError);
    expect(parseBoard({ needs_attention: [], now: "2026-11-05T15:00:00Z", pipelines: [] }).pipelines).toEqual([]);
  });
});

describe("ordering", () => {
  it("puts pipelines that need attention first, then by severity, keeping registry order otherwise", () => {
    expect(sortPipelines(redBoard.pipelines).map((row) => row.id)).toEqual([
      "research-scout",
      "market-brief",
      "research-runner",
      "strategy-pipeline",
      "thalassa-freshness",
      "preopen-watcher",
    ]);
  });

  it("sorts a state it does not know with unknown", () => {
    const odd = pipeline("research-runner", { label: "?", state: "paused" as unknown as Pipeline["state"] });
    const ok = pipeline("strategy-pipeline");
    const late = pipeline("market-brief", { state: "late" });
    expect(sortPipelines([ok, odd, late]).map((row) => row.id)).toEqual(["market-brief", "research-runner", "strategy-pipeline"]);
  });
});

describe("board view", () => {
  it("renders the red pipeline first with its reason, the count and its part table", () => {
    const markup = render(redBoard);
    expect(markup).toContain('data-page-id="ops"');
    expect(markup).toContain("流水線狀態");
    expect(order(markup)[0]).toBe("research-scout");
    expect(order(markup)[1]).toBe("market-brief");
    expect(markup).toMatch(/data-needs-attention="true" data-pipeline-id="research-scout" data-state="failed"/);
    expect(markup).toContain("11-05 00:30Z 那次 error：timeout");
    expect(markup).toContain("1 條");
    expect(markup).toContain("research-scout</span>"); // the count card names it
    // multi-part pipelines get one row per part (market-brief 4, strategy-pipeline 2); single-part ones name it
    expect([...markup.matchAll(/data-part="([^"]+)"/g)].map((m) => m[1])).toEqual([
      "us-postmarket",
      "tw-premarket",
      "tw-postmarket",
      "us-premarket",
      "scout",
      "runs",
    ]);
    expect(markup).toContain("部分：scout");
    // times: UTC like the reasons, Taipei in the title, age relative to now
    expect(markup).toMatch(/<time [^>]*title="台北 11-05 08:30"[^>]*>11-05 00:30Z/);
    expect(markup).not.toContain("data-stale");
    expect(markup).not.toContain("data-feed-outage");
  });

  it("shows an all-clear board without banners", () => {
    const markup = render(liveBoard, minutes(4));
    expect(markup).toContain("0 條");
    expect(markup).toContain("全部正常或在寬限內");
    expect(markup).toContain("4 分鐘前");
    expect(markup).not.toContain('role="status"');
  });

  it("flags a board older than 15 minutes as stale", () => {
    expect(render(liveBoard, minutes(15))).not.toContain("data-stale");
    const markup = render(liveBoard, minutes(16));
    expect(markup).toContain('data-stale="true"');
    expect(markup).toContain("已 16 分鐘沒有更新（最後寫入 11-05 15:26Z）");
    expect(render(board({ now: "not a time" }), NOW)).toContain("的寫入時間讀不出來");
  });

  it("shows a macminim4 feed outage, short and long, with the collector's note", () => {
    const note = "macminim4 資料來源自 11-05 14:00Z 起讀不到（bridge pipeline-status exit 255：）；macminim4 的流水線在 30 分鐘後顯示不明，不推播";
    const failing = {
      error: "bridge pipeline-status exit 255：",
      failing_since: "2026-11-05T14:00:00Z",
      last_ok_at: "2026-11-05T13:55:00Z",
      long: false,
      note,
      ok: false,
    };
    const unknownScout = pipeline("research-scout", { label: "不明", reason: "macminim4 輸入過舊", state: "unknown" });
    const shortMarkup = render(board({ feeds: { macminim4: failing }, pipelines: [unknownScout] }));
    expect(shortMarkup).toContain('data-feed-outage="short"');
    expect(shortMarkup).toContain(`macminim4 資料來源讀不到：${note}`);
    expect(shortMarkup).toContain('data-state="unknown"');
    expect(shortMarkup).toContain("不明");

    const longMarkup = render(board({ feeds: { macminim4: { ...failing, long: true } } }));
    expect(longMarkup).toContain('data-feed-outage="long"');
    expect(longMarkup).toContain("中斷超過 60 分鐘");
  });

  it("names a push still waiting for the bridge on its pipeline", () => {
    const markup = render(board({ notify: { "research-scout": { error: "bridge exit 255", to: "red" } }, pipelines: [failedScout] }));
    expect(markup).toContain("推播待送：紅燈（bridge exit 255）");
    expect(markup).toContain("1 則");
  });

  it("keeps a previous board on a failed refetch and says so", () => {
    expect(render(liveBoard, minutes(1), true)).toContain("最近一次讀取 board.json 失敗");
  });

  it("renders an empty board and a board without feeds or notify", () => {
    const markup = render({ needs_attention: [], now: liveBoard.now, pipelines: [] });
    expect(markup).toContain("沒有流水線");
    expect(markup).toContain("macminim4 資料來源未提供");
    expect(markup).toContain("0 則");
  });

  it("has no control that reruns or fixes anything", () => {
    expect(render(redBoard)).not.toMatch(/<button|<form/);
  });
});

describe("formatting", () => {
  it("formats UTC, Taipei and relative times", () => {
    expect(formatUtc("2026-11-05T23:40:00Z")).toBe("11-05 23:40Z");
    expect(formatTaipei("2026-11-05T23:40:00Z")).toBe("台北 11-06 07:40");
    expect(formatUtc(null)).toBe("—");
    expect(formatRelative("2026-11-05T15:26:01Z", minutes(0))).toBe("剛剛");
    expect(formatRelative("2026-11-05T13:26:01Z", NOW)).toBe("2 小時前");
    expect(formatRelative("2026-11-05T15:56:01Z", NOW)).toBe("30 分鐘後");
    expect(feedView(undefined).title).toBe("未提供");
  });
});

describe("board client", () => {
  const BASE = "http://kairos.test/ops";
  let reply: () => Response;
  const urls: string[] = [];

  beforeEach(() => {
    urls.length = 0;
    opsClient.setConfig({ baseUrl: BASE });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        urls.push((input instanceof Request ? input : new Request(input, init)).url);
        return reply();
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const fetchBoard = () => new QueryClient({ defaultOptions: { queries: { retry: false } } }).fetchQuery(boardOptions());

  it("reads board.json through the generated client", async () => {
    reply = () => new Response(JSON.stringify(live), { headers: { "Content-Type": "application/json" } });
    expect((await fetchBoard()).pipelines).toHaveLength(6);
    expect(urls).toEqual([`${BASE}/board.json`]);
  });

  it("turns the SPA fallback and an error status into a board error", async () => {
    reply = () => new Response("<!doctype html><html></html>", { headers: { "Content-Type": "text/html" } });
    await expect(fetchBoard()).rejects.toThrow(/不是看板格式/);
    reply = () => new Response("", { status: 404 });
    await expect(fetchBoard()).rejects.toThrow(/讀不到 \/ops\/board.json/);
  });
});

describe("ops route and navigation", () => {
  it("renders the cached board on /ops", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(boardOptions().queryKey, redBoard);
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/ops"]}>
          <OpsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(markup).toContain('data-page-id="ops"');
    expect(order(markup)[0]).toBe("research-scout");
  });

  it("lists /ops in System right after Infrastructure and leaves /pipelines as it was", async () => {
    const { navigationGroups } = await import("@/app/navigation");
    const system = navigationGroups.find((group) => group.title === "System")?.items ?? [];
    const at = system.findIndex((item) => item.path === "/infrastructure");
    expect(system[at + 1]).toMatchObject({ pageId: "ops", path: "/ops", title: "流水線狀態" });
    const research = navigationGroups.find((group) => group.title === "Research")?.items ?? [];
    expect(research.find((item) => item.path === "/pipelines")).toMatchObject({ pageId: "pipelines", title: "Pipelines" });
  });
});
