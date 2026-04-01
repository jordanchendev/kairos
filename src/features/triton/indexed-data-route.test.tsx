import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DocumentResponse } from "@/api/triton/types.gen";

const documents: DocumentResponse[] = [
  {
    content: "Ethereum macro memo with liquidity commentary",
    created_at: "2026-04-01T00:00:00Z",
    id: "doc-001",
    metadata: { source: "memo" },
    source_url: "https://example.com/memo",
    title: "Macro Memo",
    type: "web",
  },
  {
    content: "Podcast transcript about semiconductors and NVDA",
    created_at: "2026-04-01T00:02:00Z",
    id: "doc-002",
    metadata: null,
    source_url: null,
    title: "Earnings Pod",
    type: "audio",
  },
];

describe("indexed data route", () => {
  it("renders paginated document list, type filter, basic text search, and selected detail", async () => {
    const routeModule = await import("@/routes/indexed-data");

    expect("IndexedDataPage" in routeModule).toBe(true);

    if (!("IndexedDataPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.IndexedDataPage
        documents={documents}
        onPageChange={() => {}}
        onSearchChange={() => {}}
        onSelectDocument={() => {}}
        onTypeChange={() => {}}
        page={1}
        pageSize={20}
        searchQuery="macro"
        selectedDocumentId="doc-001"
        total={2}
        typeFilter="all"
      />,
    );

    expect(markup).toContain("Indexed Data");
    expect(markup).toContain("Macro Memo");
    expect(markup).toContain("Earnings Pod");
    expect(markup).toContain("Basic text search");
    expect(markup).toContain("Type filter");
    expect(markup).toContain("Ethereum macro memo");
    expect(markup).toContain("Page 1 / 1");
  });

  it("renders an explicit empty state when Triton has no indexed documents", async () => {
    const routeModule = await import("@/routes/indexed-data");

    expect("IndexedDataPage" in routeModule).toBe(true);

    if (!("IndexedDataPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.IndexedDataPage
        documents={[]}
        onPageChange={() => {}}
        onSearchChange={() => {}}
        onSelectDocument={() => {}}
        onTypeChange={() => {}}
        page={1}
        pageSize={20}
        searchQuery=""
        selectedDocumentId={null}
        total={0}
        typeFilter="all"
      />,
    );

    expect(markup).toContain("No indexed documents");
    expect(markup).toContain("Triton has not stored any document payloads yet.");
  });
});
