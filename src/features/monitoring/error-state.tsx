import type { ReactNode } from "react";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/cn";

type ErrorStateProps = {
  action?: ReactNode;
  className?: string;
  message: string;
  title?: string;
};

export function ErrorState({ action, className, message, title = "Monitoring data unavailable" }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-rose-500/25 bg-[linear-gradient(180deg,hsla(355,78%,56%,0.12),hsla(355,78%,56%,0.04))] p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-[18px] border border-rose-500/30 bg-rose-500/12 p-3 text-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
            <p className="max-w-2xl text-sm leading-6 text-rose-100/85">{message}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
