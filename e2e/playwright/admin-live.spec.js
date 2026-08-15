/* global process */
import { expect, test } from "@playwright/test";

test.skip(
  process.env.LIVE_ADMIN_TEST !== "true",
  "Requires the local backend and development admin login.",
);

test("el administrador real abre el dashboard", async ({ page }) => {
  const runtimeErrors = [];
  const failedResponses = [];
  let trainingsResponse = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/api/trainings?")) {
      response
        .json()
        .then((payload) => {
          trainingsResponse = Array.isArray(payload)
            ? payload
            : payload.items || [];
        })
        .catch(() => {});
    }
    if (
      response.status() >= 400 &&
      response.request().resourceType() !== "image" &&
      !(response.status() === 401 && response.url().endsWith("/api/auth/me"))
    ) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");

  await expect(page.getByText("Semana activa").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("[data-demo-banner]")).toHaveCount(0);
  await expect
    .poll(() => trainingsResponse.length, { timeout: 30_000 })
    .toBeGreaterThan(0);
  await expect(page.getByText(/^[0-7]\/7$/, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const browserDate = await page.evaluate(() => new Date().toString());
  console.log(
    JSON.stringify({
      browserDate,
      trainingCount: trainingsResponse.length,
      latestTrainingDates: trainingsResponse
        .slice(0, 5)
        .map((item) => item.date),
    }),
  );
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("el administrador abre rutinas desde la navegación móvil", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "Validación exclusiva de la navegación móvil.",
  );
  const runtimeErrors = [];
  const requestedApiPaths = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    try {
      requestedApiPaths.push(new URL(request.url()).pathname);
    } catch {
      // Ignore non-HTTP browser resources.
    }
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");
  await expect(page.getByText("Semana activa").first()).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Rutinas", exact: true }).click();

  await expect(
    page.getByRole("tab", { name: "Planificaciones", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("tab", { name: "Rutinas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rutinas y planificación" }),
  ).toBeVisible();
  const mesOneCard = page
    .getByRole("button")
    .filter({ hasText: "Mes 1" })
    .filter({ hasText: "5/5 rutinas" })
    .first();
  await expect(mesOneCard).toBeVisible();
  await mesOneCard.click();
  await expect(page.getByText("Espalda · Hombro · Tríceps").first()).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
  expect(requestedApiPaths).not.toContain("/api/photos");
  expect(requestedApiPaths).not.toContain("/api/sessions");
  expect(runtimeErrors).toEqual([]);
});

test("el historial carga una sola consulta resumida", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "La consulta es compartida por todos los tamaños de pantalla.",
  );
  const historyRequests = [];
  const historyResponses = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === "/api/trainings" &&
      url.searchParams.get("limit") === "5000"
    ) {
      historyRequests.push(url);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      url.pathname === "/api/trainings" &&
      url.searchParams.get("limit") === "5000"
    ) {
      historyResponses.push(response.status());
    }
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("active_page", "admin_sesiones");
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Historial de sesiones" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => historyResponses.length, { timeout: 30_000 }).toBe(1);
  await expect(page.getByText(/^\d+ sesiones$/).first()).toBeVisible();

  expect(historyRequests).toHaveLength(1);
  const fields = historyRequests[0].searchParams.get("fields") || "";
  expect(fields).toContain("volumeBreakdown.recordedSets");
  expect(fields).not.toContain("exercises");
  expect(historyResponses).toEqual([200]);
});

test("la biblioteca carga, busca y pagina sin bloquear la interfaz", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "La consulta de biblioteca es compartida por todos los tamaños de pantalla.",
  );
  const runtimeErrors = [];
  const failedResponses = [];
  const resultRequests = [];
  const resultResponses = [];
  let facetsStartedAt = 0;
  let facetsDurationMs = null;
  let facetsPayload = null;

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/exercises/facets") {
      facetsStartedAt = Date.now();
    }
    if (url.pathname === "/api/exercises" && url.searchParams.get("meta")) {
      resultRequests.push(url);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname === "/api/exercises/facets") {
      facetsDurationMs = facetsStartedAt ? Date.now() - facetsStartedAt : null;
      response
        .json()
        .then((payload) => {
          facetsPayload = payload;
        })
        .catch(() => {});
    }
    if (url.pathname === "/api/exercises" && url.searchParams.get("meta")) {
      resultResponses.push(response.status());
    }
    if (
      response.status() >= 400 &&
      response.request().resourceType() !== "image" &&
      !(response.status() === 401 && response.url().endsWith("/api/auth/me"))
    ) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("active_page", "library");
  });

  const navigationStartedAt = Date.now();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Explorar ejercicios" }),
  ).toBeVisible({ timeout: 10_000 });
  const shellReadyMs = Date.now() - navigationStartedAt;

  await expect.poll(() => facetsPayload?.total, { timeout: 15_000 }).toBe(1323);
  await page
    .getByRole("searchbox", { name: "Buscar ejercicios" })
    .fill("femoral");
  await expect(page.getByText(/femoral/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect.poll(() => resultResponses.length, { timeout: 10_000 }).toBe(1);

  expect(resultRequests.length).toBeLessThanOrEqual(2);
  expect(
    resultRequests.every((url) => url.searchParams.get("limit") === "60"),
  ).toBe(true);
  expect(resultResponses).toEqual([200]);
  expect(facetsDurationMs).toBeLessThan(10_000);
  expect(shellReadyMs).toBeLessThan(10_000);
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  console.log(
    JSON.stringify({
      shellReadyMs,
      facetsDurationMs,
      exerciseCount: facetsPayload.total,
    }),
  );
});

