import { expect, test } from "@playwright/test";

const user = {
  id: "progress-admin",
  _id: "progress-admin",
  name: "Admin de prueba",
  role: "Admin",
  isActive: true,
  profile: { language: "es" },
};
const slots = [1, 3, 5].map((dayIndex) => ({
  slotId: `slot-${dayIndex}`,
  dayIndex,
  type: "training",
  routineId: "push",
}));
const plans = [
  {
    _id: "current",
    name: "Fuerza · bloque 02",
    status: "active",
    scheduleMode: "fixed",
    startDate: "2026-08-24",
    endDate: "2026-10-18",
    weeklySchedule: slots,
  },
  {
    _id: "previous",
    name: "Base · bloque 01",
    status: "completed",
    scheduleMode: "fixed",
    startDate: "2026-07-01",
    endDate: "2026-08-23",
    weeklySchedule: slots,
  },
];
const exercises = (weight) => [
  {
    exerciseId: "press",
    exerciseName: "Press de banca con barra",
    loadType: "external",
    weightBasis: "total",
    primaryMuscleGroup: "Pecho",
    sets: Array.from({ length: 4 }, () => ({
      weightKg: weight,
      reps: 8,
      done: true,
    })),
  },
  {
    exerciseId: "row",
    exerciseName: "Remo con mancuerna",
    loadType: "external",
    weightBasis: "per_implement",
    implementCount: 2,
    primaryMuscleGroup: "Espalda",
    sets: Array.from({ length: 4 }, () => ({
      weightKg: 20,
      reps: 12,
      done: true,
    })),
  },
  {
    exerciseId: "curl",
    exerciseName: "Curl en polea",
    loadType: "machine",
    primaryMuscleGroup: "Bíceps",
    sets: Array.from({ length: 3 }, () => ({
      weightKg: 15,
      reps: 12,
      done: true,
    })),
  },
];
const trainings = [];
for (let index = 0; index < 78; index++) {
  const d = new Date(Date.UTC(2026, 6, 1 + index, 12));
  if (![1, 3, 5].includes(d.getUTCDay()) || index === 61) continue;
  const date = d.toISOString().slice(0, 10);
  trainings.push({
    _id: `training-${index}`,
    date,
    routineId: "push",
    routineName: "Torso · fuerza",
    progressScopeId: "torso",
    trainingPlanId: date >= "2026-08-24" ? "current" : "previous",
    trainingPlanSlotId: `slot-${d.getUTCDay()}`,
    durationSeconds: 3600 + index * 10,
    exercises: exercises(40 + Math.floor(index / 14) * 2.5),
  });
}
const routines = [
  {
    _id: "push",
    name: "Torso · fuerza",
    exercises: [
      { exerciseId: "press", sets: 4 },
      { exerciseId: "row", sets: 4 },
      { exerciseId: "curl", sets: 3 },
    ],
  },
];

async function openProgress(
  page,
  { theme = "light", empty = false, error = "", loading = false } = {},
) {
  await page.clock.setFixedTime(new Date("2026-09-16T16:00:00Z"));
  await page.addInitScript(
    ({ theme, user }) => {
      localStorage.setItem("active_page", "progreso");
      localStorage.setItem("theme", theme);
      localStorage.setItem("gym_auth_token", "e2e-only-token");
      localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
    },
    { theme, user },
  );
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/auth/me") return json({ user });
    if (path === "/api/auth/dev-admin") return json({ error: "disabled" }, 401);
    if (path === "/api/trainings") {
      if (url.searchParams.get("meta") === "true") {
        if (loading) await new Promise((resolve) => setTimeout(resolve, 1700));
        if (error === "trainings") return json({ error: "temporary" }, 500);
        return json({ items: empty ? [] : trainings, hasMore: false });
      }
      return json(empty ? [] : trainings);
    }
    if (path === "/api/plans")
      return error === "plans"
        ? json({ error: "temporary" }, 500)
        : json(empty ? [] : plans);
    if (path === "/api/routines") return json(empty ? [] : routines);
    if (path === "/api/preferences")
      return json({
        goals: {},
        branch: "sopocachi",
        locationMode: "single",
        allowedBranches: ["sopocachi"],
      });
    if (path.includes("profile")) return json(user.profile);
    if (path === "/api/sessions" || path === "/api/photos") return json([]);
    if (path.includes("exercises")) return json({ items: [], total: 0 });
    return json({});
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Progreso.", exact: true }),
  ).toBeVisible({ timeout: 20000 });
}

for (const theme of ["light", "dark"]) {
  test(`progress ${theme}: charts, filters, plan comparison and details`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openProgress(page, { theme });
    await expect(page.locator(".progress-evolution svg")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`progress-${theme}-overview.png`),
    });
    await expect(
      page.getByRole("heading", { name: "¿Qué cambió entre planes?" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`progress-${theme}-full.png`),
      fullPage: true,
    });
    await page
      .locator(".progress-evolution")
      .screenshot({ path: testInfo.outputPath(`progress-${theme}-chart.png`) });
    const legend = page.getByRole("group", {
      name: "Series de Comparación de planes",
    });
    await legend.getByRole("button").first().click();
    await expect(legend.getByRole("button").first()).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await legend.getByRole("button").first().click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "7D", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "7D", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Filtros/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Grupo muscular").selectOption("Pecho");
    await dialog.getByRole("button", { name: "Ver resultados" }).click();
    await expect(
      page.getByRole("button", { name: "Quitar filtro: Pecho" }),
    ).toBeVisible();
    await expect(
      page.getByText("El cumplimiento se calcula con sesiones completas.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Quitar filtro: Pecho" }).click();
    await page
      .getByRole("button", { name: "Restablecer", exact: true })
      .click();
    await page.locator(".progress-workout-list button").first().click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: "Press de banca con barra" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.locator(".progress-evolution summary").click();
    await expect(page.locator(".progress-evolution table")).toBeVisible();
    const chart = page.locator('.progress-evolution [role="img"]').first();
    const box = await chart.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.screenshot({
      path: testInfo.outputPath(`progress-${theme}-interaction.png`),
      fullPage: false,
    });
    expect(errors).toEqual([]);
  });
}
test("progress has honest empty states", async ({ page }) => {
  await openProgress(page, { empty: true });
  await expect(
    page.getByRole("heading", {
      name: "No hay entrenamientos en esta selección",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Necesitas al menos dos planificaciones", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar entrenamiento", exact: true }),
  ).toBeVisible();
});
test("progress isolates plan errors and retains training charts", async ({
  page,
}) => {
  await openProgress(page, { error: "plans" });
  await expect(
    page.getByRole("button", { name: "Reintentar planes" }),
  ).toBeVisible();
  await expect(page.locator(".progress-evolution svg")).toBeVisible();
});
test("progress does not show partial history as a result", async ({ page }) => {
  await openProgress(page, { error: "trainings" });
  await expect(
    page.getByRole("button", { name: "Reintentar historial" }),
  ).toBeVisible();
  await expect(page.locator(".progress-kpis")).toHaveCount(0);
});
test("progress loading and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openProgress(page, { loading: true });
  await expect(
    page.getByRole("status", { name: "Cargando métricas de entrenamiento" }),
  ).toBeVisible();
  await expect(page.locator(".progress-evolution svg")).toBeVisible();
});
