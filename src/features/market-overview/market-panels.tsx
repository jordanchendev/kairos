// The four chart panels of the first row and the futures panel.
import type { ReactNode } from "react";

import type { TaifexFuturesDailyRow, TwCreditMarketRow, TwMarketSummaryRow } from "@/api/thalassa/types.gen";

import { FLOW_COLORS, breadthOption, indexTurnoverOption, institutionalOption, marginOption } from "./chart-options";
import { PanelChart, Sparkline } from "./charts";
import { gate, type Loadable } from "./loadable";
import {
  breadthView,
  creditView,
  formatNumber,
  futuresView,
  institutionalView,
  shortDate,
  turnoverView,
  type Quote,
} from "./model";
import { Panel, Signed, Unwired } from "./panel";

const CHART_HEIGHT = 132;

function Kpi({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="mr-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">{label}</span>
      {children}
    </span>
  );
}

/** A tag that marks turnover TWSE has not revised yet (D-20261105-28: TWSE revises volume after 16:30). */
function Preliminary() {
  return (
    <span className="ml-1 rounded border border-amber-300/40 px-1 text-[10px] text-amber-300" data-preliminary="true">
      初值
    </span>
  );
}

type IndexTurnoverProps = { referenceDate: string | null; summary: Loadable<TwMarketSummaryRow[]>; taiex: Loadable<Quote | null> };

export function IndexTurnoverPanel({ referenceDate, summary, taiex }: IndexTurnoverProps) {
  const state = gate(taiex, (quote) => quote);
  const turnover = summary.status === "ready" ? turnoverView(summary.data) : null;
  const quote = state.status === "ready" ? state.view : null;
  return (
    <Panel asOf={quote?.date ?? null} dateNote="成交值 16:30 前為初值" gate={state} id="taiex" referenceDate={referenceDate} title="加權指數 · 成交金額">
      {quote ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[17px] font-semibold tabular-nums">{formatNumber(quote.close, 2)}</span>
            <Signed digits={2} value={quote.change} />
            <span>
              (<Signed digits={2} pct value={quote.pct} />)
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 text-[11.5px]">
            {turnover ? (
              <>
                <Kpi label="成交">
                  <span className="font-semibold tabular-nums">{formatNumber(turnover.yi)} 億</span>
                  {turnover.preliminary ? <Preliminary /> : null}
                </Kpi>
                <Kpi label="vs 前 5 日均">
                  <Signed digits={1} pct value={turnover.vsAvg5Pct} />
                </Kpi>
                {turnover.date !== quote.date ? <span className="text-amber-300">成交值為 {shortDate(turnover.date)}</span> : null}
              </>
            ) : (
              <span className="text-[hsl(var(--muted-foreground))]" data-turnover-missing>
                {summary.status === "error" ? `成交值讀不到（${summary.message}）` : summary.status === "loading" ? "成交值讀取中" : "成交值尚未公布"}
              </span>
            )}
          </div>
          <PanelChart
            height={CHART_HEIGHT}
            label="加權指數與成交值"
            option={() => indexTurnoverOption(quote.series, turnover?.series ?? [])}
            summary={`${quote.series.length} 個交易日收盤${turnover ? `、${turnover.series.length} 日成交值` : ""}`}
          />
        </>
      ) : null}
    </Panel>
  );
}

export function BreadthPanel({ referenceDate, summary }: { referenceDate: string | null; summary: Loadable<TwMarketSummaryRow[]> }) {
  const state = gate(summary, breadthView);
  const view = state.status === "ready" ? state.view : null;
  return (
    <Panel asOf={view?.date ?? null} gate={state} id="breadth" referenceDate={referenceDate} title="上市漲跌家數">
      {view ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2.5 text-[11.5px]">
            <Kpi label="上漲">
              <span className="trend-up text-[15px] font-semibold tabular-nums" data-sign="up">
                {view.up}
              </span>
            </Kpi>
            <Kpi label="下跌">
              <span className="trend-down text-[15px] font-semibold tabular-nums" data-sign="down">
                {view.down}
              </span>
            </Kpi>
            <Kpi label="上漲占比">
              <span className="tabular-nums">{formatNumber(view.upShare, 1)}%</span>
            </Kpi>
            <Kpi label="漲停 / 跌停">
              <span className="trend-up tabular-nums">{view.upLimit ?? "—"}</span> / <span className="trend-down tabular-nums">{view.downLimit ?? "—"}</span>
            </Kpi>
          </div>
          <PanelChart height={CHART_HEIGHT + 20} label="每日上漲與下跌家數" option={() => breadthOption(view.days)} summary={`${view.days.length} 個交易日的漲跌家數`} />
        </>
      ) : null}
    </Panel>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
      <i className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

export function InstitutionalPanel({ referenceDate, summary }: { referenceDate: string | null; summary: Loadable<TwMarketSummaryRow[]> }) {
  const state = gate(summary, institutionalView);
  const view = state.status === "ready" ? state.view : null;
  return (
    <Panel asOf={view?.date ?? null} gate={state} id="institutional" referenceDate={referenceDate} title="三大法人買賣超（上市，億）">
      {view ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2.5 text-[11.5px]">
            <Kpi label="外資">
              <Signed digits={1} value={view.foreign} />
            </Kpi>
            <Kpi label="投信">
              <Signed digits={1} value={view.trust} />
            </Kpi>
            <Kpi label="自營商">
              <Signed digits={1} value={view.dealer} />
            </Kpi>
            <Kpi label="合計">
              <Signed className="font-semibold" digits={1} value={view.total} />
            </Kpi>
          </div>
          <div className="flex justify-end gap-2">
            <Swatch color={FLOW_COLORS.foreign} label="外資" />
            <Swatch color={FLOW_COLORS.trust} label="投信" />
            <Swatch color={FLOW_COLORS.dealer} label="自營商" />
          </div>
          <PanelChart height={CHART_HEIGHT} label="三大法人每日買賣超" option={() => institutionalOption(view.days)} summary={`${view.days.length} 個交易日的法人買賣超`} />
        </>
      ) : null}
    </Panel>
  );
}

