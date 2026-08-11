import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "No autenticado" }),
    }),
  );
});

test("el login es visible y no desborda el viewport", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Acceso de demostracion" }),
  ).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
  expect(runtimeErrors).toEqual([]);
});

test("el acceso demo presenta los tres recorridos sin desbordar", async ({
  page,
}) => {
  await page.route("**/api/auth/demo/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        roles: ["athlete", "coach", "admin"],
      }),
    }),
  );
  await page.goto("/?demo=1");

  const demo = page.getByRole("region", {
    name: "Acceso de demostracion",
  });
  await expect(
    demo.getByRole("button", { name: "Abrir demo como Atleta" }),
  ).toBeVisible();
  await expect(
    demo.getByRole("button", { name: "Abrir demo como Coach" }),
  ).toBeVisible();
  await expect(
    demo.getByRole("button", { name: "Abrir demo como Admin" }),
  ).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
});

test("un rechazo de autenticacion mantiene los datos y muestra feedback", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Credenciales invalidas" }),
    }),
  );
  await page.goto("/");

  await page.locator('input[name="email"]').fill("usuario@prueba.com");
  await page.locator('input[name="password"]').fill("prueba123");
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('[role="alert"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveValue(
    "usuario@prueba.com",
  );
});
