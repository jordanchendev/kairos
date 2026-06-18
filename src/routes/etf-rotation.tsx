import { Suspense, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";

import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { EChartsShell, LazyECharts } from "@/features/risk/echarts-lazy";
import { cn } from "@/lib/cn";

type PairModel = {
  commonEnd?: string;
  commonStart?: string;
  commonTradingDays?: number;
  core: string;
  coverage?: {
    commonEnd?: string;
    commonStart?: string;
    commonTradingDays?: number;
  };
  currency?: string;
  defaultCapitalTwd?: number;
  key: string;
  label?: string;
  lev?: string;
  leveraged?: string;
  name?: string;
};

type HistoryPoint = {
  date: string;
  multiple?: number;
  value?: number;
};

type AllocationSegment = {
  cashWeight?: number;
  coreWeight?: number;
  end: string;
  leveragedWeight?: number;
  start: string;
  tradingDays?: number;
};

type SwitchEvent = {
  afterCashWeight?: number;
  afterCoreWeight?: number;
  afterLeveragedWeight?: number;
  beforeCashWeight?: number;
  beforeCoreWeight?: number;
  beforeLeveragedWeight?: number;
  date: string;
  daysSincePrevious?: null | number;
  reason?: string;
};

type HoldingSummary = {
  cashTradingDayRatio?: number;
  cashWeightedTradingDays?: number;
  coreTradingDayRatio?: number;
  coreWeightedTradingDays?: number;
  leveragedTradingDayRatio?: number;
  leveragedWeightedTradingDays?: number;
  totalTradingDays?: number;
};

type StrategyModel = {
  allocationSegments?: AllocationSegment[];
  alsoMatched?: string[];
  cagr: number;
  capitalTwd?: number;
  choice?: string;
  choiceName?: string;
  description?: string;
  finalMultiple?: number;
  holdingSummary?: HoldingSummary;
  history?: HistoryPoint[];
  id?: string;
  isBenchmark?: boolean;
  maxDrawdown?: number;
  maxdd?: number;
  metrics?: {
    years?: Record<string, number>;
  };
  mode?: string;
  name?: string;
  note?: string;
  pair?: string;
  pairKey?: string;
  pairName?: string;
  rule?: string;
  ruleLines?: string[];
  switches: number;
  switchEvents?: SwitchEvent[];
};

type ValidationBlock = {
  monteCarlo?: ValidationRow[];
  regimes?: ValidationRow[];
  rolling?: ValidationRow[];
};

type ValidationRow = {
  choice?: string;
  choiceName?: string;
  horizonYears?: number;
  medianDrawdown?: number;
  medianFinalMultiple?: number;
  medianMaxDrawdown?: number;
  medianMultiple?: number;
  p05FinalMultiple?: number;
  p05MaxDrawdown?: number;
  p05Multiple?: number;
  p50FinalMultiple?: number;
  p50Multiple?: number;
  p95FinalMultiple?: number;
  p95Multiple?: number;
  probabilityOfLoss?: number;
  regime?: string;
  ruinRate?: number;
  strategy?: string;
  winRate?: number;
  winRateVsCore?: number;
  worstDrawdown?: number;
  worstMaxDrawdown?: number;
  years?: number;
};

export type EtfRotationData = {
  generatedAt?: string;
  pairs: PairModel[];
  strategies: StrategyModel[];
  validation?: Record<string, ValidationBlock>;
};

type EtfRotationPageProps = {
  data: EtfRotationData;
};

type ChartMode = "history" | "projection";

const HORIZONS = [1, 3, 5, 7, 10] as const;
const DEFAULT_INITIAL_CAPITAL = 1_000_000;
const DEFAULT_MONTHLY_CONTRIBUTION = 0;
const dataUrl = `${import.meta.env.BASE_URL}etf-rotation/strategy-data.json`;

export function EtfRotationPage({ data }: EtfRotationPageProps) {
  const [selectedPairKey, setSelectedPairKey] = useState(data.pairs[0]?.key ?? "");
  const [chartMode, setChartMode] = useState<ChartMode>("history");
  const [initialCapital, setInitialCapital] = useState(DEFAULT_INITIAL_CAPITAL);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_MONTHLY_CONTRIBUTION);

  const selectedPair = data.pairs.find((pair) => pair.key === selectedPairKey) ?? data.pairs[0];
  const pairKey = selectedPair?.key ?? "";
  const pairStrategies = useMemo(() => getPairStrategies(data, pairKey), [data, pairKey]);
  const tableStrategies = useMemo(() => getStrategyRows(pairStrategies), [pairStrategies]);
  const chartStrategies = useMemo(() => getChartStrategies(pairStrategies), [pairStrategies]);
  const [selectedStrategyId, setSelectedStrategyId] = useState("");
  const selectedStrategy =
    tableStrategies.find((strategy) => getStrategyId(strategy) === selectedStrategyId) ?? tableStrategies[0] ?? chartStrategies[0];
  const validation = selectedPair ? data.validation?.[selectedPair.key] : undefined;
  const summary = buildSummary(pairStrategies, chartStrategies, initialCapital, monthlyContribution);

  if (!selectedPair) {
    return <ErrorState message="ETF rotation strategy data does not include any strategy pairs." title="ETF data missing" />;
  }

  return (
    <section className="space-y-6" data-page-id="etf-rotation">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">ETF Rotation</h1>
          <p className="max-w-4xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            將 Poseidon ETF 輪動研究嵌入 Kairos：策略對、全歷史回測、未來推估與三層驗證集中在同一頁。
          </p>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Generated</div>
          <div className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{formatDate(data.generatedAt)}</div>
        </div>
      </div>

      <PanelFrame
        description="調整起始資金、月投入與顯示模式，策略數值會用同一組參數重新估算。"
        eyebrow="Controls"
        title="策略篩選"
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="策略對">
            <select
              className="w-full rounded-[16px] border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-[hsl(var(--foreground))] outline-none transition focus:border-cyan-300/60"
              onChange={(event) => setSelectedPairKey(event.target.value)}
              value={pairKey}
            >
              {data.pairs.map((pair) => (
                <option key={pair.key} value={pair.key}>
                  {getPairLabel(pair)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="圖表模式">
            <select
              className="w-full rounded-[16px] border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-[hsl(var(--foreground))] outline-none transition focus:border-cyan-300/60"
              onChange={(event) => setChartMode(event.target.value as ChartMode)}
              value={chartMode}
            >
              <option value="history">歷史回測</option>
              <option value="projection">未來推估</option>
            </select>
          </Field>
          <Field label="起始金額 TWD">
            <NumberInput onChange={setInitialCapital} value={initialCapital} />
          </Field>
          <Field label="每月再投入 TWD">
            <NumberInput onChange={setMonthlyContribution} value={monthlyContribution} />
          </Field>
        </div>
      </PanelFrame>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="顯示策略" value={String(tableStrategies.length)} />
        <MetricCard label="總投入成本" value={formatMoney(calculateTotalContributed(initialCapital, monthlyContribution, 10))} />
        <MetricCard label="最高全期間 CAGR" value={formatPercent(summary.bestCagr)} />
        <MetricCard label={chartMode === "history" ? "最高歷史終值" : "最高 10 年預估"} value={formatMoney(summary.bestTerminalValue)} />
        <MetricCard label="最小回撤" tone="risk" value={formatPercent(summary.lowestDrawdown)} />
      </div>

      <EtfRotationChart
        chartMode={chartMode}
        initialCapital={initialCapital}
        monthlyContribution={monthlyContribution}
        pair={selectedPair}
        strategies={chartStrategies}
      />

      <SelectedStrategyPanel
        initialCapital={initialCapital}
        onSelectStrategy={setSelectedStrategyId}
        pair={selectedPair}
        selectedStrategy={selectedStrategy}
        strategies={tableStrategies}
      />

      <ValidationPanel strategies={chartStrategies} validation={validation} />

      <StrategyTable
        chartMode={chartMode}
        initialCapital={initialCapital}
        monthlyContribution={monthlyContribution}
        strategies={pairStrategies}
      />
    </section>
  );
}

export function Component() {
  const dataQuery = useQuery({
    queryFn: async () => {
      const response = await globalThis.fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`ETF rotation data request failed: ${response.status}`);
      }
      return (await response.json()) as EtfRotationData;
    },
    queryKey: ["etf-rotation", "strategy-data"],
    staleTime: 5 * 60 * 1000,
  });

  if (dataQuery.isPending) {
    return <div className="panel-surface h-[34rem] animate-pulse rounded-[28px]" />;
  }

  if (dataQuery.error) {
    return (
      <ErrorState
        message={dataQuery.error instanceof Error ? dataQuery.error.message : "ETF rotation data could not be loaded."}
        title="ETF Rotation data unavailable"
      />
    );
  }

  return <EtfRotationPage data={dataQuery.data} />;
}

function EtfRotationChart({
  chartMode,
  initialCapital,
  monthlyContribution,
  pair,
  strategies,
}: {
  chartMode: ChartMode;
  initialCapital: number;
  monthlyContribution: number;
  pair: PairModel;
  strategies: StrategyModel[];
}) {
  const option = useMemo(
    () => createChartOption(strategies, chartMode, initialCapital, monthlyContribution),
    [chartMode, initialCapital, monthlyContribution, strategies],
  );

  return (
    <div data-etf-rotation-chart>
      <EChartsShell
        description={
          chartMode === "history"
            ? "依策略歷史曲線顯示，同時保留核心與槓桿基準線。"
            : "依全期間 CAGR 外推，包含起始資金與每月投入。"
        }
        eyebrow={getPairLabel(pair)}
        title={chartMode === "history" ? "歷史回測資產曲線" : "資產曲線預估"}
      >
        {typeof window === "undefined" ? (
          <ChartFallback chartMode={chartMode} initialCapital={initialCapital} monthlyContribution={monthlyContribution} strategies={strategies} />
        ) : (
          <Suspense fallback={<ChartFallback chartMode={chartMode} initialCapital={initialCapital} monthlyContribution={monthlyContribution} strategies={strategies} />}>
            <LazyECharts notMerge option={option} style={{ height: 430, width: "100%" }} />
          </Suspense>
        )}
      </EChartsShell>
    </div>
  );
}

function SelectedStrategyPanel({
  initialCapital,
  onSelectStrategy,
  pair,
  selectedStrategy,
  strategies,
}: {
  initialCapital: number;
  onSelectStrategy: (strategyId: string) => void;
  pair: PairModel;
  selectedStrategy?: StrategyModel;
  strategies: StrategyModel[];
}) {
  if (!selectedStrategy) {
    return null;
  }

  const holdingSummary = selectedStrategy.holdingSummary;

  return (
    <PanelFrame
      description="直接切換單一策略，檢查歷史持倉區間、核心與槓桿 ETF 的持有天數比例，以及每次觸發換手的原因。"
      eyebrow="Selected Strategy"
      title={`已選策略：${getStrategyName(selectedStrategy)}`}
    >
      <div className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_repeat(2,minmax(180px,220px))]">
          <Field label="已選策略">
            <select
              className="w-full rounded-[16px] border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-[hsl(var(--foreground))] outline-none transition focus:border-cyan-300/60"
              onChange={(event) => onSelectStrategy(event.target.value)}
              value={getStrategyId(selectedStrategy)}
            >
              {strategies.map((strategy) => (
                <option key={getStrategyId(strategy)} value={getStrategyId(strategy)}>
                  {getStrategyName(strategy)} · CAGR {formatPercent(strategy.cagr)} · MaxDD {formatPercent(getDrawdown(strategy))}
                </option>
              ))}
            </select>
          </Field>
          <HoldingCard label={pair.core} ratio={holdingSummary?.coreTradingDayRatio} tradingDays={holdingSummary?.coreWeightedTradingDays} />
          <HoldingCard
            label={pair.leveraged ?? pair.lev ?? "槓桿 ETF"}
            ratio={holdingSummary?.leveragedTradingDayRatio}
            tradingDays={holdingSummary?.leveragedWeightedTradingDays}
          />
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">持有天數比例</div>
        <SelectedStrategyChart initialCapital={initialCapital} pair={pair} strategy={selectedStrategy} />
        <SwitchEventTable pair={pair} strategy={selectedStrategy} />
      </div>
    </PanelFrame>
  );
}

function HoldingCard({ label, ratio, tradingDays }: { label: string; ratio?: number; tradingDays?: number }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/4 p-4">
      <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{label}</div>
      <div className="mt-2 text-sm tabular-nums text-[hsl(var(--muted-foreground))]">
        {formatTradingDays(tradingDays)} 個交易日 · {formatPercent(ratio)}
      </div>
    </div>
  );
}

