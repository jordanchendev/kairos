import type { SignalResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { cn } from "@/lib/cn";

import { formatPercent, getMarketLabel } from "@/features/portfolio/portfolio-view-model";

import { formatSignalTimestamp, getSignalStatusTone, getSignalStrategyValue } from "./signals-model";

type SignalsTableProps = {
  onSelectSignal: (signalId: string) => void;
  selectedSignalId: string | null;
  signals: SignalResponse[];
};

export function SignalsTable({ onSelectSignal, selectedSignalId, signals }: SignalsTableProps) {
  if (signals.length === 0) {
    return <EmptyState message="No signals match the current route-local filters." title="No signals in scope" />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
      <div className="hidden grid-cols-[1fr_1fr_0.8fr_0.7fr_0.8fr_0.9fr] gap-4 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.85)] px-4 py-3 text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))] lg:grid">
        <span>Symbol</span>
        <span>strategy</span>
        <span>status</span>
        <span>Action</span>
        <span>Confidence</span>
        <span>Signal Time</span>
      </div>

      <div className="divide-y divide-[hsl(var(--border))]">
        {signals.map((signal) => (
          <button
            className={cn(
              "grid w-full gap-4 px-4 py-4 text-left transition hover:bg-[hsla(190,91%,37%,0.08)] lg:grid-cols-[1fr_1fr_0.8fr_0.7fr_0.8fr_0.9fr]",
              selectedSignalId === signal.id && "bg-[hsla(190,91%,37%,0.1)]",
            )}
            key={signal.id}
            onClick={() => onSelectSignal(signal.id)}
            type="button"
          >
            <div>
              <div className="text-base font-semibold text-[hsl(var(--foreground))]">{signal.symbol}</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{getMarketLabel(signal.market)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">strategy</div>
              <div className="mt-1 text-sm text-[hsl(var(--foreground))]">{getSignalStrategyValue(signal)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">status</div>
              <div className="mt-1">
                <StatusBadge label={signal.status} status={getSignalStatusTone(signal.status)} />
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Action</div>
              <div className="mt-1 text-sm font-medium uppercase text-[hsl(var(--foreground))]">{signal.action}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Confidence</div>
              <div className="mt-1 text-sm text-[hsl(var(--foreground))]">{formatPercent(signal.confidence)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:hidden">Signal Time</div>
              <div className="mt-1 text-sm text-[hsl(var(--foreground))]">{formatSignalTimestamp(signal.signal_time)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
