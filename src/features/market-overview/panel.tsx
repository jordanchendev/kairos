import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import type { Gate } from "./loadable";
import { formatPct, formatSigned, staleNote, trendClass } from "./model";

type PanelProps = {
  /** the newest date the panel's numbers come from */
  asOf: string | null;
  children?: ReactNode;
  className?: string;
  /** extra text after the date, e.g. 「成交值 16:30 前為初值」 */
  dateNote?: ReactNode;
  gate: Gate<unknown>;
  id: string;
  /** the page's latest session; a panel behind it says so */
  referenceDate: string | null;
  title: ReactNode;
  titleExtra?: ReactNode;
};

/** Compact card: title, data date, stale note; loading, error and empty states in place of its body. */
export function Panel({ asOf, children, className, dateNote, gate, id, referenceDate, title, titleExtra }: PanelProps) {
  const stale = gate.status === "ready" ? staleNote(asOf, referenceDate) : null;
  return (
    <section
      className={cn("flex min-w-0 flex-col rounded-md border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] px-2.5 py-2", className)}
      data-panel={id}
      data-stale={stale ? "true" : undefined}
      data-state={gate.status}
    >
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="m-0 whitespace-nowrap text-[12.5px] font-semibold text-[hsl(var(--foreground))]">{title}</h2>
        {titleExtra}
        <span className="ml-auto whitespace-nowrap text-[10.5px] text-[hsl(var(--muted-foreground))]">
          {stale ? <span className="mr-1.5 text-amber-300">{stale}</span> : null}
          {gate.status === "ready" && asOf ? <time dateTime={asOf}>{asOf}</time> : null}
          {gate.status === "ready" && dateNote ? <span> · {dateNote}</span> : null}
        </span>
      </header>
      {gate.status === "ready" ? children : <PanelStatus gate={gate} />}
    </section>
  );
}

function PanelStatus({ gate }: { gate: Gate<unknown> }) {
  if (gate.status === "loading") {
    return <div aria-busy="true" className="min-h-[120px] flex-1 animate-pulse rounded bg-[hsl(var(--muted)/0.5)]" data-loading />;
  }
  if (gate.status === "error") {
    return (
      <div className="flex min-h-[120px] flex-1 flex-col justify-center gap-1 rounded border border-rose-500/30 bg-rose-500/8 px-3 py-2" role="alert">
        <span className="text-[12px] font-semibold text-rose-200">讀不到資料</span>
        <span className="break-words text-[11px] leading-snug text-rose-100/80">{gate.message}</span>
      </div>
    );
  }
  return (
    <div className="flex min-h-[120px] flex-1 items-center justify-center rounded border border-dashed border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))]">
      這段期間沒有資料
    </div>
  );
}

/** A number in the Taiwan up/down colours with its arrow. */
export function Signed({ className, digits = 0, pct = false, suffix = "", value }: { className?: string; digits?: number; pct?: boolean; suffix?: string; value: number | null | undefined }) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", trendClass(value), className)} data-sign={value === null || value === undefined ? "none" : value > 0 ? "up" : value < 0 ? "down" : "flat"}>
      {pct ? formatPct(value, digits) : formatSigned(value, digits, suffix)}
    </span>
  );
}

/** 「未接資料」: a series the page should show but no Thalassa route has yet (D-20261106-15). */
export function Unwired({ className, detail, label }: { className?: string; detail: string; label: string }) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-0.5 rounded border border-dashed border-[hsl(var(--border))] px-2 py-2 text-center", className)}
      data-unwired={label}
    >
      <span className="text-[11px] font-medium text-amber-300">{label}：未接資料</span>
      <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">{detail}</span>
    </div>
  );
}
