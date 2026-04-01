import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskResponse } from "@/api/triton/types.gen";

const tasks: TaskResponse[] = [
  {
    completed_at: "2026-04-01T00:05:00Z",
    created_at: "2026-04-01T00:00:00Z",
    device: "gpu",
    error_message: null,
    id: "task-001",
    metadata: { language: "en" },
    result_text: "Alpha transcript body",
    source_url: "https://youtu.be/demo",
    started_at: "2026-04-01T00:01:00Z",
    status: "completed",
    step: "persisted",
    type: "youtube",
  },
  {
    completed_at: null,
    created_at: "2026-04-01T00:06:00Z",
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
];

describe("transcription route", () => {
  it("renders paginated task list, selected task detail, and dual-mode submission form", async () => {
    const routeModule = await import("@/routes/transcription-tasks");

    expect("TranscriptionTasksPage" in routeModule).toBe(true);

    if (!("TranscriptionTasksPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.TranscriptionTasksPage
        activeStatus="all"
        activeType="all"
        draftDevice="auto"
        draftSourceUrl="https://youtu.be/demo"
        draftType="youtube"
        onDraftChange={() => {}}
        onPageChange={() => {}}
        onSelectTask={() => {}}
        onStatusChange={() => {}}
        onTypeChange={() => {}}
        page={1}
        pageSize={20}
        selectedTaskId="task-001"
        tasks={tasks}
        total={2}
      />,
    );

    expect(markup).toContain("Transcription Tasks");
    expect(markup).toContain("task-001");
    expect(markup).toContain("task-002");
    expect(markup).toContain("Alpha transcript body");
    expect(markup).toContain("download_pending");
    expect(markup).toContain("New task");
    expect(markup).toContain("URL source");
    expect(markup).toContain("File upload");
    expect(markup).toContain("Submit to Triton");
  });

  it("renders an explicit empty state when Triton has no tasks", async () => {
    const routeModule = await import("@/routes/transcription-tasks");

    expect("TranscriptionTasksPage" in routeModule).toBe(true);

    if (!("TranscriptionTasksPage" in routeModule)) {
      return;
    }

    const markup = renderToStaticMarkup(
      <routeModule.TranscriptionTasksPage
        activeStatus="all"
        activeType="all"
        draftDevice="auto"
        draftSourceUrl=""
        draftType="youtube"
        onDraftChange={() => {}}
        onPageChange={() => {}}
        onSelectTask={() => {}}
        onStatusChange={() => {}}
        onTypeChange={() => {}}
        page={1}
        pageSize={20}
        selectedTaskId={null}
        tasks={[]}
        total={0}
      />,
    );

    expect(markup).toContain("No transcription tasks");
    expect(markup).toContain("Triton has not received any transcription or OCR jobs yet.");
  });
});
