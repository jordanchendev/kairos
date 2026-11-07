/** One Thalassa source as a panel sees it. A refetch that fails keeps the data it already has. */
export type Loadable<T> = { status: "loading" } | { message: string; status: "error" } | { data: T; status: "ready" };

export function fromQuery<T>(query: { data: T | undefined; error: unknown }): Loadable<T> {
  if (query.data !== undefined) return { data: query.data, status: "ready" };
  if (query.error) return { message: query.error instanceof Error ? query.error.message : "讀取失敗", status: "error" };
  return { status: "loading" };
}

/** What a panel renders: its view, or why it has none. */
export type Gate<V> = { status: "empty" } | { status: "loading" } | { message: string; status: "error" } | { status: "ready"; view: V };

export function gate<T, V>(source: Loadable<T>, derive: (data: T) => V | null): Gate<V> {
  if (source.status !== "ready") return source;
  const view = derive(source.data);
  return view === null ? { status: "empty" } : { status: "ready", view };
}
