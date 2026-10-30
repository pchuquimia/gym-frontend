import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/La_Paz" });

test("Lower A recuperado permite confirmar otro día y guardar las series sin duplicarlas", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-10-29T16:00:00Z"));
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  const user = {
    id: "athlete",
    name: "Atleta de prueba",
    email: "athlete@example.invalid",
    role: "Cliente",
    isActive: true,
    onboarding: { status: "complete" },
    trainingMode: "coach_managed",
    assignedTrainerId: "coach",
    coachIntake: {
      coachId: "coach",
      status: "submitted",
      submittedAt: "2026-10-01T12:00:00Z",
    },
    profile: { weight: 75, height: 175 },
    entitlements: [],
    subscription: { plan: "free", effectivePlan: "free", status: "active" },
  };
  const exercise = {
    id: "squat",
    _id: "squat",
    name: "Sentadilla",
    muscle: "Cuádriceps",
    primaryMuscleGroup: "quadriceps",
    weightBasis: "total",
    sets: [
      {
        id: "set-1",
        entries: [
          {
            id: "entry-1",
            kg: "60",
            reps: "8",
            done: true,
            completedAt: "2026-10-29T15:59:00Z",
          },
        ],
      },
    ],
  };
  const routine = {
    _id: "lower-a",
    name: "Lower A",
    ownerId: user.id,
    trainingPlanId: "plan",
    trainingPlanSlotId: "monday",
    exercises: [
      { exerciseId: "squat", name: "Sentadilla", sets: 1, reps: "8" },
    ],
  };
  const plan = {
    _id: "plan",
    name: "Mes 1",
    status: "active",
    scheduleMode: "fixed",
    startDate: "2026-10-26",
    endDate: "2026-11-29",
    weeklySchedule: [
      {
        slotId: "monday",
        dayIndex: 1,
        type: "training",
        routineId: "lower-a",
        focus: "Lower A",
      },
    ],
  };
  const snapshot = {
    ownerId: user.id,
    startedById: user.id,
    selectedRoutineId: "lower-a",
    selectedPlanContext: {
      planId: "plan",
      slotId: "monday",
      scheduleOverride: null,
    },
    trainingRequestId: "training-test-id",
    sessionDate: "2026-10-29",
    hasStarted: true,
    isRunning: false,
    durationSeconds: 1800,
    lastUpdate: Date.parse("2026-10-29T16:00:00Z"),
    exercises: [exercise],
  };
  await page.addInitScript(
    ({ user, snapshot }) => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
      localStorage.setItem("active_page", "registrar");
      localStorage.setItem("gym_auth_token", "test-only");
      localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
      localStorage.setItem(
        "active_training_snapshot",
        JSON.stringify(snapshot),
      );
    },
    { user, snapshot },
  );
  const attempts = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/auth/me") return json({ user });
    if (path === "/api/auth/profile")
      return json({ profile: user.profile, security: {}, capabilities: {} });
    if (path === "/api/auth/csrf") return json({ csrfToken: "test-only" });
    if (path === "/api/routines") return json([routine]);
    if (path === "/api/plans") return json([plan]);
    if (path === "/api/preferences")
      return json({ locationMode: "disabled", branch: "sopocachi", goals: {} });
    if (path === "/api/training-drafts/active")
      return json(
        request.method() === "GET" ? { snapshot: null } : { ok: true },
      );
    if (path === "/api/trainings" && request.method() === "POST") {
      const payload = request.postDataJSON();
      attempts.push(payload);
      if (!payload.scheduleOverride?.acknowledged)
        return json(
          {
            error:
              "Confirma que deseas guardar este entrenamiento en un día distinto al planificado.",
            code: "TRAINING_SCHEDULE_CONFIRMATION_REQUIRED",
            details: {
              selectedDayIndex: 1,
              scheduleMode: "fixed",
              actualDate: "2026-10-29",
            },
          },
          409,
        );
      return json({ ...payload, _id: "saved-training" }, 201);
    }
    if (path === "/api/trainings/saved-training")
      return json({ ...attempts.at(-1), _id: "saved-training" });
    if (path === "/api/exercises") return json({ items: [exercise], total: 1 });
    if (path === "/api/exercises/squat") return json(exercise);
    if (path === "/api/notifications")
      return json({ notifications: [], unread: 0 });
    if (path.startsWith("/api/dashboard/bootstrap"))
      return json({
        routines: [routine],
        activePlan: plan,
        trainings: { summaries: [], details: [] },
        preference: { locationMode: "disabled" },
        notifications: [],
        checkIns: [],
      });
    return json([]);
  });
  await page.goto("/");
  const finish = page.locator("[data-training-complete-page]");
  await expect(finish).toBeVisible();
  await finish
    .getByRole("button", { name: "Finalizar entrenamiento", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Guardar en otro día",
  });
  await expect(confirmation).toContainText(
    "Lower A está programado para el lunes",
  );
  await expect(confirmation).toContainText("jueves, 29 de octubre");
  await confirmation
    .getByRole("button", { name: "Volver sin guardar" })
    .click();
  expect(attempts).toHaveLength(1);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("active_training_snapshot"))
          .exercises[0].sets[0].entries[0].done,
    ),
  ).toBe(true);
  await finish
    .getByRole("button", { name: "Finalizar entrenamiento", exact: true })
    .click();
  await expect(confirmation).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await page.screenshot({
      path: testInfo.outputPath(`schedule-confirmation-${theme}.png`),
      animations: "disabled",
    });
  }
  await confirmation
    .getByRole("button", { name: "Confirmar y guardar entrenamiento" })
    .click();
  await expect(
    page.getByText("Entrenamiento guardado correctamente.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-page-view="resumen_sesion"]')).toBeVisible();
  expect(attempts).toHaveLength(3);
  expect(attempts[2]._id).toBe("training-test-id");
  expect(attempts[2]._id).toBe(attempts[0]._id);
  expect(attempts[2].date).toBe("2026-10-29");
  expect(attempts[2].scheduleOverride).toMatchObject({
    acknowledged: true,
    selectedDayIndex: 1,
    actualDate: "2026-10-29",
    scheduleMode: "fixed",
  });
  expect(attempts[2].exercises[0].sets[0].entries[0]).toMatchObject({
    weightKg: 60,
    reps: 8,
    done: true,
  });
});