function SelectedStrategyChart({ initialCapital, pair, strategy }: { initialCapital: number; pair: PairModel; strategy: StrategyModel }) {
  const option = useMemo(() => createSelectedStrategyOption(strategy, pair, initialCapital), [initialCapital, pair, strategy]);

  return (
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4">
      {typeof window === "undefined" ? (
        <ChartFallback chartMode="history" initialCapital={initialCapital} monthlyContribution={0} strategies={[strategy]} />
      ) : (
        <Suspense fallback={<ChartFallback chartMode="history" initialCapital={initialCapital} monthlyContribution={0} strategies={[strategy]} />}>
          <LazyECharts notMerge option={option} style={{ height: 360, width: "100%" }} />
        </Suspense>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
        <LegendPill color="bg-teal-400" label="核心 ETF 持有為主" />
        <LegendPill color="bg-amber-500" label="槓桿 ETF 持有為主" />
        <LegendPill color="bg-slate-400" label="現金持有為主" />
      </div>
    </div>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-6 rounded-full", color)} />
      {label}
    </span>
  );
}

function SwitchEventTable({ pair, strategy }: { pair: PairModel; strategy: StrategyModel }) {
  const events = strategy.switchEvents ?? [];

  return (
    <div className="overflow-x-auto rounded-[22px] border border-white/10">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead>
          <tr className="bg-emerald-950/40 text-[hsl(var(--foreground))]">
            <th className="px-4 py-3 font-semibold">日期</th>
            <th className="px-4 py-3 font-semibold">觸發原因</th>
            <th className="px-4 py-3 font-semibold">切換前</th>
            <th className="px-4 py-3 font-semibold">切換後</th>
            <th className="px-4 py-3 text-right font-semibold">間隔</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {events.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-[hsl(var(--muted-foreground))]" colSpan={5}>
                這個策略沒有切換事件。
              </td>
            </tr>
          ) : (
            events.map((event, index) => (
              <tr key={`${event.date}-${index}`}>
                <td className="px-4 py-3 tabular-nums text-[hsl(var(--foreground))]">{event.date}</td>
                <td className="px-4 py-3 text-[hsl(var(--foreground))]">{event.reason ?? "未提供"}</td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{formatWeightMix(event, "before", pair)}</td>
                <td className="px-4 py-3 text-[hsl(var(--foreground))]">{formatWeightMix(event, "after", pair)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                  {event.daysSincePrevious == null ? "-" : `${event.daysSincePrevious} 天`}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StrategyTable({
  chartMode,
  initialCapital,
  monthlyContribution,
  strategies,
}: {
  chartMode: ChartMode;
  initialCapital: number;
  monthlyContribution: number;
  strategies: StrategyModel[];
}) {
  const rows = useMemo(() => getStrategyRows(strategies), [strategies]);

  return (
    <PanelFrame
      description="同名規則會合併顯示；金額欄位會依目前圖表模式切換成歷史終值或未來推估。"
      eyebrow="Strategy Table"
      title="策略表"
    >
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--foreground))]">
              <Th>策略</Th>
              <Th className="min-w-[360px]">規則</Th>
              <Th>全期間 CAGR</Th>
              <Th>MaxDD</Th>
              <Th>轉換</Th>
              {HORIZONS.map((year) => (
                <Th key={year}>{chartMode === "history" ? `近 ${year} 年` : `${year} 年`}</Th>
              ))}
              <Th className="min-w-[220px]">備註</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((strategy) => (
              <tr className="border-b border-white/8" key={getStrategyId(strategy)}>
                <Td className="font-semibold text-[hsl(var(--foreground))]">{getStrategyName(strategy)}</Td>
                <Td>
                  <ul className="space-y-1.5">
                    {getRuleLines(strategy).map((line) => (
                      <li className="flex gap-2" key={line}>
                        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </Td>
                <Td>{formatPercent(strategy.cagr)}</Td>
                <Td className="text-rose-200">{formatPercent(getDrawdown(strategy))}</Td>
                <Td>{strategy.switches}</Td>
                {HORIZONS.map((year) => (
                  <Td key={year}>{formatMoney(getHorizonValue(strategy, year, chartMode, initialCapital, monthlyContribution))}</Td>
                ))}
                <Td>{strategy.description ?? strategy.note ?? "歷史回測代表策略。"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelFrame>
  );
}

function ValidationPanel({ strategies, validation }: { strategies: StrategyModel[]; validation?: ValidationBlock }) {
  const selectedChoices = new Set(strategies.map((strategy) => strategy.choice ?? strategy.id ?? getStrategyName(strategy)));

  return (
    <PanelFrame
      description="檢查同一批策略在不同進場月份、市況抽樣與蒙地卡羅路徑下是否仍穩定。"
      eyebrow="Validation"
      title="三層驗證"
    >
      {!validation ? (
        <div className="rounded-[20px] border border-white/10 bg-white/4 p-4 text-sm text-[hsl(var(--muted-foreground))]">
          這個策略對沒有 validation JSON。
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <ValidationTable
            columns={["年", "中位", "P05", "勝率", "最差DD"]}
            rows={pickRollingRows(validation.rolling, selectedChoices)}
            title="滾動進場"
            values={(row) => [
              String(row.horizonYears ?? row.years ?? "10"),
              formatMultiple(row.medianFinalMultiple ?? row.medianMultiple),
              formatMultiple(row.p05FinalMultiple ?? row.p05Multiple),
              formatPercent(row.winRateVsCore ?? row.winRate),
              formatPercent(row.worstMaxDrawdown ?? row.worstDrawdown),
            ]}
          />
          <ValidationTable
            columns={["市況", "中位", "P05", "勝率", "最差DD"]}
            rows={pickRows(validation.regimes, selectedChoices)}
            title="市況分組"
            values={(row) => [
              row.regime ?? "整體",
              formatMultiple(row.medianFinalMultiple ?? row.medianMultiple),
              formatMultiple(row.p05FinalMultiple ?? row.p05Multiple),
              formatPercent(row.winRateVsCore ?? row.winRate),
              formatPercent(row.worstMaxDrawdown ?? row.worstDrawdown),
            ]}
          />
          <ValidationTable
            columns={["P50", "P05", "P95", "虧損", "中位DD"]}
            rows={pickRows(validation.monteCarlo, selectedChoices)}
            title="蒙地卡羅"
            values={(row) => [
              formatMultiple(row.p50FinalMultiple ?? row.p50Multiple),
              formatMultiple(row.p05FinalMultiple ?? row.p05Multiple),
              formatMultiple(row.p95FinalMultiple ?? row.p95Multiple),
              formatPercent(row.probabilityOfLoss ?? row.ruinRate),
              formatPercent(row.medianMaxDrawdown ?? row.medianDrawdown),
            ]}
          />
        </div>
      )}
    </PanelFrame>
  );
}

function ValidationTable({
  columns,
  rows,
  title,
  values,
}: {
  columns: string[];
  rows: ValidationRow[];
  title: string;
  values: (row: ValidationRow) => string[];
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/4 p-4">
      <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="py-2 pr-3">策略</th>
              {columns.map((column) => (
                <th className="py-2 pr-3" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {rows.length === 0 ? (
              <tr>
                <td className="py-3 text-[hsl(var(--muted-foreground))]" colSpan={columns.length + 1}>
                  目前沒有可對應的驗證資料。
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.choice ?? row.strategy ?? index}-${title}`}>
                  <td className="py-2 pr-3 font-semibold text-[hsl(var(--foreground))]">{row.choiceName ?? row.strategy ?? "strategy"}</td>
                  {values(row).map((value, valueIndex) => (
                    <td className="py-2 pr-3 tabular-nums text-[hsl(var(--foreground))]" key={`${value}-${valueIndex}`}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ onChange, value }: { onChange: (value: number) => void; value: number }) {
  return (
    <input
      className="w-full rounded-[16px] border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-semibold tabular-nums text-[hsl(var(--foreground))] outline-none transition focus:border-cyan-300/60"
      min={0}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      type="number"
      value={value}
    />
  );
}

function MetricCard({ label, tone = "default", value }: { label: string; tone?: "default" | "risk"; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/4 p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{label}</div>
      <div className={cn("mt-3 text-2xl font-semibold tabular-nums text-[hsl(var(--foreground))]", tone === "risk" && "text-rose-200")}>
        {value}
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-white/10 bg-emerald-950/40 px-4 py-3 font-semibold", className)}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-white/8 px-4 py-4 align-top text-[hsl(var(--foreground))]", className)}>{children}</td>;
}

function ChartFallback({
  chartMode,
  initialCapital,
  monthlyContribution,
  strategies,
}: {
  chartMode: ChartMode;
  initialCapital: number;
  monthlyContribution: number;
  strategies: StrategyModel[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {strategies.slice(0, 6).map((strategy) => (
        <div className="rounded-[18px] border border-white/10 bg-white/4 p-4" key={getStrategyId(strategy)}>
          <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{getStrategyName(strategy)}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-cyan-100">
            {formatMoney(getHorizonValue(strategy, 10, chartMode, initialCapital, monthlyContribution))}
          </div>
        </div>
      ))}
    </div>
  );
}

function createChartOption(
  strategies: StrategyModel[],
  chartMode: ChartMode,
  initialCapital: number,
  monthlyContribution: number,
): EChartsOption {
  return {
    animation: false,
    backgroundColor: "transparent",
    grid: {
      bottom: 60,
      left: 86,
      right: 24,
      top: 28,
    },
    legend: {
      bottom: 0,
      data: strategies.map(getStrategyName),
      textStyle: {
        color: "rgba(248,250,252,0.72)",
      },
      type: "scroll",
    },
    series: strategies.map((strategy) => ({
      data: getChartSeriesData(strategy, chartMode, initialCapital, monthlyContribution),
      emphasis: {
        focus: "series",
      },
      name: getStrategyName(strategy),
      showSymbol: false,
      smooth: chartMode === "projection",
      type: "line",
    })),
    textStyle: {
      color: "#F8FAFC",
      fontFamily: "Fira Sans, sans-serif",
    },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      textStyle: {
        color: "#F8FAFC",
      },
      trigger: "axis",
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    xAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.68)",
      },
      axisLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.2)",
        },
      },
      type: "time",
    },
    yAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.68)",
        formatter: (value: number) => compactMoney(value),
      },
      name: "TWD",
      nameTextStyle: {
        color: "rgba(248,250,252,0.72)",
        fontWeight: 600,
      },
      splitLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.16)",
        },
      },
      type: "value",
    },
  };
}

function createSelectedStrategyOption(strategy: StrategyModel, pair: PairModel, initialCapital: number): EChartsOption {
  const historyData = (strategy.history ?? []).map((point) => [point.date, historyPointValue(point, initialCapital)]);

  return {
    animation: false,
    backgroundColor: "transparent",
    grid: {
      bottom: 36,
      left: 92,
      right: 28,
      top: 26,
    },
    series: [
      {
        data: historyData,
        lineStyle: {
          color: "#67E8F9",
          width: 3,
        },
        markArea: {
          data: (strategy.allocationSegments ?? []).map((segment) => [
            {
              itemStyle: {
                color: getSegmentColor(segment),
              },
              xAxis: segment.start,
            },
            {
              xAxis: segment.end,
            },
          ]),
          silent: true,
        },
        name: getStrategyName(strategy),
        showSymbol: false,
        type: "line",
      },
    ],
    textStyle: {
      color: "#F8FAFC",
      fontFamily: "Fira Sans, sans-serif",
    },
    tooltip: {
      backgroundColor: "#0F172A",
      borderColor: "rgba(248,250,252,0.12)",
      formatter: (params) => formatSelectedTooltip(params, pair),
      textStyle: {
        color: "#F8FAFC",
      },
      trigger: "axis",
    },
    xAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.68)",
      },
      axisLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.2)",
        },
      },
      type: "time",
    },
    yAxis: {
      axisLabel: {
        color: "rgba(248,250,252,0.68)",
        formatter: (value: number) => compactMoney(value),
      },
      name: "TWD",
      nameTextStyle: {
        color: "rgba(248,250,252,0.72)",
        fontWeight: 600,
      },
      scale: true,
      splitLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.16)",
        },
      },
      type: "value",
    },
  };
}

function getChartSeriesData(strategy: StrategyModel, chartMode: ChartMode, initialCapital: number, monthlyContribution: number) {
  if (chartMode === "history") {
    return (strategy.history ?? []).map((point) => [point.date, historyPointValue(point, initialCapital)]);
  }

  const start = new Date();
  return Array.from({ length: 121 }, (_, month) => {
    const date = new Date(start.getFullYear(), start.getMonth() + month, 1);
    return [date.toISOString().slice(0, 10), projectValue(strategy.cagr, initialCapital, monthlyContribution, month)];
  });
}

function getPairStrategies(data: EtfRotationData, pairKey: string) {
  return data.strategies.filter((strategy) => (strategy.pair ?? strategy.pairKey) === pairKey);
}

function getStrategyRows(strategies: StrategyModel[]) {
  const seen = new Set<string>();
  return [...strategies]
    .sort((a, b) => Number(Boolean(b.isBenchmark)) - Number(Boolean(a.isBenchmark)) || b.cagr - a.cagr)
    .filter((strategy) => {
      const key = strategy.choice ?? strategy.id ?? getStrategyName(strategy);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function getChartStrategies(strategies: StrategyModel[]) {
  return getStrategyRows(strategies).slice(0, 12);
}

function buildSummary(
  pairStrategies: StrategyModel[],
  visibleStrategies: StrategyModel[],
  initialCapital: number,
  monthlyContribution: number,
) {
  const all = pairStrategies.length ? pairStrategies : visibleStrategies;
  const bestCagr = all.length ? Math.max(...all.map((strategy) => strategy.cagr)) : 0;
  const bestTerminalValue = visibleStrategies.length
    ? Math.max(...visibleStrategies.map((strategy) => getHorizonValue(strategy, 10, "projection", initialCapital, monthlyContribution)))
    : 0;
  const lowestDrawdown = all.length ? Math.min(...all.map(getDrawdown)) : 0;
  return {
    bestCagr,
    bestTerminalValue,
    lowestDrawdown,
  };
}

function getPairLabel(pair: PairModel) {
  return pair.label ?? pair.name ?? `${pair.core} / ${pair.leveraged ?? pair.lev}`;
}

function getStrategyId(strategy: StrategyModel) {
  return strategy.id ?? strategy.choice ?? `${strategy.pair}-${getStrategyName(strategy)}`;
}

function getStrategyName(strategy: StrategyModel) {
  return strategy.choiceName ?? strategy.name ?? "未命名策略";
}

function getDrawdown(strategy: StrategyModel) {
  return strategy.maxdd ?? strategy.maxDrawdown ?? 0;
}

function getRuleLines(strategy: StrategyModel) {
  if (strategy.ruleLines?.length) {
    return strategy.ruleLines;
  }
  if (!strategy.rule) {
    return ["規則尚未提供。"];
  }
  return strategy.rule.split(/[；;]/).map((line) => line.trim()).filter(Boolean);
}

function getHorizonValue(
  strategy: StrategyModel,
  year: number,
  chartMode: ChartMode,
  initialCapital: number,
  monthlyContribution: number,
) {
  if (chartMode === "history") {
    return getHistoricalValue(strategy, year, initialCapital);
  }
  return projectValue(strategy.cagr, initialCapital, monthlyContribution, year * 12);
}

function getHistoricalValue(strategy: StrategyModel, year: number, initialCapital: number) {
  const history = strategy.history ?? [];
  if (history.length === 0) {
    return (strategy.finalMultiple ?? 1) * initialCapital;
  }
  const points = Math.min(history.length - 1, year * 12);
  return historyPointValue(history[points], initialCapital);
}

function historyPointValue(point: HistoryPoint, initialCapital: number) {
  return point.value ?? (point.multiple ?? 1) * initialCapital;
}

function projectValue(cagr: number, initialCapital: number, monthlyContribution: number, months: number) {
  const monthlyRate = Math.pow(1 + cagr, 1 / 12) - 1;
  let value = initialCapital;
  for (let month = 0; month < months; month += 1) {
    value *= 1 + monthlyRate;
    value += monthlyContribution;
  }
  return value;
}

function calculateTotalContributed(initialCapital: number, monthlyContribution: number, years: number) {
  return initialCapital + monthlyContribution * years * 12;
}

function pickRollingRows(rows: ValidationRow[] | undefined, selectedChoices: Set<string>) {
  return pickRows(rows?.filter((row) => (row.horizonYears ?? row.years) === 10), selectedChoices);
}

function pickRows(rows: ValidationRow[] | undefined, selectedChoices: Set<string>) {
  return (rows ?? [])
    .filter((row) => selectedChoices.has(row.choice ?? row.strategy ?? ""))
    .filter((row, index, all) => all.findIndex((candidate) => (candidate.choice ?? candidate.strategy) === (row.choice ?? row.strategy)) === index)
    .slice(0, 5);
}

function formatDate(value?: string) {
  if (!value) {
    return "unknown";
  }
  return value.slice(0, 10);
}

function formatMoney(value: number | undefined) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? Number(value) : 0);
}

function compactMoney(value: number) {
  if (Math.abs(value) >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}億`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${(value / 10_000).toFixed(0)}萬`;
  }
  return formatMoney(value);
}

function formatPercent(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function formatMultiple(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return `${value.toFixed(2)}x`;
}

function formatTradingDays(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatWeight(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function formatWeightMix(event: SwitchEvent, phase: "after" | "before", pair: PairModel) {
  const core = phase === "before" ? event.beforeCoreWeight : event.afterCoreWeight;
  const leveraged = phase === "before" ? event.beforeLeveragedWeight : event.afterLeveragedWeight;
  const cash = phase === "before" ? event.beforeCashWeight : event.afterCashWeight;
  const parts = [`${formatWeight(core)} ${pair.core}`, `${formatWeight(leveraged)} ${pair.leveraged ?? pair.lev ?? "槓桿"}`];
  if ((cash ?? 0) > 0) {
    parts.push(`${formatWeight(cash)} 現金`);
  }
  return parts.join(" / ");
}

function getSegmentColor(segment: AllocationSegment) {
  const core = segment.coreWeight ?? 0;
  const leveraged = segment.leveragedWeight ?? 0;
  const cash = segment.cashWeight ?? 0;
  if (cash >= core && cash >= leveraged) {
    return "rgba(148,163,184,0.16)";
  }
  if (leveraged > core) {
    return "rgba(245,158,11,0.22)";
  }
  return "rgba(45,212,191,0.16)";
}

function formatSelectedTooltip(params: unknown, pair: PairModel) {
  const rows = Array.isArray(params) ? params : [params];
  const first = rows[0] as { axisValueLabel?: string; value?: unknown[] } | undefined;
  const value = first?.value;
  const date = first?.axisValueLabel ?? (Array.isArray(value) ? String(value[0]) : "");
  const amount = Array.isArray(value) ? formatMoney(Number(value[1])) : "n/a";
  return [
    `<strong>${date}</strong>`,
    `<span style="color:#67E8F9">●</span> ${pair.core}/${pair.leveraged ?? pair.lev ?? "槓桿"} 策略：<strong>${amount}</strong>`,
  ].join("<br/>");
}
