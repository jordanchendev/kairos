import { useEffect, useMemo, useRef } from "react";
import { CandlestickSeries, LineSeries, createChart, createSeriesMarkers } from "lightweight-charts";

import { cn } from "@/lib/cn";

import { candlestickSeriesOptions, chartTheme, lineSeriesOptions } from "./chart-theme";
import { buildTradeMarkers, type TradeMarkerInput } from "./series-markers";

export type LightweightChartPoint = {
  close?: number;
  high?: number;
  low?: number;
  open?: number;
  time: string;
  value?: number;
};

type LightweightChartProps = {
  className?: string;
  data: LightweightChartPoint[];
  description?: string;
  markers?: TradeMarkerInput[];
  priceLabel?: string;
  title: string;
};

function formatDisplayValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function toDisplayValue(point: LightweightChartPoint) {
  return point.value ?? point.close ?? 0;
}

function isCandlestickPoint(point: LightweightChartPoint) {
  return [point.open, point.high, point.low, point.close].every((value) => typeof value === "number");
}

export function LightweightChart({
  className,
  data,
  description,
  markers = [],
  priceLabel = "Price",
  title,
}: LightweightChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const latestPoint = data.at(-1) ?? null;
  const latestValue = latestPoint ? toDisplayValue(latestPoint) : null;
  const isCandlestick = useMemo(() => data.length > 0 && data.every(isCandlestickPoint), [data]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) {
      return;
    }

    const chart = createChart(chartRef.current, {
      ...chartTheme,
      height: 320,
    });

    const series = isCandlestick
      ? chart.addSeries(CandlestickSeries, candlestickSeriesOptions)
      : chart.addSeries(LineSeries, lineSeriesOptions);

    if (isCandlestick) {
      series.setData(
        data.map((point) => ({
          close: point.close ?? 0,
          high: point.high ?? 0,
          low: point.low ?? 0,
          open: point.open ?? 0,
          time: point.time,
        })),
      );
    } else {
      series.setData(
        data.map((point) => ({
          time: point.time,
          value: toDisplayValue(point),
        })),
      );
    }

    if (markers.length > 0) {
      createSeriesMarkers(series, buildTradeMarkers(markers));
    }

    chart.timeScale().fitContent();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            if (!chartRef.current) {
              return;
            }

            chart.applyOptions({
              width: chartRef.current.clientWidth,
            });
          });

    if (resizeObserver) {
      resizeObserver.observe(chartRef.current);
    } else {
      chart.applyOptions({
        width: chartRef.current.clientWidth || 640,
      });
    }

    return () => {
      resizeObserver?.disconnect();
      chart.remove();
    };
  }, [data, isCandlestick, markers]);

  return (
    <section className={cn("panel-surface rounded-[28px] border border-[hsl(var(--border))] p-5 lg:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Chart Foundation</div>
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p> : null}
          </div>
        </div>
        <div className="grid gap-3 rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] px-4 py-3 text-right shadow-[0_0_18px_rgba(0,128,255,0.08)]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">{priceLabel}</div>
            <div className="mt-2 font-mono text-lg font-semibold text-[hsl(var(--foreground))] [text-shadow:0_0_12px_rgba(0,128,255,0.16)]">
              {latestValue === null ? "No data" : formatDisplayValue(latestValue)}
            </div>
          </div>
          <div className="flex justify-end gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            <span>{data.length} points</span>
            <span>{markers.length} markers</span>
          </div>
        </div>
      </header>

      <div
        ref={chartRef}
        className="mt-5 h-[320px] rounded-[24px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_top,rgba(0,128,255,0.14),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.94))] shadow-[inset_0_1px_0_rgba(248,250,252,0.04)]"
        data-chart-shell
      />
    </section>
  );
}
