import { describe, expect, it } from "vitest";
import {
  getManagedAthleteJourneyStage,
  getNewAthleteDashboardStage,
  getUserHome,
  needsCoachIntake,
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
      assignedTrainerId: "coach-1",
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
      assignedTrainerId: "coach-1",
      onboarding: { status: "complete" },
      coachIntake: {
        coachId: "coach-1",
        status: "submitted",
        submittedAt: "2026-09-09T12:00:00.000Z",
      },
    };
    expect(getManagedAthleteJourneyStage(user)).toBe("evaluation_submitted");
    expect(getManagedAthleteJourneyStage(user, { id: "plan-1" })).toBe(
      "plan_assigned",
    );
    expect(getManagedAthleteJourneyStage(user, null, true)).toBe(
      "plan_assigned",
    );
    expect(
      getManagedAthleteJourneyStage(user, null, false, { status: "draft" }),
    ).toBe("plan_drafting");
    expect(
      getManagedAthleteJourneyStage(user, null, false, {
        status: "scheduled",
      }),
    ).toBe("plan_scheduled");
  });

  it("no confunde un onboarding antiguo con una evaluacion del coach", () => {
    const user = {
      role: "Cliente",
      trainingMode: "coach_managed",
      assignedTrainerId: "coach-1",
      onboarding: { status: "complete" },
    };
    expect(needsCoachIntake(user)).toBe(true);
    expect(getManagedAthleteJourneyStage(user)).toBe("evaluation_pending");
  });

  it("no acepta como enviada una evaluación sin fecha de envío", () => {
    const user = {
      role: "Cliente",
      trainingMode: "coach_managed",
      assignedTrainerId: "coach-1",
      coachIntake: { coachId: "coach-1", status: "submitted" },
    };

    expect(needsCoachIntake(user)).toBe(true);
  });

  it("solicita una evaluacion nueva cuando cambia el coach", () => {
    const user = {
      role: "Cliente",
      trainingMode: "coach_managed",
      assignedTrainerId: "coach-2",
      coachIntake: { coachId: "coach-1", status: "submitted" },
    };
    expect(needsCoachIntake(user)).toBe(true);
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

  it("muestra los pasos iniciales hasta la primera sesion", () => {
    const user = { role: "Cliente", trainingMode: "independent" };
    expect(getNewAthleteDashboardStage({ user })).toBe("no_routine");
    expect(
      getNewAthleteDashboardStage({
        user,
        routines: [{ id: "routine-1", exercises: [{ id: "exercise-1" }] }],
      }),
    ).toBe("ready_to_train");
    expect(
      getNewAthleteDashboardStage({
        user,
        routines: [{ id: "routine-1", exercises: [{ id: "exercise-1" }] }],
        trainings: [{ id: "session-1" }],
      }),
    ).toBeNull();
  });

  it("no invita a iniciar una rutina sin ejercicios", () => {
    const user = { role: "Cliente", trainingMode: "independent" };
    expect(getNewAthleteDashboardStage({ user, routines: [{ id: "empty", exercises: [] }] })).toBe("no_routine");
  });

  it("conserva el flujo existente durante cargas, entrenamientos y cuentas gestionadas", () => {
    const user = { role: "Cliente", trainingMode: "independent" };
    expect(getNewAthleteDashboardStage({ user, routinesLoading: true })).toBeNull();
    expect(getNewAthleteDashboardStage({ user, routinesError: "Sin conexión" })).toBeNull();
    expect(getNewAthleteDashboardStage({ user, activeTraining: { id: "active" } })).toBeNull();
    expect(getNewAthleteDashboardStage({ user, activePlan: { id: "plan" } })).toBeNull();
    expect(
      getNewAthleteDashboardStage({
        user: { role: "Cliente", trainingMode: "coach_managed" },
      }),
    ).toBeNull();
    expect(getNewAthleteDashboardStage({ user, coachAthlete: { id: "athlete" } })).toBeNull();
  });
});
