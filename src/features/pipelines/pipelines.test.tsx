import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "@/components/ui/dialog";
import { client as pipelineClient } from "@/api/pipeline/client.gen";
import { createIdempotencyScope } from "@/features/portfolio/decision-review-panel";
import { Component as PipelinesPage } from "@/routes/pipelines";

import { RunActionDialogBody, describeActionFailure, submitRunAction } from "./action-dialog";
import {
  PipelineApiError,
  eventsOptions,
  pipelineKeys,
  runOptions,
  sendRunAction,
  stagesOptions,
} from "./api";
import { attemptCellState, findSummary, pollInterval, rerunAvailability, stageCells } from "./model";
import { AttemptReport, EventsTimeline, RunActionButtons, StageColumns } from "./run-detail";
import { RunList } from "./run-list";
import type { PipelineRun, PipelineStages, StageAttempt, StageEntry } from "./types";

const BASE = "http://kairos.test/pipeline";

function attempt(stage: string, seq: number, over: Partial<StageAttempt> = {}): StageAttempt {
  return {
    artifact_json: null,
    artifact_sha256: "a".repeat(64),
    artifact_uri: null,
    attempt: 1,
    code_version: "e0cec87",
    created_at: "2026-10-22T15:45:12+00:00",
    error_json: null,
    finished_at: "2026-10-22T15:45:14+00:00",
    heartbeat_at: null,
    id: `${stage}-${over.attempt ?? 1}`,
    input_sha256: "b".repeat(64),
    lease_expires_at: null,
    reason: null,
    seq,
    stage,
    started_at: "2026-10-22T15:45:12+00:00",
    status: "completed",
    trigger: "advance",
    verdict: "pass",
    wait_until: null,
    ...over,
  };
}

function entry(stage: string, seq: number, attempts: StageAttempt[]): StageEntry {
  return { attempts, latest: attempts[attempts.length - 1] ?? null, seq, stage };
}

function run(over: Partial<PipelineRun> & { id: string; run_no: number }): PipelineRun {
  return {
    abort_requested_at: null,
    config_json: { stage_plan: ["spec_generate", "spec_validate", "backtest", "wfe"] },
    config_sha256: "1166d9fa0033a019fff78b0f74373e5066823a5ac1344af6ea9362ae9c3b7228",
    created_at: "2026-10-22T15:45:11+00:00",
    created_by: "strategy-bridge",
    current_stage: null,
    family_id: "9f25167e-1b8f-4ef1-80aa-41f39dc56132",
    finished_at: null,
    idea_text: "smoke test: RSI 30/70 on TX 5m",
    input_spec_json: {},
    market: "tw_futures",
    reason: null,
    revision: 7,
    source: "api",
    status: "completed",
    symbol: "TX",
    updated_at: "2026-10-22T15:45:16+00:00",
    ...over,
  };
}

const passed = run({ id: "run-pass", run_no: 1 });
const failed = run({ id: "run-fail", run_no: 2, idea_text: "x".repeat(200), status: "failed" });
const errored = run({ id: "run-err", run_no: 3, status: "error", revision: 4 });
const running = run({ id: "run-live", run_no: 4, status: "running" });

