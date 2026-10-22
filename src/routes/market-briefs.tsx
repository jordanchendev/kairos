import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { BriefMarkdown } from "@/features/market-briefs/brief-markdown";
import { EmptyState } from "@/features/monitoring/empty-state";
import { ErrorState } from "@/features/monitoring/error-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import {
  BRIEF_KINDS,
  briefIndexQueryOptions,
  briefKindLabel,
  briefMarkdownQueryOptions,
  findBrief,
  groupBriefsByDate,
  type BriefDocument,
  type BriefEntry,
  type BriefIndex,
} from "@/lib/briefs";
import { cn } from "@/lib/cn";

export type KindFilter = "all" | string;

export type BriefContentState =
  | { status: "pending" }
  | { message: string; status: "error" }
  | { document: BriefDocument; status: "success" };

type MarketBriefsPageProps = {
  content: BriefContentState | null;
  index: BriefIndex;
  kindFilter: KindFilter;
  onKindFilterChange?: (kind: KindFilter) => void;
  onSelect?: (brief: BriefEntry) => void;
  /** Explicit ?date=&kind= deep link, if any. */
  requested: { date: string | null; kind: string | null };
  selected: BriefEntry | null;
};

const kindTone: Record<string, string> = {
  "tw-postmarket": "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  "tw-premarket": "border-sky-500/40 bg-sky-500/10 text-sky-200",
  "us-postmarket": "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200",
  "us-premarket": "border-violet-500/40 bg-violet-500/10 text-violet-200",
};

export function KindChip({ className, kind }: { className?: string; kind: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.08em]",
        kindTone[kind] ?? "border-slate-400/25 bg-slate-400/10 text-slate-200",
        className,
      )}
    >
      {briefKindLabel(kind)}
    </span>
  );
}

