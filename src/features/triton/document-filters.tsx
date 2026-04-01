import { cn } from "@/lib/cn";

type DocumentFiltersProps = {
  onSearchChange?: (value: string) => void;
  onTypeChange?: (value: string) => void;
  searchQuery: string;
  typeFilter: string;
};

const typeOptions = ["all", "web", "audio", "pdf", "image", "tweet", "video"];

export function DocumentFilters({
  onSearchChange = () => {},
  onTypeChange = () => {},
  searchQuery,
  typeFilter,
}: DocumentFiltersProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Basic text search</label>
        <input
          className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))]"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, content, or source"
          value={searchQuery}
        />
      </div>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Type filter</div>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => {
            const active = option === typeFilter;

            return (
              <button
                key={option}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition duration-200",
                  active
                    ? "border-emerald-400/60 bg-emerald-500/12 text-emerald-200"
                    : "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
                )}
                onClick={() => onTypeChange(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
