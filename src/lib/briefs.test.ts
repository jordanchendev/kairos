import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BriefLoadError,
  findBrief,
  groupBriefsByDate,
  loadBriefIndex,
  loadBriefMarkdown,
  parseBriefIndex,
  parseFrontmatterFields,
  splitFrontmatter,
  stripFrontmatter,
} from "@/lib/briefs";

const validIndex = {
  generated_at: "2026-10-22T08:05:00+08:00",
  briefs: [
    {
      bytes: 4210,
      data_gaps: [],
      date: "2026-10-22",
      file: "2026-10-22-tw-premarket.md",
      kind: "tw-premarket",
      session_date: "2026-10-22",
      summary: "美股收高，台指期夜盤上漲。",
      title: "台股盤前 2026-10-22",
    },
    {
      bytes: 3900,
      data_gaps: ["institutional_flows", 7],
      date: "2026-10-21",
      file: "2026-10-21-tw-postmarket.md",
      kind: "tw-postmarket",
      session_date: "2026-10-21",
      summary: "加權指數上漲 0.53%。",
      title: "台股盤後 2026-10-21",
    },
    {
      date: "2026-10-21",
      file: "2026-10-21-us-premarket.md",
      kind: "us-premarket",
    },
  ],
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseBriefIndex", () => {
  it("keeps valid entries newest first and normalises optional fields", () => {
    const index = parseBriefIndex(validIndex);

    expect(index.generated_at).toBe("2026-10-22T08:05:00+08:00");
    expect(index.rejected).toBe(0);
    expect(index.briefs.map((brief) => brief.file)).toEqual([
      "2026-10-22-tw-premarket.md",
      "2026-10-21-tw-postmarket.md",
      "2026-10-21-us-premarket.md",
    ]);
    expect(index.briefs[1].data_gaps).toEqual(["institutional_flows"]);
    expect(index.briefs[2]).toMatchObject({
      bytes: null,
      data_gaps: [],
      session_date: null,
      summary: "",
      title: "2026-10-21 美股盤前",
    });
  });

  it("sorts by date descending even when the producer order is wrong", () => {
    const index = parseBriefIndex({ briefs: [...validIndex.briefs].reverse() });

    expect(index.briefs.map((brief) => brief.date)).toEqual(["2026-10-22", "2026-10-21", "2026-10-21"]);
  });

  it("rejects entries with traversal paths, bad dates, or bad kinds and counts them", () => {
    const index = parseBriefIndex({
      briefs: [
        validIndex.briefs[0],
        { date: "2026-10-22", file: "../../etc/passwd.md", kind: "tw-premarket" },
        { date: "2026-10-22", file: "2026/../secret.md", kind: "tw-premarket" },
        { date: "2026-10-22", file: "/2026/2026-10-22-tw-premarket.md", kind: "tw-premarket" },
        { date: "2026-10-22", file: "2026-10-22-tw-premarket.html", kind: "tw-premarket" },
        { date: "2026-10-22", file: "x/2026-10-22-tw-premarket.md", kind: "tw-premarket" },
        { date: "22/10/2026", file: "2026-10-22-tw-premarket.md", kind: "tw-premarket" },
        { date: "2026-10-22", file: "2026-10-22-tw-premarket.md", kind: "TW PRE" },
        "not-an-object",
      ],
    });

    expect(index.briefs).toHaveLength(1);
    expect(index.rejected).toBe(8);
  });

  it("throws a BriefLoadError when the payload has no briefs array", () => {
    expect(() => parseBriefIndex({ generated_at: "x" })).toThrow(BriefLoadError);
    expect(() => parseBriefIndex([])).toThrow(BriefLoadError);
  });
});

describe("stripFrontmatter", () => {
  it("removes a leading YAML frontmatter block", () => {
    const markdown = "---\ntitle: x\ndata_gaps:\n  - a\n---\n\n# Heading\n\nBody";

    expect(stripFrontmatter(markdown)).toBe("# Heading\n\nBody");
  });

  it("handles CRLF line endings and a BOM", () => {
    expect(stripFrontmatter("\uFEFF---\r\ntitle: x\r\n---\r\n# Heading\r\n")).toBe("# Heading\r\n");
  });

  it("leaves content without frontmatter, and later thematic breaks, untouched", () => {
    const markdown = "# Heading\n\n---\n\nAfter break";

    expect(stripFrontmatter(markdown)).toBe(markdown);
    expect(stripFrontmatter("---\na: 1\n---\nBody\n\n---\n\nTail")).toBe("Body\n\n---\n\nTail");
  });
});