function PageHeader({ index }: { index: BriefIndex | null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">Overview Route</div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">市場日報</h1>
        <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          台股與美股的盤前、盤後日報，唯讀檢視。資料來自 Nexus vault，由 macminim4 上的唯讀日報服務提供。
        </p>
      </div>
      {index ? (
        <div className="flex flex-col items-end gap-2">
          <StatusBadge label={`${index.briefs.length} 份日報`} status={index.briefs.length > 0 ? "up" : "idle"} />
          {index.generated_at ? (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">索引更新於 {index.generated_at}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function KindFilterBar({
  kinds,
  kindFilter,
  onKindFilterChange,
}: {
  kindFilter: KindFilter;
  kinds: string[];
  onKindFilterChange: (kind: KindFilter) => void;
}) {
  const options: KindFilter[] = ["all", ...kinds];
  return (
    <div aria-label="日報類型篩選" className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const active = option === kindFilter;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-[hsl(var(--accent))] bg-[hsla(190,91%,37%,0.16)] text-[hsl(var(--foreground))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]",
            )}
            key={option}
            onClick={() => onKindFilterChange(option)}
            type="button"
          >
            {option === "all" ? "全部" : briefKindLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function BriefList({
  briefs,
  onSelect,
  selected,
}: {
  briefs: BriefEntry[];
  onSelect: (brief: BriefEntry) => void;
  selected: BriefEntry | null;
}) {
  if (briefs.length === 0) {
    return <EmptyState message="這個類型目前沒有日報，請切換篩選。" title="沒有符合的日報" />;
  }

  return (
    <div className="space-y-5">
      {groupBriefsByDate(briefs).map((group) => (
        <section key={group.date}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
            {group.date}
          </h3>
          <div className="space-y-2">
            {group.briefs.map((brief) => {
              const active = selected?.file === brief.file;
              return (
                <button
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-[hsl(var(--accent))] bg-[hsla(190,91%,37%,0.12)]"
                      : "border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)] hover:bg-[hsl(var(--muted))]",
                  )}
                  key={brief.file}
                  onClick={() => onSelect(brief)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <KindChip kind={brief.kind} />
                    {brief.data_gaps.length > 0 ? (
                      <span className="text-[11px] font-medium text-amber-200">資料未齊</span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">{brief.title}</div>
                  {brief.summary ? (
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{brief.summary}</div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function BriefReader({
  content,
  requested,
  selected,
}: {
  content: BriefContentState | null;
  requested: MarketBriefsPageProps["requested"];
  selected: BriefEntry | null;
}) {
  if (!selected) {
    const label = [requested.date, requested.kind ? briefKindLabel(requested.kind) : null].filter(Boolean).join(" ");
    return (
      <EmptyState
        message={label ? `索引中找不到 ${label} 的日報，請從清單選擇其他日報。` : "從清單選擇一份日報。"}
        title={label ? "找不到指定的日報" : "尚未選擇日報"}
      />
    );
  }

  const frontmatter = content?.status === "success" ? content.document.frontmatter : null;
  const dataGaps = [...new Set([...selected.data_gaps, ...(frontmatter?.data_gaps ?? [])])];
  const meta = [
    selected.session_date ? `交易時段：${selected.session_date}` : null,
    frontmatter?.as_of ? `資料截至：${frontmatter.as_of}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PanelFrame
      action={<KindChip kind={selected.kind} />}
      className="min-w-0"
      description={meta || undefined}
      eyebrow={selected.date}
      title={frontmatter?.title ?? selected.title}
    >
      {dataGaps.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <span className="text-xs font-semibold text-amber-200">資料缺口</span>
          {dataGaps.map((gap) => (
            <span className="rounded-full border border-amber-500/40 px-2.5 py-0.5 text-[11px] text-amber-100" key={gap}>
              {gap}
            </span>
          ))}
        </div>
      ) : null}
      {content === null || content.status === "pending" ? (
        <div className="h-[28rem] animate-pulse rounded-[20px] bg-[hsla(0,0%,100%,0.04)]" />
      ) : content.status === "error" ? (
        <ErrorState message={content.message} title="日報內容無法載入" />
      ) : (
        <BriefMarkdown markdown={content.document.body} />
      )}
    </PanelFrame>
  );
}

export function MarketBriefsPage({
  content,
  index,
  kindFilter,
  onKindFilterChange = () => {},
  onSelect = () => {},
  requested,
  selected,
}: MarketBriefsPageProps) {
  const kinds = useMemo(() => {
    const present = new Set(index.briefs.map((brief) => brief.kind));
    const unknown = [...present].filter((kind) => !(BRIEF_KINDS as string[]).includes(kind)).sort();
    return [...BRIEF_KINDS, ...unknown];
  }, [index.briefs]);

  const visible = kindFilter === "all" ? index.briefs : index.briefs.filter((brief) => brief.kind === kindFilter);

  if (index.briefs.length === 0) {
    return (
      <section className="space-y-6" data-page-id="market-briefs">
        <PageHeader index={index} />
        <EmptyState message="日報服務的索引目前是空的。第一份日報產生後會出現在這裡。" title="尚無市場日報" />
      </section>
    );
  }

  return (
    <section className="space-y-6" data-page-id="market-briefs">
      <PageHeader index={index} />
      {index.rejected > 0 ? (
        <ErrorState
          message={`index.json 有 ${index.rejected} 筆項目格式不符（日期、類型或檔案路徑），已略過不顯示。`}
          title="部分日報索引無效"
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <PanelFrame
          className="min-w-0 self-start"
          description="依日期分組，最新在上。"
          eyebrow="Archive"
          title="日報清單"
        >
          <div className="space-y-5">
            <KindFilterBar kindFilter={kindFilter} kinds={kinds} onKindFilterChange={onKindFilterChange} />
            <BriefList briefs={visible} onSelect={onSelect} selected={selected} />
          </div>
        </PanelFrame>
        <div className="min-w-0">
          <BriefReader content={content} requested={requested} selected={selected} />
        </div>
      </div>
    </section>
  );
}

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const requested = { date: searchParams.get("date"), kind: searchParams.get("kind") };

  const indexQuery = useQuery(briefIndexQueryOptions());
  const index = indexQuery.data;

  const hasDeepLink = Boolean(requested.date || requested.kind);
  const selected = index
    ? hasDeepLink
      ? findBrief(index.briefs, requested)
      : findBrief(index.briefs, { kind: kindFilter === "all" ? null : kindFilter })
    : null;

  const markdownQuery = useQuery({
    ...briefMarkdownQueryOptions(selected?.file ?? ""),
    enabled: Boolean(selected),
  });

  if (indexQuery.error) {
    return (
      <section className="space-y-6" data-page-id="market-briefs">
        <PageHeader index={null} />
        <ErrorState
          message={indexQuery.error instanceof Error ? indexQuery.error.message : "市場日報索引無法載入。"}
          title="市場日報索引無法載入"
        />
      </section>
    );
  }

  if (indexQuery.isPending) {
    return <div className="panel-surface h-[42rem] animate-pulse rounded-[28px]" />;
  }

  const content: BriefContentState | null = !selected
    ? null
    : markdownQuery.error
      ? { message: markdownQuery.error instanceof Error ? markdownQuery.error.message : "日報內容無法載入。", status: "error" }
      : markdownQuery.data !== undefined
        ? { document: markdownQuery.data, status: "success" }
        : { status: "pending" };

  return (
    <MarketBriefsPage
      content={content}
      index={index ?? { briefs: [], generated_at: null, rejected: 0 }}
      kindFilter={kindFilter}
      onKindFilterChange={setKindFilter}
      onSelect={(brief) => setSearchParams({ date: brief.date, kind: brief.kind })}
      requested={requested}
      selected={selected}
    />
  );
}
