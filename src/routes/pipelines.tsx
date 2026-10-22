import { useCallback, useState } from "react";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { RunActionDialog } from "@/features/pipelines/action-dialog";
import {
  PipelineApiError,
  attemptOptions,
  eventsOptions,
  listRunsOptions,
  pipelineKeys,
  runOptions,
  stagesOptions,
  type RunAction,
} from "@/features/pipelines/api";
import { RUN_STATUSES, pollInterval } from "@/features/pipelines/model";
import { RunActionButtons, RunDetailView, type AttemptRef } from "@/features/pipelines/run-detail";
import { RunList, StatusFilter } from "@/features/pipelines/run-list";
import type { PipelineRun, PipelineRunStatus } from "@/features/pipelines/types";
import { useReturnFocusOnClose } from "@/components/ui/dialog";

export type PipelinesNotice = { message: string; tone: "error" | "info" };

export function PipelinesNoticeBar({ notice, onDismiss }: { notice: PipelinesNotice | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div
      className={
        notice.tone === "error"
          ? "flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          : "flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
      }
      role="status"
    >
      <span>{notice.message}</span>
      <button className="min-h-11 rounded-full px-3 text-xs uppercase tracking-[0.18em]" onClick={onDismiss} type="button">
        Dismiss
      </button>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof PipelineApiError && error.kind === "forbidden") {
    return "The pipeline runner refused this key. Kairos needs a principal with the viewer or researcher role.";
  }
  return "The pipeline runner is unreachable or returned an error.";
}

function parseStatus(value: string | null): PipelineRunStatus | null {
  return RUN_STATUSES.find((status) => status === value) ?? null;
}

function RunDetailContainer({
  onNotice,
  runId,
  seed,
}: {
  onNotice: (notice: PipelinesNotice) => void;
  runId: string;
  seed: PipelineRun | undefined;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<AttemptRef | null>(null);
  const [action, setAction] = useState<RunAction | null>(null);
  useReturnFocusOnClose(action !== null);

  const runQuery = useQuery({
    ...runOptions(runId),
    refetchInterval: (query) => pollInterval([query.state.data?.status ?? seed?.status]),
  });
  const interval = pollInterval([runQuery.data?.status ?? seed?.status]);
  const stagesQuery = useQuery({ ...stagesOptions(runId), refetchInterval: interval });
  const eventsQuery = useQuery({ ...eventsOptions(runId), refetchInterval: interval });
  const attemptQuery = useQuery({
    ...attemptOptions(runId, selected?.stage ?? "", selected?.attempt ?? 0),
    enabled: selected !== null,
  });

  const current = runQuery.data ?? seed;
  if (!current) {
    return runQuery.isError ? (
      <ErrorState message={errorMessage(runQuery.error)} title="Run unavailable" />
    ) : (
      <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading run…</p>
    );
  }

  const refresh = () => void queryClient.invalidateQueries({ queryKey: pipelineKeys.all });

  return (
    <>
      <div>
        <RunDetailView
          actions={<RunActionButtons onAction={setAction} run={current} />}
          attempt={selected ? (attemptQuery.data ?? null) : null}
          attemptError={selected && attemptQuery.isError ? errorMessage(attemptQuery.error) : null}
          events={eventsQuery.data?.items ?? []}
          onSelectAttempt={setSelected}
          run={current}
          selected={selected}
          stages={stagesQuery.data?.stages}
        />
      </div>
      {action ? (
        <RunActionDialog
          kind={action}
          onClose={() => setAction(null)}
          onDone={({ message, ok, refreshed }) => {
            setAction(null);
            onNotice({ message, tone: ok ? "info" : "error" });
            if (ok || refreshed) refresh();
          }}
          run={current}
        />
      ) : null}
    </>
  );
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const statusFilter = parseStatus(params.get("status"));
  const selectedId = params.get("run");
  const [notice, setNotice] = useState<PipelinesNotice | null>(null);

  const listQuery = useQuery({
    ...listRunsOptions(statusFilter),
    refetchInterval: (query) => pollInterval((query.state.data?.items ?? []).map((run) => run.status)),
  });
  const visible = listQuery.data?.items ?? [];
  const interval = pollInterval(visible.map((run) => run.status));

  const stageQueries = useQueries({
    queries: visible.map((run) => ({ ...stagesOptions(run.id), refetchInterval: interval })),
  });
  const stagesByRun = Object.fromEntries(visible.map((run, index) => [run.id, stageQueries[index]?.data?.stages]));

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return (
    <section className="space-y-6" data-page-id="pipelines">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Research Route</div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Pipelines</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Strategy validation runs, stage by stage. A failed validation gate closes its run; start a new run in the same
          family to try a variant.
        </p>
      </div>

      <PipelinesNoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <PanelFrame
        action={<StatusFilter onChange={(status) => setParam("status", status)} value={statusFilter} />}
        description={`Refreshes every ${interval / 1000} s.`}
        title="Runs"
      >
        {listQuery.isError && !listQuery.data ? (
          <ErrorState message={errorMessage(listQuery.error)} title="Pipelines unavailable" />
        ) : listQuery.isPending ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading runs…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            message={statusFilter ? `No runs with status ${statusFilter}.` : "No pipeline runs have been started yet."}
            title="No runs"
          />
        ) : (
          <RunList onSelect={(id) => setParam("run", id)} runs={visible} selectedId={selectedId} stagesByRun={stagesByRun} />
        )}
      </PanelFrame>

      {selectedId ? (
        <PanelFrame
          action={
            <button
              className="min-h-11 rounded-full px-4 text-xs uppercase tracking-[0.18em] hover:bg-[hsl(var(--muted))]"
              onClick={() => setParam("run", null)}
              type="button"
            >
              Close
            </button>
          }
          title="Run detail"
        >
          <RunDetailContainer
            key={selectedId}
            onNotice={setNotice}
            runId={selectedId}
            seed={visible.find((run) => run.id === selectedId)}
          />
        </PanelFrame>
      ) : null}
    </section>
  );
}
