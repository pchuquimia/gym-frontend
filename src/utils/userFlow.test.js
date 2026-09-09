import { describe, expect, it } from "vitest";
import {
  getManagedAthleteJourneyStage,
  getUserHome,
  needsOnboarding,
} from "./userFlow";

describe("userFlow", () => {
  it("mantiene a atletas nuevos dentro del onboarding", () => {
    const user = { role: "Cliente", onboarding: { status: "pending" } };
    expect(needsOnboarding(user)).toBe(true);
    expect(getUserHome(user)).toBe("onboarding");
  });

  it("lleva al dashboard al atleta invitado con evaluacion pendiente", () => {
    const user = {
      role: "Cliente",
      trainingMode: "coach_managed",
      onboarding: { status: "pending" },
    };
    expect(needsOnboarding(user)).toBe(true);
    expect(getUserHome(user)).toBe("dashboard");
    expect(getManagedAthleteJourneyStage(user)).toBe("evaluation_pending");
  });

  it("distingue la evaluacion enviada del plan asignado", () => {
    const user = {
      role: "Cliente",
      trainingMode: "coach_managed",
      onboarding: { status: "complete" },
    };
    expect(getManagedAthleteJourneyStage(user)).toBe("evaluation_submitted");
    expect(getManagedAthleteJourneyStage(user, { id: "plan-1" })).toBe(
      "plan_assigned",
    );
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

  it("envia al atleta configurado a inicio", () => {
    const user = { role: "Cliente", onboarding: { status: "complete" } };
    expect(getUserHome(user)).toBe("dashboard");
  });
});
