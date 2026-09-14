import { afterEach, describe, expect, it } from "vitest";
import { isRecoverableAssetError, markAppBootReady } from "./startupRecovery";

describe("startupRecovery", () => {
  afterEach(() => {
    delete window.__RIRFIT_BOOT_READY__;
    window.history.replaceState({}, "", "/");
  });

  it.each([
    new Error("Failed to fetch dynamically imported module"),
    new Error("Importing a module script failed"),
    new Error("Loading chunk 42 failed"),
    Object.assign(new Error("Unable to preload CSS"), {
      name: "ChunkLoadError",
    }),
  ])("detects a recoverable asset error", (error) => {
    expect(isRecoverableAssetError(error)).toBe(true);
  });

  it("does not reload for an application data error", () => {
    expect(isRecoverableAssetError(new Error("No existe la rutina"))).toBe(
      false,
    );
  });

  it("removes the temporary cache-busting parameter after a healthy boot", () => {
    window.history.replaceState(
      {},
      "",
      "/?google=success&__rirfit_reload=123#access",
    );

    markAppBootReady();

    expect(window.__RIRFIT_BOOT_READY__).toBe(true);
    expect(window.location.search).toBe("?google=success");
    expect(window.location.hash).toBe("#access");
  });
});
