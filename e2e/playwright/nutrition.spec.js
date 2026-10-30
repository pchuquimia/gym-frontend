import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/La_Paz" });
// Keep the mock API and browser on the same day, including UTC CI runners.
// A fixed midday also prevents a midnight rollover during the test run.
const today = "2026-10-28";
const breakfast = {
  mealId: "95d624ba-78cb-4366-8ab7-7c75131ce573",
  name: "Desayuno",
  time: "08:00",
  notes: "Preparar según las indicaciones del coach.",
  foods: [
    {
      name: "Preparación A",
      quantity: "1 porción",
      calories: 300,
      protein: 20,
      carbs: 40,
      fat: 6,
    },
    {
      name: "Acompañamiento",
      quantity: "1 porción",
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 3,
    },
  ],
};
const meals = [
  breakfast,
  {
    ...breakfast,
    mealId: "86be88cc-24a0-4311-a042-7ae5ac552572",
    name: "Almuerzo",
    time: "13:00",
  },
  {
    ...breakfast,
    mealId: "a7fb97a3-87cf-4b5e-b9c9-c112d06ca234",
    name: "Cena",
    time: "20:00",
  },
];
const nutritionPlan = {
  _id: "plan-1",
  startsOn: today,
  content: {
    name: "Plan de alimentación del coach",
    notes: "Plan de ejemplo para probar la interfaz.",
    meals,
  },
};
const userFor = (role) => ({
  id: role === "Cliente" ? "athlete" : "coach",
  role,
  name: role === "Cliente" ? "Ana Alumna" : "Diego Coach",
  email: "test@example.invalid",
  isActive: true,
  onboarding: { status: "complete" },
  trainingMode: role === "Cliente" ? "coach_managed" : "independent",
  assignedTrainerId: role === "Cliente" ? "coach" : null,
  coachIntake: { status: "pending", coachId: "coach" },
  profile: {
    language: "es",
    weight: 70,
    height: 170,
    hydrationGoalMl: 2500,
    goal: "mantenimiento",
  },
  subscription: { plan: "free", effectivePlan: "free", status: "active" },
  entitlements: [],
});
async function setup(
  page,
  role,
  initialPage = "nutricion",
  overrides = {},
  initialPlan = null,
  fixtures = {},
) {
  await page.clock.setFixedTime(new Date(`${today}T16:00:00Z`));
  const user = { ...userFor(role), ...overrides };
  const completions = new Map();
  let storedPlan =
    initialPlan || (role === "Cliente" ? structuredClone(nutritionPlan) : null);
  let saved;
  let notifications = fixtures.notifications || [];
  await page.addInitScript(
    ({ user, initialPage }) => {
      localStorage.setItem("active_page", initialPage);
      localStorage.setItem("gym_auth_token", "test-only");
      localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
    },
    { user, initialPage },
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/auth/me") return json({ user });
    if (path === "/api/auth/dev-admin") return json({ error: "disabled" }, 401);
    if (path.startsWith("/api/dashboard/bootstrap/") && fixtures.dashboard)
      return json(fixtures.dashboard);
    if (path === "/api/routines" && fixtures.dashboard)
      return json(fixtures.dashboard.routines);
    if (path === "/api/notifications/read") {
      notifications = notifications.map((item) => ({
        ...item,
        readAt: new Date().toISOString(),
      }));
      return json({ ok: true });
    }
    if (path === "/api/notifications")
      return json({
        notifications,
        unread: notifications.filter((item) => !item.readAt).length,
      });
    if (path === "/api/coach/athletes")
      return json([{ id: "athlete", _id: "athlete", name: "Ana Alumna" }]);
    if (
      path === "/api/nutrition/athletes/athlete/plans" &&
      req.method() === "POST"
    ) {
      saved = req.postDataJSON();
      storedPlan = {
        _id: "assigned-plan",
        startsOn: saved.startsOn,
        content: { name: saved.name, notes: saved.notes, meals: saved.meals },
      };
      return json({ plan: storedPlan }, 201);
    }
    if (path === "/api/nutrition/athletes/athlete")
      return json(
        fixtures.coachNutrition || {
          plans: storedPlan ? [storedPlan] : [],
          daily: { plan: storedPlan, day: null, dateKey: today },
          days: [],
        },
      );
    if (path === "/api/users/coach-application" && req.method() === "POST") {
      const body = req.postDataJSON();
      user.coachApplication = {
        status: "pending",
        experience: body.experience,
        intendedUse: body.intendedUse,
      };
      return json({ user }, 201);
    }
    if (path === "/api/messages") return json({ conversations: [] });
    if (path === "/api/nutrition/foods/5678/portions")
      return json({
        portions: [{ id: "large", label: "huevo grande", gramWeight: 50 }],
      });
    if (/\/api\/nutrition\/foods\/\d+\/portions$/.test(path))
      return json({ portions: [] });
    if (
      path === "/api/nutrition/foods/search" &&
      /huevo/i.test(url.searchParams.get("q"))
    )
      return json({
        foods: [
          {
            foodId: "5678",
            name: "Huevo · Crudo",
            description: "Egg, whole, raw",
            quantity: "100 g",
            calories: 140,
            protein: 12,
            carbs: 1,
            fat: 10,
            nutritionSource: {
              provider: "usda",
              foodId: "5678",
              description: "Egg, whole, raw",
              grams: 100,
              per100g: { calories: 140, protein: 12, carbs: 1, fat: 10 },
            },
          },
        ],
      });
    if (path === "/api/nutrition/foods/search")
      return json({
        foods: [
          {
            foodId: "1234",
            name: "Pechuga de pollo · Crudo, sin piel",
            description: "Chicken breast, raw, skinless",
            preparation: "Crudo",
            quantity: "200 g",
            calories: 240,
            protein: 45,
            carbs: 0,
            fat: 5,
            nutritionSource: {
              provider: "usda",
              foodId: "1234",
              description: "Chicken breast, raw, skinless",
              grams: 200,
              per100g: { calories: 120, protein: 22.5, carbs: 0, fat: 2.5 },
            },
          },
        ],
      });
    if (path === "/api/nutrition/day") {
      const body = req.method() === "PATCH" ? req.postDataJSON() : null;
      const dateKey = body?.dateKey || url.searchParams.get("dateKey") || today;
      const done = completions.get(dateKey) || [];
      if (body)
        completions.set(
          dateKey,
          body.completed
            ? [...new Set([...done, body.mealId])]
            : done.filter((id) => id !== body.mealId),
        );
      return json({
        plan: storedPlan,
        day: completions.has(dateKey)
          ? { completedMealIds: completions.get(dateKey) }
          : null,
        dateKey,
        today,
        canComplete: dateKey <= today,
      });
    }
    if (path === "/api/auth/profile")
      return json({ profile: user.profile, security: {}, capabilities: {} });
    if (path === "/api/preferences")
      return json({
        branch: "sopocachi",
        locationMode: "single",
        allowedBranches: ["sopocachi"],
        goals: {},
      });
    if (path === "/api/exercises") return json({ items: [], total: 0 });
    if (["/api/trainings", "/api/routines", "/api/plans"].includes(path))
      return json([]);
    if (path === "/api/weigh-ins") return json({ entries: [] });
    return json({});
  });
  await page.goto("/");
  return { getSaved: () => saved };
}
const noOverflow = async (page) =>
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);

