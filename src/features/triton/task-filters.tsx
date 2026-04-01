import type { TaskStatus, TaskType } from "@/api/triton/types.gen";
import { cn } from "@/lib/cn";

const typeOptions: Array<{ label: string; value: TaskType | "all" }> = [
  { label: "all", value: "all" },
  { label: "youtube", value: "youtube" },
  { label: "podcast", value: "podcast" },
  { label: "video", value: "video" },
  { label: "audio", value: "audio" },
  { label: "pdf", value: "pdf" },
  { label: "image", value: "image" },
];

const statusOptions: Array<{ label: string; value: TaskStatus | "all" }> = [
  { label: "all", value: "all" },
  { label: "queued", value: "queued" },
  { label: "downloading", value: "downloading" },
  { label: "processing", value: "processing" },
  { label: "completed", value: "completed" },
  { label: "failed", value: "failed" },
];

type TaskFiltersProps = {
  activeStatus: TaskStatus | "all";
  activeType: TaskType | "all";
  onStatusChange?: (status: TaskStatus | "all") => void;
  onTypeChange?: (type: TaskType | "all") => void;
};

export function TaskFilters({
  activeStatus,
  activeType,
  onStatusChange = () => {},
  onTypeChange = () => {},
}: TaskFiltersProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FilterGroup activeValue={activeType} label="Type" onChange={onTypeChange} options={typeOptions} />
      <FilterGroup activeValue={activeStatus} label="Status" onChange={onStatusChange} options={statusOptions} />
    </div>
  );
}

type FilterGroupProps<TValue extends string> = {
  activeValue: TValue;
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
};

function FilterGroup<TValue extends string>({ activeValue, label, onChange, options }: FilterGroupProps<TValue>) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === activeValue;

          return (
            <button
              key={option.value}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition duration-200",
                active
                  ? "border-emerald-400/60 bg-emerald-500/12 text-emerald-200"
                  : "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
              )}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
