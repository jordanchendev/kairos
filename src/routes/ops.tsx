import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/features/monitoring/error-state";
import { getMonitoringQueryOptions } from "@/features/monitoring/query-config";
import { boardOptions } from "@/features/ops/api";
import { OpsBoardView } from "@/features/ops/board-view";

/** Re-renders every `intervalMs` so the board's age keeps counting between refetches. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Component() {
  const query = useQuery({ ...boardOptions(), ...getMonitoringQueryOptions("ops") });
  const nowMs = useNow(30_000);

  if (query.data) {
    return <OpsBoardView board={query.data} fetchFailed={query.isError} nowMs={nowMs} />;
  }
  if (query.isError) {
    return (
      <section className="space-y-6" data-page-id="ops">
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">流水線狀態</h1>
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "讀不到 /ops/board.json"}
          title="看板讀不到"
        />
      </section>
    );
  }
  return <div className="panel-surface h-[32rem] animate-pulse rounded-[28px]" data-page-id="ops" />;
}
