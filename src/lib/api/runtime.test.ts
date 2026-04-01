import { beforeEach, describe, expect, it, vi } from "vitest";

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
