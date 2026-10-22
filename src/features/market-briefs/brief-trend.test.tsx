import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BriefMarkdown } from "@/features/market-briefs/brief-markdown";
import { stripFrontmatter } from "@/lib/briefs";

import plainFixture from "./fixtures/trend-plain.md?raw";
import spansFixture from "./fixtures/trend-spans.md?raw";

function render(markdown: string) {
  return renderToStaticMarkup(<BriefMarkdown markdown={stripFrontmatter(markdown)} />);
}

function cellFor(markup: string, text: string) {
  const match = new RegExp(`<td([^>]*)>((?:(?!</td>).)*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:(?!</td>).)*)</td>`).exec(markup);
  return match ? { attrs: match[1], inner: match[2] } : null;
}

describe("▲/▼ trend colouring", () => {
  it.each([
    ["plain markdown", plainFixture],
    ["markdown with Obsidian colour spans", spansFixture],
  ])("colours up red and down green in table cells and inline runs (%s)", (_label, fixture) => {
    const markup = render(fixture);

    const up = cellFor(markup, "▲+1.60%");
    const down = cellFor(markup, "▼-0.42%");
    const flat = cellFor(markup, "0.00%");

    expect(up?.attrs).toMatch(/class="[^"]*\btrend-up\b/);
    expect(down?.attrs).toMatch(/class="[^"]*\btrend-down\b/);
    expect(flat?.attrs).not.toMatch(/trend-/);
    // Glyph kept as text, so colour is never the only signal.
    expect(up?.inner).toContain('<span class="trend-up">▲+1.60%</span>');
    expect(down?.inner).toContain('<span class="trend-down">▼-0.42%</span>');

    // Inline runs inside list text.
    expect(markup).toContain('費半 <span class="trend-up">▲+2.10%</span>，VIX <span class="trend-down">▼-5.3%</span>');
    // Code is left alone.
    expect(markup).toMatch(/<code[^>]*>▲<\/code>/);
  });

  it("drops the Obsidian span tags: no literal tag text and no colour style reaches the DOM", () => {
    const markup = render(spansFixture);

    expect(markup).not.toContain("&lt;span");
    expect(markup).not.toContain("<span style");
    expect(markup).not.toMatch(/style="[^"]*color/);
    expect(markup).not.toContain("#d6453d");
    expect(markup).not.toContain("#2e9e6a");
    // Only the GFM alignment style survives on cells.
    for (const style of markup.match(/style="[^"]*"/g) ?? []) {
      expect(style).toMatch(/^style="text-align:(left|right|center)"$/);
    }
  });

  it("renders the span and plain fixtures identically", () => {
    expect(render(spansFixture)).toBe(render(plainFixture));
  });
});
