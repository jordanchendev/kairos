import { PlaceholderPage } from "@/routes/placeholder-page";

export function Component() {
  return (
    <PlaceholderPage
      description="Active perp positions, margin utilization, and liquidation posture live in this route."
      pageId="perp-positions"
      phaseNote="Filled by the core monitoring view phase."
      title="Perp Positions"
    />
  );
}
