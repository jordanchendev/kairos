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
});