const stagesFor: Record<string, StageEntry[]> = {
  "run-pass": [
    entry("spec_generate", 0, [attempt("spec_generate", 0)]),
    entry("spec_validate", 1, [attempt("spec_validate", 1)]),
    entry("backtest", 2, [
      attempt("backtest", 2, {
        artifact_json: {
          files: [{ bytes: 1142, name: "trades.json", sha256: "e".repeat(64) }],
          report: { metrics: { sharpe: 1.19, trades: 42 }, summary: "backtest ✅ Sharpe 1.19 over 42 trades" },
        },
      }),
    ]),
    entry("wfe", 3, [attempt("wfe", 3, { status: "pending", verdict: null, finished_at: null })]),
  ],
  "run-fail": [
    entry("spec_generate", 0, [attempt("spec_generate", 0)]),
    entry("spec_validate", 1, [attempt("spec_validate", 1, { verdict: "fail" })]),
  ],
  "run-err": [
    entry("spec_generate", 0, [attempt("spec_generate", 0)]),
    entry("spec_validate", 1, [
      attempt("spec_validate", 1, { verdict: "error" }),
      attempt("spec_validate", 1, { attempt: 2, trigger: "retry", verdict: "unsupported" }),
    ]),
    entry("backtest", 2, [attempt("backtest", 2, { status: "running", verdict: null, finished_at: null })]),
    entry("wfe", 3, [attempt("wfe", 3, { status: "waiting", verdict: null, finished_at: null })]),
  ],
  "run-live": [entry("spec_generate", 0, [attempt("spec_generate", 0, { status: "running", verdict: null })])],
};

function cellStates(markup: string) {
  return Array.from(markup.matchAll(/data-state="([a-z_]+)"/g)).map((match) => match[1]);
}

describe("stage strip and list", () => {
  it("maps attempts to one cell per planned stage, in plan order", () => {
    const states = (id: string) => stageCells(["spec_generate", "spec_validate", "backtest", "wfe"], stagesFor[id]).map((c) => c.state);
    expect(states("run-pass")).toEqual(["pass", "pass", "pass", "pending"]);
    expect(states("run-fail")).toEqual(["pass", "fail", "not_reached", "not_reached"]);
    expect(states("run-err")).toEqual(["pass", "unsupported", "running", "waiting"]);
    expect(attemptCellState(attempt("s", 0, { status: "completed", verdict: "error" }))).toBe("error");
    expect(attemptCellState(attempt("s", 0, { status: "aborted", verdict: null }))).toBe("aborted");
  });

  it("renders run rows with truncated idea, status badge and the strip", () => {
    const markup = renderToStaticMarkup(
      <RunList onSelect={() => {}} runs={[passed, failed, errored]} selectedId={null} stagesByRun={stagesFor} />,
    );
    expect(markup).toContain("#1");
    expect(markup).toContain("#3");
    expect(markup).toContain('data-status="failed"');
    expect(markup).toContain("…");
    expect(markup).not.toMatch(/>x{100,}</);
    expect(markup).toMatch(/>x{79}…</);
    expect(cellStates(markup).slice(0, 4)).toEqual(["pass", "pass", "pass", "pending"]);
    expect(markup).toContain("repeating-linear-gradient");
  });
});

describe("actions availability", () => {
  it("disables rerun after fail and explains why", () => {
    const markup = renderToStaticMarkup(<RunActionButtons onAction={() => {}} run={{ status: "failed" }} />);
    const rerun = markup.match(/<span[^>]*title="([^"]*)"[^>]*><button[^>]*disabled=""[^>]*>Rerun/);
    expect(rerun?.[1]).toMatch(/Fail is final/);
    expect(markup).toContain("start a new run in the same family");
    expect(rerunAvailability("failed").enabled).toBe(false);
  });

  it("enables rerun for error|aborted|unsupported and abort for queued|running|waiting only", () => {
    for (const status of ["error", "aborted", "unsupported"] as const) {
      expect(rerunAvailability(status).enabled).toBe(true);
    }
    const errorMarkup = renderToStaticMarkup(<RunActionButtons onAction={() => {}} run={{ status: "error" }} />);
    expect(errorMarkup).not.toMatch(/disabled=""[^>]*>Rerun/);
    expect(errorMarkup).toMatch(/disabled=""[^>]*>Abort/);
    const liveMarkup = renderToStaticMarkup(<RunActionButtons onAction={() => {}} run={{ status: "waiting" }} />);
    expect(liveMarkup).not.toMatch(/disabled=""[^>]*>Abort/);
    expect(liveMarkup).toMatch(/disabled=""[^>]*>Rerun/);
  });

  it("requires a reason before the confirm button is enabled", () => {
    const body = (reason: string) =>
      renderToStaticMarkup(
        <Dialog open>
        <RunActionDialogBody
          consequence="c"
          errorMessage={null}
          kind="rerun"
          onCancel={() => {}}
          onReasonChange={() => {}}
          onSubmit={() => {}}
          pending={false}
          reason={reason}
        />
        </Dialog>,
      );
    expect(body("  ")).toMatch(/disabled=""[^>]*>Rerun/);
    expect(body("worker lost")).not.toMatch(/disabled=""[^>]*>Rerun/);
  });
});

