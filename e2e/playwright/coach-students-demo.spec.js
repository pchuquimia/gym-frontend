import { expect, test } from "@playwright/test";

const assertNoHorizontalOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
};

const assertTabsUsable = async (tablist, page) => {
  const viewportWidth = page.viewportSize()?.width || 0;
  const boxes = await tablist.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const box = tab.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    }),
  );

  expect(boxes).toHaveLength(4);
  boxes.forEach((box) => {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(viewportWidth + 1);
  });
  boxes.slice(1).forEach((box, index) => {
    expect(box.left).toBeGreaterThanOrEqual(boxes[index].right - 1);
  });
};

test("el perfil del alumno conserva su estructura y navega por sus cuatro pestañas", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
  });
  await page.goto("/?demo=1");
  await page
    .getByRole("button", { name: "Abrir demo como Coach" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mis alumnos", exact: true }),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Alumnos", exact: true }).click();
  const activeStudentsNavigation = page
    .getByRole("button", { name: "Alumnos", exact: true })
    .filter({ visible: true });
  const activeNavigationColors = await activeStudentsNavigation.evaluate(
    (button) => {
      const style = getComputedStyle(button);
      const iconStyle = getComputedStyle(button.querySelector("svg"));
      return {
        background: style.backgroundColor,
        foreground: style.color,
        icon: iconStyle.color,
      };
    },
  );
  expect(activeNavigationColors.foreground).not.toBe(
    activeNavigationColors.background,
  );
  expect(activeNavigationColors.icon).not.toBe(
    activeNavigationColors.background,
  );
  const athleteButton = page
    .getByRole("button", { name: /Atleta Demo/ })
    .filter({ visible: true })
    .first();
  await expect(athleteButton).toBeVisible();
  await athleteButton.click();

  const tablist = page.getByRole("tablist", {
    name: /Informacion del (alumno|atleta)/,
  });
  await expect(tablist).toBeVisible();
  await assertTabsUsable(tablist, page);

  const tabs = [
    { name: "Resumen", file: "01-resumen.png" },
    { name: /Plan|Planificación/, file: "02-plan.png" },
    { name: "Seguimiento", file: "03-seguimiento.png" },
    { name: /Historial|Actividad/, file: "04-historial.png" },
  ];

  for (const tab of tabs) {
    const control = tablist.getByRole("tab", { name: tab.name });
    await control.click();
    await expect(control).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".animate-pulse")).toHaveCount(0, {
      timeout: 15_000,
    });
    if (tab.file === "03-seguimiento.png") {
      await expect(
        page.getByRole("heading", { name: "Generando informe" }),
      ).toBeHidden({ timeout: 30_000 });
    }
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(tab.file),
      fullPage: true,
    });
  }
});
