import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Database,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LineChart,
  Server,
  Shield,
  TestTube2,
  Waves,
} from "lucide-react";

export type NavigationItem = {
  description: string;
  icon: typeof LayoutDashboard;
  pageId: string;
  path: string;
  title: string;
};

export type NavigationGroup = {
  items: NavigationItem[];
  title: "Overview" | "Trading" | "Research" | "Risk" | "System";
};

export const navigationGroups: NavigationGroup[] = [
  {
    title: "Overview",
    items: [
      {
        description: "Cross-service status snapshot and operator summary.",
        icon: LayoutDashboard,
        pageId: "overview",
        path: "/",
        title: "Overview",
      },
      {
        description: "Holdings, balances, and capital allocation placeholders.",
        icon: BriefcaseBusiness,
        pageId: "portfolio",
        path: "/portfolio",
        title: "Portfolio",
      },
    ],
  },
  {
    title: "Trading",
    items: [
      {
        description: "Leverage, liquidation, and margin posture for active perp books.",
        icon: Waves,
        pageId: "perp-positions",
        path: "/perp-positions",
        title: "Perp Positions",
      },
      {
        description: "Signal monitoring and explainability surface.",
        icon: Activity,
        pageId: "signals",
        path: "/signals",
        title: "Signals",
      },
      {
        description: "Backtest runs, metrics, and equity-curve shells.",
        icon: LineChart,
        pageId: "backtesting",
        path: "/backtesting",
        title: "Backtesting",
      },
    ],
  },
  {
    title: "Research",
    items: [
      {
        description: "Strategy experimentation and hypothesis review.",
        icon: BarChart3,
        pageId: "strategy-lab",
        path: "/strategy-lab",
        title: "Strategy Lab",
      },
      {
        description: "AutoResearch outputs and model iteration queue.",
        icon: Bot,
        pageId: "autoresearch",
        path: "/autoresearch",
        title: "AutoResearch",
      },
      {
        description: "Qlib training run monitoring, metrics, and error inspection.",
        icon: FlaskConical,
        pageId: "training-runs",
        path: "/training-runs",
        title: "Training Runs",
      },
    ],
  },
  {
    title: "Risk",
    items: [
      {
        description: "Portfolio VaR and exposure posture.",
        icon: Shield,
        pageId: "var-exposure",
        path: "/var-exposure",
        title: "VaR & Exposure",
      },
      {
        description: "Scenario runs and resilience stress views.",
        icon: TestTube2,
        pageId: "stress-testing",
        path: "/stress-testing",
        title: "Stress Testing",
      },
      {
        description: "Notification and alert readiness.",
        icon: AlertTriangle,
        pageId: "alerts",
        path: "/alerts",
        title: "Alerts",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        description: "Provider integrity and feed-level data checks.",
        icon: Gauge,
        pageId: "data-quality",
        path: "/data-quality",
        title: "Data Quality",
      },
      {
        description: "Service health, workers, and deployment posture.",
        icon: Server,
        pageId: "infrastructure",
        path: "/infrastructure",
        title: "Infrastructure",
      },
      {
        description: "Triton transcription task queue and handoff state.",
        icon: BookOpen,
        pageId: "transcription-tasks",
        path: "/transcription-tasks",
        title: "Transcription Tasks",
      },
      {
        description: "Indexed documents and retrieval surfaces.",
        icon: Database,
        pageId: "indexed-data",
        path: "/indexed-data",
        title: "Indexed Data",
      },
    ],
  },
];

export const navigationItems = navigationGroups.flatMap((group) => group.items);
