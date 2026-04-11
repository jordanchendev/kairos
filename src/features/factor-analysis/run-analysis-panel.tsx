import { useEffect, useState } from "react";

import { ButtonHTMLAttributes } from "react";

import { ICTrendChart } from "@/features/factor-analysis/ic-trend-chart";
import { ShapleyBarChart } from "@/features/factor-analysis/shapley-bar-chart";
import { CentralityHeatmap } from "@/features/factor-analysis/centrality-heatmap";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { cn } from "@/lib/cn";

import type {
  CentralityTriggerPayload,
  FactorAnalysisRun,
  FactorAnalysisTab,
  ICTriggerPayload,
  ShapleyTriggerPayload,
} from "./types";

type RunAnalysisPanelProps = {
  activeTab: FactorAnalysisTab;
  isTriggering: boolean;
  onTrigger: (
    tab: FactorAnalysisTab,
    payload: ICTriggerPayload | ShapleyTriggerPayload | CentralityTriggerPayload,
  ) => void;
  run: FactorAnalysisRun | null;
  selectedMarket: string;
};

function TabButton({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
          : "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function RunAnalysisPanel({
  activeTab,
  isTriggering,
  onTrigger,
  run,
  selectedMarket,
}: RunAnalysisPanelProps) {
  const resolvedMarket = resolveApiMarket(selectedMarket);
  const [icMarket, setIcMarket] = useState(resolvedMarket);
  const [icStart, setIcStart] = useState("2025-01-01");
  const [icEnd, setIcEnd] = useState("2025-03-31");
  const [icHorizon, setIcHorizon] = useState("5");
  const [icFeatureList, setIcFeatureList] = useState("momentum_20, rsi_14");
  const [shapleyModelVersionId, setShapleyModelVersionId] = useState("");
  const [shapleyMaxSamples, setShapleyMaxSamples] = useState("500");
  const [centralityMarket, setCentralityMarket] = useState(resolvedMarket);
  const [centralityStart, setCentralityStart] = useState("2025-01-01");
  const [centralityEnd, setCentralityEnd] = useState("2025-03-31");
  const [centralityThreshold, setCentralityThreshold] = useState("0.7");
  const [centralitySignalsJson, setCentralitySignalsJson] = useState(
    JSON.stringify(
      [
        { label: "Momentum", type: "feature_above", column: "momentum_20", threshold: 0 },
        { label: "Mean Reversion", type: "feature_below", column: "rsi_14", threshold: 35 },
      ],
      null,
      2,
    ),
  );

  useEffect(() => {
    setIcMarket(resolvedMarket);
    setCentralityMarket(resolvedMarket);
  }, [resolvedMarket]);

  return (
    <div className="space-y-6">
      {activeTab === "ic" ? (
        <>
          <PanelFrame
            action={
              <button
                className="rounded-full border border-sky-400/40 bg-sky-400/15 px-4 py-2 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isTriggering}
                onClick={() =>
                  onTrigger("ic", {
                    end_date: icEnd,
                    features: splitCsv(icFeatureList),
                    horizons: [1, 5, 20],
                    interval: "1d",
                    market: icMarket,
                    start_date: icStart,
                  })
                }
                type="button"
              >
                {isTriggering ? "Submitting..." : "Run Analysis"}
              </button>
            }
            description="Compare factor rank IC across selected horizons."
            eyebrow="Trigger"
            title="IC Analysis"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LabeledInput label="Market" value={icMarket} onChange={setIcMarket} />
              <LabeledInput label="Start Date" value={icStart} onChange={setIcStart} />
              <LabeledInput label="End Date" value={icEnd} onChange={setIcEnd} />
              <LabeledInput label="Highlight Horizon" value={icHorizon} onChange={setIcHorizon} />
            </div>
            <div className="mt-4">
              <LabeledInput
                label="Features"
                value={icFeatureList}
                onChange={setIcFeatureList}
              />
            </div>
          </PanelFrame>
          <ICTrendChart horizon={icHorizon} run={run} />
        </>
      ) : null}

      {activeTab === "shapley" ? (
        <>
          <PanelFrame
            action={
              <button
                className="rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isTriggering || shapleyModelVersionId.trim().length === 0}
                onClick={() =>
                  onTrigger("shapley", {
                    max_samples: Number.parseInt(shapleyMaxSamples, 10) || 500,
                    model_version_id: shapleyModelVersionId.trim(),
                  })
                }
                type="button"
              >
                {isTriggering ? "Submitting..." : "Run Analysis"}
              </button>
            }
            description="Inspect mean absolute SHAP value by feature for a trained model version."
            eyebrow="Trigger"
            title="Feature Importance"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput
                label="Model Version ID"
                value={shapleyModelVersionId}
                onChange={setShapleyModelVersionId}
              />
              <LabeledInput
                label="Max Samples"
                value={shapleyMaxSamples}
                onChange={setShapleyMaxSamples}
              />
            </div>
          </PanelFrame>
          <ShapleyBarChart run={run} />
        </>
      ) : null}

      {activeTab === "centrality" ? (
        <>
          <PanelFrame
            action={
              <button
                className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/15 px-4 py-2 text-sm font-medium text-fuchsia-100 transition-colors hover:bg-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isTriggering}
                onClick={() =>
                  onTrigger("centrality", {
                    distance_threshold: Number.parseFloat(centralityThreshold) || 0.7,
                    end_date: centralityEnd,
                    interval: "1d",
                    market: centralityMarket,
                    start_date: centralityStart,
                    sub_signals: parseSignals(centralitySignalsJson),
                  })
                }
                type="button"
              >
                {isTriggering ? "Submitting..." : "Run Analysis"}
              </button>
            }
            description="Replay sub-signals and surface correlated clusters."
            eyebrow="Trigger"
            title="Signal Overlap"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LabeledInput label="Market" value={centralityMarket} onChange={setCentralityMarket} />
              <LabeledInput label="Start Date" value={centralityStart} onChange={setCentralityStart} />
              <LabeledInput label="End Date" value={centralityEnd} onChange={setCentralityEnd} />
              <LabeledInput label="Distance Threshold" value={centralityThreshold} onChange={setCentralityThreshold} />
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Sub-signals JSON
              </span>
              <textarea
                className="min-h-40 w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-sky-400/40"
                onChange={(event) => setCentralitySignalsJson(event.target.value)}
                value={centralitySignalsJson}
              />
            </label>
          </PanelFrame>
          <CentralityHeatmap run={run} />
        </>
      ) : null}
    </div>
  );
}

function resolveApiMarket(selectedMarket: string) {
  if (selectedMarket === "TW Equities") return "tw_stock";
  if (selectedMarket === "US Equities") return "us_stock";
  if (selectedMarket === "Crypto Perps") return "crypto_perp";
  return "tw_stock";
}

function LabeledInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <input
        className="w-full rounded-[16px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-sky-400/40"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function splitCsv(value: string) {
  const entries = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : undefined;
}

function parseSignals(value: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
