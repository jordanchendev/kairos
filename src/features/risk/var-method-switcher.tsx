import { cn } from "@/lib/cn";

type VarMethodSwitcherProps = {
  methods: string[];
  onSelectMethod?: (method: string) => void;
  selectedMethod: string | null;
};

export function VarMethodSwitcher({
  methods,
  onSelectMethod = () => {},
  selectedMethod,
}: VarMethodSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {methods.map((method) => {
        const active = method === selectedMethod;

        return (
          <button
            key={method}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition duration-200",
              active
                ? "border-emerald-400/60 bg-emerald-500/12 text-emerald-200"
                : "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
            )}
            onClick={() => onSelectMethod(method)}
            type="button"
          >
            {method}
          </button>
        );
      })}
    </div>
  );
}
