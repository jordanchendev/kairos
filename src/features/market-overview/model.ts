// Pure derivations for 市場總覽: Thalassa rows in, panel numbers out. No fetching, no React.
import type {
  MarketIndexDailyRow,
  TaifexFuturesDailyRow,
  TwCreditMarketRow,
  TwGroupHistoryScore,
  TwGroupRankingHistoryResponse,
  TwIndexDailyRow,
  TwMarketDailyRow,
  TwMarketSummaryRow,
} from "@/api/thalassa/types.gen";

export const SESSIONS = 40;
/** Calendar days asked for so that SESSIONS trading days fit even across a long holiday. */
export const QUERY_CALENDAR_DAYS = 75;
/** Sessions of group rank history shown in the 名次走勢 column. */
export const RANK_SESSIONS = 10;
/** Enough calendar days for RANK_SESSIONS sessions even across the Lunar New Year closure (up to 9 days). */
const GROUP_QUERY_CALENDAR_DAYS = 30;
/** Aggregates of other sector indices (same list as the market brief's collect.py SECTOR_AGGREGATES). */
const SECTOR_AGGREGATES = new Set(["水泥窯製類指數", "塑膠化工類指數", "機電類指數", "化學生技醫療類指數"]);
const YI = 1e8;

export type Point = { date: string; value: number };

// ------------------------------------------------------------------------------------------------ dates

const taipeiDay = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Asia/Taipei", year: "numeric" });

/** The Taipei calendar date (YYYY-MM-DD) at nowMs. */
export function taipeiDate(nowMs: number): string {
  return taipeiDay.format(new Date(nowMs));
}

export function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export type DateRange = { end: string; start: string };

/** The range every 40-session query asks for, ending on today's Taipei date. */
export function sessionRange(nowMs: number): DateRange {
  const end = taipeiDate(nowMs);
  return { end, start: addDays(end, -QUERY_CALENDAR_DAYS) };
}

/** A shorter range for the group ranking history, which Thalassa computes per session (about 0.1 s each). */
export function groupRange(nowMs: number): DateRange {
  const end = taipeiDate(nowMs);
  return { end, start: addDays(end, -GROUP_QUERY_CALENDAR_DAYS) };
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function weekday(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

/** "11-06" */
export function shortDate(isoDate: string): string {
  return isoDate.slice(5, 10);
}

/** The panel's note when its newest row is older than the page's latest session. */
export function staleNote(panelDate: string | null, referenceDate: string | null): string | null {
  if (!panelDate || !referenceDate || panelDate >= referenceDate) return null;
  return `${shortDate(referenceDate)} 尚未公布`;
}

// ------------------------------------------------------------------------------------------------ numbers

export type Sign = "down" | "flat" | "up";

export function signOf(value: number | null | undefined): Sign {
  if (value === null || value === undefined || value === 0 || Number.isNaN(value)) return "flat";
  return value > 0 ? "up" : "down";
}

/** Taiwan convention through the --trend-up / --trend-down tokens: up red, down green. */
export function trendClass(value: number | null | undefined): string {
  const sign = signOf(value);
  return sign === "up" ? "trend-up" : sign === "down" ? "trend-down" : "text-[hsl(var(--muted-foreground))]";
}

const MINUS = "−";

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const text = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return value < 0 && text !== Number(0).toFixed(digits) ? `${MINUS}${text}` : text;
}

/** "▲+1,234.5" / "▼−1,234.5" / "0.0": the arrow stays, colour is a second signal. */
export function formatSigned(value: number | null | undefined, digits = 0, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const text = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  if (text === Number(0).toFixed(digits)) return `${text}${suffix}`;
  return value > 0 ? `▲+${text}${suffix}` : `▼${MINUS}${text}${suffix}`;
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  return formatSigned(value, digits, "%");
}

/** NT dollars to 億. */
export function toYi(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : value / YI;
}

// ------------------------------------------------------------------------------------------------ quotes

export type Quote = {
  change: number | null;
  close: number;
  date: string;
  pct: number | null;
  series: Point[];
};

/** Last close, its change against the session before and the last SESSIONS closes. Null when there is no row. */
export function quoteOf(points: readonly Point[]): Quote | null {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-SESSIONS);
  const last = sorted.at(-1);
  if (!last) return null;
  const prev = sorted.at(-2);
  const change = prev ? last.value - prev.value : null;
  return {
    change,
    close: last.value,
    date: last.date,
    pct: prev && change !== null && prev.value !== 0 ? (change / prev.value) * 100 : null,
    series: sorted,
  };
}

export function indexQuote(rows: readonly MarketIndexDailyRow[]): Quote | null {
  return quoteOf(rows.map((row) => ({ date: row.trade_date, value: row.close })));
}

export function stockQuote(rows: readonly TwMarketDailyRow[]): { name: string | null; quote: Quote | null } {
  const priced = rows.filter((row): row is TwMarketDailyRow & { close: number } => row.close !== null);
  const latest = [...rows].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return { name: latest?.name ?? null, quote: quoteOf(priced.map((row) => ({ date: row.date, value: row.close }))) };
}

