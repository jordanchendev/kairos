import type { ReactNode } from "react";

import { AlertTriangle, Clock, RadioTower, Send } from "lucide-react";

import type { Board, Part, PendingPush, Pipeline } from "@/api/ops/types.gen";
import { EmptyState } from "@/features/monitoring/empty-state";
import { MetricCard } from "@/features/monitoring/metric-card";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { monitoringQueryDefaults } from "@/features/monitoring/query-config";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { cn } from "@/lib/cn";

import {
  STALE_AFTER_MINUTES,
  boardAgeMinutes,
  feedView,
  formatRelative,
  formatTaipei,
  formatUtc,
  isStale,
  sortPipelines,
  stateTone,
  type Tone,
} from "./model";

const badgeStatus = { danger: "down", neutral: "idle", ok: "up", warning: "degraded" } as const;
const metricTone = { danger: "danger", neutral: "neutral", ok: "positive", warning: "warning" } as const;
const bannerTone = {
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-100",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
} as const;

function Banner({ children, tone }: { children: ReactNode; tone: keyof typeof bannerTone }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6", bannerTone[tone])} role="status">
      <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Stamp({ iso, nowMs }: { iso: string | null; nowMs: number }) {
  if (!iso) return <span className="text-[hsl(var(--muted-foreground))]">—</span>;
  const relative = formatRelative(iso, nowMs);
  return (
    <time dateTime={iso} title={formatTaipei(iso)}>
      {formatUtc(iso)}
      {relative ? <span className="text-[hsl(var(--muted-foreground))]">（{relative}）</span> : null}
    </time>
  );
}

function StateBadge({ verdict }: { verdict: Pick<Part, "label" | "needs_attention" | "state"> }) {
  return <StatusBadge label={verdict.label} status={badgeStatus[stateTone(verdict.state, verdict.needs_attention)]} />;
}

function PendingNote({ push }: { push: PendingPush }) {
  return (
    <p className="flex items-center gap-2 text-xs text-amber-200">
      <Send className="h-3.5 w-3.5" />
      推播待送：{push.to === "red" ? "紅燈" : "恢復"}
      {push.error ? `（${push.error}）` : "（等 bridge 確認）"}
    </p>
  );
}

function PartsTable({ nowMs, parts }: { nowMs: number; parts: Part[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-xs text-[hsl(var(--muted-foreground))]">
          <tr>
            <th className="py-2 pr-3 font-medium">部分</th>
            <th className="py-2 pr-3 font-medium">狀態</th>
            <th className="py-2 pr-3 font-medium">原因</th>
            <th className="py-2 pr-3 font-medium">預定</th>
            <th className="py-2 font-medium">證據</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr className="border-t border-[hsl(var(--border))] align-top" data-part={part.part} key={part.part}>
              <td className="py-2 pr-3 font-medium text-[hsl(var(--foreground))]">{part.part}</td>
              <td className="py-2 pr-3">
                <StateBadge verdict={part} />
              </td>
              <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))]">{part.reason}</td>
              <td className="whitespace-nowrap py-2 pr-3">
                <Stamp iso={part.expected_at} nowMs={nowMs} />
              </td>
              <td className="whitespace-nowrap py-2">
                <Stamp iso={part.evidence_at} nowMs={nowMs} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipelineCard({ nowMs, pending, pipeline }: { nowMs: number; pending?: PendingPush; pipeline: Pipeline }) {
  const single = pipeline.parts.length === 1 ? pipeline.parts[0] : null;
  return (
    <article
      className={cn(
        "rounded-[24px] border p-4 lg:p-5",
        pipeline.needs_attention
          ? "border-rose-500/50 bg-rose-500/[0.07]"
          : "border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)]",
      )}
      data-needs-attention={pipeline.needs_attention ? "true" : "false"}
      data-pipeline-id={pipeline.id}
      data-state={pipeline.state}
    >
      <header className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{pipeline.name}</h3>
        <span className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
          {pipeline.host}
        </span>
        <StateBadge verdict={pipeline} />
        {pipeline.needs_attention ? (
          <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-100">需要處理</span>
        ) : null}
      </header>
      <p className="mt-3 text-sm leading-6 text-[hsl(var(--foreground))]">{pipeline.reason}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-[hsl(var(--muted-foreground))]">預定</dt>
          <dd>
            <Stamp iso={pipeline.expected_at} nowMs={nowMs} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[hsl(var(--muted-foreground))]">寬限到（{pipeline.grace_minutes} 分鐘）</dt>
          <dd>
            <Stamp iso={pipeline.deadline_at} nowMs={nowMs} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[hsl(var(--muted-foreground))]">證據</dt>
          <dd>
            <Stamp iso={pipeline.evidence_at} nowMs={nowMs} />
          </dd>
        </div>
      </dl>
      {pending ? (
        <div className="mt-3">
          <PendingNote push={pending} />
        </div>
      ) : null}
      {single ? (
        <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">部分：{single.part}</p>
      ) : pipeline.parts.length > 1 ? (
        <div className="mt-4">
          <PartsTable nowMs={nowMs} parts={pipeline.parts} />
        </div>
      ) : null}
    </article>
  );
}

type OpsBoardViewProps = {
  board: Board;
  /** The last refetch failed; `board` is the previous good copy. */
  fetchFailed?: boolean;
  nowMs: number;
};

export function OpsBoardView({ board, fetchFailed = false, nowMs }: OpsBoardViewProps) {
  const pipelines = sortPipelines(board.pipelines);
  const red = pipelines.filter((pipeline) => pipeline.needs_attention);
  const age = boardAgeMinutes(board, nowMs);
  const stale = isStale(age);
  const feed = board.feeds?.macminim4;
  const feedState = feedView(feed);
  const notify = board.notify ?? {};
  const pendingCount = Object.keys(notify).length;
  const ageTone: Tone = stale ? "danger" : "ok";

  return (
    <section className="space-y-6" data-page-id="ops">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">System Route</div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">流水線狀態</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          每條流水線最近一次預定的執行有沒有發生。「需要處理」是失敗，或逾時超過寬限時間；紅燈與恢復另外推到 Oceanus
          🚨 告警。這一頁只讀，不提供重跑或修復。
        </p>
      </div>

      {fetchFailed ? (
        <Banner tone="warning">最近一次讀取 board.json 失敗，下面是上一次讀到的看板。</Banner>
      ) : null}
      {stale ? (
        <Banner tone="danger">
          <span data-stale="true">
            看板{age === null ? "的寫入時間讀不出來" : `已 ${age} 分鐘沒有更新`}（最後寫入 {formatUtc(board.now)}）。收集
            cron 每 5 分鐘跑一次，超過 {STALE_AFTER_MINUTES} 分鐘表示 tick 停了，下面的狀態可能過時。
          </span>
        </Banner>
      ) : null}
      {feedState.tone === "danger" || feedState.tone === "warning" ? (
        <Banner tone={feedState.tone}>
          <span data-feed-outage={feed?.long ? "long" : "short"}>
            macminim4 資料來源{feedState.title}：{feedState.detail}
          </span>
        </Banner>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          delta={red.length > 0 ? red.map((pipeline) => pipeline.name).join("、") : "全部正常或在寬限內"}
          deltaTone={red.length > 0 ? "danger" : "positive"}
          icon={<AlertTriangle className="h-5 w-5" />}
          label="需要處理"
          value={`${red.length} 條`}
        />
        <MetricCard
          delta={stale ? `超過 ${STALE_AFTER_MINUTES} 分鐘，看板可能過時` : "每 5 分鐘更新"}
          deltaTone={metricTone[ageTone]}
          detail={formatUtc(board.now)}
          icon={<Clock className="h-5 w-5" />}
          label="看板更新"
          value={age === null ? "不明" : age === 0 ? "剛剛" : `${age} 分鐘前`}
        />
        <MetricCard
          delta={feedState.detail}
          deltaTone={metricTone[feedState.tone]}
          icon={<RadioTower className="h-5 w-5" />}
          label="macminim4 資料來源"
          value={feedState.title}
        />
        <MetricCard
          delta={pendingCount > 0 ? "等 bridge 回 telegram_sent" : "沒有待送的推播"}
          deltaTone={pendingCount > 0 ? "warning" : "neutral"}
          icon={<Send className="h-5 w-5" />}
          label="待送推播"
          value={`${pendingCount} 則`}
        />
      </div>

      <PanelFrame
        description={`需要處理的排最前面，其餘依嚴重程度。每 ${monitoringQueryDefaults.ops.refetchInterval / 1000} 秒重新讀取一次。`}
        title="流水線"
      >
        {pipelines.length === 0 ? (
          <EmptyState message="board.json 的 pipelines 是空的：登記表沒有任何流水線。" title="沒有流水線" />
        ) : (
          <div className="space-y-4">
            {pipelines.map((pipeline) => (
              <PipelineCard key={pipeline.id} nowMs={nowMs} pending={notify[pipeline.id]} pipeline={pipeline} />
            ))}
          </div>
        )}
      </PanelFrame>
    </section>
  );
}
