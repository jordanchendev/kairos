import { vi } from "vitest";

import { client as legacyPoseidonClient } from "@/api/poseidon/client.gen";
import { POSEIDON_AUTH_BASE, poseidonAuthClient } from "@/lib/api/runtime";

/**
 * Test-only harness: in-memory localStorage, a recording fetch, and absolute base URLs
 * (Node's Request rejects relative URLs). Never put a real device key in a test.
 */
export const TEST_ORIGIN = "http://kairos.test";
export const TEST_DEVICE_KEY = "t".repeat(43);

export type RecordedRequest = { body: string; headers: Headers; method: string; url: string };
export type Responder = (request: Request) => Response | Promise<Response>;

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

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, status });
}

export function installDeviceKeyHarness() {
  const storage = createMemoryStorage();
  const requests: RecordedRequest[] = [];
  let responder: Responder = () => jsonResponse({});
  const legacyBefore = legacyPoseidonClient.getConfig();

  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push({
        body: await request.clone().text(),
        headers: request.headers,
        method: request.method,
        url: request.url,
      });
      return responder(request);
    }),
  );
  poseidonAuthClient.setConfig({ baseUrl: `${TEST_ORIGIN}${POSEIDON_AUTH_BASE}` });
  legacyPoseidonClient.setConfig({ baseUrl: `${TEST_ORIGIN}/poseidon`, fetch: undefined, headers: undefined });

  return {
    requests,
    respond(next: Responder) {
      responder = next;
    },
    restore() {
      poseidonAuthClient.setConfig({ baseUrl: POSEIDON_AUTH_BASE });
      legacyPoseidonClient.setConfig({ baseUrl: legacyBefore.baseUrl, fetch: legacyBefore.fetch, headers: undefined });
      vi.unstubAllGlobals();
    },
    storage,
  };
}

/** Runs a generated TanStack `*Options()` object's queryFn exactly as useQuery would. */
export async function runQueryOptions(options: { queryFn?: unknown; queryKey: unknown }) {
  const queryFn = options.queryFn as (context: { queryKey: unknown; signal: AbortSignal }) => Promise<unknown>;
  try {
    return await queryFn({ queryKey: options.queryKey, signal: new AbortController().signal });
  } catch (error) {
    return error;
  }
}
