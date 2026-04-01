import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";

import type { DocumentItemModel } from "./document-model";

type DocumentDetailPanelProps = {
  document: DocumentItemModel | null;
};

export function DocumentDetailPanel({ document }: DocumentDetailPanelProps) {
  return (
    <PanelFrame
      description="Full text stays visible here while the left pane handles filter and pagination changes."
      eyebrow="Detail"
      title="Selected document"
    >
      {document ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard detail="Document title" label="Title" value={document.title} />
            <MetricCard detail="Stored document type" label="Type" value={document.type} />
            <MetricCard detail="Source URL when provided" label="Source" value={document.sourceUrl ?? "n/a"} />
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Full content</div>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-[hsl(var(--foreground))]">{document.content}</pre>
          </div>
        </div>
      ) : (
        <div className="text-sm text-[hsl(var(--muted-foreground))]">Select a document to inspect its full indexed content.</div>
      )}
    </PanelFrame>
  );
}
