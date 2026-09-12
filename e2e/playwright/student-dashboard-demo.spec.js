import { expect, test } from "@playwright/test";

const legacyGreenColors = new Set(["rgb(226, 255, 0)", "rgb(184, 208, 0)"]);

test("el dashboard del atleta conserva jerarquía, contraste y ancho seguro", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
  });

  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Abrir demo como Atleta" }).click();

  const isMobile = testInfo.project.name.includes("mobile");
  const dashboard = page.locator(".dashboard-shell");
  const mainExperience = page.locator(
    isMobile ? ".mobile-daily-plan" : ".dashboard-today-card",
  );
  await expect(mainExperience).toBeVisible({ timeout: 60_000 });

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );

  if (isMobile) {
    const titleSize = await dashboard
      .locator(".mobile-daily-plan__header h1")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
    const primaryAction = dashboard.locator(
      ".mobile-daily-plan__workout-action",
    );
    const actionBox = await primaryAction.boundingBox();

    expect(titleSize).toBeGreaterThanOrEqual(36);
    expect(actionBox?.height || 0).toBeGreaterThanOrEqual(44);
    const cardImages = dashboard
      .locator(
        ".mobile-daily-plan__visual img, .mobile-daily-plan__plan-card img, .mobile-daily-plan__onboarding-icon img",
      )
      .filter({ visible: true });
    expect(await cardImages.count()).toBeGreaterThanOrEqual(2);
    const imageQuality = await cardImages.evaluateAll((images) =>
      images.map((image) => ({
        complete: image.complete,
        src: image.currentSrc || image.src,
        width: image.naturalWidth,
      })),
    );
    imageQuality.forEach((image) => {
      expect(image.complete).toBe(true);
      expect(image.src).toMatch(/\.webp(?:$|\?)/);
      expect(image.width).toBeGreaterThanOrEqual(256);
    });
    await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrenar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rutinas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Perfil" })).toBeVisible();
  } else {
    const cardRadius = await mainExperience.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderRadius),
    );
    const primaryAction = dashboard.locator(".dashboard-today-card__primary");
    const actionBox = await primaryAction.boundingBox();
    const activeNavigation = page.locator('aside button[aria-current="page"]');
    const navigationColors = await activeNavigation.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        foreground: style.color,
      };
    });

    expect(cardRadius).toBeGreaterThanOrEqual(12);
    expect(actionBox?.height || 0).toBeGreaterThanOrEqual(44);
    const stateThumbnail = mainExperience.locator(
      ".dashboard-today-card__thumbnail img",
    );
    await expect(stateThumbnail).toHaveAttribute("src", /\.webp$/);
    expect(
      await stateThumbnail.evaluate((image) => image.naturalWidth),
    ).toBeGreaterThanOrEqual(256);
    expect(navigationColors.foreground).not.toBe(navigationColors.background);

    await page
      .getByRole("button", { name: "Activar modo oscuro" })
      .filter({ visible: true })
      .first()
      .click();

    const legacyAccents = await page
      .locator('.app-shell[data-active-page="dashboard"]')
      .evaluate(
        (root, forbidden) => {
          const blocked = new Set(forbidden);
          return [...root.querySelectorAll("*")].flatMap((element) => {
            const style = getComputedStyle(element);
            return [
              style.color,
              style.backgroundColor,
              style.borderColor,
            ].filter((value) => blocked.has(value));
          });
        },
        [...legacyGreenColors],
      );
    expect(legacyAccents).toEqual([]);
  }

  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
});
