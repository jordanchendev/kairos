import { lazy, type ReactNode } from "react";

import { PanelFrame } from "@/features/monitoring/panel-frame";
import { cn } from "@/lib/cn";

export const LazyECharts = lazy(() => import("echarts-for-react"));

type EChartsShellProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function EChartsShell({ children, className, description, eyebrow, title }: EChartsShellProps) {
  return (
    <PanelFrame className={className} description={description} eyebrow={eyebrow} title={title}>
      <div
        className={cn(
          "rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:p-5",
        )}
        data-echarts-shell
      >
        {children}
      </div>
    </PanelFrame>
  );
}
