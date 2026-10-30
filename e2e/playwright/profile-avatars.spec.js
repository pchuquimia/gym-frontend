import { expect, test } from "@playwright/test";

test("filtra los 18 avatares por género y conserva la elección al recargar", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 360, height: 800 });
  let profile = {
    avatarId: "gym-01",
    avatarPhotoId: "",
    gender: "",
    language: "es",
    birthDate: "",
    weight: 75,
    height: 175,
    notifications: {},
  };
  let user = {
    id: "athlete",
    name: "Pablo Ivan",
    email: "athlete@example.invalid",
    role: "Cliente",
    trainingMode: "independent",
    isActive: true,
    onboarding: { status: "complete" },
    profile,
    entitlements: [],
    subscription: { plan: "free", effectivePlan: "free", status: "active" },
  };
  await page.addInitScript(
    ({ user }) => {
      sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
      localStorage.setItem("active_page", "perfil");
      localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
      localStorage.setItem("gym_auth_token", "test-only");
    },
    { user },
  );
  let saved;
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/auth/me") return json({ user });
    if (path === "/api/auth/csrf") return json({ csrfToken: "test-only" });
    if (path === "/api/auth/account" && request.method() === "PATCH") {
      saved = request.postDataJSON();
      profile = {
        ...profile,
        avatarId: saved.avatarId,
        avatarPhotoId: saved.avatarPhotoId,
        gender: saved.gender,
      };
      user = { ...user, profile };
      return json({
        user,
        profile,
        security: {},
        emailVerificationRequired: false,
      });
    }
    if (path === "/api/auth/profile")
      return json({
        profile,
        security: {},
        capabilities: { emailChange: false },
      });
    if (path === "/api/auth/profile-summary")
      return json({ workouts: 0, trainingDates: [] });
    if (path === "/api/preferences")
      return json({ locationMode: "disabled", allowedBranches: [], goals: {} });
    if (path === "/api/messages") return json({ conversations: [] });
    if (path === "/api/exercises") return json({ items: [], total: 0 });
    if (path === "/api/notifications")
      return json({ notifications: [], unread: 0 });
    return json([]);
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Cambiar foto o avatar", exact: true })
    .click();
  const choices = page.getByRole("group", {
    name: "Elegir avatar deportivo",
    exact: true,
  });
  await expect(choices.getByRole("button")).toHaveCount(18);
  await expect(page.getByText("PI", { exact: true })).toHaveCount(0);
  const assetStatus = await page.evaluate(async () => {
    return Promise.all(
      ["gym-avatars-v1.png", "gym-men-v1.png", "gym-women-v1.png"].map(
        async (file) => {
          const img = new Image();
          img.src = `/images/avatars/${file}`;
          await img.decode();
          return img.naturalWidth / img.naturalHeight;
        },
      ),
    );
  });
  expect(assetStatus).toEqual([1.5, 1.5, 1.5]);
  await page.getByLabel("Género", { exact: true }).selectOption("male");
  await expect(choices.getByRole("button")).toHaveCount(9);
  await expect(choices.locator('[data-avatar-gender="male"]')).toHaveCount(9);
  await choices
    .getByRole("button", { name: "Elegir avatar deportivo 12", exact: true })
    .click();
  await expect(
    choices.getByRole("button", {
      name: "Elegir avatar deportivo 12",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Género", { exact: true }).selectOption("female");
  await expect(choices.getByRole("button")).toHaveCount(9);
  await expect(choices.locator('[data-avatar-gender="female"]')).toHaveCount(9);
  await expect(
    choices.locator(
      'button[aria-pressed="true"] [data-avatar-gender="female"]',
    ),
  ).toHaveCount(1);
  await choices
    .getByRole("button", { name: "Elegir avatar deportivo 18", exact: true })
    .click();
  await expect(
    choices.getByRole("button", {
      name: "Elegir avatar deportivo 18",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await page.locator("#profile-photo-section").screenshot({
      path: testInfo.outputPath(`avatar-picker-${theme}.png`),
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByText("Cambios guardados.", { exact: true }),
  ).toBeVisible();
  expect(saved).toMatchObject({
    avatarId: "gym-18",
    avatarPhotoId: "",
    gender: "female",
  });
  await page.reload();
  const profileAvatar = page.getByRole("button", {
    name: "Cambiar foto o avatar",
    exact: true,
  });
  await expect(profileAvatar.locator("[data-avatar-id]")).toHaveAttribute(
    "data-avatar-id",
    "gym-18",
  );
  await expect(profileAvatar.locator("[data-avatar-gender]")).toHaveAttribute(
    "data-avatar-gender",
    "female",
  );
  await profileAvatar.click();
  await expect(
    page.getByRole("button", {
      name: "Elegir avatar deportivo 18",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
});
