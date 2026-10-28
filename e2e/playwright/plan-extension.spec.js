import { expect, test } from "@playwright/test";

for (const status of ["active", "completed"]) {
  test(`extender una planificación ${status} conserva su identidad`, async ({
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(new Date("2026-10-20T16:00:00Z"));
    const user = {
      id: "extension-user",
      _id: "extension-user",
      name: "Atleta",
      role: "Admin",
      isActive: true,
    };
    let plan = {
      _id: "same-plan",
      name: "Mes 1",
      athleteId: user.id,
      status,
      level: "intermediate",
      goal: "Fuerza",
      startDate: "2026-08-10T00:00:00.000Z",
      endDate:
        status === "active"
          ? "2026-10-25T00:00:00.000Z"
          : "2026-10-18T00:00:00.000Z",
      durationWeeks: status === "active" ? 11 : 10,
      updatedAt: "2026-10-20T10:00:00.000Z",
      scheduleMode: "fixed",
      frequencyTarget: 1,
      weeklySchedule: Array.from({ length: 7 }, (_, index) => ({
        slotId: `slot_${index + 1}`,
        dayIndex: index + 1,
        type: index === 0 ? "training" : "rest",
        focus: index === 0 ? "Torso" : "",
        routineId: index === 0 ? "routine-1" : null,
      })),
    };
    const routines = [
      {
        _id: "routine-1",
        name: "Torso",
        trainingPlanId: plan._id,
        ownerId: user.id,
        kind: "assigned",
        isArchived: status !== "active",
        isAvailableForTraining: status === "active",
        exercises: [{ exerciseId: "press", exerciseName: "Press", sets: 3 }],
      },
    ];
    const writes = [];
    await page.addInitScript((user) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("active_page", "rutinas");
      localStorage.setItem("gym_auth_token", "test-only-token");
      localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
      sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
    }, user);
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      const json = (body) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      if (method !== "GET")
        writes.push({ path, method, body: route.request().postDataJSON() });
      if (path === "/api/plans/same-plan/extend") {
        plan = {
          ...plan,
          endDate:
            status === "active"
              ? "2026-11-08T00:00:00.000Z"
              : "2026-11-02T00:00:00.000Z",
          durationWeeks: 13,
          status: "active",
          updatedAt: "2026-10-20T16:00:00.000Z",
        };
        return json(plan);
      }
      if (path === "/api/auth/me") return json({ user });
      if (path === "/api/plans") return json([plan]);
      if (path === "/api/routines") return json(routines);
      if (path === "/api/trainings") return json({ items: [], hasMore: false });
      if (path.includes("exercises")) return json({ items: [], total: 0 });
      if (path.includes("profile")) return json({ profile: {} });
      if (path === "/api/preferences")
        return json({
          goals: {},
          branch: "sopocachi",
          allowedBranches: ["sopocachi"],
        });
      return json([]);
    });
    await page.goto("/");
    await page
      .getByRole("tab", { name: "Planificaciones", exact: true })
      .click();
    if (status === "active")
      await page
        .getByRole("button", { name: "Ver planificación", exact: true })
        .click();
    else {
      await page.getByRole("button", { name: /Ver historial/ }).click();
      await page.getByRole("button", { name: /Mes 1/ }).click();
    }
    await page
      .getByLabel("Opciones de la planificación", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Extender planificación", exact: true })
      .click();
    const modal = page.getByRole("dialog", { name: "Extender planificación" });
    await expect(modal).toBeVisible();
    await modal.getByRole("spinbutton").fill("2");
    await expect(
      modal.getByText(/La planificación terminará el/),
    ).toContainText(status === "active" ? "8 nov" : "2 nov");
    await modal
      .getByRole("button", { name: "Extender planificación", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mes 1", exact: true }).last(),
    ).toBeVisible();
    expect(writes).toEqual([
      {
        path: "/api/plans/same-plan/extend",
        method: "POST",
        body: {
          additionalWeeks: 2,
          expectedEndDate:
            status === "active"
              ? "2026-10-25T00:00:00.000Z"
              : "2026-10-18T00:00:00.000Z",
          expectedUpdatedAt: "2026-10-20T10:00:00.000Z",
        },
      },
    ]);
    await expect(
      page.getByText("Planificación extendida", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`plan-${status}-extended.png`),
    });
  });
}
