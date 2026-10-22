import { useRef, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createIdempotencyScope } from "@/features/portfolio/decision-review-panel";

import { PipelineApiError, sendRunAction, type RunAction } from "./api";
import type { PipelineRun } from "./types";

export const ACTION_COPY: Record<
  RunAction,
  { confirm: string; consequence: (run: PipelineRun) => string; neutral: string; pending: string; success: string; title: string }
> = {
  abort: {
    confirm: "Abort run",
    consequence: (run) =>
      `Run #${run.run_no} stops at the next heartbeat. Pending and waiting attempts are aborted immediately; a running attempt cannot write its result afterwards.`,
    neutral: "Keep running",
    pending: "Aborting",
    success: "Abort requested.",
    title: "Abort pipeline run",
  },
  rerun: {
    confirm: "Rerun",
    consequence: (run) =>
      `Run #${run.run_no} restarts from its first stage that did not pass, as a new attempt. Passed upstream stages are reused and the run config cannot change.`,
    neutral: "Cancel",
    pending: "Requesting rerun",
    success: "Rerun queued.",
    title: "Rerun pipeline run",
  },
};

export const CONFLICT_NOTICE = "Run changed underneath, refreshed. Review the latest state and try again.";
export const FORBIDDEN_NOTICE =
  "The Kairos pipeline key is not allowed to do this (needs the researcher role).";

/** Maps a failed write to operator copy; `refresh` means the caller must refetch before anything else. */
export function describeActionFailure(error: unknown): { message: string; refresh: boolean } {
  const typed = error instanceof PipelineApiError ? error : new PipelineApiError("network", null, null);
  switch (typed.kind) {
    case "conflict":
      return { message: CONFLICT_NOTICE, refresh: true };
    case "forbidden":
      return { message: FORBIDDEN_NOTICE, refresh: false };
    case "invalid":
      return { message: typed.detail ?? "The runner rejected this request.", refresh: false };
    case "not_found":
      return { message: "Run no longer exists.", refresh: true };
    case "network":
      return { message: "Could not reach the pipeline runner. You can retry safely.", refresh: false };
    default:
      return { message: typed.detail ?? "The pipeline runner failed to handle the request.", refresh: false };
  }
}

export type IdempotencyScope = ReturnType<typeof createIdempotencyScope>;

/**
 * One idempotency key per unchanged click payload (action, run, expected revision, reason): a retry
 * reuses it, any change mints a new one. expected_revision is the revision of the latest fetch.
 */
export function submitRunAction(args: {
  kind: RunAction;
  reason: string;
  run: Pick<PipelineRun, "id" | "revision">;
  scope: IdempotencyScope;
  send?: typeof sendRunAction;
}) {
  const reason = args.reason.trim();
  const idempotencyKey = args.scope.keyFor(JSON.stringify([args.kind, args.run.id, args.run.revision, reason]));
  return (args.send ?? sendRunAction)({
    expectedRevision: args.run.revision,
    idempotencyKey,
    kind: args.kind,
    reason,
    runId: args.run.id,
  });
}

export type RunActionDialogBodyProps = {
  consequence: string;
  errorMessage: string | null;
  kind: RunAction;
  onCancel: () => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  reason: string;
};

export function RunActionDialogBody(props: RunActionDialogBodyProps) {
  const copy = ACTION_COPY[props.kind];
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{copy.title}</DialogTitle>
        <DialogDescription>{props.consequence}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.22em]" htmlFor="pipeline-action-reason">
          Reason (required)
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent p-3 text-sm"
          disabled={props.pending}
          id="pipeline-action-reason"
          maxLength={1024}
          onChange={(event) => props.onReasonChange(event.target.value)}
          required
          value={props.reason}
        />
        {props.errorMessage ? (
          <p className="text-sm text-rose-200" role="alert">
            {props.errorMessage}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus className="min-h-11" disabled={props.pending} onClick={props.onCancel} variant="outline">
            {copy.neutral}
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={props.pending || props.reason.trim() === ""}
            onClick={props.onSubmit}
            variant={props.kind === "abort" ? "destructive" : "default"}
          >
            {props.pending ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : null}
            {props.pending ? copy.pending : copy.confirm}
          </Button>
        </div>
      </div>
    </>
  );
}

export function RunActionDialog({
  kind,
  onClose,
  onDone,
  run,
}: {
  kind: RunAction;
  onClose: () => void;
  /** `refreshed` is true when the write lost a race (409) and the page must refetch. */
  onDone: (result: { message: string; ok: boolean; refreshed: boolean }) => void;
  run: PipelineRun;
}) {
  const scope = useRef(createIdempotencyScope());
  const inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: () => submitRunAction({ kind, reason, run, scope: scope.current }) });

  const submit = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    mutation.mutate(undefined, {
      onError: (failure) => {
        const { message, refresh } = describeActionFailure(failure);
        if (refresh) {
          scope.current.reset();
          onDone({ message, ok: false, refreshed: true });
        } else {
          setError(message);
        }
      },
      onSettled: () => {
        inFlight.current = false;
      },
      onSuccess: () => {
        scope.current.reset();
        onDone({ message: ACTION_COPY[kind].success, ok: true, refreshed: false });
      },
    });
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          scope.current.reset();
          onClose();
        }
      }}
      open
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <RunActionDialogBody
          consequence={ACTION_COPY[kind].consequence(run)}
          errorMessage={error}
          kind={kind}
          onCancel={() => {
            scope.current.reset();
            onClose();
          }}
          onReasonChange={setReason}
          onSubmit={submit}
          pending={mutation.isPending}
          reason={reason}
        />
      </DialogContent>
    </Dialog>
  );
}