describe("splitFrontmatter (Nexus raw schema)", () => {
  const nexus = [
    "---",
    "type: source",
    'title: "台股盤後 2026-10-21（收盤）"',
    "created: 2026-10-21T14:35:00+08:00",
    "as_of: 2026-10-21T14:30:00+08:00  # local time",
    "tags: [market-brief, 'tw-postmarket']",
    "data_gaps:",
    "  - institutional_flows",
    '  - "margin_balance"',
    "links:",
    "  twse: https://www.twse.com.tw/",
    "---",
    "",
    "# Body",
  ].join("\n");

  it("extracts title, as_of, and data_gaps and returns the body", () => {
    expect(splitFrontmatter(nexus)).toEqual({
      body: "# Body",
      frontmatter: {
        as_of: "2026-10-21T14:30:00+08:00",
        data_gaps: ["institutional_flows", "margin_balance"],
        title: "台股盤後 2026-10-21（收盤）",
      },
    });
  });

  it("parses inline lists and ignores nested mappings", () => {
    const fields = parseFrontmatterFields(nexus.split("\n").slice(1, -3).join("\n"));

    expect(fields.tags).toEqual(["market-brief", "tw-postmarket"]);
    expect(fields.type).toBe("source");
    expect(fields.links).toEqual([]);
    expect(fields).not.toHaveProperty("twse");
  });

  it("keeps a quoted value containing a hash", () => {
    expect(parseFrontmatterFields('title: "台股 #1 盤後"  # note\nkind: x # c')).toEqual({ kind: "x", title: "台股 #1 盤後" });
  });

  it("reports empty metadata when there is no frontmatter or the fields are absent", () => {
    expect(splitFrontmatter("# Only body").frontmatter).toEqual({ as_of: null, data_gaps: [], title: null });
    expect(splitFrontmatter("---\ntype: source\ndata_gaps: []\n---\nBody").frontmatter).toEqual({
      as_of: null,
      data_gaps: [],
      title: null,
    });
  });
});

describe("groupBriefsByDate / findBrief", () => {
  const { briefs } = parseBriefIndex(validIndex);

  it("groups consecutive entries by date", () => {
    expect(groupBriefsByDate(briefs).map((group) => [group.date, group.briefs.length])).toEqual([
      ["2026-10-22", 1],
      ["2026-10-21", 2],
    ]);
  });

  it("finds the newest match and returns null when nothing matches", () => {
    expect(findBrief(briefs, {})?.file).toBe("2026-10-22-tw-premarket.md");
    expect(findBrief(briefs, { date: "2026-10-21", kind: "us-premarket" })?.file).toBe("2026-10-21-us-premarket.md");
    expect(findBrief(briefs, { kind: "tw-postmarket" })?.date).toBe("2026-10-21");
    expect(findBrief(briefs, { date: "2026-10-20", kind: "tw-premarket" })).toBeNull();
  });
});

describe("loadBriefIndex", () => {
  it("fetches index.json without caching and parses it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(validIndex));
    vi.stubGlobal("fetch", fetchMock);

    const index = await loadBriefIndex();

    expect(fetchMock).toHaveBeenCalledWith("/briefs/index.json", expect.objectContaining({ cache: "no-cache" }));
    expect(index?.briefs).toHaveLength(3);
  });

  it("keeps legacy bare names with an unusual kind", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ briefs: [{ date: "2026-10-21", file: "2026-10-21-tw-market.md", kind: "tw-market", title: "舊版日報" }] }),
      ),
    );

    const index = await loadBriefIndex();

    expect(index.rejected).toBe(0);
    expect(index.briefs[0]).toMatchObject({ file: "2026-10-21-tw-market.md", kind: "tw-market" });
  });

  it("treats a missing index and an unreachable upstream as errors, not as an empty archive", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    await expect(loadBriefIndex()).rejects.toThrow(/no index.json \(HTTP 404\)/);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));
    await expect(loadBriefIndex()).rejects.toThrow(/unreachable \(HTTP 502\)/);
  });

  it("fails loudly when the SPA fallback answers with HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<!doctype html>", { headers: { "content-type": "text/html" }, status: 200 })),
    );

    await expect(loadBriefIndex()).rejects.toThrow(/returned HTML/);
  });

  it("reports non-404 HTTP failures and invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(loadBriefIndex()).rejects.toThrow(/failed with HTTP 500/);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{not json", { headers: { "content-type": "application/json" }, status: 200 })),
    );
    await expect(loadBriefIndex()).rejects.toThrow(/not valid JSON/);
  });
});

describe("loadBriefMarkdown", () => {
  it("loads the file and splits off its frontmatter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("---\ntype: source\ntitle: x\nas_of: 2026-10-22T08:00:00+08:00\n---\n# 台股盤前\n", {
        headers: { "content-type": "text/markdown" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadBriefMarkdown("2026-10-22-tw-premarket.md")).resolves.toEqual({
      body: "# 台股盤前\n",
      frontmatter: { as_of: "2026-10-22T08:00:00+08:00", data_gaps: [], title: "x" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/briefs/2026-10-22-tw-premarket.md",
      expect.objectContaining({ cache: "no-cache" }),
    );
  });

  it("refuses unexpected paths without issuing a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadBriefMarkdown("../index.html")).rejects.toThrow(BriefLoadError);
    await expect(loadBriefMarkdown("../../etc/2026-10-22-tw-premarket.md")).rejects.toThrow(BriefLoadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a listed file that is missing on the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

    await expect(loadBriefMarkdown("2026-10-22-tw-premarket.md")).rejects.toThrow(/missing on the server/);
  });
});
