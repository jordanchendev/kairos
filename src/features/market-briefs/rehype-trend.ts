/**
 * Colours market-direction markers in rendered briefs (Taiwan convention, also for US briefs):
 * ▲ = up = red (`trend-up`), ▼ = down = green (`trend-down`). The glyph is always kept, so
 * colour is never the only signal.
 *
 * - A table cell whose text starts with ▲/▼ gets the class on the <td> (colour + light tint).
 * - Every ▲/▼ run inside other text (e.g. "▲+1.60%") is wrapped in a classed <span>.
 *
 * Runs before react-markdown drops raw HTML (skipHtml), so `raw` nodes such as the
 * `<span style="color:…">` wrappers written for Obsidian are ignored here and removed later;
 * only their inner text survives and is coloured by this rule. No style attribute is emitted.
 *
 * Minimal local hast shapes keep this free of a direct dependency on the hast/unist packages.
 */

type HastText = { type: "text"; value: string };
type HastElement = {
  children: HastNode[];
  properties: Record<string, unknown>;
  tagName: string;
  type: "element";
};
type HastParent = { children: HastNode[]; type: string };
type HastNode = HastElement | HastText | { type: string; value?: string };

export const TREND_UP_CLASS = "trend-up";
export const TREND_DOWN_CLASS = "trend-down";

const RUN_PATTERN = /[▲▼]\s*[^\s，。、；;,)）\]]*/gu;
const SKIP_TAGS = new Set(["code", "pre"]);

function trendClass(text: string): string | null {
  const first = text.trimStart()[0];
  return first === "▲" ? TREND_UP_CLASS : first === "▼" ? TREND_DOWN_CLASS : null;
}

function isElement(node: HastNode): node is HastElement {
  return node.type === "element";
}

function hasChildren(node: HastNode | HastParent): node is HastParent {
  return Array.isArray((node as HastParent).children);
}

function addClass(element: HastElement, className: string) {
  const current = element.properties.className;
  const list = Array.isArray(current) ? current.map(String) : typeof current === "string" ? current.split(/\s+/) : [];
  if (!list.includes(className)) list.push(className);
  element.properties.className = list;
}

/** Visible text of a node, ignoring raw HTML that skipHtml will remove. */
function textContent(node: HastNode): string {
  if (node.type === "text") return (node as HastText).value;
  if (hasChildren(node)) return node.children.map(textContent).join("");
  return "";
}

function splitRuns(value: string): HastNode[] | null {
  RUN_PATTERN.lastIndex = 0;
  if (!RUN_PATTERN.test(value)) return null;
  RUN_PATTERN.lastIndex = 0;

  const out: HastNode[] = [];
  let cursor = 0;
  for (const match of value.matchAll(RUN_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) out.push({ type: "text", value: value.slice(cursor, start) });
    out.push({
      children: [{ type: "text", value: match[0] }],
      properties: { className: [trendClass(match[0]) ?? TREND_UP_CLASS] },
      tagName: "span",
      type: "element",
    });
    cursor = start + match[0].length;
  }
  if (cursor < value.length) out.push({ type: "text", value: value.slice(cursor) });
  return out;
}

function transform(parent: HastParent) {
  const next: HastNode[] = [];
  for (const child of parent.children) {
    if (child.type === "text") {
      next.push(...(splitRuns((child as HastText).value) ?? [child]));
      continue;
    }
    if (isElement(child)) {
      if (SKIP_TAGS.has(child.tagName)) {
        next.push(child);
        continue;
      }
      if (child.tagName === "td") {
        const cls = trendClass(textContent(child));
        if (cls) addClass(child, cls);
      }
      transform(child);
    }
    next.push(child);
  }
  parent.children = next;
}

export default function rehypeTrend() {
  return (tree: HastParent) => {
    transform(tree);
  };
}
