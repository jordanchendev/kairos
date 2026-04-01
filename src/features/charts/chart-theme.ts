import { ColorType, type DeepPartial, type TimeChartOptions } from "lightweight-charts";

export const chartTheme: DeepPartial<TimeChartOptions> = {
  autoSize: true,
  crosshair: {
    horzLine: {
      color: "rgba(0, 128, 255, 0.28)",
      labelBackgroundColor: "#1E293B",
    },
    vertLine: {
      color: "rgba(0, 128, 255, 0.18)",
      labelBackgroundColor: "#1E293B",
    },
  },
  grid: {
    horzLines: {
      color: "rgba(148, 163, 184, 0.14)",
    },
    vertLines: {
      color: "rgba(148, 163, 184, 0.08)",
    },
  },
  height: 320,
  layout: {
    attributionLogo: true,
    background: {
      color: "#020617",
      type: ColorType.Solid,
    },
    textColor: "#F8FAFC",
  },
  localization: {
    locale: "en-US",
  },
  rightPriceScale: {
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  timeScale: {
    borderColor: "rgba(148, 163, 184, 0.18)",
    timeVisible: true,
  },
};

export const candlestickSeriesOptions = {
  borderDownColor: "#d93025",
  borderUpColor: "#0f9d58",
  downColor: "#d93025",
  wickDownColor: "#d93025",
  wickUpColor: "#0f9d58",
  upColor: "#0f9d58",
} as const;

export const lineSeriesOptions = {
  color: "#0080FF",
  crosshairMarkerBackgroundColor: "#0080FF",
  crosshairMarkerBorderColor: "#F8FAFC",
  lineWidth: 3,
  priceLineColor: "#0080FF",
  priceLineWidth: 2,
} as const;
