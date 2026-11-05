import type { Board, Feed, Pipeline, PipelineState } from "@/api/ops/types.gen";

// Source of truth for the states: aquarium local_dev/scripts/strategy-bridge/stormtrooper/pipeline_status.py STATES.
export const STATE_ORDER: readonly PipelineState[] = ["failed", "late", "unknown", "running", "ok", "closed"];

/** The tick rewrites board.json every 5 minutes; three missed ticks mean the collector itself stopped. */
export const STALE_AFTER_MINUTES = 15;

export type Tone = "danger" | "neutral" | "ok" | "warning";

export class OpsBoardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpsBoardError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The board is a static file: a missing mount or an SPA fallback answers 200 with index.html, which the client
 * returns as text. Only an object with `now` and the two arrays is a board; feeds and notify may be absent.
 */
export function parseBoard(raw: unknown): Board {
  if (!isRecord(raw) || typeof raw.now !== "string" || !Array.isArray(raw.pipelines) || !Array.isArray(raw.needs_attention)) {
    throw new OpsBoardError("board.json 不是看板格式（Caddy 的 /ops 掛載可能還沒上線）");
  }
  return raw as Board;
}

export function stateRank(state: string): number {
  const rank = STATE_ORDER.indexOf(state as PipelineState);
  return rank === -1 ? STATE_ORDER.indexOf("unknown") : rank;
}

/** Red first, then by severity; the registry order is kept inside each group. */
export function sortPipelines(pipelines: readonly Pipeline[]): Pipeline[] {
  return pipelines
    .map((pipeline, index) => ({ index, pipeline }))
    .sort(
      (a, b) =>
        Number(b.pipeline.needs_attention) - Number(a.pipeline.needs_attention) ||
        stateRank(a.pipeline.state) - stateRank(b.pipeline.state) ||
        a.index - b.index,
    )
    .map((entry) => entry.pipeline);
}

export function stateTone(state: string, needsAttention: boolean): Tone {
  if (needsAttention || state === "failed") return "danger";
  if (state === "late" || state === "unknown") return "warning";
  if (state === "ok") return "ok";
  return "neutral";
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Whole minutes since the tick wrote the board; null when `now` is unreadable. */
export function boardAgeMinutes(board: Board, nowMs: number): number | null {
  const at = parseMs(board.now);
  return at === null ? null : Math.max(0, Math.floor((nowMs - at) / 60_000));
}

export function isStale(ageMinutes: number | null): boolean {
  return ageMinutes === null || ageMinutes > STALE_AFTER_MINUTES;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "11-05 06:30Z", the form the collector's reasons use. */
export function formatUtc(iso: string | null | undefined): string {
  const ms = parseMs(iso);
  if (ms === null) return "—";
  const d = new Date(ms);
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}

/** "台北 11-05 14:30" (Asia/Taipei has no DST: UTC+8 all year). */
export function formatTaipei(iso: string | null | undefined): string {
  const ms = parseMs(iso);
  if (ms === null) return "";
  const d = new Date(ms + 8 * 3_600_000);
  return `台北 ${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatRelative(iso: string | null | undefined, nowMs: number): string {
  const ms = parseMs(iso);
  if (ms === null) return "";
  const minutes = Math.round((nowMs - ms) / 60_000);
  const span = Math.abs(minutes);
  const suffix = minutes >= 0 ? "前" : "後";
  if (span < 1) return "剛剛";
  if (span < 60) return `${span} 分鐘${suffix}`;
  if (span < 48 * 60) return `${Math.floor(span / 60)} 小時${suffix}`;
  return `${Math.floor(span / 1440)} 天${suffix}`;
}

export type FeedView = { detail: string; title: string; tone: Tone };

export function feedView(feed: Feed | undefined): FeedView {
  if (!feed) {
    return { detail: "board.json 沒有 feeds.macminim4", title: "未提供", tone: "warning" };
  }
  if (feed.ok) {
    return { detail: `最後成功 ${formatUtc(feed.last_ok_at)}`, title: "正常", tone: "ok" };
  }
  const detail = feed.note ?? `自 ${formatUtc(feed.failing_since)} 起讀不到（${feed.error ?? "原因不明"}）`;
  return feed.long
    ? { detail, title: "中斷超過 60 分鐘", tone: "danger" }
    : { detail, title: "讀不到", tone: "warning" };
}
