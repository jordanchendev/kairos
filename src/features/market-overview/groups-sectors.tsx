// 族群強弱 (Thalassa group ranking history) and 類股漲跌 (TWSE sector indices).
import type { TwGroupRankingHistoryResponse, TwIndexDailyRow } from "@/api/thalassa/types.gen";
import { cn } from "@/lib/cn";

import { Sparkline } from "./charts";
import { gate, type Loadable } from "./loadable";
import { formatNumber, formatPct, groupsView, RANK_SESSIONS, sectorsView, signOf } from "./model";
import { Panel, Signed } from "./panel";

const pct = (value: number | null | undefined) => (value === null || value === undefined ? null : value * 100);

/** Relative-to-TAIEX bar: centred at zero, full width at ±20 points. */
function RelBar({ value }: { value: number | null }) {
  if (value === null) return null;
  const width = Math.min(Math.abs(value) / 20, 1) * 50;
  const sign = signOf(value);
  return (
    <span aria-hidden className="relative mr-1.5 inline-block h-2 w-14 rounded-sm bg-white/5 align-middle @max-2xl:hidden">
      <i
        className="absolute inset-y-0 rounded-sm"
        style={{
          background: sign === "up" ? "hsl(var(--trend-up) / 0.8)" : "hsl(var(--trend-down) / 0.8)",
          left: sign === "up" ? "50%" : `${50 - width}%`,
          width: `${width}%`,
        }}
      />
      <i className="absolute -inset-y-0.5 left-1/2 border-l border-[hsl(var(--border))]" />
    </span>
  );
}

export function GroupsPanel({ groups, referenceDate }: { groups: Loadable<TwGroupRankingHistoryResponse>; referenceDate: string | null }) {
  const state = gate(groups, groupsView);
  const view = state.status === "ready" ? state.view : null;
  const th = "h-[22px] whitespace-nowrap border-b border-[hsl(var(--border))] px-1.5 text-right text-[10.5px] font-medium text-[hsl(var(--muted-foreground))]";
  const td = "h-5 whitespace-nowrap border-b border-[hsl(var(--border)/0.45)] px-1.5 text-right tabular-nums";
  return (
    <Panel
      asOf={view?.date ?? null}
      className="@container @3xl:col-span-2"
      dateNote={view ? `表 ${view.tableVersion}` : undefined}
      gate={state}
      id="groups"
      referenceDate={referenceDate}
      title="族群強弱"
      titleExtra={
        view ? (
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
            加權指數 20 日 <Signed digits={1} pct value={pct(view.taiexRet20)} /> · 60 日 <Signed digits={1} pct value={pct(view.taiexRet60)} />
          </span>
        ) : null
      }
    >
      {view ? (
        <>
          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr>
                  <th className={th}>#</th>
                  <th className={cn(th, "text-left")}>族群</th>
                  <th className={cn(th, "@max-2xl:hidden")}>檔數</th>
                  <th className={th}>20 日</th>
                  <th className={cn(th, "@max-md:hidden")}>60 日</th>
                  <th className={th}>相對大盤 20 日</th>
                  <th className={cn(th, "@max-md:hidden")}>成交占比</th>
                  <th className={th}>占比變化</th>
                  <th className={cn(th, "w-[72px] @max-md:hidden")}>名次走勢</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr data-group={row.group} key={row.group}>
                    <td className={cn(td, "text-[hsl(var(--muted-foreground))]")}>{row.rank ?? "—"}</td>
                    <td className={cn(td, "max-w-[9rem] truncate text-left")} title={row.missing.length ? `缺 ${row.missing.join("、")}` : undefined}>
                      {row.group}
                    </td>
                    <td className={cn(td, "text-[hsl(var(--muted-foreground))] @max-2xl:hidden")}>{row.n_valid === row.n_members ? row.n_members : `${row.n_valid}/${row.n_members}`}</td>
                    <td className={td}>
                      <Signed digits={1} pct value={pct(row.ret20)} />
                    </td>
                    <td className={cn(td, "@max-md:hidden")}>
                      <Signed digits={1} pct value={pct(row.ret60)} />
                    </td>
                    <td className={td}>
                      <RelBar value={pct(row.rel20)} />
                      <Signed digits={1} value={pct(row.rel20)} />
                    </td>
                    <td className={cn(td, "@max-md:hidden")}>{row.turnover_share === null ? "—" : `${formatNumber(row.turnover_share * 100, 1)}%`}</td>
                    <td className={td}>
                      <Signed digits={1} pct value={pct(row.turnover_share_change)} />
                    </td>
                    <td className={cn(td, "@max-md:hidden")}>
                      <Sparkline invert label={`${row.group} 近 ${RANK_SESSIONS} 日名次`} values={row.rankSeries} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
            依過去 20／60 日報酬與成交占比排序的描述統計，不含預測。相對大盤＝族群 20 日報酬減加權指數（百分點）；名次走勢＝近 {RANK_SESSIONS} 個交易日的名次（越高越前）。
          </p>
        </>
      ) : null}
    </Panel>
  );
}

/** Tint grows with the move, capped at ±5 %, in the same up/down tokens. */
function tileBackground(value: number | null): string {
  const sign = signOf(value);
  if (sign === "flat" || value === null) return "hsl(var(--muted) / 0.6)";
  const alpha = 0.12 + Math.min(Math.abs(value) / 5, 1) * 0.28;
  return `hsl(var(${sign === "up" ? "--trend-up" : "--trend-down"}) / ${alpha.toFixed(2)})`;
}

export function SectorsPanel({ referenceDate, sectors }: { referenceDate: string | null; sectors: Loadable<TwIndexDailyRow[]> }) {
  const state = gate(sectors, sectorsView);
  const view = state.status === "ready" ? state.view : null;
  return (
    <Panel asOf={view?.date ?? null} gate={state} id="sectors" referenceDate={referenceDate} title={`類股漲跌（上市${view ? ` ${view.tiles.length} 類` : ""}）`}>
      {view ? (
        <div className="grid grid-cols-3 gap-[3px]">
          {view.tiles.map((tile) => (
            <div
              className="flex min-w-0 flex-col rounded-[3px] px-1.5 py-0.5 leading-tight"
              data-sector={tile.name}
              key={tile.name}
              style={{ background: tileBackground(tile.pct) }}
              title={`${tile.name} ${formatNumber(tile.close, 2)}`}
            >
              <span className="truncate text-[11px] text-[hsl(var(--foreground))]">{tile.name}</span>
              <span className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] tabular-nums" data-sign={signOf(tile.pct)}>
                  {formatPct(tile.pct)}
                </span>
                <Sparkline className="h-3 min-w-0 flex-1 text-[hsl(var(--foreground)/0.55)]" label={`${tile.name} 近 ${tile.series.length} 日`} values={tile.series.map((p) => p.value)} />
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
