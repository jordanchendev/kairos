import { useDeferredValue, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getDocumentDocumentsDocumentIdGetOptions,
  listDocumentsDocumentsGetOptions,
} from "@/api/triton/@tanstack/react-query.gen";
import type { DocumentResponse } from "@/api/triton/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { DocumentDetailPanel } from "@/features/triton/document-detail-panel";
import { DocumentFilters } from "@/features/triton/document-filters";
import { filterDocumentsByText, normalizeDocuments } from "@/features/triton/document-model";
import { DocumentListPanel } from "@/features/triton/document-list-panel";

type IndexedDataPageProps = {
  documents: DocumentResponse[];
  onPageChange?: (page: number) => void;
  onSearchChange?: (value: string) => void;
  onSelectDocument?: (documentId: string) => void;
  onTypeChange?: (value: string) => void;
  page: number;
  pageSize: number;
  searchQuery: string;
  selectedDocumentId: string | null;
  total: number;
  typeFilter: string;
};

export function IndexedDataPage({
  documents,
  onPageChange = () => {},
  onSearchChange = () => {},
  onSelectDocument = () => {},
  onTypeChange = () => {},
  page,
  pageSize,
  searchQuery,
  selectedDocumentId,
  total,
  typeFilter,
}: IndexedDataPageProps) {
  if (documents.length === 0) {
    return (
      <section className="space-y-6" data-page-id="indexed-data">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Triton Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Indexed Data</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Search-first document retrieval workspace for Triton indexed payloads.
          </p>
        </div>

        <EmptyState message="Triton has not stored any document payloads yet." title="No indexed documents" />
      </section>
    );
  }

  const normalized = normalizeDocuments({ documents, page, page_size: pageSize, total });
  const filtered = filterDocumentsByText(normalized.items, searchQuery);
  const selectedDocument =
    filtered.find((document) => document.id === selectedDocumentId) ??
    normalized.items.find((document) => document.id === selectedDocumentId) ??
    filtered[0] ??
    normalized.items[0] ??
    null;

  return (
    <section className="space-y-6" data-page-id="indexed-data">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Triton Route</div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Indexed Data</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Directory-style document browsing with top-level search, type narrowing, and adjacent full-text detail.
          </p>
        </div>
        <StatusBadge label={`${total} documents`} status="up" />
      </div>

      <PanelFrame
        description="Keep search and type narrowing at the top of the route so browsing always starts from a search-first workspace."
        eyebrow="Search"
        title="Document controls"
      >
        <DocumentFilters onSearchChange={onSearchChange} onTypeChange={onTypeChange} searchQuery={searchQuery} typeFilter={typeFilter} />
      </PanelFrame>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <DocumentListPanel
          documents={normalized.items}
          onPageChange={onPageChange}
          onSelectDocument={onSelectDocument}
          page={page}
          pageSize={pageSize}
          selectedDocumentId={selectedDocument?.id ?? null}
          total={total}
        />
        <DocumentDetailPanel document={selectedDocument} />
      </div>
    </section>
  );
}

export function Component() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const documentsQuery = useQuery({
    ...listDocumentsDocumentsGetOptions({
      query: {
        page,
        page_size: 20,
        type: typeFilter === "all" ? undefined : typeFilter,
      },
    }),
    ...getMonitoringQueryOptions("indexedData"),
  });

  const selectedDocument = useMemo(
    () => (documentsQuery.data?.documents ?? []).find((document) => document.id === selectedDocumentId) ?? documentsQuery.data?.documents?.[0] ?? null,
    [documentsQuery.data?.documents, selectedDocumentId],
  );

  const documentDetailQuery = useQuery({
    ...(selectedDocument
      ? getDocumentDocumentsDocumentIdGetOptions({
          path: {
            document_id: selectedDocument.id,
          },
        })
      : getDocumentDocumentsDocumentIdGetOptions({
          path: {
            document_id: "pending",
          },
        })),
    ...getMonitoringQueryOptions("indexedData"),
    enabled: Boolean(selectedDocument?.id),
  });

  const error = documentsQuery.error ?? documentDetailQuery.error;

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Indexed documents could not be loaded from Triton."} />;
  }

  if (documentsQuery.isPending) {
    return <div className="panel-surface h-[38rem] animate-pulse rounded-[28px]" />;
  }

  const mergedDocuments =
    selectedDocument && documentDetailQuery.data
      ? documentsQuery.data?.documents?.map((document) => (document.id === selectedDocument.id ? documentDetailQuery.data ?? document : document)) ?? []
      : documentsQuery.data?.documents ?? [];

  return (
    <IndexedDataPage
      documents={mergedDocuments}
      onPageChange={setPage}
      onSearchChange={setSearchQuery}
      onSelectDocument={setSelectedDocumentId}
      onTypeChange={setTypeFilter}
      page={page}
      pageSize={20}
      searchQuery={deferredSearchQuery}
      selectedDocumentId={selectedDocumentId}
      total={documentsQuery.data?.total ?? 0}
      typeFilter={typeFilter}
    />
  );
}
