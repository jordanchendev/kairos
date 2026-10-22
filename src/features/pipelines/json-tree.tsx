import { cn } from "@/lib/cn";

type JsonTreeProps = {
  /** Depth up to which containers start expanded. */
  defaultOpenDepth?: number;
  label?: string;
  value: unknown;
};

function primitive(value: unknown) {
  if (value === null) return <span className="text-slate-400">null</span>;
  if (typeof value === "string") return <span className="break-all text-emerald-200">&quot;{value}&quot;</span>;
  if (typeof value === "number") return <span className="text-sky-200">{String(value)}</span>;
  if (typeof value === "boolean") return <span className="text-amber-200">{String(value)}</span>;
  return <span className="text-slate-400">{String(value)}</span>;
}

function Node({ depth, label, openDepth, value }: { depth: number; label?: string; openDepth: number; value: unknown }) {
  const labelNode = label !== undefined ? <span className="text-[hsl(var(--muted-foreground))]">{label}: </span> : null;

  if (value === null || typeof value !== "object") {
    return (
      <div className="py-px pl-4">
        {labelNode}
        {primitive(value)}
      </div>
    );
  }

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>);
  const noun = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;

  if (entries.length === 0) {
    return (
      <div className="py-px pl-4">
        {labelNode}
        <span className="text-slate-400">{Array.isArray(value) ? "[]" : "{}"}</span>
      </div>
    );
  }

  return (
    <details open={depth < openDepth}>
      <summary className="cursor-pointer select-none py-px marker:text-slate-500">
        {labelNode}
        <span className="text-slate-400">{noun}</span>
      </summary>
      <div className="ml-2 border-l border-[hsl(var(--border))] pl-2">
        {entries.map(([key, item]) => (
          <Node depth={depth + 1} key={key} label={key} openDepth={openDepth} value={item} />
        ))}
      </div>
    </details>
  );
}

export function JsonTree({ defaultOpenDepth = 2, label, value }: JsonTreeProps) {
  return (
    <div className={cn("overflow-x-auto font-mono text-xs leading-5")} data-testid="json-tree">
      <Node depth={0} label={label} openDepth={defaultOpenDepth} value={value} />
    </div>
  );
}
