import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MobileDailyPlan from "./MobileDailyPlan";

const baseProps = {
  date: new Date("2026-09-09T12:00:00"),
  user: { name: "Pedro Invitado", onboarding: { status: "pending" } },
  coach: { name: "Coach Pablo" },
  weekDays: [
    { key: "2026-09-07" },
    { key: "2026-09-08" },
    { key: "2026-09-09", isToday: true },
    { key: "2026-09-10" },
    { key: "2026-09-11" },
    { key: "2026-09-12" },
    { key: "2026-09-13" },
  ],
  workoutTask: {
    title: "LOWER A",
    subtitle: "6 ejercicios · 55 min",
    actionLabel: "Comenzar entrenamiento",
  },
  onOpenMenu: vi.fn(),
  onStartEvaluation: vi.fn(),
  onOpenCoach: vi.fn(),
  onOpenPlan: vi.fn(),
  onOpenCheckIn: vi.fn(),
  onOpenWorkout: vi.fn(),
  onOpenHydration: vi.fn(),
};

const renderPlan = (props = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MobileDailyPlan {...baseProps} {...props} />
    </QueryClientProvider>,
  );
};

describe("MobileDailyPlan", () => {
  it("prioriza la evaluacion al aceptar la invitacion", () => {
    renderPlan({ journeyStage: "evaluation_pending" });
    expect(
      screen.getByRole("button", { name: "Comenzar evaluación" }),
    ).toBeVisible();
    expect(screen.queryByText("Misión de hoy")).toBeNull();
  });

  it("confirma el envio mientras el coach prepara el plan", () => {
    renderPlan({
      journeyStage: "evaluation_submitted",
      user: {
        name: "Pedro Invitado",
        onboarding: {
          status: "complete",
        },
        coachIntake: {
          coachId: "coach-1",
          status: "submitted",
          submittedAt: "2026-09-09T13:24:00.000Z",
        },
      },
    });
    expect(screen.getByText("Evaluación enviada")).toBeVisible();
    expect(
      screen.getByText("Tu coach está preparando tu plan"),
    ).toBeVisible();
    expect(screen.queryByLabelText("Actividad semanal")).toBeNull();
    expect(screen.queryByText("Comenzar entrenamiento")).toBeNull();
  });

  it("muestra las misiones y no cuenta la hidratacion opcional", () => {
    renderPlan({
      journeyStage: "plan_assigned",
      activePlanContext: {
        name: "Mes 1 · Adaptación",
        currentWeek: 1,
        durationWeeks: 6,
        progress: 17,
      },
      checkInTask: {
        title: "Check-in diario",
        subtitle: "Completado",
        completed: true,
      },
      hydrationTask: {
        title: "Hidratación",
        subtitle: "1.400 de 2.500 ml",
        completed: false,
      },
      trackingMissions: [
        {
          id: "weight-today",
          type: "weight",
          title: "Peso de seguimiento",
          subtitle: "Registrar peso actual",
          required: true,
          completed: false,
        },
      ],
    });
    expect(screen.getByText("Misión de hoy")).toBeVisible();
    expect(screen.getByText("1 de 3")).toBeVisible();
    expect(screen.getByText("Otros registros")).toBeVisible();
    const workoutAction = screen.getByRole("button", {
      name: "Comenzar entrenamiento",
    });
    expect(workoutAction).toBeVisible();
    expect(workoutAction).toHaveClass("mobile-daily-plan__workout-action");
    expect(
      screen.getByRole("button", { name: /Peso de seguimiento/ }),
    ).toHaveClass("is-tracking");
  });

  it("distingue un borrador de un plan programado", () => {
    const { rerender } = renderPlan({
      journeyStage: "plan_drafting",
      planningContext: { status: "draft", name: "Bloque inicial" },
    });
    expect(
      screen.getByText("Tu coach está preparando tu plan"),
    ).toBeVisible();
    expect(screen.queryByText("Misión de hoy")).toBeNull();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MobileDailyPlan
          {...baseProps}
          journeyStage="plan_scheduled"
          planningContext={{
            status: "scheduled",
            name: "Bloque inicial",
            startDate: "2026-09-14T00:00:00.000Z",
          }}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Tu plan está listo")).toBeVisible();
    expect(screen.getByText(/Bloque inicial comenzará/)).toBeVisible();
  });
});