const expectMealPhotos = async (card) => {
  for (const [name, photo] of [
    ["Desayuno", "breakfast"],
    ["Almuerzo", "lunch"],
    ["Cena", "dinner"],
  ]) {
    const image = card.getByRole("img", { name, exact: true });
    await expect(image).toHaveAttribute(
      "src",
      `/images/nutrition/${photo}.webp`,
    );
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBeGreaterThan(0);
  }
};

test("dashboard del alumno con coach muestra comidas compactas y notificaciones desde la campana", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile")) {
    await page.setViewportSize({ width: 360, height: 800 });
  }
  await setup(page, "Cliente", "dashboard", {}, null, {
    notifications: [
      {
        _id: "notice-1",
        type: "coach_message",
        peerId: "coach",
        title: "Nuevo mensaje de tu coach",
        message: "Revisemos tu entrenamiento de mañana",
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ],
  });
  const hero = page.getByRole("region", { name: "Tu punto de partida" });
  const mealsCard = page.getByRole("region", { name: "Comidas de hoy" });
  await expect(hero).toBeVisible();
  await expect(mealsCard).toBeVisible();
  await expectMealPhotos(mealsCard);
  await expect(page.getByText("Últimas novedades")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await hero.boundingBox()).height).toBeLessThanOrEqual(215);
  expect((await mealsCard.boundingBox()).height).toBeLessThanOrEqual(330);
  await expect(mealsCard.getByText("ENERGÍA DE TU PLAN")).toHaveCount(0);
  await expect
    .poll(() => hero.locator("img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await mealsCard
    .getByRole("button", { name: "Ver alimentos de Almuerzo" })
    .click();
  await expect(
    mealsCard.getByRole("listitem").filter({ hasText: "Preparación A" }),
  ).toBeVisible();
  await mealsCard.getByRole("button", { name: "Completar Almuerzo" }).click();
  await expect(
    mealsCard.getByRole("button", { name: "Desmarcar Almuerzo" }),
  ).toBeEnabled();
  await expect(mealsCard.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await mealsCard
    .getByRole("button", { name: "Ver alimentos de Almuerzo" })
    .click();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("managed-dashboard-compact.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    path: testInfo.outputPath("managed-dashboard-compact-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Notificaciones, 1 sin leer" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Notificaciones" }),
  ).toBeVisible();
  await expect(
    page.getByText("Revisemos tu entrenamiento de mañana"),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("notification-center.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    mealsCard.getByRole("button", { name: "Desmarcar Almuerzo" }),
  ).toBeVisible();
});

