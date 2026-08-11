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
          trainingsResponse = Array.isArray(payload) ? payload : payload.items || [];
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
  await expect(page.getByText("1/7", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const browserDate = await page.evaluate(() => new Date().toString());
  console.log(
    JSON.stringify({
      browserDate,
      trainingCount: trainingsResponse.length,
      latestTrainingDates: trainingsResponse.slice(0, 5).map((item) => item.date),
    }),
  );
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
