/* global process */
import { expect, test } from "@playwright/test";

test.skip(
  process.env.PRODUCTION_SMOKE_TEST !== "true",
  "Runs only against the deployed application.",
);

test("la aplicacion principal abre en movil y conecta con la API", async ({
  page,
  request,
}) => {
  const pageErrors = [];
  const requestFailures = [];
  const unexpectedResponses = [];
  const apiRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (currentRequest) => {
    if (currentRequest.url().includes("gym-backend-1fod.onrender.com")) {
      apiRequests.push(currentRequest.url());
    }
  });
  page.on("requestfailed", (currentRequest) => {
    requestFailures.push(
      `${currentRequest.failure()?.errorText || "request failed"} ${currentRequest.url()}`,
    );
  });
  page.on("response", (response) => {
    const expectedAnonymousResponse =
      response.status() === 401 && response.url().endsWith("/api/auth/me");
    if (response.status() >= 400 && !expectedAnonymousResponse) {
      unexpectedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Acceso de demostracion" }),
  ).toHaveCount(0);
  await expect
    .poll(() => apiRequests.some((url) => url.endsWith("/api/auth/me")))
    .toBe(true);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );

  const health = await request.get(
    "https://gym-backend-1fod.onrender.com/api/health",
  );
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({ ok: true });
  expect(pageErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
  expect(unexpectedResponses).toEqual([]);
});
