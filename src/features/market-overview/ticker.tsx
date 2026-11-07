// The top of the page: system status pills, summary chips and the two-row quote ticker.
import type { ReactNode } from "react";

import { Link } from "react-router-dom";

import type { Board } from "@/api/ops/types.gen";
import { boardAgeMinutes, feedView, formatUtc, isStale } from "@/features/ops/model";
import { cn } from "@/lib/cn";

import { Sparkline } from "./charts";
import type { Gate, Loadable } from "./loadable";
import { formatNumber, shortDate, type Quote } from "./model";
import { Signed } from "./panel";

// ------------------------------------------------------------------------------------------------ status

function Pill({ children, tone }: { children: ReactNode; tone: "ok" | "warn" }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[hsl(var(--border))] bg-white/[0.02] px-2 text-[11px] text-[hsl(var(--muted-foreground))]" data-tone={tone}>
      <i className={cn("inline-block h-1.5 w-1.5 rounded-full", tone === "ok" ? "bg-emerald-400" : "bg-amber-300")} />
      {children}
    </span>
  );
}

const strong = "font-semibold text-[hsl(var(--foreground))]";

/** Compact pipeline status from /ops/board.json, the same file the 流水線狀態 page reads. */
export function StatusStrip({ board, nowMs }: { board: Loadable<Board>; nowMs: number }) {
  const link = (
    <Link className="text-[11px] text-[hsl(var(--accent))] hover:underline" to="/ops">
      流水線狀態 →
    </Link>
  );
  if (board.status !== "ready") {
    return (
      <div className="flex flex-wrap items-center gap-1" data-status-strip={board.status}>
        <Pill tone="warn">{board.status === "loading" ? "看板讀取中" : "看板讀不到"}</Pill>
        {link}
      </div>
    );
  }
  const attention = board.data.needs_attention.length;
  const feed = feedView(board.data.feeds?.macminim4);
  const age = boardAgeMinutes(board.data, nowMs);
  const stale = isStale(age);
  return (
    <div className="flex flex-wrap items-center gap-1" data-status-strip="ready">
      <Pill tone={attention ? "warn" : "ok"}>
        流水線 <b className={strong}>{attention} 條</b> 需要處理（共 {board.data.pipelines.length}）
      </Pill>
      <Pill tone={feed.tone === "ok" ? "ok" : "warn"}>
        macminim4 資料來源 <b className={strong}>{feed.title}</b>
      </Pill>
      <Pill tone={stale ? "warn" : "ok"}>
        看板 {formatUtc(board.data.now)}
        {stale ? <span className="text-amber-300">（{age === null ? "時間讀不出來" : `${age} 分鐘沒更新`}）</span> : null}
      </Pill>
      {link}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ chips

export type SummaryChip = { date: string | null; key: string; label: string; value: ReactNode };

export function SummaryChips({ chips }: { chips: readonly SummaryChip[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          className="inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-md border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] px-2 py-1 text-[11.5px]"
          data-chip={chip.key}
          key={chip.key}
        >
          <span className="text-[hsl(var(--muted-foreground))]">{chip.label}</span>
          {chip.value}
          {chip.date ? <span className="text-[10.5px] text-[hsl(var(--muted-foreground)/0.8)]">{shortDate(chip.date)}</span> : null}
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ ticker

export type TickerTile =
  | { digits: number; key: string; kind: "quote"; label: string; market: "tw" | "us"; quote: Gate<Quote> }
  | { key: string; kind: "unwired"; label: string };

const tileClass =
  "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-1.5 rounded-md border bg-[hsl(var(--card))] px-1.5 py-1";

function TileQuote({ referenceDate, tile }: { referenceDate: string | null; tile: Extract<TickerTile, { kind: "quote" }> }) {
  const state = tile.quote;
  if (state.status !== "ready") {
    const text = state.status === "loading" ? "讀取中" : state.status === "error" ? "讀不到" : "無資料";
    return (
      <div className={cn(tileClass, "border-[hsl(var(--border)/0.7)]")} data-state={state.status} data-tile={tile.key} title={state.status === "error" ? state.message : undefined}>
        <span className="truncate text-[11.5px] font-semibold">{tile.label}</span>
        <span className={cn("text-right text-[11px]", state.status === "error" ? "text-rose-300" : "text-[hsl(var(--muted-foreground))]")}>{text}</span>
        <span className={cn("col-span-2 h-[18px] rounded", state.status === "loading" && "animate-pulse bg-[hsl(var(--muted)/0.5)]")} />
      </div>
    );
  }
  const quote = state.view;
  const stale = tile.market === "tw" && referenceDate !== null && quote.date < referenceDate;
  return (
    <div
      className={cn(tileClass, stale ? "border-amber-300/50" : "border-[hsl(var(--border)/0.7)]")}
      data-stale={stale ? "true" : undefined}
      data-state="ready"
      data-tile={tile.key}
      title={`${tile.label} ${quote.date} 收盤`}
    >
      <span className="truncate text-[11.5px] font-semibold">{tile.label}</span>
      <span className="text-right text-[12px] font-semibold tabular-nums">{formatNumber(quote.close, tile.digits)}</span>
      <Sparkline label={`${tile.label} 近 ${quote.series.length} 日`} values={quote.series.map((point) => point.value)} />
      <span className="flex items-baseline justify-end gap-1 text-[11px]">
        {stale || tile.market === "us" ? (
          <span className={cn("text-[10px]", stale ? "text-amber-300" : "text-[hsl(var(--muted-foreground))]")}>
            {tile.market === "us" ? "美 " : ""}
            {shortDate(quote.date)}
          </span>
        ) : null}
        <Signed digits={2} pct value={quote.pct} />
      </span>
    </div>
  );
}

export function Ticker({ referenceDate, tiles }: { referenceDate: string | null; tiles: readonly TickerTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-1 @3xl:grid-cols-6 @7xl:grid-cols-9" data-ticker>
      {tiles.map((tile) =>
        tile.kind === "quote" ? (
          <TileQuote key={tile.key} referenceDate={referenceDate} tile={tile} />
        ) : (
          <div className={cn(tileClass, "border-[hsl(var(--border)/0.7)]")} data-tile={tile.key} data-unwired={tile.label} key={tile.key}>
            <span className="truncate text-[11.5px] font-semibold">{tile.label}</span>
            <span className="text-right text-[11px] text-amber-300">未接資料</span>
            <span className="col-span-2 text-[10.5px] text-[hsl(var(--muted-foreground))]">走勢與報價尚無來源</span>
          </div>
        ),
      )}
    </div>
  );
}
