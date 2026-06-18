import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const strategyData = {
  generatedAt: "2026-06-18T00:00:00Z",
  pairs: [
    {
      key: "nasdaq",
      label: "QQQ / TQQQ",
      core: "QQQ",
      leveraged: "TQQQ",
      currency: "TWD",
      commonStart: "2011-01-01",
      commonEnd: "2026-06-12",
      commonTradingDays: 3888,
    },
  ],
  strategies: [
    {
      id: "nasdaq-core",
      pairKey: "nasdaq",
      name: "純核心持有",
      note: "完全持有核心 ETF。",
      ruleLines: ["不切換", "全程持有 100% QQQ。"],
      cagr: 0.185,
      maxDrawdown: -0.32,
      switches: 0,
      finalMultiple: 12.3,
      metrics: {
        years: {
          "1": 1180000,
          "3": 1760000,
          "5": 2520000,
          "7": 3860000,
          "10": 6880000,
        },
      },
      history: [
        { date: "2024-01-01", value: 1000000, coreWeight: 1, leveragedWeight: 0, cashWeight: 0 },
        { date: "2025-01-01", value: 1180000, coreWeight: 1, leveragedWeight: 0, cashWeight: 0 },
      ],
    },
    {
      id: "nasdaq-rotation",
      pairKey: "nasdaq",
      name: "回撤小於 60% 內最高報酬",
      note: "在歷史最大回撤控制在約 60% 內時，找最高終值的策略。",
      ruleLines: [
        "平常持有 95% QQQ / 5% TQQQ。",
        "QQQ 從近期高點下跌 10% 時，把 TQQQ 調到 100%。",
        "之後 QQQ 從低點反彈 40% 時，降回 5% TQQQ。",
      ],
      cagr: 0.391,
      maxDrawdown: -0.58,
      switches: 18,
      finalMultiple: 64.2,
      metrics: {
        years: {
          "1": 1320000,
          "3": 2960000,
          "5": 6100000,
          "7": 14000000,
          "10": 51000000,
        },
      },
      history: [
        { date: "2024-01-01", multiple: 1, coreWeight: 0.95, leveragedWeight: 0.05, cashWeight: 0 },
        { date: "2025-01-01", multiple: 1.32, coreWeight: 0, leveragedWeight: 1, cashWeight: 0 },
      ],
      allocationSegments: [
        {
          start: "2024-01-01",
          end: "2024-06-01",
          tradingDays: 100,
          coreWeight: 0.95,
          leveragedWeight: 0.05,
          cashWeight: 0,
        },
        {
          start: "2024-06-02",
          end: "2025-01-01",
          tradingDays: 120,
          coreWeight: 0,
          leveragedWeight: 1,
          cashWeight: 0,
        },
      ],
      switchEvents: [
        {
          date: "2024-06-02",
          reason: "QQQ 從近期高點下跌 10%",
          beforeCoreWeight: 0.95,
          beforeLeveragedWeight: 0.05,
          beforeCashWeight: 0,
          afterCoreWeight: 0,
          afterLeveragedWeight: 1,
          afterCashWeight: 0,
          daysSincePrevious: null,
        },
      ],
      holdingSummary: {
        totalTradingDays: 220,
        coreWeightedTradingDays: 95,
        leveragedWeightedTradingDays: 125,
        cashWeightedTradingDays: 0,
        coreTradingDayRatio: 0.43,
        leveragedTradingDayRatio: 0.57,
        cashTradingDayRatio: 0,
      },
    },
  ],
  validation: {
    nasdaq: {
      rolling: [
        {
          strategy: "回撤小於 60% 內最高報酬",
          years: 10,
          medianMultiple: 30.87,
          p05Multiple: 16.45,
          winRate: 1,
          worstDrawdown: -0.56,
        },
      ],
      regimes: [
        {
          strategy: "回撤小於 60% 內最高報酬",
          regime: "熊市",
          medianMultiple: 4.46,
          p05Multiple: 1.87,
          winRate: 1,
          worstDrawdown: -0.74,
        },
      ],
      monteCarlo: [
        {
          strategy: "回撤小於 60% 內最高報酬",
          p50Multiple: 31.46,
          p05Multiple: 2.64,
          p95Multiple: 395.95,
          ruinRate: 0.01,
          medianDrawdown: -0.56,
        },
      ],
    },
  },
};

describe("ETF rotation route", () => {
  it("renders a native Kairos page with chart, strategy table, and validation", async () => {
    const routeModule = await import("@/routes/etf-rotation");

    expect("EtfRotationPage" in routeModule).toBe(true);

    if (!("EtfRotationPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(<routeModule.EtfRotationPage data={strategyData} />);

    expect(markup).toContain("ETF Rotation");
    expect(markup).toContain("QQQ / TQQQ");
    expect(markup).toContain("全期間 CAGR");
    expect(markup).toContain("近 10 年");
    expect(markup).toContain("data-etf-rotation-chart");
    expect(markup).toContain("策略表");
    expect(markup).toContain("已選策略");
    expect(markup).toContain("持有天數比例");
    expect(markup).toContain("觸發原因");
    expect(markup).toContain("切換前");
    expect(markup).toContain("切換後");
    expect(markup).toContain("三層驗證");
    expect(markup).toContain("滾動進場");
    expect(markup).toContain("市況分組");
    expect(markup).toContain("蒙地卡羅");
    expect(markup).toContain("回撤小於 60% 內最高報酬");
  });

  it("adds the ETF rotation page to Kairos research navigation", async () => {
    const { navigationItems } = await import("@/app/navigation");

    expect(navigationItems.some((item) => item.path === "/etf-rotation" && item.title === "ETF Rotation")).toBe(true);
  });
});
