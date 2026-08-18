import { expect, test } from "@playwright/test";

const coachEntitlements = [
  "daily_checkin",
  "coach_portfolio",
  "coach_alerts",
  "weekly_reports",
  "assisted_plans",
  "load_recovery",
  "exercise_progression",
];

const athlete = {
  _id: "a1",
  id: "a1",
  name: "Ana Atleta",
  email: "ana@example.com",
  role: "Cliente",
  isActive: true,
  trainingMode: "coach_managed",
  assignedTrainerId: "c1",
  priority: "high",
  trainingCount: 2,
  lastTraining: { date: "2026-08-12" },
  profile: { goal: "Hipertrofia" },
};

const premiumCoach = {
  _id: "c1",
  id: "c1",
  name: "Carlos Coach",
  email: "coach@example.com",
  role: "Entrenador",
  isActive: true,
  subscription: {
    plan: "coach_pro",
    status: "active",
    effectivePlan: "coach_pro",
    isPremium: true,
  },
  entitlements: coachEntitlements,
};

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

async function mockApplication(page, { user, users = [], onRequest } = {}) {
  let currentUser = user;
  const billingPlans = {
    free: {
      id: "free",
      name: "Free",
      description: "Entrenamiento esencial.",
      features: ["Registro de entrenamientos"],
    },
    athlete_pro: {
      id: "athlete_pro",
      name: "Athlete Pro",
      description: "Recuperacion diaria.",
      features: ["Check-in diario", "Recomendacion de carga"],
    },
    coach_pro: {
      id: "coach_pro",
      name: "Coach Pro",
      description: "Control de atletas.",
      features: ["Portfolio", "Informes semanales"],
    },
  };
  const billingSummary = () => {
    const recommendedPlan =
      currentUser.role === "Entrenador"
        ? "coach_pro"
        : currentUser.role === "Cliente"
          ? "athlete_pro"
          : "free";
    return {
      subscription: currentUser.subscription || {
        plan: "free",
        status: "active",
        effectivePlan: "free",
        isPremium: false,
      },
      entitlements: currentUser.entitlements || [],
      recommendedPlan,
      canStartTrial:
        currentUser.role !== "Admin" &&
        !currentUser.subscription?.isPremium &&
        !currentUser.subscription?.trialUsedAt,
      trialDays: 14,
      plans: [billingPlans.free, billingPlans[recommendedPlan]].filter(Boolean),
    };
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    onRequest?.({ request, path, method });

    if (path === "/api/auth/me") return json(route, { user: currentUser });
    if (path === "/api/auth/dev-admin")
      return json(route, { error: "disabled" }, 401);
    if (path === "/api/users" && method === "GET") return json(route, users);
    if (path === "/api/billing/me") return json(route, billingSummary());
    if (path === "/api/billing/trial" && method === "POST") {
      const recommendedPlan =
        currentUser.role === "Entrenador" ? "coach_pro" : "athlete_pro";
      currentUser = {
        ...currentUser,
        subscription: {
          plan: recommendedPlan,
          status: "trialing",
          effectivePlan: recommendedPlan,
          isPremium: true,
          trialEndsAt: "2026-08-31T12:00:00.000Z",
          trialUsedAt: "2026-08-17T12:00:00.000Z",
        },
        entitlements:
          recommendedPlan === "coach_pro"
            ? coachEntitlements
            : ["daily_checkin", "load_recovery", "exercise_progression"],
      };
      return json(route, { user: currentUser, billing: billingSummary() }, 201);
    }
    if (path === "/api/billing/cancel" && method === "POST") {
      currentUser = {
        ...currentUser,
        subscription: {
          ...currentUser.subscription,
          status: "canceled",
          effectivePlan: "free",
          isPremium: false,
        },
        entitlements: [],
      };
      return json(route, { user: currentUser, billing: billingSummary() });
    }
    if (
      /^\/api\/users\/[^/]+\/subscription$/.test(path) &&
      method === "PATCH"
    ) {
      const body = request.postDataJSON();
      const target = users.find((item) => path.includes(item.id || item._id));
      return json(route, {
        ...target,
        subscription:
          body.action === "set_free"
            ? { plan: "free", status: "active", effectivePlan: "free" }
            : {
                plan: body.plan,
                status: body.action === "start_trial" ? "trialing" : "active",
                effectivePlan: body.plan,
                isPremium: true,
              },
      });
    }
    if (path === "/api/coach/portfolio") {
      return json(route, {
        summary: {
          athletes: 1,
          attention: 1,
          sessionsThisWeek: 2,
          adherence: 50,
        },
        athletes: [athlete],
        alerts: [
          {
            athleteId: "a1",
            athleteName: "Ana Atleta",
            code: "inactive",
            severity: "high",
            title: "7 dias sin entrenar",
          },
        ],
      });
    }
    if (path === "/api/coach/athletes") return json(route, [athlete]);
    if (path === "/api/coach/link-code") {
      return json(route, { coachCode: "APEX-TEST0000", athleteCount: 1 });
    }
    if (path === "/api/coach/plan-catalog") {
      return json(route, { plans: [], routines: [] });
    }
    if (path === "/api/coach/athletes/a1/overview") {
      return json(route, { athlete, plans: [], routines: [], templates: [] });
    }
    if (path === "/api/coach/athletes/a1/weekly-report") {
      return json(route, {
        athlete: { id: "a1", name: "Ana Atleta" },
        period: { from: "2026-08-10", to: "2026-08-16" },
        adherence: { completed: 2, target: 4, percentage: 50 },
        current: { volume: 4200, sets: 24 },
        comparison: { volumePercent: 12, setsPercent: 9 },
        readiness: { score: 82 },
        alerts: [],
        recommendation: "Mantener la carga y revisar la recuperacion.",
      });
    }
    if (path === "/api/coach/athletes/a1/plan-draft" && method === "POST") {
      return json(route, {
        source: "rules_v1",
        rationale: ["Basado en la adherencia reciente."],
        plan: {
          name: "Plan Hipertrofia - Ana",
          level: "intermediate",
          goal: "Hipertrofia",
          durationWeeks: 8,
          startDate: "2026-08-17",
          scheduleMode: "fixed",
          weeklySchedule: [
            { dayIndex: 1, type: "training", focus: "Full body" },
            { dayIndex: 2, type: "rest", focus: "" },
            { dayIndex: 3, type: "training", focus: "Full body" },
          ],
        },
      });
    }
    if (path === "/api/check-ins/latest") return json(route, { checkIn: null });
    if (path === "/api/check-ins" && method === "POST") {
      const body = request.postDataJSON();
      return json(route, {
        checkIn: {
          ...body,
          readinessState: "ready",
          readinessScore: 82,
        },
        recommendation: "Puedes entrenar segun lo planificado.",
      });
    }
    if (path === "/api/analytics/intelligence") {
      return json(route, {
        dataset: {
          sessions: 8,
          firstDate: "2026-07-01",
          lastDate: "2026-08-17",
          completeness: 96,
          setEntries: 80,
          exerciseObservations: 32,
          recordLimit: 2000,
        },
        totals: { volume: 24000, sets: 80, durationMinutes: 480 },
        weekly: [],
        prediction: {
          available: false,
          reason: "Se necesitan mas semanas de historial",
          sampleSize: 0,
        },
        anomalies: [],
        descriptive: {
          volume: {},
          duration: {},
          sets: {},
          correlations: { volumeDuration: null, volumeSets: null },
        },
        machineLearning: { available: false, clusters: [] },
        deepLearning: {
          ready: false,
          readiness: 10,
          currentSessions: 8,
          requiredSessions: 200,
          sequenceCoverage: 50,
          modelType: "Serie temporal multivariable",
        },
        infrastructure: {
          storage: "MongoDB",
          aggregation: "API Node.js",
          delivery: "JSON agregado",
          rawRowsSent: 0,
        },
        advanced: {
          available: true,
          requiresPremium: false,
          decisionSupport: {
            score: 84,
            state: "optimal",
            confidence: "alta",
            recommendation:
              "Mantener la sesion planificada y progresar con tecnica estable.",
            adjustment: { minPercent: 0, maxPercent: 5 },
            load: {
              acuteVolume: 4200,
              chronicWeeklyVolume: 4000,
              ratio: 1.05,
              sessionsLast7Days: 3,
              consecutiveDays: 1,
            },
            adherence: { completed: 3, target: 4, percentage: 75 },
            weight: {
              currentKg: 72,
              change30dPercent: 0.5,
              observations: 4,
            },
            factors: [
              {
                code: "check_in",
                label: "Check-in reciente",
                tone: "positive",
                detail: "84/100 registrado hoy.",
              },
              {
                code: "load_stable",
                label: "Carga estable",
                tone: "positive",
                detail: "La carga se mantiene cerca del patron previo.",
              },
            ],
          },
          exerciseProgression: {
            available: true,
            exercisesAnalyzed: 4,
            actionable: 1,
            items: [
              {
                exerciseId: "bench-press",
                name: "Press banca",
                muscleGroup: "Pecho",
                sessionCount: 6,
                lastDate: "2026-08-17",
                current: { oneRM: 104, weight: 80, reps: 9 },
                bestOneRM: 104,
                changePercent: 0.8,
                status: "plateau",
                confidence: "alta",
                suggestedWeightKg: 82,
                suggestion:
                  "Prueba 82 kg manteniendo el rango actual de repeticiones.",
                history: [],
              },
            ],
          },
          periodComparison: {
            period: {
              current: { from: "2026-08-17", to: "2026-08-17" },
              previous: { from: "2026-08-10", to: "2026-08-10" },
              elapsedDays: 1,
              comparisonMode: "equivalent_weekdays",
            },
            metrics: {
              sessions: {
                available: true,
                hasReference: true,
                current: 2,
                previous: 1,
                changePercent: 100,
                trend: "up",
              },
              volume: {
                available: true,
                hasReference: true,
                current: 4200,
                previous: 3800,
                changePercent: 10.5,
                trend: "up",
              },
              strength: {
                available: true,
                hasReference: true,
                current: 104,
                previous: 100,
                changePercent: 4,
                trend: "up",
                comparableExercises: 3,
              },
              adherence: {
                available: true,
                hasReference: true,
                current: 100,
                previous: 50,
                changePercent: 100,
                trend: "up",
                target: 2,
              },
              recovery: {
                available: true,
                hasReference: true,
                current: 84,
                previous: 78,
                changePercent: 7.7,
                trend: "up",
                currentObservations: 1,
                previousObservations: 1,
              },
            },
          },
        },
      });
    }
    if (path === "/api/routines") return json(route, []);
    if (path === "/api/trainings") return json(route, []);
    if (path === "/api/preferences") {
      return json(route, {
        branch: "sopocachi",
        locationMode: "single",
        allowedBranches: ["sopocachi"],
        goals: {},
      });
    }
    if (path === "/api/sessions" || path === "/api/photos")
      return json(route, []);
    if (path === "/api/exercises") {
      return json(route, { items: [], total: 0, page: 1, limit: 500 });
    }
    return json(route, {});
  });
}

