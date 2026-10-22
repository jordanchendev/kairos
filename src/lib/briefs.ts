/**
 * Loader for the daily market-brief archive.
 *
 * The briefs are static documents (index.json + markdown from the Nexus vault) that a
 * read-only file server on macminim4 exposes and Caddy proxies same-origin at /briefs/*.
 * They are not an API and have no OpenAPI spec, so there is no generated Hey API client
 * for them. This module is the single place allowed to call
 * `fetch` for them; eslint.config.js scopes that exception to this file only.
 */
import { queryOptions } from "@tanstack/react-query";

export const BRIEFS_BASE = import.meta.env.VITE_BRIEFS_BASE ?? "/briefs";

export const BRIEF_KIND_LABELS = {
  "tw-premarket": "台股盤前",
  "tw-postmarket": "台股盤後",
  "us-premarket": "美股盤前",
  "us-postmarket": "美股盤後",
} as const;

export type KnownBriefKind = keyof typeof BRIEF_KIND_LABELS;

export const BRIEF_KINDS = Object.keys(BRIEF_KIND_LABELS) as KnownBriefKind[];

export type BriefEntry = {
  bytes: number | null;
  data_gaps: string[];
  date: string;
  file: string;
  kind: string;
  session_date: string | null;
  summary: string;
  title: string;
};

export type BriefIndex = {
  briefs: BriefEntry[];
  generated_at: string | null;
  /** Entries dropped because they failed validation; surfaced so a bad producer is not silent. */
  rejected: number;
};

export class BriefLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BriefLoadError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KIND_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// "<YYYY-MM-DD>-<kind>.md" (optionally under a "<YYYY>/" dir) only: the name comes from a data
// file and is turned into a URL, so anything else (other slashes, "..", other extensions) is rejected.
const FILE_PATTERN = /^(?:\d{4}\/)?\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

export function briefKindLabel(kind: string): string {
  return kind in BRIEF_KIND_LABELS ? BRIEF_KIND_LABELS[kind as KnownBriefKind] : kind;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseEntry(raw: unknown): BriefEntry | null {
  if (!isRecord(raw)) return null;
  const { date, kind, file } = raw;
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) return null;
  if (typeof kind !== "string" || !KIND_PATTERN.test(kind)) return null;
  if (typeof file !== "string" || !FILE_PATTERN.test(file)) return null;

  return {
    bytes: typeof raw.bytes === "number" && Number.isFinite(raw.bytes) ? raw.bytes : null,
    data_gaps: Array.isArray(raw.data_gaps)
      ? raw.data_gaps.filter((gap): gap is string => typeof gap === "string" && gap.length > 0)
      : [],
    date,
    file,
    kind,
    session_date: optionalString(raw.session_date),
    summary: typeof raw.summary === "string" ? raw.summary : "",
    title: optionalString(raw.title) ?? `${date} ${briefKindLabel(kind)}`,
  };
}

/** Validates an untrusted index.json payload. Entries are kept newest first. */
export function parseBriefIndex(payload: unknown): BriefIndex {
  if (!isRecord(payload) || !Array.isArray(payload.briefs)) {
    throw new BriefLoadError("index.json is malformed: expected an object with a briefs array.");
  }

  const briefs: BriefEntry[] = [];
  let rejected = 0;
  for (const raw of payload.briefs) {
    const entry = parseEntry(raw);
    if (entry) {
      briefs.push(entry);
    } else {
      rejected += 1;
    }
  }

  // Newest date first; stable for entries of the same date so producer order is kept.
  briefs.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));

  return { briefs, generated_at: optionalString(payload.generated_at), rejected };
}

const FRONTMATTER_PATTERN = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** The frontmatter fields the reader shows (Nexus raw schema: type, title, created, as_of, tags, ...). */
export type BriefFrontmatter = {
  as_of: string | null;
  data_gaps: string[];
  title: string | null;
};

export type BriefDocument = {
  body: string;
  frontmatter: BriefFrontmatter;
};

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'") && trimmed.at(-1) === trimmed[0]) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Reads top-level scalar and string-list keys from a YAML block. Deliberately minimal (no YAML
 * dependency): `key: value`, `key: [a, b]`, and `key:` followed by `  - item` lines. Nested
 * mappings and other constructs are ignored, which is enough for the display fields.
 */
