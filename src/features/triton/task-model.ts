import type { TaskListResponse, TaskResponse, TaskStatus } from "@/api/triton/types.gen";

export type TaskListItemModel = {
  createdAt: string;
  device: string | null;
  id: string;
  preview: string;
  sourceUrl: string | null;
  status: TaskStatus;
  stepLabel: string;
  type: TaskResponse["type"];
};

export type TaskListSummary = {
  items: TaskListItemModel[];
  page: number;
  pageSize: number;
  statusCounts: Record<TaskStatus, number>;
  total: number;
};

const emptyStatusCounts: Record<TaskStatus, number> = {
  completed: 0,
  downloading: 0,
  failed: 0,
  processing: 0,
  queued: 0,
};

export function normalizeTask(task: TaskResponse): TaskListItemModel {
  return {
    createdAt: task.created_at,
    device: task.device,
    id: task.id,
    preview: task.result_text?.trim() || task.source_url?.trim() || "Pending Triton output",
    sourceUrl: task.source_url,
    status: task.status,
    stepLabel: task.step?.trim() || "queued",
    type: task.type,
  };
}

export function summarizeTaskList(payload: TaskListResponse): TaskListSummary {
  const items = payload.tasks.map(normalizeTask);
  const statusCounts = items.reduce<Record<TaskStatus, number>>((counts, task) => {
    counts[task.status] += 1;
    return counts;
  }, { ...emptyStatusCounts });

  return {
    items,
    page: payload.page,
    pageSize: payload.page_size,
    statusCounts,
    total: payload.total,
  };
}
