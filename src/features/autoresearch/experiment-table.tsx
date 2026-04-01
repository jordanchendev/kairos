import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { ExperimentResponse } from "@/api/poseidon/types.gen";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatRatio, getMarketLabel } from "@/features/portfolio/portfolio-view-model";
import { cn } from "@/lib/cn";

export type ExperimentSortKey = "compositeScore" | "createdAt" | "wfeScore";

type ExperimentTableProps = {
  experiments: ExperimentResponse[];
  onSelectExperiment: (experimentId: string) => void;
  onSortChange: (sortKey: ExperimentSortKey) => void;
  selectedExperimentId: string | null;
  sortDirection: "asc" | "desc";
  sortKey: ExperimentSortKey;
};

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5" />;
  }

  return direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

function HeaderButton({
  active,
  children,
  direction,
  onClick,
}: {
  active: boolean;
  children: string;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 uppercase tracking-[0.22em] transition-colors duration-200 hover:text-[hsl(var(--foreground))]",
        active && "text-[hsl(var(--foreground))]",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{children}</span>
      <SortIcon active={active} direction={direction} />
    </button>
  );
}

function getExperimentStatusTone(status: string) {
  if (status === "passed" || status === "success") {
    return "up" as const;
  }

  if (status === "failed" || status === "rejected") {
    return "down" as const;
  }

  return "degraded" as const;
}

export function ExperimentTable({
  experiments,
  onSelectExperiment,
  onSortChange,
  selectedExperimentId,
  sortDirection,
  sortKey,
}: ExperimentTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
      <div className="hidden grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-4 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.88)] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] lg:grid">
        <span>Study</span>
        <HeaderButton active={sortKey === "compositeScore"} direction={sortDirection} onClick={() => onSortChange("compositeScore")}>
          composite score
        </HeaderButton>
        <HeaderButton active={sortKey === "wfeScore"} direction={sortDirection} onClick={() => onSortChange("wfeScore")}>
          WFE
        </HeaderButton>
        <HeaderButton active={sortKey === "createdAt"} direction={sortDirection} onClick={() => onSortChange("createdAt")}>
          Created
        </HeaderButton>
        <span>Status</span>
      </div>

      <div className="divide-y divide-[hsl(var(--border))]">
        {experiments.map((experiment) => (
          <button
            className={cn(
              "grid w-full cursor-pointer gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-[hsla(190,91%,37%,0.08)] lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.8fr]",
              selectedExperimentId === experiment.id && "bg-[hsla(190,91%,37%,0.12)]",
            )}
            key={experiment.id}
            onClick={() => onSelectExperiment(experiment.id)}
            type="button"
          >
            <div>
              <div className="text-base font-semibold text-[hsl(var(--foreground))]">{experiment.study_name}</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {getMarketLabel(experiment.market)} · {experiment.interval}
              </div>
            </div>

            <div className="text-sm text-[hsl(var(--foreground))]">{formatRatio(experiment.composite_score)}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{formatRatio(experiment.wfe_score)}</div>
            <div className="text-sm text-[hsl(var(--foreground))]">{experiment.created_at}</div>
            <div>
              <StatusBadge label={experiment.status} status={getExperimentStatusTone(experiment.status)} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
