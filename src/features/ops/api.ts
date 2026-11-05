import { queryOptions } from "@tanstack/react-query";

import { getBoardQueryKey } from "@/api/ops/@tanstack/react-query.gen";
import { getBoard } from "@/api/ops/sdk.gen";

import { OpsBoardError, parseBoard } from "./model";

export function boardOptions() {
  return queryOptions({
    queryFn: async ({ signal }) => {
      let data: unknown;
      try {
        ({ data } = await getBoard({ signal, throwOnError: true }));
      } catch (error) {
        if (signal.aborted) throw error;
        throw new OpsBoardError("讀不到 /ops/board.json（Kairos 的 Caddy 沒有回應或回了錯誤）");
      }
      return parseBoard(data);
    },
    queryKey: getBoardQueryKey(),
  });
}
