import { beforeEach, describe, expect, it } from "vitest";

import { useUiStore } from "./ui-store";

describe("ui store mobile navigation", () => {
  beforeEach(() => {
    useUiStore.setState({ mobileNavOpen: false, sidebarCollapsed: false });
  });

  it("starts closed so page content leads on a phone", () => {
    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });

  it("opens and closes without touching the desktop collapse preference", () => {
    useUiStore.getState().setMobileNavOpen(true);
    expect(useUiStore.getState().mobileNavOpen).toBe(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().setMobileNavOpen(false);
    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });
});