describe("writes", () => {
  const calls: { body: string; headers: Headers; method: string; url: string }[] = [];
  let status = 202;

  beforeEach(() => {
    calls.length = 0;
    status = 202;
    pipelineClient.setConfig({ baseUrl: BASE });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init);
        calls.push({ body: await request.clone().text(), headers: request.headers, method: request.method, url: request.url });
        const body = status === 409 ? { detail: "revision mismatch" } : { id: "run-err", status: "queued", revision: 5 };
        return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, status });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends Idempotency-Key and expected_revision on rerun and abort", async () => {
    const scope = createIdempotencyScope(() => "key-1");
    await submitRunAction({ kind: "rerun", reason: " worker lost ", run: errored, scope });
    await submitRunAction({ kind: "abort", reason: "stop", run: running, scope: createIdempotencyScope(() => "key-2") });

    expect(calls[0].url).toBe(`${BASE}/api/v1/pipelines/run-err/rerun`);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.get("Idempotency-Key")).toBe("key-1");
    expect(JSON.parse(calls[0].body)).toEqual({ expected_revision: 4, reason: "worker lost" });
    expect(calls[1].url).toBe(`${BASE}/api/v1/pipelines/run-live/abort`);
    expect(calls[1].headers.get("Idempotency-Key")).toBe("key-2");
    expect(JSON.parse(calls[1].body)).toEqual({ expected_revision: 7, reason: "stop" });
  });

  it("reuses the key for a retry and mints a new one when the revision changes", async () => {
    let n = 0;
    const scope = createIdempotencyScope(() => `key-${++n}`);
    await submitRunAction({ kind: "rerun", reason: "again", run: errored, scope });
    await submitRunAction({ kind: "rerun", reason: "again", run: errored, scope });
    await submitRunAction({ kind: "rerun", reason: "again", run: { ...errored, revision: 5 }, scope });
    expect(calls.map((call) => call.headers.get("Idempotency-Key"))).toEqual(["key-1", "key-1", "key-2"]);
  });

  it("turns a 409 into a refresh notice", async () => {
    status = 409;
    const failure = await sendRunAction({
      expectedRevision: 1,
      idempotencyKey: "k",
      kind: "abort",
      reason: "r",
      runId: "run-live",
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(PipelineApiError);
    expect((failure as PipelineApiError).kind).toBe("conflict");
    const described = describeActionFailure(failure);
    expect(described.refresh).toBe(true);
    expect(described.message).toMatch(/changed underneath, refreshed/);
  });

  it("maps 403 to a role message without refreshing", async () => {
    status = 403;
    const failure = await sendRunAction({
      expectedRevision: 1,
      idempotencyKey: "k",
      kind: "abort",
      reason: "r",
      runId: "run-live",
    }).catch((error: unknown) => error);
    expect(describeActionFailure(failure)).toMatchObject({ refresh: false, message: expect.stringMatching(/researcher/) });
  });
});

describe("polling", () => {
  it("polls every 5 s while a run is queued or running, otherwise every 60 s", () => {
    expect(pollInterval(["completed", "running"])).toBe(5000);
    expect(pollInterval(["queued"])).toBe(5000);
    expect(pollInterval(["completed", "failed", "waiting", "error"])).toBe(60000);
    expect(pollInterval([])).toBe(60000);
  });
});

