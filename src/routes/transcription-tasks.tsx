import { useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createTaskTasksPostMutation,
  createTaskWithUploadTasksUploadPostMutation,
  getTaskTasksTaskIdGetOptions,
  listTasksTasksGetOptions,
} from "@/api/triton/@tanstack/react-query.gen";
import type { DeviceType, TaskResponse, TaskStatus, TaskType } from "@/api/triton/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { NewTaskForm, type NewTaskDraft } from "@/features/triton/new-task-form";
import { summarizeTaskList } from "@/features/triton/task-model";
import { TaskDetailPanel } from "@/features/triton/task-detail-panel";
import { TaskFilters } from "@/features/triton/task-filters";
import { TaskListPanel } from "@/features/triton/task-list-panel";

type TranscriptionTasksPageProps = {
  activeStatus: TaskStatus | "all";
  activeType: TaskType | "all";
  draftDevice: DeviceType;
  draftSourceUrl: string;
  draftType: TaskType;
  onDraftChange?: (next: NewTaskDraft) => void;
  onPageChange?: (page: number) => void;
  onSelectTask?: (taskId: string) => void;
  onStatusChange?: (status: TaskStatus | "all") => void;
  onSubmitDraft?: () => void;
  onTypeChange?: (type: TaskType | "all") => void;
  page: number;
  pageSize: number;
  selectedTaskId: string | null;
  submitting?: boolean;
  tasks: TaskResponse[];
  total: number;
};

export function TranscriptionTasksPage({
  activeStatus,
  activeType,
  draftDevice,
  draftSourceUrl,
  draftType,
  onDraftChange = () => {},
  onPageChange = () => {},
  onSelectTask = () => {},
  onStatusChange = () => {},
  onSubmitDraft = () => {},
  onTypeChange = () => {},
  page,
  pageSize,
  selectedTaskId,
  submitting = false,
  tasks,
  total,
}: TranscriptionTasksPageProps) {
  if (tasks.length === 0) {
    return (
      <section className="space-y-6" data-page-id="transcription-tasks">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Triton Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Transcription Tasks</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Queue browsing, selected-task inspection, and submission controls stay in one operator workspace.
          </p>
        </div>

        <EmptyState
          message="Triton has not received any transcription or OCR jobs yet."
          title="No transcription tasks"
        />
      </section>
    );
  }

  const summary = summarizeTaskList({ page, page_size: pageSize, tasks, total });
  const selectedTask = summary.items.find((task) => task.id === selectedTaskId) ?? summary.items[0] ?? null;

  return (
    <section className="space-y-6" data-page-id="transcription-tasks">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Triton Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Transcription Tasks</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Search-first queue management for Triton jobs, with selected-task detail and submission controls kept on one route.
          </p>
        </div>
        <StatusBadge label={`${total} tasks`} status="up" />
      </div>

      <PanelFrame
        description="Filter by type and status before drilling into the active task."
        eyebrow="Filters"
        title="Queue controls"
      >
        <TaskFilters activeStatus={activeStatus} activeType={activeType} onStatusChange={onStatusChange} onTypeChange={onTypeChange} />
      </PanelFrame>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <TaskListPanel
          onPageChange={onPageChange}
          onSelectTask={onSelectTask}
          page={page}
          pageSize={pageSize}
          selectedTaskId={selectedTask?.id ?? null}
          tasks={summary.items}
          total={total}
        />
        <TaskDetailPanel task={selectedTask} />
      </div>

      <NewTaskForm
        draft={{
          device: draftDevice,
          file: null,
          sourceUrl: draftSourceUrl,
          type: draftType,
        }}
        onDraftChange={onDraftChange}
        onSubmit={onSubmitDraft}
        submitting={submitting}
      />
    </section>
  );
}

export function Component() {
  const [activeStatus, setActiveStatus] = useState<TaskStatus | "all">("all");
  const [activeType, setActiveType] = useState<TaskType | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewTaskDraft>({
    device: "auto",
    file: null,
    sourceUrl: "",
    type: "youtube",
  });

  const tasksQuery = useQuery({
    ...listTasksTasksGetOptions({
      query: {
        page,
        page_size: 20,
        status: activeStatus === "all" ? undefined : activeStatus,
        type: activeType === "all" ? undefined : activeType,
      },
    }),
    ...getMonitoringQueryOptions("transcription"),
  });

  const selectedTask = useMemo(
    () => (tasksQuery.data?.tasks ?? []).find((task) => task.id === selectedTaskId) ?? tasksQuery.data?.tasks?.[0] ?? null,
    [selectedTaskId, tasksQuery.data?.tasks],
  );

  const taskDetailQuery = useQuery({
    ...(selectedTask
      ? getTaskTasksTaskIdGetOptions({
          path: {
            task_id: selectedTask.id,
          },
        })
      : getTaskTasksTaskIdGetOptions({
          path: {
            task_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("transcription"),
    enabled: Boolean(selectedTask?.id),
  });

  const createTaskMutation = useMutation(createTaskTasksPostMutation());
  const uploadTaskMutation = useMutation(createTaskWithUploadTasksUploadPostMutation());
  const error = tasksQuery.error ?? taskDetailQuery.error ?? createTaskMutation.error ?? uploadTaskMutation.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Triton tasks could not be loaded."} />;
  }

  if (tasksQuery.isPending) {
    return <div className="panel-surface h-[38rem] animate-pulse rounded-[28px]" />;
  }

  const mergedTasks =
    selectedTask && taskDetailQuery.data ? tasksQuery.data?.tasks?.map((task) => (task.id === selectedTask.id ? taskDetailQuery.data ?? task : task)) ?? []
    : tasksQuery.data?.tasks ?? [];

  return (
    <TranscriptionTasksPage
      activeStatus={activeStatus}
      activeType={activeType}
      draftDevice={draft.device}
      draftSourceUrl={draft.sourceUrl}
      draftType={draft.type}
      onDraftChange={setDraft}
      onPageChange={setPage}
      onSelectTask={setSelectedTaskId}
      onStatusChange={setActiveStatus}
      onSubmitDraft={() => {
        if (["video", "audio", "pdf", "image"].includes(draft.type)) {
          if (!draft.file) {
            return;
          }

          uploadTaskMutation.mutate(
            {
              body: {
                file: draft.file as unknown as string,
              },
              query: {
                device: draft.device,
                type: draft.type,
              },
            },
            {
              onSuccess: (task) => {
                setSelectedTaskId(task.id);
                setDraft((current) => ({ ...current, file: null, sourceUrl: "" }));
                void tasksQuery.refetch();
              },
            },
          );

          return;
        }

        if (!draft.sourceUrl.trim()) {
          return;
        }

        createTaskMutation.mutate(
          {
            body: {
              device: draft.device,
              source_url: draft.sourceUrl.trim(),
              type: draft.type,
            },
          },
          {
            onSuccess: (task) => {
              setSelectedTaskId(task.id);
              setDraft((current) => ({ ...current, sourceUrl: "" }));
              void tasksQuery.refetch();
            },
          },
        );
      }}
      onTypeChange={setActiveType}
      page={page}
      pageSize={20}
      selectedTaskId={selectedTaskId}
      submitting={createTaskMutation.isPending || uploadTaskMutation.isPending}
      tasks={mergedTasks}
      total={tasksQuery.data?.total ?? 0}
    />
  );
}
