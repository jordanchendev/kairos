import type { TaskStatus } from "@/api/triton/types.gen";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { cn } from "@/lib/cn";

import type { TaskListItemModel } from "./task-model";

type TaskListPanelProps = {
  onPageChange?: (page: number) => void;
  onSelectTask?: (taskId: string) => void;
  page: number;
  pageSize: number;
  selectedTaskId: string | null;
  tasks: TaskListItemModel[];
  total: number;
};

export function TaskListPanel({
  onPageChange = () => {},
  onSelectTask = () => {},
  page,
  pageSize,
  selectedTaskId,
  tasks,
  total,
}: TaskListPanelProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PanelFrame
      description="Paginated task queue with selection locked to the active detail panel."
      eyebrow="Queue"
      title="Task list"
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Step</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const active = task.id === selectedTaskId;

                return (
                  <tr
                    key={task.id}
                    className={cn("border-t border-white/8", active && "bg-emerald-500/8")}
                  >
                    <td className="px-4 py-3">
                      <button className="cursor-pointer text-left text-[hsl(var(--foreground))]" onClick={() => onSelectTask(task.id)} type="button">
                        <div className="font-medium">{task.id}</div>
                        <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{task.preview}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--foreground))]">{task.type}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={task.status} status={toBadgeStatus(task.status)} />
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--foreground))]">{task.stepLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-[hsl(var(--muted-foreground))]">
          <div>
            Page {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 transition duration-200 hover:border-white/20 hover:text-[hsl(var(--foreground))]"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              type="button"
            >
              Prev
            </button>
            <button
              className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 transition duration-200 hover:border-white/20 hover:text-[hsl(var(--foreground))]"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

function toBadgeStatus(status: TaskStatus) {
  if (status === "completed") {
    return "up";
  }

  if (status === "failed") {
    return "down";
  }

  if (status === "queued") {
    return "idle";
  }

  return "degraded";
}