async function openAs(page, activePage, user, options = {}) {
  await mockApplication(page, { user, ...options });
  await page.addInitScript(
    ({ pageName }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("active_page", pageName);
    },
    { pageName: activePage },
  );
  await page.goto("/");
}

test("Coach Pro prioriza atletas, genera informes y prepara un borrador", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await openAs(page, "trainer", premiumCoach);

  await expect(
    page.getByRole("heading", { name: "Centro de control" }),
  ).toBeVisible();
  await page
    .getByRole("button")
    .filter({ hasText: "7 dias sin entrenar" })
    .click();
  await expect(page.getByRole("heading", { name: "Ana Atleta" })).toBeVisible();
  await page.getByRole("tab", { name: /Seguimiento/ }).click();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Crear borrador asistido" }).click();
  const dialog = page.getByRole("dialog", { name: /Crear planificaci/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nombre del plan")).toHaveValue(
    "Plan Hipertrofia - Ana",
  );
});

test("Athlete Pro completa el check-in diario y recibe su recomendacion", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const user = {
    ...athlete,
    trainingMode: "independent",
    subscription: {
      plan: "athlete_pro",
      status: "trialing",
      effectivePlan: "athlete_pro",
      isPremium: true,
    },
    entitlements: ["daily_checkin"],
  };
  await openAs(page, "check_in", user);

  await expect(
    page.getByRole("heading", { name: "Estado diario" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar estado de hoy" }).click();
  await expect(
    page.getByRole("heading", { name: "Listo para entrenar" }),
  ).toBeVisible();
  await expect(page.getByText("82", { exact: true })).toBeVisible();
});

test("Athlete Pro compara el dashboard con los mismos dias anteriores", async ({
  page,
}) => {
  await openAs(page, "dashboard", {
    ...athlete,
    trainingMode: "independent",
    subscription: {
      plan: "athlete_pro",
      status: "active",
      effectivePlan: "athlete_pro",
      isPremium: true,
    },
    entitlements: [
      "daily_checkin",
      "load_recovery",
      "exercise_progression",
    ],
  });

  const comparison = page.getByRole("heading", {
    name: "Comparativa inteligente",
  });
  await expect(comparison).toBeVisible();
  await expect(page.getByText("Mismos 1 dias", { exact: true })).toBeVisible();
  await expect(page.getByText("104 kg", { exact: true })).toBeVisible();
  await expect(page.getByText("84%", { exact: true })).toBeVisible();
});

test("el dashboard Free muestra el acceso Premium sin procesar inteligencia", async ({
  page,
}) => {
  const requestedPaths = [];
  await openAs(
    page,
    "dashboard",
    {
      ...athlete,
      trainingMode: "independent",
      subscription: { plan: "free", status: "active", effectivePlan: "free" },
      entitlements: [],
    },
    { onRequest: ({ path }) => requestedPaths.push(path) },
  );

  await expect(
    page.getByRole("heading", { name: "Comparativa inteligente" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver Premium" })).toBeVisible();
  expect(requestedPaths).not.toContain("/api/analytics/intelligence");
});

test("una cuenta Free ve el limite Premium sin solicitar el portfolio", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const requestedPaths = [];
  await openAs(
    page,
    "trainer",
    {
      ...premiumCoach,
      subscription: { plan: "free", status: "active", effectivePlan: "free" },
      entitlements: [],
    },
    { onRequest: ({ path }) => requestedPaths.push(path) },
  );

  await expect(
    page.getByRole("heading", { name: "Centro de control premium" }),
  ).toBeVisible();
  expect(requestedPaths).not.toContain("/api/coach/portfolio");
});

test("el administrador inicia una prueba Premium de 14 dias", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const requests = [];
  const admin = {
    _id: "admin1",
    id: "admin1",
    name: "Admin Principal",
    email: "admin@example.com",
    role: "Admin",
    isActive: true,
    entitlements: coachEntitlements,
  };
  await openAs(page, "coach_admin", admin, {
    users: [
      admin,
      { ...athlete, subscription: { plan: "free", status: "active" } },
    ],
    onRequest: ({ request, path, method }) => {
      if (path === "/api/users/a1/subscription" && method === "PATCH") {
        requests.push(request.postDataJSON());
      }
    },
  });

  await page.getByRole("button", { name: "Directorio" }).click();
  await page.getByRole("button", { name: "Acciones para Ana Atleta" }).click();
  await page.getByRole("button", { name: "Gestionar Premium" }).click();
  await expect(
    page.getByRole("heading", { name: "Gestionar Premium" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Iniciar prueba de 14 dias" }).click();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({
    action: "start_trial",
    plan: "athlete_pro",
    trialDays: 14,
  });
  await expect(page.getByText(/Athlete Pro.*Prueba/)).toBeVisible();
});

test("un atleta activa su prueba desde el centro de planes", async ({
  page,
}) => {
  const freeAthlete = {
    ...athlete,
    trainingMode: "independent",
    assignedTrainerId: null,
    subscription: {
      plan: "free",
      status: "active",
      effectivePlan: "free",
      isPremium: false,
      trialUsedAt: null,
    },
    entitlements: [],
  };
  await openAs(page, "planes", freeAthlete);

  await expect(
    page.getByRole("heading", { name: "Planes y Premium" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Probar gratis 14 dias" }).click();

  await expect(
    page.getByRole("heading", { name: "Athlete Pro" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Prueba activa")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancelar Premium" }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancelar Premium" }).click();
  await expect(
    page.getByRole("heading", { name: "Free" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Cancelado")).toBeVisible();
});

test("Inteligencia Premium recomienda carga y progresion por ejercicio", async ({
  page,
}) => {
  const user = {
    ...athlete,
    trainingMode: "independent",
    assignedTrainerId: null,
    subscription: {
      plan: "athlete_pro",
      status: "active",
      effectivePlan: "athlete_pro",
      isPremium: true,
    },
    entitlements: ["daily_checkin", "load_recovery", "exercise_progression"],
  };
  await openAs(page, "data_intelligence", user);

  await expect(
    page.getByRole("heading", { name: "Condicion optima" }),
  ).toBeVisible();
  await expect(page.getByText(/Mantener la sesion planificada/)).toBeVisible();
  await expect(page.getByText("Carga estable")).toBeVisible();

  await page.getByRole("button", { name: "Progreso", exact: true }).click();
  await expect(page.getByText("Press banca")).toBeVisible();
  await expect(page.getByText("Estancamiento")).toBeVisible();
  await expect(page.getByText(/Prueba 82 kg/)).toBeVisible();
});

test("Inteligencia avanzada muestra el upgrade a una cuenta Free", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await openAs(page, "data_intelligence", {
    ...athlete,
    trainingMode: "independent",
    assignedTrainerId: null,
    subscription: {
      plan: "free",
      status: "active",
      effectivePlan: "free",
      isPremium: false,
    },
    entitlements: [],
  });

  await expect(
    page.getByRole("heading", { name: "Decisiones de carga y recuperacion" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tendencias", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Carga semanal" }),
  ).toBeVisible();
});
