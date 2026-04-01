import type { ChangeEvent, FormEvent } from "react";

import type { DeviceType, TaskType } from "@/api/triton/types.gen";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { cn } from "@/lib/cn";

const uploadTypes: TaskType[] = ["video", "audio", "pdf", "image"];
const taskTypes: TaskType[] = ["youtube", "podcast", "video", "audio", "pdf", "image"];
const deviceTypes: DeviceType[] = ["auto", "gpu", "cpu"];

export type NewTaskDraft = {
  device: DeviceType;
  file: File | null;
  sourceUrl: string;
  type: TaskType;
};

type NewTaskFormProps = {
  draft: NewTaskDraft;
  onDraftChange?: (next: NewTaskDraft) => void;
  onSubmit?: () => void;
  submitting?: boolean;
};

export function NewTaskForm({ draft, onDraftChange = () => {}, onSubmit = () => {}, submitting = false }: NewTaskFormProps) {
  const uploadMode = uploadTypes.includes(draft.type);

  return (
    <PanelFrame
      description="URL source is used for streamed/web tasks; file upload is used for local media and OCR inputs."
      eyebrow="Submit"
      title="New task"
    >
      <form
        className="space-y-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="text-sm text-[hsl(var(--muted-foreground))]">Modes: URL source for streamed inputs, File upload for local media and OCR.</div>
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Task type</div>
          <div className="flex flex-wrap gap-2">
            {taskTypes.map((type) => {
              const active = type === draft.type;

              return (
                <button
                  key={type}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition duration-200",
                    active
                      ? "border-emerald-400/60 bg-emerald-500/12 text-emerald-200"
                      : "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
                  )}
                  onClick={() => onDraftChange({ ...draft, file: null, sourceUrl: "", type })}
                  type="button"
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Device</label>
            <select
              className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))]"
              onChange={(event) => onDraftChange({ ...draft, device: event.target.value as DeviceType })}
              value={draft.device}
            >
              {deviceTypes.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              {uploadMode ? "File upload" : "URL source"}
            </div>
            {uploadMode ? (
              <input
                className="block w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))]"
                onChange={(event: ChangeEvent<HTMLInputElement>) => onDraftChange({ ...draft, file: event.target.files?.[0] ?? null })}
                type="file"
              />
            ) : (
              <input
                className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))]"
                onChange={(event) => onDraftChange({ ...draft, sourceUrl: event.target.value })}
                placeholder="https://"
                value={draft.sourceUrl}
              />
            )}
          </div>
        </div>

        <button
          className="cursor-pointer rounded-full border border-emerald-400/60 bg-emerald-500/12 px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200 transition duration-200 hover:bg-emerald-500/18"
          disabled={submitting}
          type="submit"
        >
          Submit to Triton
        </button>
      </form>
    </PanelFrame>
  );
}
