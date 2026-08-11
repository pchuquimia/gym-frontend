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
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  expect(runtimeErrors).toEqual([]);
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
