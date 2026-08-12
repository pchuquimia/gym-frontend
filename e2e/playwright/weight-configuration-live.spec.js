/* global process */
import { expect, test } from "@playwright/test";

test.skip(
  process.env.LIVE_WEIGHT_CONFIG_TEST !== "true",
  "Requires the local backend and development admin login.",
);

test("permite configurar el criterio de peso desde movil", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Registrar entrenamiento" }).click();
  await expect(page.getByText(/Agenda semanal|Ciclo de entrenamiento/i)).toBeVisible({
    timeout: 30_000,
  });
  const startButton = page.getByRole("button", {
    name: "Iniciar entrenamiento",
  });
  if (await startButton.isVisible()) await startButton.click();
  const continueButton = page.getByRole("button", {
    name: /Continuar sesi.n/i,
  });
  const hasExistingSession = await continueButton
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (hasExistingSession) await continueButton.click();

  const exerciseCard = page.locator("[data-exercise-id]:visible").first();
  await expect(exerciseCard).toBeVisible({ timeout: 30_000 });
  await exerciseCard.getByRole("button", { name: /Ver t.cnica de/ }).click();
  await expect(
    page.getByRole("heading", { name: "Cómo registrar este ejercicio" }),
  ).toBeVisible();
  await expect(page.getByText("Qué ingresar", { exact: true })).toBeVisible();
  await expect(page.getByText("Cálculo", { exact: true })).toBeVisible();
  await expect(page.getByText("Ejemplo", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Volver" }).click();
  const optionsButton = exerciseCard.getByRole("button", {
    name: "Opciones",
    exact: true,
  });
  if (!(await optionsButton.isVisible())) {
    await exerciseCard.locator("button").nth(1).click();
  }
  await optionsButton.click();

  const weightSelect = page.getByLabel("Cómo registrar el peso").first();
  await expect(weightSelect).toBeVisible();
  await weightSelect.selectOption("per_side");
  await expect(page.getByLabel(/Peso de la barra para/).first()).toBeVisible();
});

test("carga el criterio de peso persistido en el catálogo", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Registrar entrenamiento" }),
  ).toBeVisible({ timeout: 30_000 });

  const exercise = await page.evaluate(async () => {
    const token = window.localStorage.getItem("gym_auth_token");
    const response = await fetch(
      "http://localhost:4000/api/exercises/tren-superior-pecho-press-con-barra-press-de-banca-con-barra",
      {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!response.ok) throw new Error(`Exercise request failed: ${response.status}`);
    return response.json();
  });

  expect(exercise.weightConfig).toMatchObject({
    basis: "total",
    barWeightKg: 0,
    implementCount: 1,
  });
});
