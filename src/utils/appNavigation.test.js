import { describe, expect, test } from "vitest";
import {
  canReturnWithinApp,
  createAppHistoryState,
  getAppHistoryIndex,
  getAppHistoryPage,
  getAppHistoryScroll,
} from "./appNavigation";

describe("app navigation history", () => {
  test("conserva contexto adicional al crear una entrada", () => {
    const state = createAppHistoryState({
      currentState: { profileView: "security" },
      page: "perfil",
      index: 3,
      scrollY: 420,
    });

    expect(state.profileView).toBe("security");
    expect(getAppHistoryPage(state)).toBe("perfil");
    expect(getAppHistoryIndex(state)).toBe(3);
    expect(getAppHistoryScroll(state)).toBe(420);
    expect(canReturnWithinApp(state)).toBe(true);
  });

  test("no permite salir accidentalmente desde la primera entrada", () => {
    const state = createAppHistoryState({
      page: "dashboard",
      index: 0,
      scrollY: -20,
    });

    expect(canReturnWithinApp(state)).toBe(false);
    expect(getAppHistoryScroll(state)).toBe(0);
  });
});
