import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  onOpenProfile: vi.fn(),
  onStartEvaluation: vi.fn(),
  onOpenCoach: vi.fn(),
  onOpenPlan: vi.fn(),
  onOpenCheckIn: vi.fn(),
  onOpenWorkout: vi.fn(),
  onOpenHydration: vi.fn(),
  onOpenWeighIn: vi.fn(),
  onOpenTrackingMission: vi.fn(),
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
  it("guía al usuario sin rutina hacia su primer entrenamiento", async () => {
    const onCreateRoutine = vi.fn();
    const onOpenLibrary = vi.fn();
    renderPlan({
      coach: null,
      starterStage: "no_routine",
      onCreateRoutine,
      onOpenLibrary,
    });

    expect(
      screen.getByRole("heading", { name: "Tu progreso empieza hoy." }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Crear rutina" })).toBeVisible();
    expect(screen.queryByLabelText("Actividad semanal")).toBeNull();
    expect(screen.queryByText("Misión de hoy")).toBeNull();
    expect(screen.queryByText("Series por grupo muscular")).toBeNull();
    expect(screen.queryByText("Registrar progreso")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Crear rutina" }));
    expect(onCreateRoutine).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: /Quieres explorar primero/i }),
    );
    expect(onOpenLibrary).toHaveBeenCalledTimes(1);
  });

  it("invita a iniciar la primera sesión cuando ya hay rutina", async () => {
    const onOpenWorkout = vi.fn();
    renderPlan({
      coach: null,
      starterStage: "ready_to_train",
      onOpenWorkout,
    });

    const hero = screen
      .getByRole("heading", { name: "Empieza tu primera sesión" })
      .closest("section");
    expect(
      hero.querySelector(".mobile-daily-plan__starter-hero-image"),
    ).toHaveAttribute("src", "/images/routine-upper.webp");
    expect(hero.querySelector(".mobile-daily-plan__starter-icon")).toBeNull();
    expect(screen.getByText("Rutina creada")).toBeVisible();
    expect(screen.queryByText("Misión de hoy")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Iniciar entrenamiento" }),
    );
    expect(onOpenWorkout).toHaveBeenCalledTimes(1);
  });

  it("presenta el descanso como una fila igual al check-in y abre la recuperación", async () => {
    const onOpenWorkout = vi.fn();
    renderPlan({
      workoutTask: {
        type: "rest",
        title: "Hoy toca descansar",
        subtitle: "Descanso para tu próxima sesión.",
        actionLabel: "Ver recuperación",
        completed: true,
      },
      checkInTask: {
        title: "Check-in diario",
        subtitle: "Sueño, energía y molestias · 20 s",
      },
      onOpenWorkout,
    });

    const rest = screen.getByRole("button", { name: "Ver recuperación" });
    const checkIn = screen.getByRole("button", { name: /Check-in diario/ });
    expect(rest.className).toBe(checkIn.className);
    expect(rest).toHaveTextContent("Hoy toca descansar");
    expect(rest.querySelector(".mobile-daily-plan__workout-action")).toBeNull();
    await userEvent.click(rest);
    expect(onOpenWorkout).toHaveBeenCalledTimes(1);
  });

  it("alinea la rutina completada y el check-in con la acción de resumen a la derecha", async () => {
    const onOpenWorkout = vi.fn();
    renderPlan({
      workoutTask: {
        type: "completed",
        title: "UPPER",
        subtitle: "Entrenamiento completado",
        actionLabel: "Ver resumen",
        completed: true,
      },
      checkInTask: {
        title: "Check-in diario",
        subtitle: "Pendiente",
        completed: false,
      },
      onOpenWorkout,
    });

    const workout = screen.getByRole("button", { name: "Ver resumen" });
    const checkIn = screen.getByRole("button", { name: /Check-in diario/ });
    expect(workout.children[0]).toHaveClass("mobile-daily-plan__status");
    expect(checkIn.children[0]).toHaveClass("mobile-daily-plan__status");
    expect(workout.children[1]).toHaveClass("mobile-daily-plan__visual");
    expect(checkIn.children[1]).toHaveClass("mobile-daily-plan__visual");
    expect(workout.children[2]).toHaveClass("mobile-daily-plan__mission-copy");
    expect(checkIn.children[2]).toHaveClass("mobile-daily-plan__mission-copy");
    expect(workout.children[3]).toHaveClass("mobile-daily-plan__workout-action");
    expect(workout.querySelectorAll("button")).toHaveLength(0);
    await userEvent.click(workout);
    expect(onOpenWorkout).toHaveBeenCalledOnce();
  });

  it("abre el perfil al tocar la foto del usuario", async () => {
    const onOpenProfile = vi.fn();
    renderPlan({ onOpenProfile });

    await userEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));

    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it("prioriza la evaluacion al aceptar la invitacion", () => {
    const { container } = renderPlan({ journeyStage: "evaluation_pending" });
    expect(
      screen.getByRole("button", { name: "Comenzar evaluación" }),
    ).toBeVisible();
    expect(screen.queryByText("Misión de hoy")).toBeNull();
    expect(
      container.querySelector(".mobile-daily-plan__onboarding-icon img"),
    ).toHaveAttribute("src", "/images/daily-checkin-card.webp");
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
    expect(screen.getByText("Tu coach está preparando tu plan")).toBeVisible();
    expect(screen.queryByLabelText("Actividad semanal")).toBeNull();
    expect(screen.queryByText("Comenzar entrenamiento")).toBeNull();
  });

  it("muestra las misiones y no cuenta la hidratacion opcional", () => {
    const { container } = renderPlan({
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
    const planContext = screen.getByText("Mes 1 · Adaptación");
    const missionHeading = screen.getByText("Misión de hoy");
    expect(
      planContext.compareDocumentPosition(missionHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("Mes 1 · Adaptación")).toHaveLength(1);
    expect(screen.getByText("Vinculado como tu coach")).toBeVisible();
    expect(screen.queryByText("Próximo paso")).toBeNull();
    expect(screen.queryByText("Solicitado por tu coach")).toBeNull();
    expect(screen.getByText("Registrar progreso")).toBeVisible();
    expect(
      screen.getByText("Opcional · fotos, medidas e hidratación"),
    ).toBeVisible();
    expect(screen.queryByText("3 accesos")).toBeNull();
    expect(screen.queryByText("Otros registros")).toBeNull();
    const workoutAction = screen.getByRole("button", {
      name: "Comenzar entrenamiento",
    });
    expect(workoutAction).toBeVisible();
    expect(workoutAction).toHaveClass("mobile-daily-plan__mission", "mobile-daily-plan__workout-card");
    expect(workoutAction.querySelector(".mobile-daily-plan__workout-action")).toHaveTextContent("Comenzar");
    expect(workoutAction).not.toHaveTextContent("Comenzar entrenamiento");
    expect(
      screen.getByRole("button", { name: /Peso de seguimiento/ }),
    ).toHaveClass("is-tracking");
    expect(
      screen.getByRole("button", { name: /Peso de seguimiento/ }).parentElement,
    ).toHaveClass("mobile-daily-plan__mission-list");
    expect(
      container.querySelector('img[src="/images/daily-checkin-card.webp"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('img[src="/images/daily-weight-card.webp"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('img[src="/images/daily-planning-card.webp"]'),
    ).toBeInTheDocument();
  });

  it("abre el progreso de la planificación desde su tarjeta", async () => {
    const onOpenPlan = vi.fn();
    renderPlan({
      journeyStage: "plan_assigned",
      activePlanContext: {
        id: "plan-1",
        name: "Mes 1 · Continuación",
        currentWeek: 2,
        durationWeeks: 4,
        progress: 50,
      },
      planTrend: <div data-testid="compact-plan-trend">Gráfica del plan</div>,
      onOpenPlan,
    });
    const planCard = screen.getByRole("button", { name: /Mes 1 · Continuación.*Ver progreso/ });
    const preview = screen.getByTestId("compact-plan-trend");
    const missions = screen.getByRole("heading", { name: "Misión de hoy" });
    expect(planCard.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(preview.compareDocumentPosition(missions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Mes 1 · Continuación.*Ver progreso/ }));
    expect(onOpenPlan).toHaveBeenCalledTimes(1);
  });

  it("muestra el trabajo muscular debajo de las misiones y los registros al final", async () => {
    const onOpenTrackingMission = vi.fn();
    const onOpenHydration = vi.fn();
    renderPlan({
      journeyStage: "plan_assigned",
      weeklyMuscleSummary: {
        sessions: 3,
        byPrimaryMuscle: [
          { name: "Cuádriceps", sets: 10 },
          { name: "Isquiotibiales", sets: 7 },
          { name: "Espalda", sets: 6 },
        ],
      },
      hydrationTask: {
        title: "Hidratación",
        subtitle: "Registrar agua",
        completed: false,
      },
      onOpenTrackingMission,
      onOpenHydration,
    });

    const missionHeading = screen.getByRole("heading", {
      name: "Misión de hoy",
    });
    const muscleHeading = screen.getByRole("heading", {
      name: "Series por grupo muscular",
    });
    const progressHeading = screen.getByRole("heading", {
      name: "Registrar progreso",
    });
    expect(
      missionHeading.compareDocumentPosition(muscleHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      muscleHeading.compareDocumentPosition(progressHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Esta semana · 3 sesiones")).toBeVisible();
    expect(screen.getByText("Cuádriceps")).toBeVisible();
    expect(screen.getByText("10 series")).toBeVisible();
    expect(screen.getByRole("button", { name: /Fotos/ })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Fotos/ }));
    expect(onOpenTrackingMission).toHaveBeenCalledWith("photos");

    await userEvent.click(screen.getByRole("button", { name: /Hidratación/ }));
    expect(onOpenHydration).toHaveBeenCalledTimes(1);
  });

  it("no inventa barras cuando no hay series completadas", () => {
    renderPlan({ journeyStage: "plan_assigned" });

    expect(
      screen.getByText(
        "Completa una serie para ver qué grupos musculares trabajaste.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("permite abrir el detalle si existen más de cinco grupos", async () => {
    const onOpenMuscleDetails = vi.fn();
    renderPlan({
      journeyStage: "plan_assigned",
      weeklyMuscleSummary: {
        sessions: 2,
        byPrimaryMuscle: [
          { name: "Espalda", sets: 8 },
          { name: "Bíceps", sets: 7 },
          { name: "Pecho", sets: 6 },
          { name: "Tríceps", sets: 5 },
          { name: "Hombros", sets: 4 },
          { name: "Core", sets: 3 },
        ],
      },
      onOpenMuscleDetails,
    });

    expect(screen.queryByText("Core")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Ver todos" }));
    expect(onOpenMuscleDetails).toHaveBeenCalledTimes(1);
  });

  it("abre el ingreso rapido de peso sin navegar al historial", async () => {
    const onOpenWeighIn = vi.fn();
    const onOpenTrackingMission = vi.fn();
    renderPlan({
      journeyStage: "plan_assigned",
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
      onOpenWeighIn,
      onOpenTrackingMission,
    });

    await userEvent.click(
      screen.getByRole("button", { name: /Peso de seguimiento/ }),
    );

    expect(onOpenWeighIn).toHaveBeenCalledTimes(1);
    expect(onOpenTrackingMission).not.toHaveBeenCalledWith("weight");
  });

  it("distingue un borrador de un plan programado", () => {
    const { rerender } = renderPlan({
      journeyStage: "plan_drafting",
      planningContext: { status: "draft", name: "Bloque inicial" },
    });
    expect(screen.getByText("Tu coach está preparando tu plan")).toBeVisible();
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