export function parseFrontmatterFields(yaml: string): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {};
  let listKey: string | null = null;

  for (const line of yaml.split(/\r?\n/)) {
    const item = listKey ? /^\s*-\s+(.*)$/.exec(line) : null;
    if (item && listKey) {
      (fields[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    listKey = null;

    const match = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    // Trailing "# comment" is only stripped from unquoted values; a quoted title may contain " #".
    const trimmedRaw = rawValue.trim();
    const quoted = /^(["'])(.*)\1(?:\s+#.*)?$/.exec(trimmedRaw);
    const value = quoted ? `${quoted[1]}${quoted[2]}${quoted[1]}` : trimmedRaw.replace(/\s+#.*$/, "").trim();

    if (value === "") {
      fields[key] = [];
      listKey = key;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      fields[key] = value
        .slice(1, -1)
        .split(",")
        .map(unquote)
        .filter((entry) => entry.length > 0);
    } else {
      fields[key] = unquote(value);
    }
  }
  return fields;
}

function scalarField(fields: Record<string, string | string[]>, key: string): string | null {
  const value = fields[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Splits a brief into its frontmatter display fields and the markdown body. */
export function splitFrontmatter(markdown: string): BriefDocument {
  const match = FRONTMATTER_PATTERN.exec(markdown);
  if (!match) {
    return { body: markdown, frontmatter: { as_of: null, data_gaps: [], title: null } };
  }

  const fields = parseFrontmatterFields(match[1]);
  const gaps = fields.data_gaps;
  return {
    body: markdown.slice(match[0].length).replace(/^\s*\n/, ""),
    frontmatter: {
      as_of: scalarField(fields, "as_of"),
      data_gaps: Array.isArray(gaps) ? gaps.filter((gap) => gap.length > 0) : typeof gaps === "string" ? [gaps] : [],
      title: scalarField(fields, "title"),
    },
  };
}

/** Removes a leading YAML frontmatter block (--- ... ---). Content without one is returned unchanged. */
export function stripFrontmatter(markdown: string): string {
  return splitFrontmatter(markdown).body;
}

export type BriefGroup = {
  briefs: BriefEntry[];
  date: string;
};

export function groupBriefsByDate(briefs: BriefEntry[]): BriefGroup[] {
  const groups: BriefGroup[] = [];
  for (const brief of briefs) {
    const last = groups.at(-1);
    if (last && last.date === brief.date) {
      last.briefs.push(brief);
    } else {
      groups.push({ briefs: [brief], date: brief.date });
    }
  }
  return groups;
}

/** First (newest) brief matching every provided criterion, or null when nothing matches. */
export function findBrief(
  briefs: BriefEntry[],
  criteria: { date?: string | null; kind?: string | null },
): BriefEntry | null {
  return (
    briefs.find(
      (brief) => (!criteria.date || brief.date === criteria.date) && (!criteria.kind || brief.kind === criteria.kind),
    ) ?? null
  );
}

function isHtmlResponse(response: Response) {
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

function isUpstreamDown(response: Response) {
  return response.status === 502 || response.status === 503 || response.status === 504;
}

/** Throws BriefLoadError for every failure, so an upstream outage is never shown as "no briefs". */
export async function loadBriefIndex(signal?: AbortSignal): Promise<BriefIndex> {
  const response = await fetch(`${BRIEFS_BASE}/index.json`, { cache: "no-cache", signal });
  if (response.status === 404) {
    throw new BriefLoadError("The brief server has no index.json (HTTP 404).");
  }
  if (isUpstreamDown(response)) {
    throw new BriefLoadError(`The brief server on macminim4 is unreachable (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new BriefLoadError(`Brief index request failed with HTTP ${response.status}.`);
  }
  if (isHtmlResponse(response)) {
    // The SPA fallback answered instead of the /briefs route: the proxy is not configured.
    throw new BriefLoadError("The /briefs route returned HTML instead of index.json; the proxy route is missing.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BriefLoadError("index.json is not valid JSON.");
  }
  return parseBriefIndex(payload);
}

export async function loadBriefMarkdown(file: string, signal?: AbortSignal): Promise<BriefDocument> {
  if (!FILE_PATTERN.test(file)) {
    throw new BriefLoadError(`Refusing to load unexpected brief path: ${file}`);
  }
  const response = await fetch(`${BRIEFS_BASE}/${file}`, { cache: "no-cache", signal });
  if (response.status === 404) {
    throw new BriefLoadError(`Brief file ${file} is listed in index.json but missing on the server.`);
  }
  if (isUpstreamDown(response)) {
    throw new BriefLoadError(`The brief server on macminim4 is unreachable (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new BriefLoadError(`Brief request for ${file} failed with HTTP ${response.status}.`);
  }
  if (isHtmlResponse(response)) {
    throw new BriefLoadError(`The /briefs route returned HTML for ${file}; the proxy route is missing.`);
  }
  return splitFrontmatter(await response.text());
}

const minute = 60 * 1000;

export const briefIndexQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => loadBriefIndex(signal),
    queryKey: ["briefs", "index"],
    refetchInterval: 5 * minute,
    refetchOnReconnect: true,
    staleTime: minute,
  });

export const briefMarkdownQueryOptions = (file: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadBriefMarkdown(file, signal),
    queryKey: ["briefs", "markdown", file],
    staleTime: 5 * minute,
  });
