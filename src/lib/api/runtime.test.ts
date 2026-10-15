import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Client as PoseidonClient } from "@/api/poseidon/client";

const poseidonSetConfig = vi.fn();
const tritonSetConfig = vi.fn();

vi.mock("@/api/poseidon/client.gen", () => ({
  client: {
    setConfig: poseidonSetConfig,
  },
}));

vi.mock("@/api/triton/client.gen", () => ({
  client: {
    setConfig: tritonSetConfig,
  },
}));

describe("api runtime", () => {
  beforeEach(() => {
    poseidonSetConfig.mockClear();
    tritonSetConfig.mockClear();
  });

  it("uses service namespaces instead of double-prefix api bases", async () => {
    const { API_PROXY_BASES, syncRuntimeClients } = await import("./runtime");

    expect(API_PROXY_BASES.poseidon).toBe("/poseidon");
    expect(API_PROXY_BASES.triton).toBe("/triton");

    syncRuntimeClients();

    expect(poseidonSetConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "/poseidon",
      }),
    );
    expect(tritonSetConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "/triton",
      }),
    );
  });

  it("retries legacy poseidon routes without the /api prefix when the live backend returns 404", async () => {
    const networkFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);

      if (url === "http://stormtrooper/poseidon/api/signals?limit=6") {
        return new Response(JSON.stringify({ detail: "Not Found", status_code: 404 }), {
          headers: {
            "Content-Type": "application/json",
          },
          status: 404,
        });
      }

      if (url === "http://stormtrooper/poseidon/signals?limit=6") {
        return new Response(JSON.stringify([{ id: "signal-001" }]), {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        });
      }

      return new Response("unexpected", { status: 500 });
    });

    vi.stubGlobal("fetch", networkFetch);

    const { syncRuntimeClients } = await import("./runtime");

    syncRuntimeClients();

    const poseidonConfig = poseidonSetConfig.mock.calls.at(-1)?.[0];

    expect(poseidonConfig?.fetch).toBeTypeOf("function");

    const response = await poseidonConfig.fetch(new Request("http://stormtrooper/poseidon/api/signals?limit=6"));

    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(networkFetch.mock.calls[0]?.[0]).toBeInstanceOf(Request);
    expect((networkFetch.mock.calls[0]?.[0] as Request).url).toBe("http://stormtrooper/poseidon/api/signals?limit=6");
    expect((networkFetch.mock.calls[1]?.[0] as Request).url).toBe("http://stormtrooper/poseidon/signals?limit=6");
    expect(response.status).toBe(200);
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
  };
}

// Synthetic test value only; never a real device key.
const TEST_DEVICE_KEY = "k".repeat(43);

describe("device-key Poseidon client", () => {
  let storage: Storage;
  let requests: Request[];

  beforeEach(() => {
    storage = createMemoryStorage();
    requests = [];
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init);
        requests.push(request);
        return new Response(JSON.stringify({ actor_id: "operator" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("targets the no-inject /poseidon-auth route", async () => {
    const { poseidonAuthClient } = await import("./runtime");

    expect(poseidonAuthClient.getConfig().baseUrl).toBe("/poseidon-auth");
  });

  it("sends the stored device key as X-API-Key and stops after clearDeviceKey()", async () => {
    const { DEVICE_KEY_STORAGE_KEY, clearDeviceKey, poseidonAuthClient } = await import("./runtime");
    storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);

    await poseidonAuthClient.get({ baseUrl: "http://kairos.test/poseidon-auth", url: "/api/v1/principal" });

    expect(requests[0]?.url).toBe("http://kairos.test/poseidon-auth/api/v1/principal");
    expect(requests[0]?.headers.get("X-API-Key")).toBe(TEST_DEVICE_KEY);

    clearDeviceKey();
    await poseidonAuthClient.get({ baseUrl: "http://kairos.test/poseidon-auth", url: "/api/v1/principal" });

    expect(requests[1]?.headers.has("X-API-Key")).toBe(false);
  });

  it("never replays a 404 toward the legacy route", async () => {
    const { DEVICE_KEY_STORAGE_KEY, poseidonAuthClient } = await import("./runtime");
    storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        requests.push(input as Request);
        return new Response(JSON.stringify({ detail: "Not Found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }),
    );

    await poseidonAuthClient.get({ baseUrl: "http://kairos.test/poseidon-auth", url: "/api/strategies" });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("http://kairos.test/poseidon-auth/api/strategies");
  });

  it("never sends the stored device key through the legacy /poseidon client", async () => {
    const { DEVICE_KEY_STORAGE_KEY, syncRuntimeClients } = await import("./runtime");
    storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);

    syncRuntimeClients();
    const legacyConfig = poseidonSetConfig.mock.calls.at(-1)?.[0];
    const actual = await vi.importActual<{ client: PoseidonClient }>("@/api/poseidon/client.gen");
    actual.client.setConfig({ ...legacyConfig, baseUrl: "http://kairos.test/poseidon" });

    await actual.client.get({ url: "/api/v1/principal" });

    expect(requests[0]?.url).toBe("http://kairos.test/poseidon/api/v1/principal");
    expect(requests[0]?.headers.get("X-API-Key")).not.toBe(TEST_DEVICE_KEY);
  });

  it("validates the device key format before storing it", async () => {
    const { DEVICE_KEY_STORAGE_KEY, hasDeviceKey, setDeviceKey } = await import("./runtime");

    for (const invalid of ["", " ".repeat(40), `${"k".repeat(20)} ${"k".repeat(20)}`, "k".repeat(31), "k".repeat(257)]) {
      expect(() => setDeviceKey(invalid)).toThrow("Device key format is invalid");
    }
    expect(storage.getItem(DEVICE_KEY_STORAGE_KEY)).toBeNull();
    expect(hasDeviceKey()).toBe(false);

    setDeviceKey("k".repeat(32));
    expect(hasDeviceKey()).toBe(true);
    setDeviceKey("k".repeat(256));
    expect(storage.getItem(DEVICE_KEY_STORAGE_KEY)).toBe("k".repeat(256));
    expect(hasDeviceKey()).toBe(true);
  });

  it("reports no device key when browser storage is unavailable", async () => {
    vi.stubGlobal("window", undefined);
    const { hasDeviceKey, getDeviceKey } = await import("./runtime");

    expect(getDeviceKey()).toBeNull();
    expect(hasDeviceKey()).toBe(false);
  });

  it("keeps import.meta.env out of the device-key client path", () => {
    const source = readFileSync(path.resolve(__dirname, "runtime.ts"), "utf8");
    const authSection = source.slice(source.indexOf("DEVICE_KEY_STORAGE_KEY ="));

    expect(authSection.length).toBeGreaterThan(0);
    expect(authSection).not.toContain("import.meta.env");
    expect(authSection).not.toContain("VITE_");
  });
});
