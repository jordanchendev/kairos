import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Dialog } from "@/components/ui/dialog";
import { DEVICE_KEY_STORAGE_KEY, clearDeviceKey, hasDeviceKey } from "@/lib/api/runtime";
import { TEST_DEVICE_KEY, installDeviceKeyHarness, jsonResponse } from "@/test/device-key-harness";

import {
  DEVICE_KEY_COPY,
  DeviceKeyDialog,
  DeviceKeyDialogBody,
  DeviceKeyRequiredNotice,
  checkDevicePrincipal,
  saveDeviceKeyDraft,
  type DeviceKeyDialogBodyProps,
} from "./device-key-dialog";

const noop = () => undefined;

function renderBody(overrides: Partial<DeviceKeyDialogBodyProps> = {}) {
  return renderToStaticMarkup(
    <Dialog>
      <DeviceKeyDialogBody
        draft=""
        error={null}
        onClear={noop}
        onDraftChange={noop}
        onSave={noop}
        status={{ kind: "none" }}
        {...overrides}
      />
    </Dialog>,
  );
}

describe("device-key settings dialog", () => {
  let harness: ReturnType<typeof installDeviceKeyHarness>;

  beforeEach(() => {
    harness = installDeviceKeyHarness();
  });

  afterEach(() => {
    harness.restore();
  });

  it("renders a 44px 'Device key' trigger that opens a Radix dialog (focus returns to the trigger)", () => {
    const markup = renderToStaticMarkup(<DeviceKeyDialog />);

    expect(markup).toContain(DEVICE_KEY_COPY.trigger);
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain("min-h-11");

    const source = readFileSync(path.resolve(__dirname, "device-key-dialog.tsx"), "utf8");
    expect(source).toContain("<DialogTrigger asChild>");
    expect(source).not.toContain("onCloseAutoFocus");
  });

  it("renders a password input with autocomplete off and 44px Save/Clear buttons", () => {
    const markup = renderBody();

    expect(markup).toContain(DEVICE_KEY_COPY.title);
    expect(markup).toContain(DEVICE_KEY_COPY.help);
    expect(markup).toContain('type="password"');
    expect(markup).toMatch(/autocomplete="off"/i);
    expect(markup).toMatch(/<button[^>]*min-h-11[^>]*>Clear<\/button>/);
    expect(markup).toMatch(/<button[^>]*min-h-11[^>]*>Save<\/button>/);
  });

  it("stores a valid key and never renders the stored value back", async () => {
    expect(saveDeviceKeyDraft(TEST_DEVICE_KEY)).toBeNull();
    expect(harness.storage.getItem(DEVICE_KEY_STORAGE_KEY)).toBe(TEST_DEVICE_KEY);
    expect(hasDeviceKey()).toBe(true);

    harness.respond(() => jsonResponse({ actor_id: "operator-1" }));
    const status = await checkDevicePrincipal();
    const markup = renderBody({ status });

    expect(markup).toContain("Signed in as operator-1");
    expect(markup).not.toContain(TEST_DEVICE_KEY);
    expect(renderToStaticMarkup(<DeviceKeyDialog />)).not.toContain(TEST_DEVICE_KEY);
  });

  it("rejects an invalid key with the format error and stores nothing", () => {
    for (const invalid of ["", "short", `${"a".repeat(20)} ${"a".repeat(20)}`, "a".repeat(257), "bad/char".repeat(8)]) {
      expect(saveDeviceKeyDraft(invalid)).toBe(DEVICE_KEY_COPY.invalid);
    }
    expect(harness.storage.getItem(DEVICE_KEY_STORAGE_KEY)).toBeNull();
    expect(renderBody({ error: DEVICE_KEY_COPY.invalid })).toContain("Device key format is invalid");
  });

  it("verifies the stored key against /poseidon-auth/api/v1/principal with the key in X-API-Key", async () => {
    harness.storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);
    harness.respond(() => jsonResponse({ actor_id: "operator-1" }));

    await expect(checkDevicePrincipal()).resolves.toEqual({ actorId: "operator-1", kind: "signed_in" });

    expect(harness.requests).toHaveLength(1);
    expect(harness.requests[0]?.url).toBe("http://kairos.test/poseidon-auth/api/v1/principal");
    expect(harness.requests[0]?.headers.get("X-API-Key")).toBe(TEST_DEVICE_KEY);
  });

  it("shows 'Key not recognized by Poseidon' on 401", async () => {
    harness.storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);
    harness.respond(() => jsonResponse({ detail: "Invalid API key" }, 401));

    const status = await checkDevicePrincipal();

    expect(status).toEqual({ kind: "unrecognized" });
    expect(renderBody({ status })).toContain("Key not recognized by Poseidon");
  });

  it("clear removes the key, shows 'No device key set', and sends no principal request", async () => {
    harness.storage.setItem(DEVICE_KEY_STORAGE_KEY, TEST_DEVICE_KEY);

    clearDeviceKey();
    const status = await checkDevicePrincipal();

    expect(harness.storage.getItem(DEVICE_KEY_STORAGE_KEY)).toBeNull();
    expect(status).toEqual({ kind: "none" });
    expect(harness.requests).toHaveLength(0);
    expect(renderBody({ status })).toContain("No device key set");
  });

  it("renders the 'Device key required' notice with the dialog trigger", () => {
    const markup = renderToStaticMarkup(<DeviceKeyRequiredNotice />);

    expect(markup).toContain(DEVICE_KEY_COPY.required);
    expect(markup).toContain('aria-haspopup="dialog"');
  });
});
