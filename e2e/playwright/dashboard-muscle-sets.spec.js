import { expect, test } from "@playwright/test";

const user = {
  id: "muscle-test",
  _id: "muscle-test",
  name: "Atleta",
  role: "Admin",
  isActive: true,
};
const trainings = Array.from({ length: 100 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 6, 13 + index, 12))
    .toISOString()
    .slice(0, 10);
  const upper = index % 2 === 1;
  const groups = upper
    ? [
        ["Pecho", 4],
        ["Espalda", 3],
        ["Hombros", 2],
      ]
    : [
        ["Cuadriceps", 5],
        ["Gluteos", 4],
      ];
  return {
    _id: `session-${index}`,
    date,
    routineId: upper ? "upper" : "lower",
    routineName: upper ? "Torso A" : "Piernas A",
    durationSeconds: 1800,
    exercises: groups.map(([muscle, count]) => ({
      exerciseId: muscle,
      exerciseName: muscle,
      primaryMuscleGroup: muscle,
      sets: [
        ...Array.from({ length: count }, () => ({ done: true, reps: 8 })),
        { done: false, reps: 8 },
      ],
    })),
  };
});

async function openDashboard(page) {
  await page.clock.setFixedTime(new Date("2026-10-20T16:00:00Z"));
  const recent = trainings.slice(-30);
  const snapshot = {
    ownerId: user.id,
    activePlan: null,
    planning: {},
    followUp: { missions: [] },
    profile: { profile: {} },
    routines: [{ _id: "upper", name: "Torso A", exercises: [] }],
    preference: {
      goals: {},
      branch: "sopocachi",
      allowedBranches: ["sopocachi"],
    },
    trainings: { summaries: recent, details: recent },
    dailyMetrics: [],
  };
  await page.addInitScript((user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("active_page", "dashboard");
    localStorage.setItem("gym_auth_token", "e2e-only-token");
    localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
    sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
  }, user);
  let historyRequests = 0;
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/trainings") {
      historyRequests++;
      const older = Boolean(url.searchParams.get("cursor"));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items: older ? trainings.slice(0, 40) : trainings.slice(40),
          hasMore: !older,
          nextCursor: older ? null : "older-page",
        }),
      });
    }
    const body =
      path === "/api/auth/me"
        ? { user }
        : path.includes("/dashboard/bootstrap")
          ? snapshot
          : path === "/api/routines"
            ? snapshot.routines
            : path.includes("exercises")
              ? { items: [], total: 0 }
              : path.includes("profile")
                ? { profile: {} }
                : path === "/api/preferences"
                  ? snapshot.preference
                  : [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
  return () => historyRequests;
}

test("grafico compacto y detalle de 100 entrenamientos", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile")) {
    await page.setViewportSize({ width: 360, height: 800 });
  }
  const requests = await openDashboard(page);
  const preview = page
    .locator(".workout-series-card")
    .filter({ visible: true });
  await expect(preview).toBeVisible();
  await expect(preview.locator(".workout-series__column")).toHaveCount(9);
  await expect(
    preview.locator(".workout-series__column.is-future"),
  ).toHaveCount(0);
  await expect(
    preview.getByLabel(/Semana anterior: 12 oct 2026/),
  ).toBeVisible();
  await expect(preview.getByLabel(/Esta semana: 19 oct 2026/)).toBeVisible();
  expect(requests()).toBe(0);
  await preview.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await preview.screenshot({
    path: testInfo.outputPath("dashboard-series-preview.png"),
  });
  await preview.getByRole("button").click();
  const detail = page.getByRole("dialog", { name: "Series por entrenamiento" });
  await expect(detail.getByText("Mostrando 86–100 de 100")).toBeVisible();
  expect(requests()).toBeGreaterThanOrEqual(2);
  const bars = detail
    .getByRole("group", {
      name: "Series completadas por entrenamiento y músculo",
    })
    .getByRole("button");
  await expect(bars).toHaveCount(15);
  const selected = detail.getByRole("region", {
    name: "Entrenamiento seleccionado",
  });
  await expect(
    selected.getByRole("heading", { name: "Torso A" }),
  ).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveCount(3);
  await bars.first().click();
  await expect(selected).toContainText("6 oct 2026");
  await detail.getByRole("button", { name: "Pecho", exact: true }).click();
  await expect(
    detail.getByRole("button", { name: "Pecho", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(bars.first()).toHaveAttribute("aria-label", /4 series de Pecho/);
  await detail.getByRole("button", { name: "Pecho", exact: true }).click();
  await detail
    .getByRole("button", { name: "Entrenamientos anteriores" })
    .click();
  await expect(detail.getByText("Mostrando 71–85 de 100")).toBeVisible();
  await detail
    .getByRole("slider", { name: "Posición en el historial" })
    .fill("0");
  await expect(detail.getByText("Mostrando 1–15 de 100")).toBeVisible();
  await expect(
    detail.getByRole("button", { name: "Entrenamientos anteriores" }),
  ).toBeDisabled();
  await detail
    .getByRole("combobox", { name: "Rutina", exact: true })
    .selectOption("upper");
  await expect(detail.getByText("Mostrando 36–50 de 50")).toBeVisible();
  await expect(
    selected.getByRole("heading", { name: "Torso A" }),
  ).toBeVisible();
  await detail
    .getByRole("combobox", { name: "Entrenamientos", exact: true })
    .selectOption("20");
  await expect(bars).toHaveCount(20);
  await detail
    .getByRole("combobox", { name: "Rutina", exact: true })
    .selectOption("");
  await detail
    .getByRole("combobox", { name: "Entrenamientos", exact: true })
    .selectOption("15");
  expect(
    await detail.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await detail.evaluate((element) => element.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("series-full-light.png") });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: testInfo.outputPath("series-full-dark.png") });
  await detail.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await page.screenshot({
    path: testInfo.outputPath("series-selected-dark.png"),
  });
  await detail.getByRole("button", { name: "Volver al inicio" }).click();
  await expect(detail).not.toBeVisible();
  await expect(preview.getByRole("button")).toBeFocused();
  await preview.getByRole("button").click();
  await expect(detail).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).not.toBeVisible();
});
