import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const kairosRoot = path.resolve(currentDir, "../../..");
const poseidonSpecPath = path.join(kairosRoot, ".cache-specs/poseidon/openapi.json");
const poseidonSdkPath = path.join(kairosRoot, "src/api/poseidon/sdk.gen.ts");
const poseidonTypesPath = path.join(kairosRoot, "src/api/poseidon/types.gen.ts");

// Funding rates moved to Thalassa in v12 (Poseidon no longer owns market data); the other chart inputs stay on Poseidon.
const requiredResearchPaths = ["/api/data/ohlcv", "/api/backtest/{backtest_id}/trades", "/api/backtest/{backtest_id}/equity-curve"];
const thalassaSdkPath = path.join(kairosRoot, "src/api/thalassa/sdk.gen.ts");
const requiredThalassaPaths = ["/api/v1/funding-rates"];

describe("Poseidon research API contract", () => {
  // The cached spec is gitignored local state; only assert against it when present.
  it.skipIf(!existsSync(poseidonSpecPath))("includes chart endpoints in the cached OpenAPI spec", () => {
    const spec = JSON.parse(readFileSync(poseidonSpecPath, "utf8")) as { paths: Record<string, unknown> };

    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(requiredResearchPaths));
  });

  it("exposes chart endpoints through the generated SDK", () => {
    const sdkSource = readFileSync(poseidonSdkPath, "utf8");
    const typesSource = readFileSync(poseidonTypesPath, "utf8");

    for (const endpoint of requiredResearchPaths) {
      expect(sdkSource).toContain(endpoint.replace(/^\/api/, ""));
      expect(typesSource).toContain(endpoint.replace(/^\/api/, ""));
    }
  });

  it("exposes funding rates through the generated Thalassa SDK", () => {
    const sdkSource = readFileSync(thalassaSdkPath, "utf8");

    for (const endpoint of requiredThalassaPaths) {
      expect(sdkSource).toContain(endpoint);
    }
  });
});
