import { defineConfig } from "@hey-api/openapi-ts";

const sharedPlugins = [
  "@hey-api/typescript",
  "@hey-api/sdk",
  "@hey-api/client-fetch",
  {
    name: "@tanstack/react-query",
    mutationOptions: true,
    queryKeys: true,
    queryOptions: true,
  },
] as const;

const poseidonInput = process.env.OPENAPI_POSEIDON_INPUT ?? "http://localhost:8001/openapi.json";
const tritonInput = process.env.OPENAPI_TRITON_INPUT ?? "http://localhost:8000/openapi.json";

export default defineConfig([
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
]);
