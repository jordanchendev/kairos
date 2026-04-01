import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const deltaTone = {
  danger: "text-rose-300",
  neutral: "text-[hsl(var(--muted-foreground))]",
  positive: "text-emerald-300",
  warning: "text-amber-200",
} as const;

type MetricCardProps = {
  className?: string;
  delta?: string;
  deltaTone?: keyof typeof deltaTone;
  detail?: string;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
};

export function MetricCard({
  className,
  delta,
  deltaTone: tone = "neutral",
  detail,
  icon,
  label,
  value,
}: MetricCardProps) {
  return (
    <article className={cn("panel-surface rounded-[24px] p-4 lg:p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.26em] text-[hsl(var(--muted-foreground))]">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">{value}</div>
        </div>
        {icon ? (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.03)] p-3 text-[hsl(var(--foreground))]">
            {icon}
          </div>
        ) : null}
      </div>
      {delta || detail ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          {delta ? <span className={cn("font-medium", deltaTone[tone])}>{delta}</span> : null}
          {detail ? <span className="text-[hsl(var(--muted-foreground))]">{detail}</span> : null}
        </div>
      ) : null}
    </article>
  );
}
