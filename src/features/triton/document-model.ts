import type { DocumentListResponse, DocumentResponse } from "@/api/triton/types.gen";

export type DocumentItemModel = {
  content: string;
  createdAt: string;
  id: string;
  sourceUrl: string | null;
  title: string;
  type: string;
};

export type DocumentListModel = {
  items: DocumentItemModel[];
  page: number;
  pageSize: number;
  total: number;
};

export function normalizeDocument(document: DocumentResponse): DocumentItemModel {
  return {
    content: document.content,
    createdAt: document.created_at,
    id: document.id,
    sourceUrl: document.source_url,
    title: document.title?.trim() || "Untitled document",
    type: document.type,
  };
}

export function normalizeDocuments(payload: DocumentListResponse): DocumentListModel {
  return {
    items: payload.documents.map(normalizeDocument).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    page: payload.page,
    pageSize: payload.page_size,
    total: payload.total,
  };
}

export function filterDocumentsByText(items: DocumentItemModel[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [item.title, item.content, item.type, item.sourceUrl ?? ""].some((field) => field.toLowerCase().includes(normalizedQuery)),
  );
}