// ------------------------------------------------------------------------------------------------ market summary

export function listedRows(rows: readonly TwMarketSummaryRow[]): TwMarketSummaryRow[] {
  return rows
    .filter((row) => row.market === "twse")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-SESSIONS);
}

/**
 * Turnover is the exchange's preliminary figure until TWSE revises it at 16:30 Taipei: a row not yet final whose
 * last fetch was before 16:30 of its own session carries the preliminary number.
 */
export function isPreliminaryTurnover(row: TwMarketSummaryRow): boolean {
  if (row.final || row.turnover === null) return false;
  const fetched = row.fetched_at ? Date.parse(row.fetched_at) : Number.NaN;
  const revisedFrom = Date.parse(`${row.date}T16:30:00+08:00`);
  return Number.isNaN(fetched) || fetched < revisedFrom;
}

export type TurnoverView = {
  avg5: number | null;
  date: string;
  preliminary: boolean;
  series: Point[];
  vsAvg5Pct: number | null;
  yi: number;
};

export function turnoverView(rows: readonly TwMarketSummaryRow[]): TurnoverView | null {
  const withTurnover = listedRows(rows).filter((row) => row.turnover !== null);
  const last = withTurnover.at(-1);
  if (!last || last.turnover === null) return null;
  const prior = withTurnover.slice(-6, -1).map((row) => row.turnover as number);
  const avg5 = prior.length === 5 ? prior.reduce((sum, v) => sum + v, 0) / 5 : null;
  return {
    avg5: toYi(avg5),
    date: last.date,
    preliminary: isPreliminaryTurnover(last),
    series: withTurnover.map((row) => ({ date: row.date, value: (row.turnover as number) / YI })),
    vsAvg5Pct: avg5 ? ((last.turnover - avg5) / avg5) * 100 : null,
    yi: last.turnover / YI,
  };
}

export type BreadthDay = { date: string; down: number; up: number };

export type BreadthView = {
  date: string;
  days: BreadthDay[];
  down: number;
  downLimit: number | null;
  up: number;
  upLimit: number | null;
  /** up / (up + down), in percent */
  upShare: number | null;
};

export function breadthView(rows: readonly TwMarketSummaryRow[]): BreadthView | null {
  const counted = listedRows(rows).filter((row) => row.up !== null && row.down !== null);
  const last = counted.at(-1);
  if (!last || last.up === null || last.down === null) return null;
  return {
    date: last.date,
    days: counted.map((row) => ({ date: row.date, down: row.down as number, up: row.up as number })),
    down: last.down,
    downLimit: last.down_limit,
    up: last.up,
    upLimit: last.up_limit,
    upShare: last.up + last.down > 0 ? (last.up / (last.up + last.down)) * 100 : null,
  };
}

export type FlowDay = { date: string; dealer: number; foreign: number; total: number; trust: number };

export type InstitutionalView = FlowDay & {
  days: FlowDay[];
  /** consecutive sessions, newest first, on which foreign investors were on the same side as today */
  foreignStreak: number;
};

export function institutionalView(rows: readonly TwMarketSummaryRow[]): InstitutionalView | null {
  const days: FlowDay[] = listedRows(rows).flatMap((row) =>
    row.institutional
      ? [
          {
            date: row.date,
            dealer: row.institutional.dealer.net / YI,
            foreign: row.institutional.foreign.net / YI,
            total: row.institutional.total.net / YI,
            trust: row.institutional.trust.net / YI,
          },
        ]
      : [],
  );
  const last = days.at(-1);
  if (!last) return null;
  const side = signOf(last.foreign);
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && side !== "flat" && signOf(days[i].foreign) === side; i -= 1) streak += 1;
  return { ...last, days, foreignStreak: streak };
}

// ------------------------------------------------------------------------------------------------ credit

export type CreditView = {
  amountYi: number;
  changeYi: number;
  date: string;
  days: { amountYi: number; date: string; ratio: number | null }[];
  otcAmountYi: number | null;
  ratio: number | null;
};

export function creditView(rows: readonly TwCreditMarketRow[]): CreditView | null {
  const listed = rows
    .filter((row) => row.market === "twse")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-SESSIONS);
  const last = listed.at(-1);
  if (!last) return null;
  const otc = rows.find((row) => row.market === "tpex" && row.date === last.date);
  return {
    amountYi: last.margin_amount / YI,
    changeYi: last.margin_amount_change / YI,
    date: last.date,
    days: listed.map((row) => ({ amountYi: row.margin_amount / YI, date: row.date, ratio: row.maintenance_ratio_estimate_pct })),
    otcAmountYi: otc ? otc.margin_amount / YI : null,
    ratio: last.maintenance_ratio_estimate_pct,
  };
}

// ------------------------------------------------------------------------------------------------ TX futures

export type FuturesQuote = Quote & { contract: string; prevSettlement: number | null };
export type FuturesView = {
  day: (FuturesQuote & { basis: number | null }) | null;
  /** date is TAIFEX's trading date; the session started on the evening of startDate */
  night: (FuturesQuote & { startDate: string | null }) | null;
};

