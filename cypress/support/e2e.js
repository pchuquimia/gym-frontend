beforeEach(() => {
  cy.viewport(390, 844);
  cy.intercept("GET", "**/api/auth/me", {
    statusCode: 401,
    body: { error: "No autenticado" },
  });
});

Cypress.Commands.add("findPasswordToggle", () =>
  cy.get('button[aria-label*="contrase"]'),
);
