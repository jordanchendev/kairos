type PlaceholderPageProps = {
  description: string;
  pageId: string;
  phaseNote: string;
  title: string;
};

export function PlaceholderPage({ description, pageId, phaseNote, title }: PlaceholderPageProps) {
  return (
    <section className="space-y-6" data-page-id={pageId}>
      <div className="panel-surface overflow-hidden rounded-[32px]">
        <div className="grid-overlay px-6 py-10 lg:px-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsla(190,91%,37%,0.12)] px-3 py-1 text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
              {pageId}
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">{title}</h2>
            <p className="max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">{description}</p>
            <p className="text-sm uppercase tracking-[0.22em] text-[hsl(var(--accent))]">{phaseNote}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel-surface rounded-[28px] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Purpose</div>
          <div className="mt-3 text-lg font-medium text-[hsl(var(--foreground))]">Route-level shell readiness</div>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            This page exists to prove navigation, layout stability, and lazy chunk loading before real widgets land.
          </p>
        </div>
        <div className="panel-surface rounded-[28px] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Contract</div>
          <div className="mt-3 text-lg font-medium text-[hsl(var(--foreground))]">Typed APIs only</div>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Follow-on work must consume generated Poseidon and Triton clients through TanStack Query, not raw browser requests.
          </p>
        </div>
        <div className="panel-surface rounded-[28px] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Next</div>
          <div className="mt-3 text-lg font-medium text-[hsl(var(--foreground))]">Phase-owned content</div>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Replace this placeholder with production data widgets once the downstream feature phase for this domain begins.
          </p>
        </div>
      </div>
    </section>
  );
}
