import type { TrainingRunDetailResponse } from "./types";

type RunDetailPanelProps = {
  onClose: () => void;
  run: TrainingRunDetailResponse;
};

// Stub — will be replaced in Task 2
export function RunDetailPanel(_props: RunDetailPanelProps) {
  return <div>Loading...</div>;
}
