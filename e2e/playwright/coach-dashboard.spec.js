import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/La_Paz" });
const today = "2026-10-29";
const athletes = Array.from({ length: 20 }, (_, index) => ({
  id: `athlete-${index + 1}`,
  name: `Alumno ${String(index + 1).padStart(2, "0")}`,
  email: `athlete${index + 1}@example.invalid`,
  role: "Cliente",
  trainingMode: "coach_managed",
  assignedTrainerId: "coach",
  routineCount: index < 2 ? 0 : 2,
  trainingCount: 12,
  priority: index < 3 ? "high" : "normal",
  alerts:
    index < 3 ? [{ title: "Revisar su planificación", severity: "high" }] : [],
  profile: { goal: "mantenimiento", weight: 70, height: 170 },
  lastTraining: { date: today, routineName: "Torso A" },
  adherence: { percentage: 85 },
}));

async function setup(page, initialPage, fixtures = {}) {
  await page.clock.setFixedTime(new Date(`${today}T16:00:00Z`));
  const user = {
    id: "coach",
    name: "Diego Coach",
    email: "coach@example.invalid",
    role: "Entrenador",
    isActive: true,
    onboarding: { status: "complete" },
    trainingMode: "independent",
    entitlements: ["coach_portfolio"],
    subscription: {
      plan: "coach_pro",
      effectivePlan: "coach_pro",
      status: "active",
    },
  };
  let notifications = fixtures.notifications || [];
  await page.addInitScript(
    ({ user, initialPage }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("active_page", initialPage);
      localStorage.setItem("gym_auth_token", "test-only");
      localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
      sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
    },
    { user, initialPage },
  );
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const currentAthletes = fixtures.athletes || athletes;
    let body = {};
    if (path === "/api/auth/me") body = { user };
    else if (path === "/api/coach/portfolio")
      body = {
        athletes: currentAthletes,
        summary: {
          athletes: 20,
          attention: 3,
          sessionsThisWeek: 20,
          adherence: 85,
        },
        alerts: currentAthletes.slice(0, 3).map((athlete) => ({
          athleteId: athlete.id,
          athleteName: athlete.name,
          title: "Revisar su planificación",
          severity: "high",
        })),
      };
    else if (path === "/api/coach/athletes") body = currentAthletes;
    else if (path === "/api/coach/workflow-settings")
      body = fixtures.workflowSettings || { followUp: {} };
    else if (path.endsWith("/overview"))
      body = fixtures.overview || {
        athlete: currentAthletes.find((athlete) =>
          path.includes(`/${athlete.id}/`),
        ),
        plans: [],
        routines: [],
        recentTrainings: [],
        followUpRecords: { checkIns: [] },
      };
    else if (path === "/api/trainings" && fixtures.overview)
      body = fixtures.overview.recentTrainings;
    else if (path === "/api/check-ins" && fixtures.overview)
      body = fixtures.overview.followUpRecords.checkIns;
    else if (path === "/api/coach/notifications/read") {
      notifications = notifications.map((item) => ({
        ...item,
        readAt: item.readAt || new Date().toISOString(),
      }));
      body = { ok: true };
    } else if (
      path === "/api/coach/notifications" ||
      path === "/api/notifications"
    )
      body = {
        notifications,
        unread: notifications.filter((item) => !item.readAt).length,
      };
    else if (path === "/api/messages") body = { conversations: [] };
    else if (path === "/api/auth/profile")
      body = { profile: { name: user.name }, security: {}, capabilities: {} };
    else if (path === "/api/preferences")
      body = { branch: "sopocachi", allowedBranches: ["sopocachi"], goals: {} };
    else if (path === "/api/exercises") body = { items: [], total: 0 };
    else if (path === "/api/plan-templates")
      body = fixtures.planTemplates || [];
    else if (path === "/api/routines" && fixtures.overview)
      body = fixtures.overview.routines;
    else if (path === "/api/plans" && fixtures.overview)
      body = fixtures.overview.plans;
    else if (
      [
        "/api/plans/templates",
        "/api/routines",
        "/api/trainings",
        "/api/plans",
      ].includes(path)
    )
      body = [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
}

const noOverflow = async (page) =>
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);

