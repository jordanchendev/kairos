import type { SignalResponse } from "@/api/poseidon/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";

import { getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { formatSignalTimestamp, getSignalStatusTone, getSignalStrategyValue } from "@/features/signals/signals-model";

type RecentSignalsPanelProps = {
  signals: SignalResponse[];
};

export function RecentSignalsPanel({ signals }: RecentSignalsPanelProps) {
  if (signals.length === 0) {
    return (
      <PanelFrame description="Latest signals will appear here once Poseidon emits them." eyebrow="Signals" title="Recent Signals">
        <EmptyState message="No recent signals are available." title="No recent signals" />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame description="Latest operator-relevant signals across the current market scope." eyebrow="Signals" title="Recent Signals">
      <div className="space-y-3">
        {signals.slice(0, 6).map((signal) => (
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.7)] p-4" key={signal.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{signal.symbol}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{getSignalStrategyValue(signal)} · {getMarketLabel(signal.market)}</div>
              </div>
              <StatusBadge label={signal.status} status={getSignalStatusTone(signal.status)} />
            </div>
            <div className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{formatSignalTimestamp(signal.signal_time)}</div>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}
