import { client as poseidonClient } from "@/api/poseidon/client.gen";
import { client as tritonClient } from "@/api/triton/client.gen";

export const API_PROXY_BASES = {
  poseidonApiKey: import.meta.env.VITE_POSEIDON_API_KEY,
  poseidon: import.meta.env.VITE_POSEIDON_PROXY_BASE ?? "/api/poseidon",
  triton: import.meta.env.VITE_TRITON_PROXY_BASE ?? "/api/triton",
} as const;

export function hasPoseidonApiKey() {
  return Boolean(API_PROXY_BASES.poseidonApiKey);
}

export function syncRuntimeClients() {
  poseidonClient.setConfig({
    baseUrl: API_PROXY_BASES.poseidon,
    headers: API_PROXY_BASES.poseidonApiKey
      ? {
          "X-API-Key": API_PROXY_BASES.poseidonApiKey,
        }
      : undefined,
  });

  tritonClient.setConfig({
    baseUrl: API_PROXY_BASES.triton,
  });
}
