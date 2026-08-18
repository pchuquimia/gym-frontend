import { expect, test } from "@playwright/test";

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

test("una cuenta nueva completa onboarding y llega al dashboard", async ({
  page,
}) => {
  let currentUser = null;
  let onboardingPayload = null;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path === "/api/auth/me") {
      return currentUser
        ? json(route, { user: currentUser })
        : json(route, { error: "No autenticado" }, 401);
    }
    if (path === "/api/auth/dev-admin") {
      return json(route, { error: "disabled" }, 401);
    }
    if (path === "/api/auth/register" && method === "POST") {
      const body = request.postDataJSON();
      currentUser = {
        id: "new-athlete",
        name: body.name,
        email: body.email,
        role: "Cliente",
        trainingMode: "independent",
        onboarding: { status: "pending", completedAt: null },
        profile: {
          goal: "mantenimiento",
          experienceLevel: "beginner",
          weeklyFrequency: 3,
          weight: null,
          height: null,
        },
        subscription: {
          plan: "free",
          status: "active",
          effectivePlan: "free",
        },
        entitlements: [],
      };
      return json(route, { user: currentUser, token: "test-token" }, 201);
    }
    if (path === "/api/auth/onboarding" && method === "PATCH") {
      onboardingPayload = request.postDataJSON();
      currentUser = {
        ...currentUser,
        onboarding: {
          status: "complete",
          completedAt: "2026-08-17T12:00:00.000Z",
        },
        profile: { ...currentUser.profile, ...onboardingPayload },
      };
      return json(route, { user: currentUser });
    }
    if (path === "/api/auth/profile") {
      return json(route, {
        profile: currentUser?.profile || {},
        security: {},
        capabilities: { emailChange: false },
      });
    }
    if (path === "/api/preferences") {
      return json(route, {
        branch: "sopocachi",
        locationMode: "single",
        allowedBranches: ["sopocachi"],
        goals: {},
      });
    }
    if (path === "/api/exercises") {
      return json(route, { items: [], total: 0, page: 1, limit: 500 });
    }
    if (
      path === "/api/trainings" ||
      path === "/api/routines" ||
      path === "/api/plans" ||
      path === "/api/weigh-ins"
    ) {
      return json(route, path === "/api/weigh-ins" ? { entries: [] } : []);
    }
    return json(route, {});
  });

  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Lucia Nueva");
  await page.getByLabel(/Correo electr/i).fill("lucia@example.com");
  await page.locator("#register-password").fill("Apex1234");
  await page.locator("#register-confirmPassword").fill("Apex1234");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(
    page.getByRole("heading", { name: "¿Cual es tu objetivo principal?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Ganar masa/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: /Intermedio/ }).click();
  await page.getByRole("button", { name: "4 dias por semana" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Peso actual en kilogramos").fill("68.5");
  await page.getByLabel("Altura en centimetros").fill("166");
  await page.getByRole("button", { name: "Preparar dashboard" }).click();

  await expect(page.getByText("Semana activa").first()).toBeVisible();
  expect(onboardingPayload).toEqual({
    goal: "volumen",
    experienceLevel: "intermediate",
    weeklyFrequency: 4,
    weight: 68.5,
    height: 166,
  });
});

test("una cuenta pendiente no puede saltarse la configuracion", async ({
  page,
}) => {
  const user = {
    id: "pending-athlete",
    name: "Atleta Pendiente",
    email: "pending@example.com",
    role: "Cliente",
    trainingMode: "independent",
    onboarding: { status: "pending", completedAt: null },
    profile: {},
    subscription: { plan: "free", status: "active", effectivePlan: "free" },
    entitlements: [],
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return json(route, { user });
    if (path === "/api/auth/profile") {
      return json(route, { profile: {}, security: {}, capabilities: {} });
    }
    return json(route, []);
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("active_page", "dashboard");
  });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "¿Cual es tu objetivo principal?" }),
  ).toBeVisible();
  await expect(page.locator('[data-active-page="onboarding"]')).toBeVisible();
});
