import type { SignalResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";

import { formatPercent, formatRatio } from "@/features/portfolio/portfolio-view-model";

import { formatSignalTimestamp, getSignalStatusTone, getSignalStrategyValue } from "./signals-model";

type SignalDrawerProps = {
  isLoading: boolean;
  signal: SignalResponse | null;
};

export function SignalDrawer({ isLoading, signal }: SignalDrawerProps) {
  if (isLoading) {
    return <div className="panel-surface h-full min-h-[22rem] animate-pulse rounded-[28px]" />;
  }

  if (!signal) {
    return <EmptyState message="Select a row to inspect route-local signal details." title="No signal selected" />;
  }

  return (
    <PanelFrame
      action={<StatusBadge label={signal.status} status={getSignalStatusTone(signal.status)} />}
      description="Detail view stays inspection-only. The current API does not expose linked execution P&L or exit fills on this route yet."
      eyebrow="signal_id"
      title={signal.id}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Strategy</div>
          <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">{getSignalStrategyValue(signal)}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Confidence</div>
          <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">{formatPercent(signal.confidence)}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Signal Time</div>
          <div className="mt-2 text-sm text-[hsl(var(--foreground))]">{formatSignalTimestamp(signal.signal_time)}</div>
        </div>
        <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Expiry</div>
          <div className="mt-2 text-sm text-[hsl(var(--foreground))]">{signal.valid_until ? formatSignalTimestamp(signal.valid_until) : "No expiry"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Outcome Context</div>
        <div className="mt-3 grid gap-3 text-sm text-[hsl(var(--foreground))] sm:grid-cols-3">
          <div>Action: {signal.action}</div>
          <div>Quantity: {formatRatio(signal.quantity_pct ?? 0)}</div>
          <div>Reject Reason: {signal.reject_reason ?? "None"}</div>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-xs text-[hsl(var(--muted-foreground))]">
          {JSON.stringify(signal.params, null, 2)}
        </pre>
      </div>
    </PanelFrame>
  );
}
