import { expect, test } from "@playwright/test";

for (const trainingMode of ["coach_managed", "independent"]) {
  test(`el atleta ${trainingMode} recibe el aviso y tiene Mensajes en su menú`, async ({
    page,
    context,
  }, testInfo) => {
    const coachPage = await context.newPage();
    const messages = [];
    const athlete = {
      id: "athlete",
      name: "Ana Alumna",
      role: "Cliente",
      trainingMode,
      assignedTrainerId: "coach",
      isActive: true,
      onboarding: { status: "complete" },
      coachIntake: { status: "pending", coachId: "coach" },
      profile: { language: "es" },
      subscription: { plan: "free", effectivePlan: "free", status: "active" },
      entitlements: [],
    };
    const coach = {
      ...athlete,
      id: "coach",
      name: "Diego Coach",
      role: "Entrenador",
      trainingMode: "independent",
      assignedTrainerId: null,
    };
    const setup = async (target, user, peer, initialPage) => {
      await target.addInitScript(
        ({ user, initialPage }) => {
          localStorage.setItem("active_page", initialPage);
          localStorage.setItem("gym_auth_token", "e2e-only-token");
          localStorage.setItem("gym_authenticated_user", JSON.stringify(user));
        },
        { user, initialPage },
      );
      await target.route("**/api/**", async (route) => {
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
                lastMessage: messages.at(-1) || null,
                unread: messages.filter(
                  (message) =>
                    message.recipientId === user.id && !message.readAt,
                ).length,
              },
            ],
          });
        if (path === `/api/messages/${peer.id}` && req.method() === "POST") {
          const message = {
            _id: "message-1",
            ...req.postDataJSON(),
            senderId: user.id,
            recipientId: peer.id,
            createdAt: new Date().toISOString(),
            readAt: null,
          };
          messages.push(message);
          return json({ message }, 201);
        }
        if (path === `/api/messages/${peer.id}`)
          return json({ messages, nextCursor: null });
        if (path === `/api/messages/${peer.id}/read`) {
          for (const message of messages)
            if (message.recipientId === user.id)
              message.readAt = new Date().toISOString();
          return json({ updated: messages.length });
        }
        if (path === "/api/nutrition/day")
          return json({ plan: null, day: null });
        if (path === "/api/auth/profile")
          return json({
            profile: user.profile,
            security: {},
            capabilities: {},
          });
        if (path === "/api/preferences")
          return json({
            branch: "sopocachi",
            locationMode: "single",
            allowedBranches: ["sopocachi"],
            goals: {},
          });
        if (path === "/api/exercises") return json({ items: [], total: 0 });
        return json({});
      });
      await target.goto("/");
    };
    // Use isolated storage so coach and athlete can remain signed in together.
    const coachContext = await context
      .browser()
      .newContext({ viewport: page.viewportSize() });
    const isolatedCoachPage = await coachContext.newPage();
    await coachPage.close();
    try {
      await setup(page, athlete, coach, "nutricion");
      await expect(
        page.getByRole("heading", { name: "Mi alimentación", exact: true }),
      ).toBeVisible();
      const mobile = (page.viewportSize()?.width || 0) < 1024;
      if (mobile && trainingMode !== "coach_managed")
        await page.getByRole("button", { name: "Más", exact: true }).click();
      await expect(
        page
          .getByRole("button", { name: /Mensajes/ })
          .filter({ visible: true }),
      ).toBeVisible();
      if (mobile && trainingMode === "coach_managed")
        await expect(
          page
            .getByRole("navigation")
            .filter({ visible: true })
            .getByRole("button", { name: "Progreso", exact: true }),
        ).toHaveCount(0);
      if (mobile && trainingMode !== "coach_managed")
        await page
          .getByRole("button", { name: "Cerrar menu principal" })
          .click();
      await setup(isolatedCoachPage, coach, athlete, "coach_messages");
      await isolatedCoachPage
        .getByRole("button", { name: /Ana Alumna/ })
        .click();
      await isolatedCoachPage
        .getByLabel("Escribe un mensaje")
        .fill("Ana, revisemos tu entrenamiento de mañana.");
      await isolatedCoachPage
        .getByRole("button", { name: "Enviar mensaje" })
        .click();
      await expect(
        isolatedCoachPage.getByRole("log").getByText(/Ana, revisemos/),
      ).toBeVisible();
      await expect(
        page.getByText("Nuevo mensaje de tu coach", { exact: true }),
      ).toBeVisible({ timeout: 25_000 });
      await expect(
        page.locator('[aria-label="1 mensajes sin leer"]:visible'),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath("athlete-message-notification.png"),
        fullPage: true,
      });
      if (mobile) {
        if (trainingMode !== "coach_managed")
          await page.getByRole("button", { name: /Más/ }).click();
        await page
          .getByRole("button", { name: /Mensajes/ })
          .filter({ visible: true })
          .click();
        await page.getByRole("button", { name: /Diego Coach/ }).click();
      } else
        await page
          .getByRole("button", { name: "Ver mensaje", exact: true })
          .click();
      await expect(
        page.getByRole("log").getByText(/Ana, revisemos/),
      ).toBeVisible();
      await expect(
        page.locator('[aria-label="1 mensajes sin leer"]:visible'),
      ).toHaveCount(0);
      expect(messages[0].readAt).toBeTruthy();
    } finally {
      await coachContext.close();
    }
  });
}

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
      avatarId: role === "Entrenador" ? "gym-04" : "gym-01",
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
    const pageHeader = page.locator(
      ".messages-page > .mobile-page-header--main",
    );
    await expect(pageHeader).toBeVisible();
    await expect(
      page.locator(".messenger__contacts [data-avatar-id]"),
    ).toHaveAttribute("data-avatar-id", peer.avatarId);
    await expect(page.getByText("RIRFIT CONNECT", { exact: true })).toHaveCount(
      0,
    );
    expect(
      await pageHeader
        .getByRole("heading", { name: "Mensajes", exact: true })
        .evaluate((element) => ({
          size: getComputedStyle(element).fontSize,
          weight: getComputedStyle(element).fontWeight,
        })),
    ).toEqual({ size: "32px", weight: "600" });
    await page.screenshot({
      path: testInfo.outputPath(`messages-list-${role}.png`),
      fullPage: true,
      animations: "disabled",
    });
    const listBounds = await page.locator(".messenger").boundingBox();
    await page.getByRole("button", { name: new RegExp(peer.name) }).click();
    await expect(
      page.getByRole("log").getByText("¿Revisamos el entrenamiento de mañana?"),
    ).toBeVisible();
    await expect(pageHeader).toBeVisible();
    await expect(
      page.locator(".messenger__thread-header [data-avatar-id]"),
    ).toHaveAttribute("data-avatar-id", peer.avatarId);
    const chatBounds = await page.locator(".messenger").boundingBox();
    expect(chatBounds.y).toBe(listBounds.y);
    expect(chatBounds.height).toBe(listBounds.height);
    if ((page.viewportSize()?.width || 0) < 768) {
      const navigation = page.locator(".mobile-bottom-nav");
      await expect(navigation).toBeVisible();
      const navBounds = await navigation.boundingBox();
      expect(chatBounds.y + chatBounds.height).toBeLessThan(navBounds.y);
    }
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
      animations: "disabled",
    });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({
      path: testInfo.outputPath(`messages-${role}-dark.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.evaluate(() =>
      document.documentElement.classList.remove("dark"),
    );
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
