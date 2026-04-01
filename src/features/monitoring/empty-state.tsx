import type { ReactNode } from "react";

import { Inbox } from "lucide-react";

import { cn } from "@/lib/cn";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  message: string;
  title: string;
};

export function EmptyState({ action, className, message, title }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid-overlay rounded-[24px] border border-dashed border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)] p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 text-[hsl(var(--muted-foreground))]">
          <Inbox className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
          <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
