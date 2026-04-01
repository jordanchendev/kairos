import { cn } from "@/lib/cn";

const badgeTone = {
  degraded: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  down: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  idle: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  up: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
} as const;

type StatusKind = keyof typeof badgeTone;

type StatusBadgeProps = {
  className?: string;
  label?: string;
  status: StatusKind;
};

export function StatusBadge({ className, label, status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
        badgeTone[status],
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label ?? status}
    </span>
  );
}
