import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/La_Paz" });
const today = "2026-10-29";
const checkIn = {
  id: "check_in",
  type: "check_in",
  title: "Check-in de bienestar",
  subtitle: "Sueño, energía y molestias",
  required: true,
  completed: false,
};
const photos = {
  id: "photos",
  type: "photos",
  title: "Fotos de progreso",
  subtitle: "1 vista pendiente",
  required: false,
  completed: false,
  views: ["front"],
};

async function openDashboard(page, missions) {
  await page.clock.install({ time: new Date(`${today}T16:00:00Z`) });
  const user = {
    id: "athlete",
    name: "Atleta",
    role: "Cliente",
    isActive: true,
    trainingMode: "coach_managed",
    assignedTrainerId: "coach",
    onboarding: { status: "complete" },
    coachIntake: {
      status: "submitted",
      coachId: "coach",
      submittedAt: `${today}T12:00:00Z`,
    },
    profile: { weight: 70, gender: "female", avatarId: "gym-18" },
    entitlements: [],
    subscription: { plan: "free", effectivePlan: "free", status: "active" },
  };
  const snapshot = {
    ownerId: user.id,
    activePlan: {
      _id: "plan",
      name: "Plan del coach",
      status: "active",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      durationWeeks: 12,
      scheduleMode: "fixed",
      weeklySchedule: [{ dayIndex: 4, type: "rest" }],
    },
    planning: { status: "active" },
    followUp: { missions },
    profile: { profile: user.profile },
    routines: [],
    preference: {
      goals: {},
      branch: "sopocachi",
      allowedBranches: ["sopocachi"],
    },
    trainings: { summaries: [], details: [] },
    dailyMetrics: [],
  };
  await page.addInitScript((user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("active_page", "dashboard");
    localStorage.setItem("gym_auth_token", "test-only");
    localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
    sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
  }, user);
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = [];
    if (path === "/api/auth/me") body = { user };
    else if (path.startsWith("/api/dashboard/bootstrap")) body = snapshot;
    else if (path === "/api/auth/profile") {
      if (route.request().method() === "PATCH") {
        user.profile = { ...user.profile, ...route.request().postDataJSON() };
        snapshot.profile.profile = user.profile;
      }
      body = { profile: user.profile, security: {}, capabilities: {} };
    } else if (path === "/api/preferences") body = snapshot.preference;
    else if (path === "/api/coach/relationship")
      body = { coach: { id: "coach", name: "Coach" } };
    else if (path === "/api/notifications")
      body = { notifications: [], unread: 0 };
    else if (path === "/api/messages") body = { conversations: [] };
    else if (path === "/api/nutrition/day")
      body = { plan: null, meals: [], totals: {} };
    else if (path === "/api/check-ins/latest") body = { checkIn: null };
    else if (path === "/api/check-ins" && route.request().method() === "POST") {
      const saved = {
        ...route.request().postDataJSON(),
        athleteId: user.id,
        readinessScore: 75,
        readinessState: "ready",
      };
      snapshot.followUp.missions = snapshot.followUp.missions.map((mission) =>
        mission.type === "check_in"
          ? { ...mission, completed: true, subtitle: "Registrado hoy" }
          : mission,
      );
      body = { checkIn: saved, recommendation: "Registro completado" };
    } else if (path === "/api/measurements")
      body = { measurements: snapshot.measurementRecords || [] };
    else if (path === "/api/photos/summary")
      body = { total: 0, available: 0, missing: 0 };
    else if (path === "/api/photos")
      body = { items: [], total: 0, page: 1, limit: 12 };
    else if (path === "/api/exercises") body = { items: [], total: 0 };
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
  return snapshot;
}

test("el seguimiento refleja solo las tareas del coach y se actualiza al cambiar la asignación", async ({
  page,
}, testInfo) => {
  const snapshot = await openDashboard(page, [checkIn, photos]);
  const dashboard = page.getByRole("region", { name: "Tu plan del día" });
  const tracking = dashboard.getByRole("region", {
    name: "Seguimiento de hoy",
  });
  await expect(tracking.getByRole("button")).toHaveCount(2);
  await expect(
    tracking.getByText("A tu elección", { exact: true }),
  ).toBeVisible();
  await expect(
    dashboard.getByRole("button", { name: /Peso|Medidas/ }),
  ).toHaveCount(0);
  await tracking.screenshot({
    path: testInfo.outputPath("coach-assigned-follow-up.png"),
    animations: "disabled",
  });
  snapshot.followUp.missions = [
    {
      id: "measurements",
      type: "measurements",
      title: "Medidas corporales",
      subtitle: "Actualizar medidas",
      required: true,
      completed: false,
      fields: ["waist", "arm"],
      dueToday: false,
      nextDueDate: "2026-11-05",
    },
  ];
  await page.clock.fastForward(30_000);
  await expect(tracking.getByRole("button")).toHaveCount(1);
  await expect(
    tracking.getByRole("button", { name: /Medidas corporales/ }),
  ).toBeVisible();
  await expect(tracking.getByText(/Próximo registro:/)).toBeVisible();
  await expect(
    tracking.locator('img[src="/images/daily-measurements-card.webp"]'),
  ).toBeVisible();
  await expect(
    dashboard.getByRole("button", {
      name: /Check-in de bienestar|Fotos de progreso|Peso/,
    }),
  ).toHaveCount(0);
  await tracking.getByRole("button", { name: /Medidas corporales/ }).click();
  await expect(page.getByRole("spinbutton", { name: /Cintura/ })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: /Brazo/ })).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: /Pecho|Cadera|Muslo|Pantorrilla/ }),
  ).toHaveCount(0);
});

