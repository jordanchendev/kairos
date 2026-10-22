import type { CSSProperties } from "react";

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import rehypeTrend from "@/features/market-briefs/rehype-trend";
import { cn } from "@/lib/cn";

function isRightAligned(style: CSSProperties | undefined) {
  return style?.textAlign === "right";
}

// Element map only: raw HTML is never rendered (no rehype-raw, skipHtml below). Inline
// <span style="color:…"> wrappers in the source are dropped; their text keeps the ▲/▼
// colouring from rehypeTrend via the trend-up / trend-down classes (src/index.css).
const components: Components = {
  a: ({ children, href, title }) => (
    <a
      className="text-[hsl(var(--accent))] underline underline-offset-2 hover:text-[hsl(var(--ring))]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={title}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-amber-100 [&_p]:text-amber-100">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => (
    <code className={cn("rounded-md bg-[hsl(var(--muted))] px-1.5 py-0.5 font-mono text-[0.85em]", className)}>{children}</code>
  ),
  h1: ({ children }) => <h1 className="mt-6 mb-3 text-2xl font-semibold text-[hsl(var(--foreground))] first:mt-0">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 border-b border-[hsl(var(--border))] pb-2 text-xl font-semibold text-[hsl(var(--foreground))] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-lg font-semibold text-[hsl(var(--foreground))]">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-4 mb-2 text-base font-semibold text-[hsl(var(--foreground))]">{children}</h4>,
  hr: () => <hr className="my-6 border-[hsl(var(--border))]" />,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6 text-sm leading-7">{children}</ol>,
  p: ({ children }) => <p className="my-3 text-sm leading-7 text-[hsl(var(--foreground))]">{children}</p>,
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 text-xs [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  strong: ({ children }) => <strong className="font-semibold text-[hsl(var(--foreground))]">{children}</strong>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-[hsl(var(--border))]" data-brief-table="">
      <table className="w-full min-w-max border-collapse text-sm">{children}</table>
    </div>
  ),
  td: ({ children, className, style }) => (
    <td
      className={cn(
        "border-t border-[hsl(var(--border))] px-3 py-2 align-top text-[hsl(var(--foreground))]",
        isRightAligned(style) && "whitespace-nowrap tabular-nums",
        className,
      )}
      style={style}
    >
      {children}
    </td>
  ),
  th: ({ children, style }) => (
    <th
      className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]"
      style={style}
    >
      {children}
    </th>
  ),
  thead: ({ children }) => <thead className="bg-[hsl(var(--muted))]">{children}</thead>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6 text-sm leading-7">{children}</ul>,
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeTrend];

type BriefMarkdownProps = {
  markdown: string;
};

export function BriefMarkdown({ markdown }: BriefMarkdownProps) {
  return (
    <div className="min-w-0 text-[hsl(var(--foreground))]" data-brief-markdown="">
      <Markdown components={components} rehypePlugins={rehypePlugins} remarkPlugins={remarkPlugins} skipHtml>
        {markdown}
      </Markdown>
    </div>
  );
}
