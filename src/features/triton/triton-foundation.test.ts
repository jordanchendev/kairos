import { describe, expect, it } from "vitest";

describe("phase 33 triton foundation", () => {
  it("normalizes task payloads, document payloads, and local search behavior", async () => {
    const taskModule = await import("./task-model").catch(() => null);
    const documentModule = await import("./document-model").catch(() => null);

    expect(taskModule).not.toBeNull();
    expect(documentModule).not.toBeNull();

    if (!taskModule || !documentModule) {
      return;
    }

    const taskSummary = taskModule.summarizeTaskList({
      page: 1,
      page_size: 20,
      tasks: [
        {
          completed_at: "2026-04-01T00:05:00Z",
          created_at: "2026-04-01T00:00:00Z",
          device: "gpu",
          error_message: null,
          id: "task-001",
          metadata: { language: "en" },
          result_text: "alpha transcript",
          source_url: "https://youtu.be/demo",
          started_at: "2026-04-01T00:01:00Z",
          status: "completed",
          step: "persisted",
          type: "youtube",
        },
        {
          completed_at: null,
          created_at: "2026-04-01T00:03:00Z",
          device: "cpu",
          error_message: null,
          id: "task-002",
          metadata: null,
          result_text: null,
          source_url: null,
          started_at: null,
          status: "queued",
          step: "download_pending",
          type: "pdf",
        },
      ],
      total: 2,
    });

    const documents = documentModule.normalizeDocuments({
      documents: [
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
      ],
      page: 1,
      page_size: 20,
      total: 2,
    });
    const filtered = documentModule.filterDocumentsByText(documents.items, "semiconductors");

    expect(taskSummary.items[0]?.stepLabel).toBe("persisted");
    expect(taskSummary.items[0]?.preview).toContain("alpha transcript");
    expect(taskSummary.statusCounts).toEqual({
      completed: 1,
      downloading: 0,
      failed: 0,
      processing: 0,
      queued: 1,
    });
    expect(documents.items[0]?.title).toBe("Earnings Pod");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("doc-002");
  });

  it("defines explicit query freshness presets for triton routes", async () => {
    const monitoringModule = await import("../monitoring/query-config");

    expect(monitoringModule.monitoringQueryDefaults).toHaveProperty("indexedData");
    expect(monitoringModule.monitoringQueryDefaults).toHaveProperty("transcription");
    expect(monitoringModule.getMonitoringQueryOptions("indexedData")).toMatchObject({
      refetchOnReconnect: true,
    });
    expect(monitoringModule.getMonitoringQueryOptions("transcription")).toMatchObject({
      refetchOnReconnect: true,
    });
  });
});
