import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearQuickPlanDraft,
  readQuickPlanDraft,
  saveQuickPlanDraft,
} from "./quickPlanDraft";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("quick plan draft persistence", () => {
  it("recovers previous session drafts and saves them across tab sessions", () => {
    sessionStorage.setItem(
      "user-a",
      JSON.stringify({ dayRoutines: { 1: "push" } }),
    );
    const draft = readQuickPlanDraft("user-a");
    expect(draft.dayRoutines).toEqual({ 1: "push" });
    expect(saveQuickPlanDraft("user-a", draft)).toBe(true);
    sessionStorage.clear();
    expect(readQuickPlanDraft("user-a").dayRoutines).toEqual({ 1: "push" });
  });
  it("uses a newer session fallback if persistent storage cannot be updated", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    saveQuickPlanDraft("user-a", { name: "Earlier" });
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      function (key, value) {
        if (this === localStorage) throw new Error("Full");
        return setItem.call(this, key, value);
      },
    );
    expect(saveQuickPlanDraft("user-a", { name: "Latest" })).toBe(true);
    expect(readQuickPlanDraft("user-a").name).toBe("Latest");
  });
  it("reports failure instead of claiming to save when both stores are unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    expect(saveQuickPlanDraft("user-a", { name: "Plan" })).toBe(false);
  });
  it("discards the current user's draft from both stores while preserving other drafts", () => {
    localStorage.setItem("user-a", "{}");
    sessionStorage.setItem("user-a", "{}");
    saveQuickPlanDraft("user-b", { name: "Other plan" });
    clearQuickPlanDraft("user-a");
    expect(localStorage.getItem("user-a")).toBeNull();
    expect(sessionStorage.getItem("user-a")).toBeNull();
    expect(readQuickPlanDraft("user-b").name).toBe("Other plan");
  });
  it("ignores malformed drafts and still recovers a valid legacy copy", () => {
    localStorage.setItem("user-a", "{broken");
    sessionStorage.setItem("user-a", JSON.stringify({ name: "Recovered" }));
    expect(readQuickPlanDraft("user-a").name).toBe("Recovered");
    localStorage.setItem("array", "[]");
    expect(readQuickPlanDraft("array")).toEqual({});
    expect(readQuickPlanDraft()).toEqual({});
  });
});