type PricedRow = TaifexFuturesDailyRow & { close: number };

/** Per date, the session's most traded contract: the near month except around expiry. */
function mostTraded(rows: readonly TaifexFuturesDailyRow[], session: string): PricedRow[] {
  const byDate = new Map<string, PricedRow>();
  for (const row of rows) {
    if (row.session !== session || row.close === null) continue;
    const held = byDate.get(row.trade_date);
    if (!held || row.volume > held.volume) byDate.set(row.trade_date, row as PricedRow);
  }
  return [...byDate.values()].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
}

/** The settlement of `contract` on the last day session before `date`. */
function settlementBefore(rows: readonly TaifexFuturesDailyRow[], contract: string, date: string): number | null {
  let found: TaifexFuturesDailyRow | null = null;
  for (const row of rows) {
    if (row.session !== "day" || row.contract_month !== contract || row.trade_date >= date || row.settlement === null) continue;
    if (!found || row.trade_date > found.trade_date) found = row;
  }
  return found?.settlement ?? null;
}

function futuresQuote(picked: readonly PricedRow[], rows: readonly TaifexFuturesDailyRow[]): FuturesQuote | null {
  const last = picked.at(-1);
  if (!last) return null;
  const prevSettlement = settlementBefore(rows, last.contract_month, last.trade_date);
  const change = prevSettlement === null ? null : last.close - prevSettlement;
  return {
    change,
    close: last.close,
    contract: last.contract_month,
    date: last.trade_date,
    pct: prevSettlement && change !== null ? (change / prevSettlement) * 100 : null,
    prevSettlement,
    series: picked.slice(-SESSIONS).map((row) => ({ date: row.trade_date, value: row.close })),
  };
}

/**
 * TX day session against the previous settlement and its basis to TAIEX, and the latest night session. TAIFEX files
 * a night session under the next trading date; it starts on the evening of the day session before it.
 */
export function futuresView(rows: readonly TaifexFuturesDailyRow[], taiex: Quote | null): FuturesView {
  const tx = rows.filter((row) => row.product === "TX");
  const dayRows = mostTraded(tx, "day");
  const day = futuresQuote(dayRows, tx);
  const night = futuresQuote(mostTraded(tx, "night"), tx);
  const taiexOnDay = day ? taiex?.series.find((point) => point.date === day.date) : undefined;
  return {
    day: day ? { ...day, basis: taiexOnDay ? day.close - taiexOnDay.value : null } : null,
    night: night ? { ...night, startDate: dayRows.filter((row) => row.trade_date < night.date).at(-1)?.trade_date ?? null } : null,
  };
}

// ------------------------------------------------------------------------------------------------ groups

export type GroupRow = TwGroupHistoryScore & { rankSeries: (number | null)[] };

export type GroupsView = {
  date: string;
  /** sessions in each rankSeries: RANK_SESSIONS, or fewer when the range holds fewer */
  rankSessions: number;
  rows: GroupRow[];
  tableVersion: string;
  taiexRet20: number | null;
  taiexRet60: number | null;
};

export function groupsView(history: TwGroupRankingHistoryResponse): GroupsView | null {
  const days = [...history.days].sort((a, b) => a.date.localeCompare(b.date));
  const last = days.at(-1);
  if (!last) return null;
  const recent = days.slice(-RANK_SESSIONS);
  const rows = [...last.groups]
    .sort((a, b) => (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY))
    .map((group) => ({
      ...group,
      rankSeries: recent.map((day) => day.groups.find((g) => g.group === group.group)?.rank ?? null),
    }));
  return {
    date: last.date,
    rankSessions: recent.length,
    rows,
    tableVersion: history.table_version,
    taiexRet20: last.taiex.ret20 ?? null,
    taiexRet60: last.taiex.ret60 ?? null,
  };
}

// ------------------------------------------------------------------------------------------------ sectors

export type SectorTile = { close: number; name: string; pct: number | null; series: Point[] };
export type SectorsView = { date: string; tiles: SectorTile[] };

/** TWSE sector indices (名稱以「類指數」結尾，扣掉四個合併類), strongest first, on their latest date. */
export function sectorsView(rows: readonly TwIndexDailyRow[]): SectorsView | null {
  const sectors = rows.filter((row) => row.index_name.endsWith("類指數") && !SECTOR_AGGREGATES.has(row.index_name));
  const date = sectors.reduce<string | null>((max, row) => (max === null || row.date > max ? row.date : max), null);
  if (!date) return null;
  const tiles = sectors
    .filter((row) => row.date === date)
    .map((row) => ({
      close: row.close,
      name: row.index_name.replace(/類指數$/, ""),
      pct: row.change_pct,
      series: sectors
        .filter((other) => other.index_name === row.index_name)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-SESSIONS)
        .map((other) => ({ date: other.date, value: other.close })),
    }))
    .sort((a, b) => (b.pct ?? Number.NEGATIVE_INFINITY) - (a.pct ?? Number.NEGATIVE_INFINITY));
  return { date, tiles };
}
