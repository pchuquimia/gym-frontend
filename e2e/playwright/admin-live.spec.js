/* global process */
import { expect, test } from "@playwright/test";

test.skip(
  process.env.LIVE_ADMIN_TEST !== "true",
  "Requires the local backend and development admin login.",
);

test("el administrador real abre el dashboard", async ({ page }) => {
  const runtimeErrors = [];
  const failedResponses = [];
  const dashboardRequests = [];
  const legacyDashboardRequests = [];
  let dashboardResponse = null;
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/dashboard/bootstrap") {
      dashboardRequests.push(url);
    }
    if (
      [
        "/api/trainings",
        "/api/routines",
        "/api/preferences",
        "/api/analytics/intelligence",
        "/api/weigh-ins",
        "/api/auth/profile",
      ].includes(url.pathname)
    ) {
      legacyDashboardRequests.push(url.pathname);
    }
  });
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/dashboard/bootstrap") {
      response
        .json()
        .then((payload) => {
          dashboardResponse = payload;
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
    .poll(() => dashboardResponse, { timeout: 30_000 })
    .not.toBeNull();
  expect(dashboardResponse.trainings.summaries.length).toBeGreaterThan(0);
  await expect(page.getByText(/^[0-7]\/7$/, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const browserDate = await page.evaluate(() => new Date().toString());
  console.log(
    JSON.stringify({
      browserDate,
      trainingCount: dashboardResponse.trainings.summaries.length,
      latestTrainingDates: dashboardResponse.trainings.summaries
        .slice(0, 5)
        .map((item) => item.date),
    }),
  );
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(dashboardRequests).toHaveLength(1);
  expect(legacyDashboardRequests).toEqual([]);
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
  await expect(
    page.getByText("Espalda · Hombro · Tríceps").first(),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "Encuentra tu próximo ejercicio" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page
      .getByRole("tablist", { name: "Colecciones de ejercicios" })
      .getByRole("tab"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Filtros y herramientas" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Recomendados para ti")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(4);
  for (const movement of [
    "Press de pecho",
    "Sentadilla",
    "Remo",
    "Peso muerto",
  ]) {
    await expect(page.getByRole("heading", { name: movement })).toBeVisible();
  }
  const shellReadyMs = Date.now() - navigationStartedAt;

  await expect.poll(() => facetsPayload?.total, { timeout: 15_000 }).toBe(1323);
  await page
    .getByRole("searchbox", { name: "Buscar ejercicios" })
    .fill("femoral");
  await expect(page.getByRole("tab", { name: "Para ti" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText(/femoral/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect
    .poll(() => resultResponses.length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);

  expect(resultRequests.length).toBeLessThanOrEqual(3);
  expect(
    resultRequests.every((url) => url.searchParams.get("limit") === "60"),
  ).toBe(true);
  expect(
    resultRequests.every((url) => url.searchParams.get("sort") === "discovery"),
  ).toBe(true);
  expect(resultResponses.every((status) => status === 200)).toBe(true);
  await page.getByRole("button", { name: "Catálogo completo" }).click();
  await expect(
    page.getByRole("button", { name: "Catálogo completo" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Para ti" }).click();
  await page
    .getByRole("searchbox", { name: "Buscar ejercicios" })
    .fill("press banca");
  const familyVariantsButton = page.getByRole("button", {
    name: /Ver \d+ variantes de Press de pecho/i,
  });
  await expect(familyVariantsButton).toBeVisible({ timeout: 10_000 });
  await familyVariantsButton.click();
  await expect(
    page.getByRole("heading", { name: "Press de pecho" }),
  ).toBeVisible();
  await expect(page.getByText(/^8 de \d+$/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mostrar 8 más" }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(8);
  await expect(page.locator("article").first().getByRole("heading")).toHaveText(
    "Press de banca con barra",
  );
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
    page.getByRole("heading", { name: "Encuentra tu próximo ejercicio" }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Filtros y herramientas" }).click();
  await page.getByRole("button", { name: /Migrar catálogo/i }).click();

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

test("gestionar imágenes ofrece la cola anatómica de Codex", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "La herramienta de imágenes se administra en escritorio.",
  );
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("active_page", "library");
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Encuentra tu próximo ejercicio" }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Filtros y herramientas" }).click();
  await page.getByRole("button", { name: /Gestionar imágenes/i }).click();
  await expect(
    page.getByRole("heading", { name: "Imágenes de ejercicios" }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Revisión automática" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Revisar propuestas" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Autoencolado activo")).toBeVisible();

  await page.getByRole("tab", { name: "Buscar ejercicio" }).click();

  const exercise = page
    .getByRole("button", { name: /Editar imagen de/i })
    .first();
  await expect(exercise).toBeVisible({ timeout: 10_000 });
  await exercise.click();
  await page.getByRole("tab", { name: "Generar con Codex" }).click();

  await expect(page.getByText("Generador anatómico con Codex")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generar con Codex" }),
  ).toBeVisible();
  await expect(page.getByText("Músculo principal en rojo")).toBeVisible();
  await expect(page.getByText(/sin utilizar una API key/i)).toBeVisible();
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