test("muestra los avatares de mujer y hombre en cuatro perfiles completados", async ({
  page,
}, testInfo) => {
  const assigned = [
    { gender: "female", avatarId: "gym-15" },
    { gender: "female", avatarId: "gym-18" },
    { gender: "male", avatarId: "gym-05" },
    { gender: "male", avatarId: "gym-08" },
  ];
  const roster = athletes.slice(0, 4).map((athlete, index) => ({
    ...athlete,
    profile: { ...athlete.profile, ...assigned[index] },
  }));
  await setup(page, "trainer", { athletes: roster });
  const team = page.locator(".coach-home__roster");
  for (const athlete of roster) {
    const avatar = team.getByRole("img", {
      name: `Avatar deportivo de ${athlete.name}`,
      exact: true,
    });
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute(
      "data-avatar-id",
      athlete.profile.avatarId,
    );
    await expect(avatar).toHaveAttribute(
      "data-avatar-gender",
      athlete.profile.gender,
    );
    const dimensions = await avatar.evaluate(async (element) => {
      const url = getComputedStyle(element).backgroundImage.match(
        /^url\(["']?(.*?)["']?\)$/,
      )?.[1];
      const image = new Image();
      image.src = url;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    });
    expect(dimensions).toEqual([1536, 1024]);
  }
  await team.screenshot({
    path: testInfo.outputPath("coach-assigned-avatars.png"),
    animations: "disabled",
  });
});

for (const initialPage of ["trainer", "coach_athletes"]) {
  test(`sincroniza avatares en ${initialPage} al volver y mientras la vista permanece abierta`, async ({
    page,
  }) => {
    await page.clock.install();
    const fixtures = {
      athletes: athletes.map((athlete, index) =>
        index === 0
          ? {
              ...athlete,
              profile: {
                ...athlete.profile,
                gender: "female",
                avatarId: "gym-02",
              },
            }
          : athlete,
      ),
    };
    await setup(page, initialPage, fixtures);
    await expect(
      page
        .locator('[data-avatar-id="gym-02"]')
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    fixtures.athletes = fixtures.athletes.map((athlete, index) =>
      index === 0
        ? {
            ...athlete,
            profile: { ...athlete.profile, avatarId: "gym-18" },
          }
        : athlete,
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page
        .locator('[data-avatar-id="gym-18"]')
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(page.locator('[data-avatar-id="gym-02"]')).toHaveCount(0);
    if (initialPage === "coach_athletes") {
      await page
        .locator(".coach-directory .coach-athlete-row")
        .filter({ visible: true })
        .filter({ hasText: "Alumno 01" })
        .click();
      await expect(
        page
          .getByRole("region", { name: "Ficha del alumno" })
          .locator('[data-avatar-id="gym-18"]'),
      ).toBeVisible();
    }
    fixtures.athletes = fixtures.athletes.map((athlete, index) =>
      index === 0
        ? {
            ...athlete,
            profile: { ...athlete.profile, avatarId: "gym-14" },
          }
        : athlete,
    );
    await page.clock.fastForward(30_000);
    const target =
      initialPage === "coach_athletes"
        ? page.getByRole("region", { name: "Ficha del alumno" })
        : page;
    await expect(
      target.locator('[data-avatar-id="gym-14"]').first(),
    ).toBeVisible();
  });
}

test("las notificaciones del coach presentan una lista compacta con filtros y detalle", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  const messages = [
    {
      _id: "checkin",
      type: "critical_check_in",
      title: "Check-in que requiere atención",
      message:
        "Alumno 20 reportó una disponibilidad de 28/100. Revisa su estado antes de comenzar la próxima sesión.",
      athleteId: "athlete-20",
      createdAt: `${today}T15:40:00Z`,
      readAt: null,
    },
    {
      _id: "intake",
      type: "intake_submitted",
      title: "Evaluación inicial recibida",
      message:
        "Alumno 19 completó su evaluación inicial con toda la información sobre su experiencia y objetivos para preparar su planificación.",
      athleteId: "athlete-19",
      createdAt: `${today}T14:00:00Z`,
      readAt: null,
    },
    {
      _id: "joined",
      type: "athlete_joined",
      title: "Nuevo alumno vinculado",
      message:
        "Alumno 18 aceptó tu invitación y debe completar su evaluación inicial.",
      athleteId: "athlete-18",
      createdAt: "2026-10-28T17:00:00Z",
      readAt: null,
    },
    {
      _id: "final",
      type: "final_assessment_submitted",
      title: "Evaluación final recibida",
      message: "Alumno 17 completó la evaluación de Fuerza y constancia.",
      athleteId: "athlete-17",
      createdAt: "2026-10-28T16:00:00Z",
      readAt: "2026-10-28T17:00:00Z",
    },
    {
      _id: "deleted",
      type: "athlete_account_deleted",
      title: "Cuenta eliminada",
      message:
        "Alumno anterior eliminó su cuenta y ya no está vinculado a tu equipo.",
      athleteId: null,
      createdAt: "2026-10-25T16:00:00Z",
      readAt: "2026-10-25T17:00:00Z",
    },
  ];
  await setup(page, "trainer", { notifications: messages });
  await page
    .getByRole("button", { name: "Notificaciones, 3 sin leer", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Notificaciones",
    exact: true,
  });
  await expect(dialog.locator(".coach-notifications__item")).toHaveCount(5);
  await expect(
    dialog.getByRole("region", { name: "Hoy", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText(messages[1].message, { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByText("Alumno 20 · 28/100", { exact: true }),
  ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`coach-notifications-${theme}.png`),
      animations: "disabled",
    });
  }
  await dialog.getByRole("button", { name: "Sin leer 3", exact: true }).click();
  await expect(dialog.locator(".coach-notifications__item")).toHaveCount(3);
  await dialog
    .getByRole("button", { name: "Marcar todas como leídas", exact: true })
    .click();
  await expect(
    dialog.getByText("No tienes avisos sin leer.", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Todas", exact: true }).click();
  await dialog.getByRole("button", { name: /Check-in por revisar/ }).click();
  const detail = page.getByRole("dialog", {
    name: "Detalle del aviso",
    exact: true,
  });
  await expect(
    detail.getByText(messages[0].message, { exact: true }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Ver alumno", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Ficha del alumno", exact: true }),
  ).toContainText("Alumno 20");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("crear planificación ofrece dos entradas visuales y permite personalizar una plantilla", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  await setup(page, "coach_athletes", {
    workflowSettings: {
      followUp: {
        weight: {
          enabled: true,
          frequencyInterval: 2,
          frequencyUnit: "week",
          weekday: 5,
          required: false,
        },
        photos: { enabled: false, views: ["front"] },
        review: { enabled: true, intervalWeeks: 8, leadDays: 3 },
      },
    },
    planTemplates: [
      {
        _id: "base-template",
        name: "Fuerza base",
        durationWeeks: 6,
        weeklySchedule: Array.from({ length: 7 }, (_, index) => ({
          dayIndex: index + 1,
          type: index === 0 ? "training" : "rest",
          focus: index === 0 ? "Torso" : "",
        })),
      },
    ],
  });
  await page
    .getByPlaceholder(/Buscar (alumno|atleta)/)
    .filter({ visible: true })
    .fill("Alumno 20");
  await page
    .locator(".coach-directory .coach-athlete-row")
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole("region", { name: "Ficha del alumno" })
    .getByRole("button", { name: "Crear plan", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Crear planificación",
    exact: true,
  });
  await expect(dialog.locator(".plan-create__choices > button")).toHaveCount(2);
  await expect(dialog.locator(".plan-create__choices img")).toHaveCount(2);
  await expect(
    dialog.getByRole("button", {
      name: /Plan rápido|Duplicar plan anterior|^Continuar$/,
    }),
  ).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`create-plan-${theme}.png`),
      animations: "disabled",
    });
  }
  await dialog.getByRole("button", { name: /Usar una plantilla/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "Plantillas disponibles" }),
  ).toBeVisible();
  await expect(dialog.locator(".plan-create img")).toHaveCount(0);
  await dialog.getByRole("button", { name: /Fuerza base/ }).click();
  await expect(dialog.getByLabel("Nombre del plan")).toHaveValue("Fuerza base");
  await expect(
    dialog.locator(".plan-editor__general > header img"),
  ).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("plan-general-dark.png"),
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: /Continuar: organizar semana/ })
    .click();
  const days = dialog.getByRole("group", { name: "Días de entrenamiento" });
  await expect(days.getByRole("button")).toHaveCount(7);
  await expect(
    days.getByRole("button", { name: "Entrenar Martes", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await days
    .getByRole("button", { name: "Entrenar Martes", exact: true })
    .click();
  await days
    .getByRole("button", { name: "Entrenar Lunes", exact: true })
    .click();
  await expect(
    days.getByRole("button", { name: "Entrenar Martes", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog.getByRole("button", {
      name: "Seleccionar rutina para Martes",
      exact: true,
    }),
  ).toContainText("Entrenamiento");
  await expect(
    dialog.getByRole("button", {
      name: "Seleccionar rutina para Lunes",
      exact: true,
    }),
  ).toHaveCount(0);
  const restCard = dialog.getByRole("article", {
    name: "Lunes: Descanso",
    exact: true,
  });
  await expect(restCard).toContainText("Descanso");
  const restSize = await restCard.boundingBox();
  const trainingSize = await dialog
    .getByRole("button", {
      name: "Seleccionar rutina para Martes",
      exact: true,
    })
    .boundingBox();
  expect(restSize.width).toBe(trainingSize.width);
  expect(restSize.height).toBe(trainingSize.height);
  await expect(
    dialog.getByText("Recuperación activa", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Elegir actividad del día", exact: true }),
  ).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`plan-week-${theme}.png`),
      animations: "disabled",
    });
  }
  await dialog.getByRole("button", { name: /Revisar planificación/ }).click();
  await dialog.getByRole("button", { name: /5 de 6 tareas activas/ }).click();
  await expect(
    dialog.getByRole("button", { name: "General del coach", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Personalizado", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("switch", { name: "Activar Fotos de progreso" }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(dialog.getByRole("button", { name: /Peso/ })).toContainText(
    "Cada 2 semanas · Viernes",
  );
  await expect(dialog.locator(".plan-editor__followup img")).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`plan-followup-${theme}.png`),
      animations: "disabled",
    });
  }
  await dialog.getByRole("switch", { name: "Activar Peso" }).click();
  await dialog.getByRole("button", { name: /Volver a revisión/ }).click();
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/api/coach/athletes/athlete-20/plans"),
  );
  await dialog
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  const savedPlan = (await saved).postDataJSON();
  expect(savedPlan.weeklySchedule.map((day) => day.type)).toEqual([
    "rest",
    "training",
    "rest",
    "rest",
    "rest",
    "rest",
    "rest",
  ]);
  expect(savedPlan.followUp).toMatchObject({
    useCoachDefaults: false,
    weight: { enabled: false, frequencyInterval: 2, weekday: 5 },
    photos: { enabled: false },
    review: { intervalWeeks: 8, leadDays: 3 },
  });
});

