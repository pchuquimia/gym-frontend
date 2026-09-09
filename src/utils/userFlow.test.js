import { describe, expect, it } from "vitest";
import { getUserHome, needsOnboarding } from "./userFlow";

describe("userFlow", () => {
  it("mantiene a atletas nuevos dentro del onboarding", () => {
    const user = { role: "Cliente", onboarding: { status: "pending" } };
    expect(needsOnboarding(user)).toBe(true);
    expect(getUserHome(user)).toBe("onboarding");
  });

  it("mantiene a entrenadores nuevos dentro del onboarding profesional", () => {
    const user = { role: "Entrenador", onboarding: { status: "pending" } };
    expect(needsOnboarding(user)).toBe(true);
    expect(getUserHome(user)).toBe("onboarding");
  });

  it("envia al entrenador configurado a su panel", () => {
    const user = { role: "Entrenador", onboarding: { status: "complete" } };
    expect(needsOnboarding(user)).toBe(false);
    expect(getUserHome(user)).toBe("trainer");
  });
});
