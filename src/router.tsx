import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/app/app-shell";

const routerBasename =
  import.meta.env.BASE_URL !== "/" ? import.meta.env.BASE_URL.replace(/\/$/, "") : undefined;

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      {
        index: true,
        lazy: () => import("@/routes/overview"),
      },
      {
        path: "portfolio",
        lazy: () => import("@/routes/portfolio"),
      },
      {
        path: "perp-positions",
        lazy: () => import("@/routes/perp-positions"),
      },
      {
        path: "signals",
        lazy: () => import("@/routes/signals"),
      },
      {
        path: "backtesting",
        lazy: () => import("@/routes/backtesting"),
      },
      {
        path: "strategy-lab",
        lazy: () => import("@/routes/strategy-lab"),
      },
      {
        path: "autoresearch",
        lazy: () => import("@/routes/autoresearch"),
      },
      {
        path: "var-exposure",
        lazy: () => import("@/routes/var-exposure"),
      },
      {
        path: "stress-testing",
        lazy: () => import("@/routes/stress-testing"),
      },
      {
        path: "alerts",
        lazy: () => import("@/routes/alerts"),
      },
      {
        path: "data-quality",
        lazy: () => import("@/routes/data-quality"),
      },
      {
        path: "data-health",
        lazy: () => import("@/routes/data-health"),
      },
      {
        path: "infrastructure",
        lazy: () => import("@/routes/infrastructure"),
      },
      {
        path: "transcription-tasks",
        lazy: () => import("@/routes/transcription-tasks"),
      },
      {
        path: "indexed-data",
        lazy: () => import("@/routes/indexed-data"),
      },
      {
        path: "training-runs",
        lazy: () => import("@/routes/training-runs"),
      },
    ],
  },
], {
  basename: routerBasename,
});
