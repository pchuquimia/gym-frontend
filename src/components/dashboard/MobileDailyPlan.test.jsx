import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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
  it("muestra la notificación del coach y permite abrir su mensaje", async () => {
    const open = vi.fn();
    const read = vi.fn();
    const notification = {
      _id: "notice",
      type: "coach_message",
      peerId: "coach",
      title: "Nuevo mensaje de tu coach",
      message: "Revisemos la próxima sesión",
    };
    renderPlan({
      notifications: [notification],
      notificationUnread: 1,
      onReadNotifications: read,
      onOpenNotification: open,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Notificaciones, 1 sin leer" }),
    );
    expect(screen.getByText(notification.message)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Ver mensaje" }));
    expect(open).toHaveBeenCalledWith(notification);
    expect(read).toHaveBeenCalledTimes(1);
  });
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

  it("ofrece recuperación en descanso sin mostrar la tarjeta de check-in pendiente", async () => {
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
    expect(
      screen.queryByRole("button", { name: /Check-in diario/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Seguimiento de hoy" }),
    ).toBeNull();
    expect(rest).toHaveTextContent("Hoy toca descansar");
    expect(rest.querySelector(".daily-workout__action.is-primary")).toBeNull();
    await userEvent.click(rest);
    expect(onOpenWorkout).toHaveBeenCalledTimes(1);
  });

  it("permite ver la sesión completada sin mostrar check-in ni iniciar otra sesión", async () => {
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
    expect(
      screen.queryByRole("button", { name: /Check-in diario/ }),
    ).toBeNull();
    expect(workout).toHaveTextContent("Completado");
    expect(workout).toHaveTextContent("UPPER");
    expect(
      screen.queryByRole("button", { name: "Comenzar entrenamiento" }),
    ).toBeNull();
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

  it("mantiene los registros requeridos del coach separados de los opcionales", () => {
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
    const planContext = screen.getByText("Mes 1 · Adaptación");
    const workoutAction = screen.getByRole("button", {
      name: "Comenzar entrenamiento",
    });
    expect(
      workoutAction.compareDocumentPosition(planContext) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("Mes 1 · Adaptación")).toHaveLength(1);
    expect(screen.getByText("Vinculado como tu coach")).toBeVisible();
    expect(screen.queryByText("Próximo paso")).toBeNull();
    expect(screen.queryByText("Solicitado por tu coach")).toBeNull();
    expect(screen.getByText("Registros opcionales")).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Peso/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Hidratación/ })).toBeVisible();
    expect(screen.queryByText("3 accesos")).toBeNull();
    expect(screen.queryByText("Otros registros")).toBeNull();
    expect(workoutAction).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Seguimiento de hoy" }),
    ).toContainElement(
      screen.getByRole("button", { name: /Peso de seguimiento/ }),
    );
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
      onOpenPlan,
    });
    const planCard = screen.getByRole("button", {
      name: "Ver progreso de Mes 1 · Continuación",
    });
    expect(screen.getByText("Semana 2 de 4")).toBeVisible();
    const chart = screen.getByRole("heading", {
      name: "Series por entrenamiento",
    });
    expect(
      chart.compareDocumentPosition(planCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Ver progreso de Mes 1 · Continuación",
      }),
    );
    expect(onOpenPlan).toHaveBeenCalledTimes(1);
  });

  it("muestra el trabajo muscular debajo de las misiones y los registros al final", async () => {
    const onOpenTrackingMission = vi.fn();
    const onOpenHydration = vi.fn();
    renderPlan({
      journeyStage: "plan_assigned",
      workoutSeries: [
        {
          key: "session-1",
          name: "Piernas",
          date: "2026-09-09",
          completedSets: 23,
          byPrimaryMuscle: [
            { name: "Cuádriceps", sets: 10 },
            { name: "Isquiotibiales", sets: 7 },
            { name: "Espalda", sets: 6 },
          ],
        },
      ],
      hydrationTask: {
        title: "Hidratación",
        subtitle: "Registrar agua",
        completed: false,
      },
      onOpenTrackingMission,
      onOpenHydration,
    });

    const workout = screen.getByRole("button", {
      name: "Comenzar entrenamiento",
    });
    const muscleHeading = screen.getByRole("heading", {
      name: "Series por entrenamiento",
    });
    const progressHeading = screen.getByRole("heading", {
      name: "Registros opcionales",
    });
    expect(
      workout.compareDocumentPosition(muscleHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      muscleHeading.compareDocumentPosition(progressHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByLabelText(/Esta semana:/)).toBeVisible();
    expect(
      screen.getByRole("group", {
        name: "Series diarias por músculo, agrupadas por semana",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: /8 sept 2026: Descanso/ }),
    ).toBeVisible();
    expect(screen.queryByRole("img", { name: /10 sept 2026/ })).toBeNull();
    expect(
      screen.getByLabelText(/Esta semana: 7 sept 2026 – 9 sept 2026/),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("group", {
          name: "Series diarias por músculo, agrupadas por semana",
        }),
      ).getAllByRole("img"),
    ).toHaveLength(10);
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

  it.each([1, 6, 0])(
    "permite abrir el detalle con %s grupos",
    async (count) => {
      const onOpenMuscleDetails = vi.fn();
      renderPlan({
        journeyStage: "plan_assigned",
        workoutSeries: [
          {
            key: "session-1",
            name: "Torso",
            date: "2026-09-09",
            completedSets: 33,
            byPrimaryMuscle: [
              { name: "Espalda", sets: 8 },
              { name: "Bíceps", sets: 7 },
              { name: "Pecho", sets: 6 },
              { name: "Tríceps", sets: 5 },
              { name: "Hombros", sets: 4 },
              { name: "Core", sets: 3 },
            ].slice(0, count),
          },
        ],
        onOpenMuscleDetails,
      });

      await userEvent.click(
        screen.getByRole("button", {
          name: "Ver series por grupo muscular por entrenamiento",
        }),
      );
      expect(onOpenMuscleDetails).toHaveBeenCalledTimes(1);
    },
  );

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

  it("muestra la gráfica de series sin el bloque de Tu actividad", () => {
    renderPlan();
    expect(screen.queryByRole("region", { name: "Tu actividad" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Series por entrenamiento" }),
    ).toBeVisible();
  });

  it("mantiene continuar como acción principal durante una sesión", () => {
    renderPlan({
      workoutTask: {
        type: "active",
        title: "Continúa LOWER A",
        subtitle: "4 de 14 series",
        actionLabel: "Continuar entrenamiento",
      },
      checkInTask: { title: "Check-in diario", subtitle: "Pendiente" },
    });
    expect(
      screen.getByRole("button", { name: "Continuar entrenamiento" }),
    ).toHaveTextContent("En curso");
    expect(screen.queryByText("Completar check-in")).toBeNull();
  });

  it("deshabilita el registro y entrenamiento en modo de solo lectura", () => {
    renderPlan({ readOnly: true, checkInTask: { title: "Check-in diario" } });
    expect(
      screen.getByRole("button", { name: "Comenzar entrenamiento" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Completar Check-in diario/ }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: /Fotos/ })).toBeDisabled();
  });
});
