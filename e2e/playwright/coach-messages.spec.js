import { expect, test } from "@playwright/test";

for (const role of ["Entrenador", "Cliente"]) {
  test(`${role} abre una conversación y envía mensajes`, async ({
    page,
  }, testInfo) => {
    const user = {
      id: role === "Entrenador" ? "coach" : "athlete",
      name: role === "Entrenador" ? "Diego Coach" : "Ana Alumna",
      email: "test@example.invalid",
      role,
      isActive: true,
      trainingMode: role === "Cliente" ? "coach_managed" : "independent",
      assignedTrainerId: role === "Cliente" ? "coach" : null,
      onboarding: { status: "complete" },
      // A new athlete can contact their coach before finishing their intake.
      coachIntake: { status: "pending", coachId: "coach" },
      profile: { language: "es" },
      subscription: { plan: "free", status: "active", effectivePlan: "free" },
      entitlements: [],
    };
    const peer = {
      id: role === "Entrenador" ? "athlete" : "coach",
      name: role === "Entrenador" ? "Ana Alumna" : "Diego Coach",
      role: role === "Entrenador" ? "Cliente" : "Entrenador",
    };
    const messages = [
      {
        _id: "message-1",
        senderId: peer.id,
        recipientId: user.id,
        text: "¿Revisamos el entrenamiento de mañana?",
        readAt: null,
        createdAt: "2026-10-28T12:00:00.000Z",
      },
    ];
    let sentPayload;
    await page.addInitScript(
      ({ user }) => {
        localStorage.setItem("active_page", "coach_messages");
        localStorage.setItem("gym_auth_token", "e2e-only-token");
        localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
      },
      { user },
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const json = (body, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      if (path === "/api/auth/me") return json({ user });
      if (path === "/api/auth/dev-admin")
        return json({ error: "disabled" }, 401);
      if (path === "/api/messages")
        return json({
          conversations: [
            {
              peer,
              lastMessage: messages.at(-1),
              unread: messages.filter(
                (message) => message.recipientId === user.id && !message.readAt,
              ).length,
            },
          ],
        });
      if (path === `/api/messages/${peer.id}` && req.method() === "GET")
        return json({ messages, nextCursor: null });
      if (path === `/api/messages/${peer.id}` && req.method() === "POST") {
        sentPayload = req.postDataJSON();
        const message = {
          _id: "message-2",
          ...sentPayload,
          senderId: user.id,
          recipientId: peer.id,
          createdAt: "2026-10-28T12:01:00.000Z",
        };
        messages.push(message);
        return json({ message }, 201);
      }
      if (path.endsWith("/read")) {
        messages[0].readAt = "2026-10-28T12:01:00.000Z";
        return json({ updated: 1 });
      }
      if (path === "/api/auth/profile")
        return json({ profile: user.profile, security: {}, capabilities: {} });
      if (path === "/api/preferences")
        return json({
          branch: "sopocachi",
          locationMode: "single",
          allowedBranches: ["sopocachi"],
          goals: {},
        });
      if (path === "/api/exercises") return json({ items: [], total: 0 });
      return json([]);
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Mensajes", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: new RegExp(peer.name) }).click();
    await expect(
      page.getByRole("log").getByText("¿Revisamos el entrenamiento de mañana?"),
    ).toBeVisible();
    await page
      .getByLabel("Escribe un mensaje")
      .fill("Sí, revisemos las cargas y el horario.");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(
      page.getByRole("log").getByText("Sí, revisemos las cargas y el horario."),
    ).toBeVisible();
    await expect(page.getByLabel("Escribe un mensaje")).toHaveValue("");
    expect(sentPayload.clientMessageId).toBeTruthy();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    await page.screenshot({
      path: testInfo.outputPath(`messages-${role}.png`),
      fullPage: true,
    });
    if ((page.viewportSize()?.width || 0) < 768) {
      await page
        .getByRole("button", { name: "Volver a conversaciones" })
        .click();
      await expect(
        page.getByRole("textbox", { name: "Buscar conversación" }),
      ).toBeVisible();
    }
  });
}
