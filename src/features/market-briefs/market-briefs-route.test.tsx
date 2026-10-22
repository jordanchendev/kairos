import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseBriefIndex, splitFrontmatter } from "@/lib/briefs";

import fixtureMarkdown from "./fixtures/2026-10-21-tw-postmarket.md?raw";

const index = parseBriefIndex({
  generated_at: "2026-10-22T08:05:00+08:00",
  briefs: [
    {
      data_gaps: [],
      date: "2026-10-22",
      file: "2026-10-22-us-postmarket.md",
      kind: "us-postmarket",
      session_date: "2026-10-21",
      summary: "那斯達克收高。",
      title: "美股盤後 2026-10-22",
    },
    {
      data_gaps: ["institutional_flows"],
      date: "2026-10-21",
      file: "2026-10-21-tw-postmarket.md",
      kind: "tw-postmarket",
      session_date: "2026-10-21",
      summary: "加權指數上漲 0.53%。",
      title: "台股盤後 2026-10-21",
    },
  ],
});

const selected = index.briefs[1];

async function loadRoute() {
  return import("@/routes/market-briefs");
}

describe("market briefs route", () => {
  it("renders the grouped list, kind chips, metadata, and the GFM table of the selected brief", async () => {
    const { MarketBriefsPage } = await loadRoute();

    const markup = renderToStaticMarkup(
      <MarketBriefsPage
        content={{ document: splitFrontmatter(fixtureMarkdown), status: "success" }}
        index={index}
        kindFilter="all"
        requested={{ date: "2026-10-21", kind: "tw-postmarket" }}
        selected={selected}
      />,
    );

    // List grouped by date with kind chips and the filter bar.
    expect(markup).toContain("市場日報");
    expect(markup).toContain("2026-10-22");
    expect(markup).toContain("美股盤後");
    expect(markup).toContain("台股盤後");
    expect(markup).toContain("全部");
    expect(markup).toContain("台股盤前");
    expect(markup).toContain("美股盤前");

    // Reader header: frontmatter title and as_of, session date, merged data gaps.
    expect(markup).toContain("台股盤後 2026-10-21（收盤）");
    expect(markup).toContain("交易時段：2026-10-21 · 資料截至：2026-10-21T14:30:00+08:00");
    expect(markup).toContain("institutional_flows");
    expect(markup).toContain("margin_balance");

    // Frontmatter is gone; GFM table rendered with right-aligned numeric columns in a scroll wrapper.
    expect(markup).not.toContain("type: source");
    expect(markup).not.toContain("as_of:");
    expect(markup).toMatch(/<div class="[^"]*overflow-x-auto[^"]*" data-brief-table="">\s*<table/);
    expect(markup).toContain("加權指數");
    expect(markup).toMatch(/<td[^>]*style="text-align:right"[^>]*>23,456.78<\/td>/);
    expect(markup).toMatch(/<th[^>]*style="text-align:right"[^>]*>收盤<\/th>/);
    expect(markup).toMatch(/<td[^>]*style="text-align:left"[^>]*>加權指數<\/td>/);

    // Banner blockquote, external links in a new tab, and no raw HTML.
    expect(markup).toContain("<blockquote");
    expect(markup).toContain("資料未齊");
    expect(markup).toContain('href="https://www.twse.com.tw/" rel="noopener noreferrer" target="_blank"');
    expect(markup).not.toContain("<script");
  });

  it("renders the empty state when the archive has no briefs", async () => {
    const { MarketBriefsPage } = await loadRoute();

    const markup = renderToStaticMarkup(
      <MarketBriefsPage
        content={null}
        index={{ briefs: [], generated_at: null, rejected: 0 }}
        kindFilter="all"
        requested={{ date: null, kind: null }}
        selected={null}
      />,
    );

    expect(markup).toContain("尚無市場日報");
  });

  it("says so when a deep link points at a brief that is not in the index", async () => {
    const { MarketBriefsPage } = await loadRoute();

    const markup = renderToStaticMarkup(
      <MarketBriefsPage
        content={null}
        index={index}
        kindFilter="all"
        requested={{ date: "2026-10-20", kind: "us-premarket" }}
        selected={null}
      />,
    );

    expect(markup).toContain("找不到指定的日報");
    expect(markup).toContain("2026-10-20 美股盤前");
  });

  it("shows the markdown load error and the rejected-entry warning", async () => {
    const { MarketBriefsPage } = await loadRoute();

    const markup = renderToStaticMarkup(
      <MarketBriefsPage
        content={{ message: "Brief file 2026-10-21-tw-postmarket.md is listed in index.json but missing on the server.", status: "error" }}
        index={{ ...index, rejected: 2 }}
        kindFilter="tw-postmarket"
        requested={{ date: null, kind: null }}
        selected={selected}
      />,
    );

    expect(markup).toContain("日報內容無法載入");
    expect(markup).toContain("missing on the server");
    expect(markup).toContain("有 2 筆項目格式不符");
    expect(markup).not.toContain("美股盤後 2026-10-22");
  });

  it("renders legacy briefs with an unusual kind using a generic chip and filter option", async () => {
    const { MarketBriefsPage } = await loadRoute();
    const legacy = parseBriefIndex({
      briefs: [{ date: "2026-10-21", file: "2026-10-21-tw-market.md", kind: "tw-market", title: "舊版台股日報" }],
    });

    const markup = renderToStaticMarkup(
      <MarketBriefsPage
        content={{ document: splitFrontmatter("# 舊版\n\n內容"), status: "success" }}
        index={legacy}
        kindFilter="all"
        requested={{ date: null, kind: null }}
        selected={legacy.briefs[0]}
      />,
    );

    expect(markup).toContain("舊版台股日報");
    expect(markup).toMatch(/<span class="[^"]*border-slate-400\/25[^"]*">tw-market<\/span>/);
    expect(markup).toMatch(/<button[^>]*>tw-market<\/button>/);
  });

  it("is reachable from the Overview navigation group", async () => {
    const { navigationGroups } = await import("@/app/navigation");
    const overview = navigationGroups.find((group) => group.title === "Overview");

    expect(overview?.items.some((item) => item.path === "/market-briefs" && item.title === "市場日報")).toBe(true);
  });
});