export function MarginPanel({ credit, referenceDate }: { credit: Loadable<TwCreditMarketRow[]>; referenceDate: string | null }) {
  const state = gate(credit, creditView);
  const view = state.status === "ready" ? state.view : null;
  return (
    <Panel asOf={view?.date ?? null} dateNote="晚間公布" gate={state} id="margin" referenceDate={referenceDate} title="上市融資金額 · 維持率（估算）">
      {view ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2.5 text-[11.5px]">
            <span className="text-[17px] font-semibold tabular-nums">{formatNumber(view.amountYi)} 億</span>
            <Signed digits={1} value={view.changeYi} />
            <Kpi label="維持率">
              <span className="tabular-nums">{formatNumber(view.ratio, 1)}%</span>
            </Kpi>
            {view.otcAmountYi !== null ? (
              <Kpi label="上櫃">
                <span className="tabular-nums">{formatNumber(view.otcAmountYi)} 億</span>
              </Kpi>
            ) : null}
          </div>
          <PanelChart height={CHART_HEIGHT + 20} label="融資金額與維持率估算" option={() => marginOption(view.days)} summary={`${view.days.length} 個交易日的融資金額`} />
        </>
      ) : null}
    </Panel>
  );
}

type FuturesProps = { futures: Loadable<TaifexFuturesDailyRow[]>; referenceDate: string | null; taiex: Quote | null };

export function FuturesPanel({ futures, referenceDate, taiex }: FuturesProps) {
  const state = gate(futures, (rows) => {
    const view = futuresView(rows, taiex);
    return view.day ? view : null;
  });
  const view = state.status === "ready" ? state.view : null;
  const day = view?.day ?? null;
  const night = view?.night ?? null;
  return (
    <Panel asOf={day?.date ?? null} gate={state} id="futures" referenceDate={referenceDate} title="期貨籌碼">
      {day ? (
        <div className="flex flex-1 flex-col gap-1.5">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">TX 日盤 {day.contract}</span>
              <span className="text-[17px] font-semibold tabular-nums">{formatNumber(day.close)}</span>
              <Signed value={day.change} />
              <span>
                (<Signed digits={2} pct value={day.pct} />)
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 text-[11px]">
              <Kpi label="對現貨">
                <Signed digits={0} value={day.basis} />
              </Kpi>
              <span className="text-[hsl(var(--muted-foreground))]">對 {formatNumber(day.prevSettlement)} 結算價</span>
            </div>
            <Sparkline label={`TX 日盤近 ${day.series.length} 日收盤`} values={day.series.map((point) => point.value)} />
          </div>
          {night ? (
            <div data-night-start={night.startDate ?? ""}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{night.startDate ? `${shortDate(night.startDate)} 夜盤` : "夜盤"}</span>
                <span className="font-semibold tabular-nums">{formatNumber(night.close)}</span>
                <Signed value={night.change} />
                <span>
                  (<Signed digits={2} pct value={night.pct} />)
                </span>
              </div>
              <div className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                對 {formatNumber(night.prevSettlement)} 結算價 · TAIFEX 記在 {shortDate(night.date)} 交易日
              </div>
              <Sparkline label={`TX 夜盤近 ${night.series.length} 日收盤`} values={night.series.map((point) => point.value)} />
            </div>
          ) : null}
          <Unwired className="min-h-[64px] flex-1" detail="Thalassa 目前沒有 TAIFEX 三大法人期貨部位" label="外資台指期淨未平倉" />
        </div>
      ) : null}
    </Panel>
  );
}