test("distingue visualmente registros pendientes, programados y completados", async ({
  page,
}, testInfo) => {
  await openDashboard(page, [
    checkIn,
    { ...photos, dueToday: false, nextDueDate: "2026-11-05" },
    {
      id: "weight",
      type: "weight",
      title: "Peso de seguimiento",
      subtitle: "70 kg registrados",
      required: true,
      completed: true,
    },
  ]);
  const tracking = page.getByRole("region", { name: "Seguimiento de hoy" });
  const pending = tracking.getByRole("button", {
    name: /Pendiente: Check-in de bienestar/,
  });
  const completed = tracking.getByRole("button", {
    name: /Completado: Peso de seguimiento/,
  });
  const scheduled = tracking.getByRole("button", {
    name: /Programado: Fotos de progreso/,
  });
  await expect(
    pending.getByText("Responder check-in", { exact: true }),
  ).toBeVisible();
  await expect(
    completed.getByText("Editar peso", { exact: true }),
  ).toBeVisible();
  await expect(
    scheduled.getByText("Subir fotos", { exact: true }),
  ).toBeVisible();
  await expect(tracking.getByRole("status")).toHaveText(
    "1 de 3 registros guardados",
  );
  await expect(
    tracking.getByText(/^(Pendiente|Completado|Programado)$/),
  ).toHaveCount(0);
  await expect(completed.locator(".daily-quick-action__receipt")).toBeVisible();
  await expect(pending.locator(".daily-quick-action__receipt")).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle("dark", dark),
      theme === "dark",
    );
    await tracking.screenshot({
      path: testInfo.outputPath(`tracking-states-${theme}.png`),
      animations: "disabled",
    });
    for (const card of [pending, completed, scheduled]) {
      const dimensions = await card.boundingBox();
      expect(dimensions.width).toBeGreaterThan(120);
      const overflows = await card.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 1,
      );
      expect(overflows).toBe(false);
    }
  }
});

for (const completed of [false, true]) {
  test(`la acción de fotos ${completed ? "abre la galería" : "abre la carga directamente"}`, async ({
    page,
  }) => {
    await openDashboard(page, [{ ...photos, completed }]);
    await page
      .getByRole("region", { name: "Seguimiento de hoy" })
      .getByRole("button", { name: completed ? /Ver fotos/ : /Subir fotos/ })
      .click();
    if (completed) {
      await expect(
        page.getByRole("heading", { name: "Fotos de progreso", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "Añadir foto" }),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("dialog", { name: "Añadir foto" }),
      ).toBeVisible();
    }
  });
}

test("editar medidas recupera los valores guardados y conserva los campos pedidos por el coach", async ({
  page,
}) => {
  const snapshot = await openDashboard(page, [
    {
      id: "measurements",
      type: "measurements",
      title: "Medidas corporales",
      subtitle: "Registradas hoy",
      completed: true,
      required: true,
      fields: ["waist", "arm"],
    },
  ]);
  snapshot.measurementRecords = [
    {
      dateKey: today,
      values: { waist: 80, arm: 32, chest: 95 },
      notes: "Registro del atleta",
    },
  ];
  await page
    .getByRole("region", { name: "Seguimiento de hoy" })
    .getByRole("button", { name: /Editar medidas/ })
    .click();
  await expect(page.getByRole("spinbutton", { name: /Cintura/ })).toHaveValue(
    "80",
  );
  await expect(page.getByRole("spinbutton", { name: /Brazo/ })).toHaveValue(
    "32",
  );
  await expect(page.getByRole("spinbutton", { name: /Pecho/ })).toHaveCount(0);
});

test("el agua solo aparece como registro opcional cuando el atleta la activa", async ({
  page,
}) => {
  await openDashboard(page, [checkIn]);
  const dashboard = page.getByRole("region", { name: "Tu plan del día" });
  const assigned = dashboard.getByRole("region", {
    name: "Seguimiento de hoy",
  });
  const optional = dashboard.getByRole("region", {
    name: "Registros opcionales",
  });
  await expect(
    assigned.getByRole("heading", { name: "Registros asignados" }),
  ).toBeVisible();
  await expect(
    dashboard.getByRole("button", { name: /Hidratación/ }),
  ).toHaveCount(0);
  await optional.getByText("Elegir registros opcionales").click();
  await optional
    .getByRole("checkbox", { name: "Mostrar registro de agua" })
    .click();
  await expect(
    optional.getByRole("checkbox", { name: "Mostrar registro de agua" }),
  ).toBeChecked();
  await expect(
    optional.getByRole("button", { name: /Hidratación/ }),
  ).toBeVisible();
  await expect(
    assigned.getByRole("button", { name: /Hidratación/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    optional.getByRole("button", { name: /Hidratación/ }),
  ).toBeVisible();
  await optional.getByText("Elegir registros opcionales").click();
  await optional
    .getByRole("checkbox", { name: "Mostrar registro de agua" })
    .click();
  await expect(
    optional.getByRole("checkbox", { name: "Mostrar registro de agua" }),
  ).not.toBeChecked();
  await expect(
    optional.getByRole("button", { name: /Hidratación/ }),
  ).toHaveCount(0);
  await expect(
    assigned.getByRole("button", { name: /Check-in de bienestar/ }),
  ).toBeVisible();
});

test("un atleta gratuito puede abrir el check-in que le asignó su coach", async ({
  page,
}) => {
  await openDashboard(page, [checkIn]);
  await page
    .getByRole("region", { name: "Seguimiento de hoy" })
    .getByRole("button", { name: /Check-in de bienestar/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "¿Cómo te sientes hoy?", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Esta funcionalidad requiere un plan premium", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Guardar estado de hoy", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Seguimiento de hoy" })
      .getByRole("button", { name: /Completado: Check-in de bienestar/ }),
  ).toBeVisible();
});
