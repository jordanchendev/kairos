import { defineConfig, type UserConfig } from "@hey-api/openapi-ts";

const sharedPlugins: UserConfig["plugins"] = [
  "@hey-api/typescript",
  "@hey-api/sdk",
  "@hey-api/client-fetch",
  {
    name: "@tanstack/react-query",
    mutationOptions: true,
    queryKeys: true,
    queryOptions: true,
  },
];

const service = process.env.OPENAPI_SERVICE ?? "";
if (service !== "" && service !== "poseidon" && service !== "thalassa" && service !== "ops") {
  throw new Error(`Unsupported OPENAPI_SERVICE: ${service}`);
}
if (service === "poseidon" && !process.env.OPENAPI_POSEIDON_INPUT?.trim()) {
  throw new Error("OPENAPI_SERVICE=poseidon requires an explicit OPENAPI_POSEIDON_INPUT");
}
if (service === "thalassa" && !process.env.OPENAPI_THALASSA_INPUT?.trim()) {
  throw new Error("OPENAPI_SERVICE=thalassa requires an explicit OPENAPI_THALASSA_INPUT");
}

const poseidonInput = process.env.OPENAPI_POSEIDON_INPUT ?? "./.cache-specs/poseidon/openapi.json";
const tritonInput = process.env.OPENAPI_TRITON_INPUT ?? "./.cache-specs/triton/openapi.json";
const thalassaInput = process.env.OPENAPI_THALASSA_INPUT ?? "./.cache-specs/thalassa/openapi.json";
const pipelineInput = process.env.OPENAPI_PIPELINE_INPUT ?? "./.cache-specs/pipeline/openapi.json";
// Checked in, not synced: the board is a static file with a hand-written spec.
const opsInput = "./openapi/ops.json";

const targets: UserConfig[] = [
  {
    input: poseidonInput,
    output: {
      lint: "eslint",
      path: "src/api/poseidon",
    },
    plugins: sharedPlugins,
  },
  {
    input: tritonInput,
    output: {
      lint: "eslint",
      path: "src/api/triton",
    },
    plugins: sharedPlugins,
  },
  {
    input: thalassaInput,
    output: {
      lint: "eslint",
      path: "src/api/thalassa",
    },
    plugins: sharedPlugins,
  },
  {
    input: pipelineInput,
    output: {
      lint: "eslint",
      path: "src/api/pipeline",
    },
    plugins: sharedPlugins,
  },
  {
    input: opsInput,
    output: {
      lint: "eslint",
      path: "src/api/ops",
    },
    plugins: sharedPlugins,
  },
];

const selected: Record<string, UserConfig[]> = {
  "": targets,
  ops: targets.slice(-1),
  poseidon: targets.slice(0, 1),
  thalassa: targets.slice(2, 3),
};

export default defineConfig(selected[service]);
