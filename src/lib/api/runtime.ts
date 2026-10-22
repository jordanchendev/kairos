import { createClient, createConfig } from "@/api/poseidon/client";
import { client as pipelineClient } from "@/api/pipeline/client.gen";
import { client as poseidonClient } from "@/api/poseidon/client.gen";
import { client as thalassaClient } from "@/api/thalassa/client.gen";
import { client as tritonClient } from "@/api/triton/client.gen";
import { createPoseidonCompatibilityFetch } from "@/lib/api/poseidon-compat";

export const API_PROXY_BASES = {
  poseidonApiKey: import.meta.env.VITE_POSEIDON_API_KEY,
  // The pipeline key is injected by Caddy (KAIROS_PIPELINE_API_KEY); never a VITE_* variable.
  pipeline: import.meta.env.VITE_PIPELINE_PROXY_BASE ?? "/pipeline",
  poseidon: import.meta.env.VITE_POSEIDON_PROXY_BASE ?? "/poseidon",
  triton: import.meta.env.VITE_TRITON_PROXY_BASE ?? "/triton",
  thalassa: import.meta.env.VITE_THALASSA_PROXY_BASE ?? "/thalassa",
  thalassaApiKey: import.meta.env.VITE_THALASSA_API_KEY,
} as const;

export function hasPoseidonApiKey() {
  return Boolean(API_PROXY_BASES.poseidonApiKey);
}

export function syncRuntimeClients() {
  poseidonClient.setConfig({
    baseUrl: API_PROXY_BASES.poseidon,
    fetch: createPoseidonCompatibilityFetch(),
    headers: API_PROXY_BASES.poseidonApiKey
      ? {
          "X-API-Key": API_PROXY_BASES.poseidonApiKey,
        }
      : undefined,
  });

  pipelineClient.setConfig({
    baseUrl: API_PROXY_BASES.pipeline,
  });

  tritonClient.setConfig({
    baseUrl: API_PROXY_BASES.triton,
  });

  thalassaClient.setConfig({
    baseUrl: API_PROXY_BASES.thalassa,
    headers: API_PROXY_BASES.thalassaApiKey
      ? { "X-API-Key": API_PROXY_BASES.thalassaApiKey }
      : undefined,
  });
}

// Device key is browser-local (D-08/D-09); never a VITE_* build variable.
// It is read from localStorage at request time and only ever sent on the
// /poseidon-auth route, which Caddy proxies without injecting the legacy key.
export const DEVICE_KEY_STORAGE_KEY = "kairos.poseidon.deviceKey";
export const POSEIDON_AUTH_BASE = "/poseidon-auth";

const DEVICE_KEY_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const deviceKeyListeners = new Set<() => void>();

function notifyDeviceKeyListeners() {
  for (const listener of deviceKeyListeners) listener();
}

/** Subscribe to device-key changes in this tab (set/clear) and in other tabs (storage event). */
export function subscribeDeviceKey(listener: () => void) {
  deviceKeyListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DEVICE_KEY_STORAGE_KEY) listener();
  };
  const target = typeof window !== "undefined" && typeof window.addEventListener === "function" ? window : null;
  target?.addEventListener("storage", onStorage);
  return () => {
    deviceKeyListeners.delete(listener);
    target?.removeEventListener("storage", onStorage);
  };
}

function deviceKeyStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function isValidDeviceKey(key: string) {
  return DEVICE_KEY_PATTERN.test(key);
}

export function getDeviceKey(): string | null {
  const value = deviceKeyStorage()?.getItem(DEVICE_KEY_STORAGE_KEY) ?? null;
  return value && isValidDeviceKey(value) ? value : null;
}

export function setDeviceKey(key: string): void {
  if (!isValidDeviceKey(key)) {
    throw new Error("Device key format is invalid");
  }
  const storage = deviceKeyStorage();
  if (!storage) {
    throw new Error("Browser storage is unavailable");
  }
  storage.setItem(DEVICE_KEY_STORAGE_KEY, key);
  notifyDeviceKeyListeners();
}

export function clearDeviceKey(): void {
  deviceKeyStorage()?.removeItem(DEVICE_KEY_STORAGE_KEY);
  notifyDeviceKeyListeners();
}

export function hasDeviceKey(): boolean {
  return getDeviceKey() !== null;
}

/** True for TanStack query keys produced with `client: poseidonAuthClient` (keys carry the client baseUrl). */
export function isPoseidonAuthQueryKey(queryKey: readonly unknown[]) {
  const head = queryKey[0] as { baseUrl?: unknown } | undefined;
  return typeof head?.baseUrl === "string" && head.baseUrl === poseidonAuthClient.getConfig().baseUrl;
}

/**
 * Client for every decision-loop call (principal, decisions, traces, release lifecycle).
 * Uses plain fetch on purpose: the legacy compatibility fetch retries 404s on another path,
 * and a device key must never be replayed toward the legacy-key route.
 */
export const poseidonAuthClient = createClient(createConfig({ baseUrl: POSEIDON_AUTH_BASE }));

poseidonAuthClient.interceptors.request.use((request) => {
  const key = getDeviceKey();
  if (key) {
    request.headers.set("X-API-Key", key);
  } else {
    request.headers.delete("X-API-Key");
  }
  return request;
});