describe("detail pieces", () => {
  it("shows the gate summary prominently, the file manifest and a collapsible report", () => {
    const full = stagesFor["run-pass"][2].latest as StageAttempt;
    expect(findSummary(full.artifact_json)).toBe("backtest ✅ Sharpe 1.19 over 42 trades");
    const markup = renderToStaticMarkup(<AttemptReport attempt={full} />);
    expect(markup).toMatch(/data-testid="gate-summary"[^>]*>backtest ✅ Sharpe 1.19/);
    expect(markup).toContain("trades.json");
    expect(markup).toContain("<details");
    expect(markup).toContain("sharpe");
  });

  it("lists attempt history per stage and marks the selected attempt", () => {
    const markup = renderToStaticMarkup(
      <StageColumns
        onSelectAttempt={() => {}}
        plan={["spec_generate", "spec_validate", "backtest", "wfe"]}
        selected={{ attempt: 2, stage: "spec_validate" }}
        stages={stagesFor["run-err"]}
      />,
    );
    expect(markup).toContain("#1 error");
    expect(markup).toContain("#2 unsupported");
    expect(markup).toMatch(/aria-pressed="true"[^>]*>.*#2 unsupported/);
  });

  it("renders the event timeline", () => {
    const markup = renderToStaticMarkup(
      <EventsTimeline
        events={[
          {
            actor_id: "strategy-bridge",
            created_at: "2026-10-22T15:45:11+00:00",
            event_type: "run_created",
            expected_revision: 1,
            id: "e1",
            payload_json: { response: { id: "x" }, note: "hi" },
            stage_run_id: null,
          },
        ]}
      />,
    );
    expect(markup).toContain("run_created");
    expect(markup).toContain("strategy-bridge");
    expect(markup).toContain("note");
  });
});

describe("pipelines route", () => {
  function seeded() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const runs = [running, errored, failed, passed];
    client.setQueryData(pipelineKeys.list(null), { items: runs, limit: 50, offset: 0 });
    for (const item of runs) {
      client.setQueryData(stagesOptions(item.id).queryKey, { run_id: item.id, stages: stagesFor[item.id] } satisfies PipelineStages);
    }
    return client;
  }

  function render(url: string, client: QueryClient) {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>
          <PipelinesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("renders the list with a stage strip per run and the 5 s refresh note", () => {
    const markup = render("/pipelines", seeded());
    expect(markup).toContain('data-page-id="pipelines"');
    expect(markup).toContain("#4");
    expect(markup).toContain('data-status="running"');
    expect(markup).toContain("Refreshes every 5 s");
    expect(markup).not.toContain('data-testid="run-detail"');
  });

  it("falls back to the 60 s cadence when nothing is live", () => {
    const client = seeded();
    client.setQueryData(pipelineKeys.list(null), { items: [passed, failed], limit: 50, offset: 0 });
    expect(render("/pipelines", client)).toContain("Refreshes every 60 s");
  });

  it("opens the detail panel for ?run= with header, stage columns and events", () => {
    const client = seeded();
    client.setQueryData(runOptions("run-fail").queryKey, failed);
    client.setQueryData(eventsOptions("run-fail").queryKey, {
      items: [
        {
          actor_id: null,
          created_at: "2026-10-22T15:45:12+00:00",
          event_type: "stage_completed",
          expected_revision: null,
          id: "e2",
          payload_json: { verdict: "fail" },
          stage_run_id: null,
        },
      ],
      run_id: "run-fail",
    });
    const markup = render("/pipelines?run=run-fail", client);
    expect(markup).toContain("Run #2");
    expect(markup).toContain("Revision");
    expect(markup).toContain("1166d9fa");
    expect(markup).toContain('data-testid="stage-columns"');
    expect(markup).toContain("stage_completed");
    expect(markup).toMatch(/disabled=""[^>]*>Rerun/);
  });
});