for (const dayType of ["training", "rest"]) {
  test(`dashboard con plan activo permite completar comidas en día de ${dayType}`, async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name.includes("mobile")) {
      await page.setViewportSize({ width: 360, height: 800 });
    }
    const routine = {
      _id: "routine-upper",
      name: "Torso A",
      exercises: [],
    };
    await setup(
      page,
      "Cliente",
      "dashboard",
      {
        coachIntake: {
          status: "submitted",
          coachId: "coach",
          submittedAt: `${today}T12:00:00Z`,
        },
      },
      null,
      {
        dashboard: {
          ownerId: "athlete",
          activePlan: {
            _id: "training-plan",
            name: "Plan de fuerza",
            status: "active",
            startDate: today,
            durationWeeks: 8,
            scheduleMode: "fixed",
            weeklySchedule: [
              {
                dayIndex: 3,
                type: dayType,
                routineId: dayType === "training" ? routine._id : null,
              },
            ],
          },
          planning: { status: "active" },
          followUp: { missions: [] },
          routines: [routine],
          profile: { profile: userFor("Cliente").profile },
          preference: { branch: "sopocachi", goals: {} },
          trainings: { summaries: [], details: [] },
          dailyMetrics: [],
        },
      },
    );
    const workout = page.locator(".daily-workout");
    const mealsCard = page.getByRole("region", { name: "Comidas de hoy" });
    await expect(workout).toBeVisible();
    await expect(workout).toContainText(
      dayType === "training" ? "Torso A" : "Hoy toca descansar",
    );
    await expect(mealsCard).toBeVisible();
    await expect(page.getByText("Últimas novedades")).toHaveCount(0);
    const workoutBox = await workout.boundingBox();
    const mealsBox = await mealsCard.boundingBox();
    if (testInfo.project.name.includes("mobile")) {
      expect(workoutBox.height).toBeLessThanOrEqual(245);
      expect(mealsBox.y).toBeLessThan(500);
    } else {
      expect(Math.abs(workoutBox.y - mealsBox.y)).toBeLessThanOrEqual(1);
      expect(mealsBox.x).toBeGreaterThan(workoutBox.x);
    }
    expect(
      await mealsCard.evaluate((meals) =>
        meals.previousElementSibling?.classList.contains("daily-workout"),
      ),
    ).toBe(true);
    await mealsCard.getByRole("button", { name: "Completar Almuerzo" }).click();
    await expect(
      mealsCard.getByRole("button", { name: "Desmarcar Almuerzo" }),
    ).toBeEnabled();
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`managed-dashboard-${dayType}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({
      path: testInfo.outputPath(`managed-dashboard-${dayType}-dark.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("el alumno completa comidas por día y ve el avance en el dashboard", async ({
  page,
}, testInfo) => {
  await setup(page, "Cliente", "dashboard");
  await page
    .getByRole("region", { name: "Comidas de hoy" })
    .getByRole("button", { name: "Ver plan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi alimentación", exact: true }),
  ).toBeVisible();
  const content = page.locator(".mobile-app-content");
  await expect(
    content.getByRole("button", { name: "Abrir menu principal", exact: true }),
  ).toBeHidden();
  await expect(
    content.getByRole("button", { name: /Activar modo (claro|oscuro)/ }),
  ).toBeHidden();
  const heading = page.locator(".nutrition-athlete-page__heading");
  await expect(heading.getByRole("button", { name: "Volver" })).toBeVisible();
  await expect(heading.locator("p")).toHaveCount(0);
  await expect(page.locator(".nutrition-athlete-page__back")).toHaveCount(0);
  expect(
    await heading
      .locator("h1")
      .evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain("Inter Tight");
  await expectMealPhotos(page.getByRole("region", { name: "Mi alimentación" }));
  await page.getByRole("button", { name: "Ver alimentos de Desayuno" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Preparación A" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Completar Desayuno" }).click();
  await expect(
    page.getByRole("button", { name: "Desmarcar Desayuno" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("progressbar", { name: "Comidas completadas" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("nutrition-student.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Día siguiente" }).click();
  await expect(
    page.getByRole("button", { name: "Completar Desayuno" }),
  ).toBeDisabled();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: "Día anterior" }).click();
  await expect(
    page.getByRole("button", { name: "Desmarcar Desayuno" }),
  ).toBeVisible();
  await heading.getByRole("button", { name: "Volver" }).click();
  const card = page.getByRole("region", { name: "Comidas de hoy" });
  await expect(card).toBeVisible();
  await expectMealPhotos(card);
  await expect(card.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await page.screenshot({
    path: testInfo.outputPath("nutrition-dashboard.png"),
    fullPage: true,
  });
});

test("el atleta marca desayuno almuerzo y cena sin abrir cada alimento", async ({
  page,
}, testInfo) => {
  await setup(page, "Cliente");
  for (const name of ["Desayuno", "Almuerzo", "Cena"]) {
    const check = page.getByRole("button", { name: `Completar ${name}` });
    await expect(check).toBeEnabled();
    await check.click();
    await expect(
      page.getByRole("button", { name: `Desmarcar ${name}` }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await expect(
    page.getByRole("progressbar", { name: "Comidas completadas" }),
  ).toHaveAttribute("aria-valuenow", "3");
  await expect(page.getByText("Todas las comidas completadas")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Desmarcar Cena" }),
  ).toBeEnabled();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await page.getByRole("button", { name: "Desmarcar Almuerzo" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await expect(
    page.getByRole("button", { name: "Completar Almuerzo" }),
  ).toBeEnabled();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("daily-meal-checks.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    path: testInfo.outputPath("daily-meal-checks-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
});

async function addManualFood(page, mealName, foodName, quantity) {
  await page
    .getByRole("button", { name: `Agregar alimento a ${mealName}` })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Crear alimento/ }).click();
  await dialog.getByLabel("Nombre del alimento").fill(foodName);
  await dialog.getByLabel("Cantidad", { exact: true }).fill(quantity);
  await dialog.getByRole("button", { name: `Agregar a ${mealName}` }).click();
  await expect(dialog).toHaveCount(0);
}

test("el coach ve las comidas del alumno con fotos y conserva su registro al revisar una versión futura", async ({
  page,
}, testInfo) => {
  const activePlan = {
    ...structuredClone(nutritionPlan),
    _id: "active-diet",
  };
  const futurePlan = {
    ...structuredClone(nutritionPlan),
    _id: "next-diet",
    startsOn: "2026-10-29",
    content: {
      ...structuredClone(nutritionPlan.content),
      name: "Próximo plan",
    },
  };
  await setup(page, "Entrenador", "nutricion", {}, futurePlan, {
    coachNutrition: {
      plans: [futurePlan, activePlan],
      daily: {
        plan: { _id: activePlan._id, content: activePlan.content },
        day: { completedMealIds: [breakfast.mealId] },
        dateKey: today,
      },
      days: [
        {
          _id: "record-1",
          dateKey: today,
          completedMealIds: [breakfast.mealId],
          snapshot: activePlan.content,
        },
      ],
    },
  });
  await page.getByLabel("Alumno para alimentación").selectOption("athlete");
  const diary = page.getByRole("region", { name: "Alimentación del alumno" });
  await expect(diary).toBeVisible();
  await expectMealPhotos(diary);
  await expect(diary.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(
    diary.getByRole("img", { name: "Completada: Desayuno" }),
  ).toBeVisible();
  await expect(
    diary.getByRole("img", { name: "Pendiente: Almuerzo" }),
  ).toBeVisible();
  await expect(
    diary.getByRole("button", { name: /Completar|Desmarcar/ }),
  ).toHaveCount(0);
  await diary
    .getByRole("button", { name: "Ver alimentos de Almuerzo" })
    .click();
  await expect(diary.getByText("1 porción").first()).toBeVisible();
  await noOverflow(page);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await page.screenshot({
      path: testInfo.outputPath(`coach-nutrition-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Última versión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Próximo plan", exact: true }),
  ).toBeVisible();
  await expect(diary.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(diary.getByText("Desde 29 de octubre")).toBeVisible();
  await page.getByRole("button", { name: "Plan de hoy", exact: true }).click();
  await expect(diary.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await page
    .getByRole("button", { name: "Editar y asignar nueva versión" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Plan de comidas", exact: true }),
  ).toBeVisible();
});

test("el coach crea una dieta dividida en comidas con macros opcionales", async ({
  page,
}, testInfo) => {
  const state = await setup(page, "Entrenador");
  await page.getByLabel("Alumno para alimentación").selectOption("athlete");
  await page.getByRole("button", { name: "Crear dieta" }).click();
  await expect(
    page.getByRole("heading", { name: "Plan de comidas", exact: true }),
  ).toBeVisible();
  for (const name of ["Desayuno", "Almuerzo", "Cena"]) {
    await addManualFood(
      page,
      name,
      `Preparación de ${name.toLowerCase()}`,
      "1 porción indicada",
    );
  }
  expect(state.getSaved()).toBeUndefined();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("nutrition-editor.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Guardar y asignar dieta" }).click();
  await expect(page.getByRole("status")).toContainText("Dieta asignada");
  expect(state.getSaved().meals).toHaveLength(3);
  expect(state.getSaved().meals[0].foods[0].calories).toBeNull();
  await expect(
    page.getByRole("heading", { name: "Plan de comidas", exact: true }),
  ).toBeVisible();
});

test("escribir 200g de pollo trae los macros y cambiar gramos los recalcula", async ({
  page,
}, testInfo) => {
  const state = await setup(page, "Entrenador");
  await page.getByLabel("Alumno para alimentación").selectOption("athlete");
  await page.getByRole("button", { name: "Crear dieta" }).click();
  const addBreakfast = page.getByRole("button", {
    name: "Agregar alimento a Desayuno",
  });
  await addBreakfast.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Buscar macros · Desayuno" }),
  ).toBeFocused();
  await dialog
    .getByLabel("Buscar macros · Desayuno")
    .fill("200g de pechuga de pollo");
  await dialog
    .getByRole("button", { name: /Pechuga de pollo · Crudo/ })
    .click();
  const quantity = dialog.getByLabel("Cantidad", { exact: true });
  await expect(quantity).toHaveValue("200 g");
  await quantity.fill("150 g");
  await expect(dialog.getByText(/Macros calculados para 150 g/)).toBeVisible();
  await expect(dialog.getByLabel("Proteínas", { exact: true })).toHaveValue(
    "33.75",
  );
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("food-macros-automatic.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Agregar a Desayuno" }).click();
  await expect(addBreakfast).toBeFocused();
  await page.getByRole("button", { name: /Editar Pechuga de pollo/ }).click();
  await dialog.getByLabel("Cantidad", { exact: true }).fill("100 g");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Editar Pechuga de pollo/ }),
  ).toContainText("150 g");
  for (const name of ["Almuerzo", "Cena"]) {
    await addManualFood(page, name, "Preparación manual", "1 porción");
  }
  await page.getByRole("button", { name: "Guardar y asignar dieta" }).click();
  await expect(page.getByRole("status")).toContainText("Dieta asignada");
  expect(state.getSaved().meals[0].foods[0]).toMatchObject({
    quantity: "150 g",
    calories: 180,
    protein: 33.75,
    nutritionSource: { grams: 150, foodId: "1234" },
  });
});

test("el coach indica cinco huevos por unidades y conserva la cantidad al asignar", async ({
  page,
}, testInfo) => {
  const state = await setup(page, "Entrenador");
  await page.getByLabel("Alumno para alimentación").selectOption("athlete");
  await page.getByRole("button", { name: "Crear dieta" }).click();
  await page
    .getByRole("button", { name: "Agregar alimento a Desayuno" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Buscar macros · Desayuno").fill("huevo");
  await dialog.getByRole("button", { name: /Huevo · Crudo/ }).click();
  await expect(
    dialog.getByRole("option", { name: /huevo grande/ }),
  ).toHaveCount(1);
  await dialog
    .getByLabel("Medida del alimento")
    .selectOption({ label: "Unidad / porción: huevo grande (50 g)" });
  await dialog.getByLabel("Cantidad", { exact: true }).fill("5");
  await expect(dialog.getByLabel("Proteínas", { exact: true })).toHaveValue(
    "30",
  );
  await expect(dialog.getByText(/5 × huevo grande/)).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("five-eggs.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Agregar a Desayuno" }).click();
  await page.getByRole("button", { name: /Editar Huevo/ }).click();
  await expect(dialog.getByLabel("Cantidad", { exact: true })).toHaveValue("5");
  await page.keyboard.press("Escape");
  for (const name of ["Almuerzo", "Cena"])
    await addManualFood(page, name, "Preparación manual", "1 porción");
  await page.getByRole("button", { name: "Guardar y asignar dieta" }).click();
  await expect(page.getByRole("status")).toContainText("Dieta asignada");
  expect(state.getSaved().meals[0].foods[0]).toMatchObject({
    quantity: "5 × huevo grande",
    calories: 350,
    protein: 30,
    nutritionSource: { grams: 250, portion: { amount: 5, gramWeight: 50 } },
  });
});

test("el atleta encuentra alimentación y mensajes desde el inicio sin acceso directo", async ({
  page,
}, testInfo) => {
  await setup(page, "Cliente", "dashboard");
  const card = page.getByRole("region", { name: "Comidas de hoy" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Ver plan/ }).click();
  await expect(
    page.getByRole("heading", { name: "Mi alimentación", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar y asignar dieta" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: /Buscar macros/ }),
  ).toHaveCount(0);
  const mobile = (page.viewportSize()?.width || 0) < 1024;
  if (mobile) {
    await page.getByRole("button", { name: "Más", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Menu principal" });
    await expect(
      menu.getByRole("button", { name: "Alimentación", exact: true }),
    ).toBeVisible();
    await menu.getByRole("button", { name: "Mensajes", exact: true }).click();
  } else {
    await expect(
      page.getByRole("button", { name: "Mi alimentación", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mensajes con mi coach", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Mensajes", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("athlete-feature-navigation.png"),
    fullPage: true,
  });
});

test("el atleta independiente puede solicitar acceso de coach desde su perfil", async ({
  page,
}) => {
  await setup(page, "Cliente", "perfil", {
    trainingMode: "independent",
    assignedTrainerId: null,
  });
  await page
    .getByRole("button", { name: "Solicitar acceso como coach" })
    .click();
  await page
    .getByLabel("Tu experiencia como coach")
    .fill("Experiencia de prueba en entrenamiento");
  await page
    .getByLabel("¿Cómo piensas usar Rirfit con tus alumnos?")
    .fill("Planificar rutinas y acompañar a mis alumnos");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(
    page.getByText("Solicitud en revisión", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Alumnos", exact: true }),
  ).toHaveCount(0);
});

test("el plan mantiene el diseño claro y oscuro y conserva los cambios al reordenar comidas", async ({
  page,
}, testInfo) => {
  const plan = structuredClone(nutritionPlan);
  const foods = [
    [
      {
        name: "Avena",
        quantity: "40 g",
        calories: 150,
        protein: 5,
        carbs: 27,
        fat: 3,
      },
      {
        name: "Leche",
        quantity: "200 ml",
        calories: 100,
        protein: 7,
        carbs: 10,
        fat: 3,
      },
    ],
    [
      {
        name: "Pechuga de pollo",
        quantity: "200 g",
        calories: 240,
        protein: 45,
        carbs: 0,
        fat: 5,
      },
      {
        name: "Arroz",
        quantity: "150 g",
        calories: 195,
        protein: 4,
        carbs: 42,
        fat: 1,
      },
    ],
    [
      {
        name: "Salmón",
        quantity: "150 g",
        calories: 300,
        protein: 30,
        carbs: 0,
        fat: 20,
      },
      {
        name: "Ensalada",
        quantity: "1 plato",
        calories: 80,
        protein: 2,
        carbs: 10,
        fat: 4,
      },
    ],
  ];
  plan.content.meals.forEach((meal, index) => {
    meal.foods = foods[index];
  });
  const state = await setup(page, "Entrenador", "nutricion", {}, plan);
  await page.getByLabel("Alumno para alimentación").selectOption("athlete");
  await page
    .getByRole("button", { name: "Editar y asignar nueva versión" })
    .click();
  const summary = page.getByRole("region", { name: "Resumen del plan" });
  await expect(summary).toContainText("1065");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`meal-plan-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Editar Desayuno", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre de la comida").fill("Primera comida");
  await dialog.getByRole("button", { name: "Bajar comida" }).click();
  const mealNames = page.locator(".nutrition-meal h2");
  await expect(mealNames).toHaveText(["Almuerzo", "Primera comida", "Cena"]);
  await page.getByRole("button", { name: "Agregar alimento a Cena" }).click();
  await dialog
    .getByRole("button", { name: "En este plan", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Avena/ }).click();
  await dialog.getByRole("button", { name: "Agregar a Cena" }).click();
  await page.getByRole("button", { name: "Guardar y asignar dieta" }).click();
  await expect(page.getByRole("status")).toContainText("Dieta asignada");
  expect(state.getSaved().meals[1].name).toBe("Primera comida");
  expect(state.getSaved().meals[2].foods).toHaveLength(3);
});
