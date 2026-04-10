import type { TrainingRunResponse } from "./types";

type RunListTableProps = {
  limit: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onSelectRun: (runId: string) => void;
  page: number;
  runs: TrainingRunResponse[];
  selectedRunId: string | null;
  total: number;
};

// Stub — will be replaced in Task 2
export function RunListTable(_props: RunListTableProps) {
  return <div>Loading...</div>;
}