test("una rutina del plan activo abre el registro con el alumno y el día seleccionados", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  await setup(page, "coach_athletes", {
    overview: {
      athlete: athletes[19],
      plans: [
        {
          _id: "active-plan",
          name: "Plan de fuerza",
          status: "active",
          startDate: "2026-10-26",
          endDate: "2026-11-29",
          scheduleMode: "fixed",
          weeklySchedule: [
            {
              slotId: "monday",
              dayIndex: 1,
              type: "training",
              routineId: "upper",
              focus: "Torso A",
            },
          ],
        },
      ],
      routines: [
        {
          _id: "upper",
          name: "Torso A",
          ownerId: "athlete-20",
          isAvailableForTraining: true,
          exercises: [],
        },
      ],
      recentTrainings: [],
      followUpRecords: { checkIns: [] },
    },
  });
  await page
    .getByPlaceholder(/Buscar (alumno|atleta)/)
    .filter({ visible: true })
    .fill("Alumno 20");
  await page
    .locator(".coach-directory .coach-athlete-row")
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("tab", { name: "Plan", exact: true }).click();
  if (testInfo.project.name.includes("desktop"))
    await page.locator(".athlete-plan-catalog-card").click();
  await page
    .getByRole("button", {
      name: "Registrar entrenamiento de Torso A",
      exact: true,
    })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator('[data-page-view="registrar"]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("active_page")))
    .toBe("registrar");
  await expect(
    page.getByRole("heading", { name: "Algo salió mal" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Torso A", { exact: true }).first(),
  ).toBeVisible();
});

test("el inicio del coach mantiene veinte alumnos en una lista compacta, paginada y con búsqueda", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  await setup(page, "trainer");
  const roster = page.getByRole("region", { name: "Alumnos del coach" });
  await expect(roster.locator(".coach-athlete-row")).toHaveCount(5);
  await expect(roster.getByRole("navigation")).toContainText("1–5 de 20");
  expect(
    (await roster.locator(".coach-athlete-row").first().boundingBox()).height,
  ).toBeLessThanOrEqual(64);
  expect((await roster.boundingBox()).height).toBeLessThanOrEqual(620);
  const hero = page.getByRole("region", { name: "Tu equipo", exact: true });
  await expect
    .poll(() => hero.locator("img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await roster.getByRole("button", { name: "Página siguiente" }).click();
  await expect(roster.getByRole("navigation")).toContainText("6–10 de 20");
  await roster
    .getByRole("searchbox", { name: "Buscar alumno" })
    .fill("Alumno 20");
  await expect(roster.locator(".coach-athlete-row")).toHaveCount(1);
  await expect(roster.locator(".coach-athlete-row")).toContainText("Alumno 20");
  await roster.getByRole("searchbox").fill("");
  await expect(roster.getByRole("navigation")).toContainText("1–5 de 20");
  await roster.getByRole("button", { name: "Atención", exact: true }).click();
  await expect(roster.locator(".coach-athlete-row")).toHaveCount(3);
  await roster.getByRole("button", { name: "Todos", exact: true }).click();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((dark) => {
      document.documentElement.classList.toggle("dark", dark);
      window.scrollTo(0, 0);
    }, theme === "dark");
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`coach-home-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await roster.getByRole("button", { name: "Ver todos", exact: true }).click();
  await expect(page.locator(".coach-directory")).toBeVisible();
});

test("el listado completo pagina veinte alumnos y permite abrir al último desde la búsqueda", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  await setup(page, "coach_athletes");
  const rows = page
    .locator(".coach-directory .coach-athlete-row")
    .filter({ visible: true });
  const pagination = page
    .getByRole("navigation", { name: "Páginas de alumnos" })
    .filter({ visible: true });
  await expect(rows).toHaveCount(8);
  await expect(pagination).toContainText("1–8 de 20");
  await pagination.getByRole("button", { name: "Página siguiente" }).click();
  await expect(pagination).toContainText("9–16 de 20");
  await pagination.getByRole("button", { name: "Página siguiente" }).click();
  await expect(rows).toHaveCount(4);
  await expect(pagination).toContainText("17–20 de 20");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((dark) => {
      document.documentElement.classList.toggle("dark", dark);
      window.scrollTo(0, 0);
    }, theme === "dark");
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`coach-directory-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  const search = page
    .getByPlaceholder(/Buscar (alumno|atleta)/)
    .filter({ visible: true });
  await search.fill("Alumno 20");
  await expect(rows).toHaveCount(1);
  await rows.first().click();
  await expect(
    page.getByRole("tablist", { name: /Informacion del (alumno|atleta)/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Algo salió mal" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Ficha del alumno" }),
  ).toContainText("athlete20@example.invalid");
  await expect(
    page.getByRole("button", { name: "Ver evaluación del alumno" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Seguimiento", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Seguimiento del alumno" }),
  ).toContainText("Sin registro");
  await expect(page.locator(".athlete-followup__card")).toHaveCount(5);
  await noOverflow(page);
});

test("el perfil del alumno presenta sus cuatro pestañas con imágenes y registros reales", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  const plan = {
    _id: "strength-plan",
    name: "Fuerza y constancia",
    status: "active",
    startDate: "2026-10-26",
    endDate: "2026-11-22",
    durationWeeks: 4,
    scheduleMode: "fixed",
    weeklySchedule: [1, 3, 5].map((dayIndex) => ({
      slotId: `slot-${dayIndex}`,
      dayIndex,
      type: "training",
      routineId: "upper",
      focus: "Torso A",
    })),
  };
  const recentTrainings = [today, "2026-10-27"].map((date, index) => ({
    _id: `session-${index}`,
    ownerId: "athlete-20",
    date,
    routineId: "upper",
    routineName: "Torso A",
    durationSeconds: 2700,
    exercises: [
      {
        exerciseId: "bench",
        exerciseName: "Press de banca",
        sets: [{ reps: 8, weight: 60, done: true }],
      },
    ],
  }));
  const checkIn = {
    _id: "checkin-1",
    dateKey: today,
    readinessScore: 82,
    readinessState: "ready",
  };
  const assessment = {
    _id: "assessment-1",
    dateKey: today,
    answers: {
      progress: 4,
      goalReached: "partly",
      feedback: "Mayor constancia y mejor técnica.",
    },
  };
  const overview = {
    athlete: {
      ...athletes[19],
      coachIntake: {
        status: "submitted",
        submittedAt: `${today}T10:00:00Z`,
        answers: [
          {
            key: "equipment",
            label: "Equipamiento",
            value: "Gimnasio completo",
          },
        ],
      },
    },
    plans: [plan],
    routines: [{ _id: "upper", name: "Torso A", exercises: [] }],
    recentTrainings,
    followUpRecords: {
      checkIns: [checkIn],
      latestAssessment: assessment,
      assessments: [assessment],
      weights: [74.8, 75.2, 75.5].map((weightKg, index) => ({
        _id: `weight-${index}`,
        dateKey: [today, "2026-10-22", "2026-10-15"][index],
        weightKg,
      })),
      measurements: [
        { _id: "measure-1", dateKey: today, values: { waist: 80, chest: 98 } },
      ],
      photos: [],
    },
  };
  await setup(page, "coach_athletes", { overview });
  const search = page
    .getByPlaceholder(/Buscar (alumno|atleta)/)
    .filter({ visible: true });
  await search.fill("Alumno 20");
  await page
    .locator(".coach-directory .coach-athlete-row")
    .filter({ visible: true })
    .first()
    .click();
  const profile = page.locator(".coach-athlete-profile");
  await expect(
    profile.getByRole("region", { name: "Ficha del alumno" }),
  ).toContainText("athlete20@example.invalid");
  expect(
    (await profile.locator(".athlete-profile-header__hero").boundingBox())
      .height,
  ).toBeLessThan(165);
  await expect(
    profile.getByRole("button", { name: "Elegir entrenamiento", exact: true }),
  ).toHaveCount(0);
  const tabs = profile.getByRole("tablist");
  await expect(tabs.getByRole("tab")).toHaveCount(4);
  await expect(
    profile.getByRole("button", { name: "Ver plan del alumno", exact: true }),
  ).toContainText(plan.name);
  await profile
    .getByRole("button", { name: "Ver evaluación del alumno" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Evaluación de Alumno/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Gimnasio completo", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Volver al perfil/ })
    .first()
    .click();
  for (const [name, file] of [
    ["Resumen", "summary"],
    ["Plan", "plan"],
    ["Seguimiento", "followup"],
    ["Historial", "history"],
  ]) {
    await tabs.getByRole("tab", { name, exact: true }).click();
    await expect(tabs.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    if (name === "Seguimiento") {
      await expect(profile.getByText("82/100", { exact: true })).toBeVisible();
      await expect(
        profile.getByText("74.8 kg", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        profile.getByRole("img", {
          name: "Peso desde 75.5 hasta 74.8 kilogramos",
        }),
      ).toBeVisible();
    }
    if (name === "Historial")
      await expect(profile.locator(".athlete-history")).toContainText(
        "Torso A",
      );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((dark) => {
        document.documentElement.classList.toggle("dark", dark);
        window.scrollTo(0, 0);
      }, theme === "dark");
      await noOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`athlete-${file}-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    if (name === "Plan" && testInfo.project.name.includes("desktop")) {
      await profile.locator(".athlete-plan-catalog-card").click();
      await expect(
        profile.getByRole("progressbar", {
          name: "Progreso temporal de la planificación",
          exact: true,
        }),
      ).toBeVisible();
      await noOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath("athlete-plan-detail-dark.png"),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  await tabs.getByRole("tab", { name: "Resumen", exact: true }).click();
  await profile
    .getByRole("button", { name: "Ver alimentación del alumno" })
    .click();
  await expect(page.locator('[data-page-view="nutricion"]')).toBeVisible();
});
