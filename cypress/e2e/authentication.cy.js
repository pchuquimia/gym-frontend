const visitLoggedOut = () => {
  cy.visit("/", {
    onBeforeLoad(window) {
      window.localStorage.clear();
      window.sessionStorage.setItem("gym_dev_auto_login_disabled", "true");
    },
  });
};

describe("Autenticacion", () => {
  it("muestra un formulario utilizable en movil", () => {
    visitLoggedOut();

    cy.get('input[name="email"]')
      .should("be.visible")
      .and("have.attr", "type", "email");
    cy.get('input[name="password"]')
      .should("be.visible")
      .and("have.attr", "type", "password");

    cy.findPasswordToggle().click();
    cy.get('input[name="password"]').should("have.attr", "type", "text");
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.lte(
        document.documentElement.clientWidth + 1,
      );
    });
  });

  it("muestra el error de credenciales sin abandonar la pagina", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 401,
      body: { error: "Credenciales invalidas" },
    }).as("login");
    visitLoggedOut();

    cy.get('input[name="email"]').type("usuario@prueba.com");
    cy.get('input[name="password"]').type("prueba123");
    cy.get('button[type="submit"]').click();

    cy.wait("@login");
    cy.get('[role="alert"]').should("be.visible");
    cy.get('input[name="email"]').should("have.value", "usuario@prueba.com");
  });
});
