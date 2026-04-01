import { PanelFrame } from "@/features/monitoring/panel-frame";
import { cn } from "@/lib/cn";

import type { DocumentItemModel } from "./document-model";

type DocumentListPanelProps = {
  documents: DocumentItemModel[];
  onPageChange?: (page: number) => void;
  onSelectDocument?: (documentId: string) => void;
  page: number;
  pageSize: number;
  selectedDocumentId: string | null;
  total: number;
};

export function DocumentListPanel({
  documents,
  onPageChange = () => {},
  onSelectDocument = () => {},
  page,
  pageSize,
  selectedDocumentId,
  total,
}: DocumentListPanelProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PanelFrame
      description="Paginated document inventory with the active document kept in the adjacent detail pane."
      eyebrow="Index"
      title="Document list"
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const active = document.id === selectedDocumentId;

                return (
                  <tr key={document.id} className={cn("border-t border-white/8", active && "bg-emerald-500/8")}>
                    <td className="px-4 py-3">
                      <button className="cursor-pointer text-left text-[hsl(var(--foreground))]" onClick={() => onSelectDocument(document.id)} type="button">
                        <div className="font-medium">{document.title}</div>
                        <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{document.content.slice(0, 96)}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--foreground))]">{document.type}</td>
                    <td className="px-4 py-3 text-[hsl(var(--foreground))]">{document.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-[hsl(var(--muted-foreground))]">
          <div>
            Page {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 transition duration-200 hover:border-white/20 hover:text-[hsl(var(--foreground))]"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              type="button"
            >
              Prev
            </button>
            <button
              className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 transition duration-200 hover:border-white/20 hover:text-[hsl(var(--foreground))]"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
