import { cn } from "@/lib/cn";

type MetricsViewerProps = {
  metrics: Record<string, number> | null;
};

/**
 * Qlib metrics that deserve special formatting/highlighting.
 */
const HIGHLIGHT_METRICS = new Set([
  "IC",
  "ICIR",
  "Rank IC",
  "Rank ICIR",
]);

const LOSS_METRICS = new Set(["mse", "mae", "loss"]);

function formatMetricValue(key: string, value: number): string {
  // IC/ICIR and rank variants get 6 decimal places
  if (HIGHLIGHT_METRICS.has(key)) {
    return value.toFixed(6);
  }
  // Loss metrics get 6 decimal places
  if (LOSS_METRICS.has(key)) {
    return value.toFixed(6);
  }
  // Integer-like values
  if (Number.isInteger(value)) {
    return String(value);
  }
  // Generic floats
  return value.toFixed(6);
}

export function MetricsViewer({ metrics }: MetricsViewerProps) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
          Metrics
        </div>
        <div className="rounded-[16px] border border-dashed border-white/12 bg-white/2 p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No metrics available
        </div>
      </div>
    );
  }

  const sortedKeys = Object.keys(metrics).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="space-y-3" data-section-id="metrics-viewer">
      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
        Metrics
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedKeys.map((key) => {
          const value = metrics[key];
          const isHighlight = HIGHLIGHT_METRICS.has(key);
          const isLoss = LOSS_METRICS.has(key);
          return (
            <div
              className={cn(
                "rounded-[14px] border bg-white/4 px-4 py-3",
                isHighlight
                  ? "border-cyan-500/30"
                  : isLoss
                    ? "border-amber-500/20"
                    : "border-white/8",
              )}
              key={key}
            >
              <div
                className={cn(
                  "text-[11px] uppercase tracking-[0.22em]",
                  isHighlight
                    ? "text-cyan-300"
                    : isLoss
                      ? "text-amber-300"
                      : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {key}
              </div>
              <div
                className={cn(
                  "mt-1 font-mono text-base font-semibold",
                  isHighlight
                    ? "text-cyan-100"
                    : isLoss
                      ? "text-amber-100"
                      : "text-[hsl(var(--foreground))]",
                )}
              >
                {formatMetricValue(key, value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
