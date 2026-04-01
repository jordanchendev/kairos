import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type PanelFrameProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PanelFrame({ action, children, className, description, eyebrow, title }: PanelFrameProps) {
  return (
    <section className={cn("panel-surface rounded-[28px] p-5 lg:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? (
            <div className="text-[11px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">{eyebrow}</div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}
