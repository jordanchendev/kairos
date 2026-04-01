import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";

import type { TaskListItemModel } from "./task-model";

type TaskDetailPanelProps = {
  task: TaskListItemModel | null;
};

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  return (
    <div className="space-y-4">
      <PanelFrame
        action={task ? <StatusBadge label={task.status} status={task.status === "completed" ? "up" : task.status === "failed" ? "down" : "degraded"} /> : undefined}
        description="Selected task detail stays synced with the queue so operators can inspect step state and output text without leaving the route."
        eyebrow="Detail"
        title="Selected task"
      >
        {task ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard detail="Current Triton processing step" label="Step" value={task.stepLabel} />
              <MetricCard detail="Execution device assigned by Triton" label="Device" value={task.device ?? "n/a"} />
              <MetricCard detail="Task source type" label="Type" value={task.type} />
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/4 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Result text</div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-[hsl(var(--foreground))]">{task.preview}</pre>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Select a task to inspect its current step and result text.</div>
        )}
      </PanelFrame>
    </div>
  );
}
