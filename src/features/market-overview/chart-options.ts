// ECharts options for the panel charts, coloured from the Kairos tokens (up red, down green via --trend-up / --trend-down).
import type { EChartsOption } from "echarts";

import type { BreadthDay, CreditView, FlowDay, Point } from "./model";
import { shortDate } from "./model";

const TOKEN_FALLBACK: Record<string, string> = {
  "--accent": "191 91% 37%",
  "--border": "221 19% 25%",
  "--foreground": "210 40% 96%",
  "--muted-foreground": "217 17% 65%",
  "--trend-down": "152 52% 58%",
  "--trend-up": "3 85% 72%",
};

/** A Kairos colour token (index.css, HSL triplet) as an ECharts colour, read from the live document when there is one. */
function tokenColor(name: keyof typeof TOKEN_FALLBACK, alpha = 1): string {
  const live = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h, s, l] = (live || TOKEN_FALLBACK[name]).split(/\s+/);
  return `hsla(${h}, ${s}, ${l}, ${alpha})`;
}

/** Series colours for the three institutional investors: identities, not directions, so not red/green. */
export const FLOW_COLORS = {
  dealer: "hsla(275, 55%, 72%, 0.9)",
  foreign: "hsla(210, 60%, 66%, 0.9)",
  trust: "hsla(40, 85%, 62%, 0.9)",
} as const;
const RATIO_COLOR = "hsla(40, 85%, 62%, 1)";

function axisBase(dates: readonly string[]): Pick<EChartsOption, "animation" | "backgroundColor" | "grid" | "textStyle" | "tooltip" | "xAxis"> {
  return {
    animation: false,
    backgroundColor: "transparent",
    grid: { bottom: 18, containLabel: false, left: 42, right: 38, top: 8 },
    textStyle: { color: tokenColor("--muted-foreground"), fontSize: 10 },
    tooltip: {
      backgroundColor: "hsla(224, 33%, 11%, 0.96)",
      borderColor: tokenColor("--border"),
      confine: true,
      textStyle: { color: tokenColor("--foreground"), fontSize: 11 },
      trigger: "axis",
    },
    xAxis: {
      axisLabel: { color: tokenColor("--muted-foreground"), fontSize: 10, formatter: (value: string) => shortDate(value), hideOverlap: true },
      axisLine: { lineStyle: { color: tokenColor("--border") } },
      axisTick: { show: false },
      data: [...dates],
      type: "category",
    },
  };
}

function valueAxis(position: "left" | "right", extra: Record<string, unknown> = {}) {
  return {
    axisLabel: { color: tokenColor("--muted-foreground"), fontSize: 10 },
    position,
    scale: true,
    splitLine: { lineStyle: { color: tokenColor("--border", position === "left" ? 0.45 : 0) } },
    type: "value" as const,
    ...extra,
  };
}

const round = (digits: number) => (value: unknown) => (typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: digits }) : "—");

/** TAIEX close (line, left) over listed turnover in 億 (bars, right). */
export function indexTurnoverOption(taiex: readonly Point[], turnover: readonly Point[]): EChartsOption {
  const dates = taiex.map((point) => point.date);
  const byDate = new Map(turnover.map((point) => [point.date, point.value]));
  return {
    ...axisBase(dates),
    series: [
      {
        barWidth: "60%",
        data: dates.map((date) => byDate.get(date) ?? null),
        itemStyle: { color: tokenColor("--muted-foreground", 0.35) },
        name: "成交值（億）",
        tooltip: { valueFormatter: round(0) },
        type: "bar",
        yAxisIndex: 1,
      },
      {
        data: taiex.map((point) => point.value),
        lineStyle: { color: tokenColor("--accent", 1), width: 1.5 },
        name: "加權指數",
        showSymbol: false,
        tooltip: { valueFormatter: round(2) },
        type: "line",
        yAxisIndex: 0,
      },
    ],
    yAxis: [valueAxis("left"), valueAxis("right", { axisLabel: { show: false }, max: (v: { max: number }) => v.max * 2.2, min: 0, scale: false })],
  };
}

/** Listed advancers (up, red) and decliners (down, green, below zero) per session. */
export function breadthOption(days: readonly BreadthDay[]): EChartsOption {
  return {
    ...axisBase(days.map((day) => day.date)),
    grid: { bottom: 18, left: 42, right: 8, top: 8 },
    series: [
      { barWidth: "60%", data: days.map((day) => day.up), itemStyle: { color: tokenColor("--trend-up", 0.85) }, name: "上漲", stack: "breadth", type: "bar" },
      { barWidth: "60%", data: days.map((day) => -day.down), itemStyle: { color: tokenColor("--trend-down", 0.85) }, name: "下跌", stack: "breadth", tooltip: { valueFormatter: (v) => String(Math.abs(Number(v))) }, type: "bar" },
    ],
    yAxis: valueAxis("left", { axisLabel: { color: tokenColor("--muted-foreground"), fontSize: 10, formatter: (v: number) => String(Math.abs(v)) }, scale: false }),
  };
}

/** Net buy (+) / sell (−) in 億 of the three institutional investors, stacked, with their total as a line. */
export function institutionalOption(days: readonly FlowDay[]): EChartsOption {
  const bar = (key: keyof typeof FLOW_COLORS, name: string) => ({
    barWidth: "60%",
    data: days.map((day) => day[key]),
    itemStyle: { color: FLOW_COLORS[key] },
    name,
    stack: "flow",
    tooltip: { valueFormatter: round(1) },
    type: "bar" as const,
  });
  return {
    ...axisBase(days.map((day) => day.date)),
    grid: { bottom: 18, left: 48, right: 8, top: 8 },
    series: [
      bar("foreign", "外資"),
      bar("trust", "投信"),
      bar("dealer", "自營商"),
      {
        data: days.map((day) => day.total),
        lineStyle: { color: tokenColor("--foreground", 0.85), width: 1.2 },
        name: "合計",
        showSymbol: false,
        tooltip: { valueFormatter: round(1) },
        type: "line",
      },
    ],
    yAxis: valueAxis("left", { scale: false }),
  };
}

/** Listed margin balance in 億 (line, left) and the estimated maintenance ratio in % (dashed, right). */
export function marginOption(days: CreditView["days"]): EChartsOption {
  return {
    ...axisBase(days.map((day) => day.date)),
    series: [
      {
        areaStyle: { color: tokenColor("--accent", 0.12) },
        data: days.map((day) => day.amountYi),
        lineStyle: { color: tokenColor("--accent", 1), width: 1.5 },
        name: "融資金額（億）",
        showSymbol: false,
        tooltip: { valueFormatter: round(0) },
        type: "line",
        yAxisIndex: 0,
      },
      {
        data: days.map((day) => day.ratio),
        lineStyle: { color: RATIO_COLOR, type: "dashed", width: 1.2 },
        name: "維持率估算（%）",
        showSymbol: false,
        tooltip: { valueFormatter: round(1) },
        type: "line",
        yAxisIndex: 1,
      },
    ],
    yAxis: [valueAxis("left"), valueAxis("right", { axisLabel: { color: RATIO_COLOR, fontSize: 10, formatter: (v: number) => `${v}%` } })],
  };
}
