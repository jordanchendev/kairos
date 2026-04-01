import { cn } from "@/lib/cn";

export type StressScenarioPreset = {
  description: string;
  id: string;
  label: string;
};

type StressScenarioTableProps = {
  activeScenario: string;
  onSelectScenario?: (scenarioId: string) => void;
  presets: StressScenarioPreset[];
};

export function StressScenarioTable({
  activeScenario,
  onSelectScenario = () => {},
  presets,
}: StressScenarioTableProps) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-white/8">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
          <tr>
            <th className="px-4 py-3 font-medium">Scenario</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {presets.map((preset) => {
            const active = preset.id === activeScenario;

            return (
              <tr key={preset.id} className={cn("border-t border-white/8", active && "bg-emerald-500/8")}>
                <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{preset.id}</td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{preset.description}</td>
                <td className="px-4 py-3">
                  <button
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition duration-200",
                      active
                        ? "border-emerald-400/60 bg-emerald-500/12 text-emerald-200"
                        : "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
                    )}
                    onClick={() => onSelectScenario(preset.id)}
                    type="button"
                  >
                    {active ? "Active" : preset.label}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