test("el administrador entra a migrar catálogo", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "La migración de catálogo es una herramienta administrativa de escritorio.",
  );
  const runtimeErrors = [];
  const failedResponses = [];
  let migrationStartedAt = 0;
  let migrationDurationMs = null;
  let migrationPayload = null;

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/exercises/admin/migrations") {
      migrationStartedAt = Date.now();
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname === "/api/exercises/admin/migrations") {
      migrationDurationMs = migrationStartedAt
        ? Date.now() - migrationStartedAt
        : null;
      response
        .json()
        .then((payload) => {
          migrationPayload = payload;
        })
        .catch(() => {});
    }
    if (
      response.status() >= 400 &&
      response.request().resourceType() !== "image" &&
      !(response.status() === 401 && response.url().endsWith("/api/auth/me"))
    ) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("active_page", "library");
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Explorar ejercicios" }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("tab", { name: /Migrar catálogo/i }).click();

  await expect(
    page.getByRole("listbox", { name: "Catálogo anterior" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("listbox", { name: "Catálogo importado" }),
  ).toBeVisible();
  await expect.poll(() => migrationPayload?.summary?.targets).toBe(1322);

  expect(migrationDurationMs).toBeLessThan(10_000);
  expect(migrationPayload.summary.legacy).toBeGreaterThan(0);
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  console.log(
    JSON.stringify({
      migrationDurationMs,
      legacy: migrationPayload.summary.legacy,
      withReferences: migrationPayload.summary.withReferences,
      targets: migrationPayload.summary.targets,
    }),
  );
});

test("el editor de historial reúne entrenamientos y sesiones heredadas", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "El contenido es el mismo en todos los tamaños de pantalla.",
  );
  const runtimeErrors = [];
  const failedResponses = [];
  const patchRequests = [];
  let historyPayload = null;
  let countsPayload = null;

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "PATCH") patchRequests.push(request.url());
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname === "/api/trainings/exercise-history") {
      response
        .json()
        .then((payload) => {
          historyPayload = payload;
        })
        .catch(() => {});
    }
    if (url.pathname === "/api/trainings/exercise-counts") {
      response
        .json()
        .then((payload) => {
          countsPayload = payload;
        })
        .catch(() => {});
    }
    if (
      response.status() >= 400 &&
      response.request().resourceType() !== "image" &&
      !(response.status() === 401 && response.url().endsWith("/api/auth/me"))
    ) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("active_page", "editor_historial");
    window.localStorage.setItem(
      "history_editor_exercise_id",
      "dataset-hasane-0585",
    );
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Editor de historial" }),
  ).toBeVisible({ timeout: 30_000 });
  const exerciseSearch = page.getByRole("combobox", {
    name: "Buscar ejercicio",
  });
  await expect(exerciseSearch).toBeEnabled({ timeout: 30_000 });
  await exerciseSearch.fill("extension cuadri");
  const targetExercise = page.getByRole("option", {
    name: /máquina de palanca extensión de piernas/i,
  });
  await expect(targetExercise).toBeVisible();
  await expect(targetExercise).toContainText("35 sesiones");
  await targetExercise.click();
  await expect
    .poll(
      () =>
        countsPayload?.exercises?.find(
          (item) => item.exerciseId === "dataset-hasane-0585",
        )?.count,
      { timeout: 30_000 },
    )
    .toBe(35);
  const targetCount = countsPayload.exercises.find(
    (item) => item.exerciseId === "dataset-hasane-0585",
  );
  const targetGroup = countsPayload.groups.find(
    (item) => item.group === targetCount.group,
  );
  expect(targetGroup.count).toBeGreaterThanOrEqual(targetCount.count);
  await expect(
    page
      .getByLabel("Filtrar por grupo muscular")
      .locator("option")
      .filter({
        hasText: `${targetGroup.group} (${targetGroup.count} sesiones)`,
      }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Solo ejercicios con historial" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => historyPayload?.count, { timeout: 30_000 }).toBe(32);
  await expect(page.locator("[data-history-record]")).toHaveCount(35, {
    timeout: 30_000,
  });
  await expect(page.getByText("32 actuales + 3 heredados")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Guardar/ }).first(),
  ).toBeDisabled();

  expect(patchRequests).toEqual([]);
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
