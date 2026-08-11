delete process.env.ELECTRON_RUN_AS_NODE;

const { default: cypress } = await import("cypress");
const shouldOpen = process.argv.includes("--open");
const result = shouldOpen ? await cypress.open() : await cypress.run();

if (!shouldOpen) {
  if (result?.failures) {
    console.error(result.message || "Cypress no pudo iniciar la ejecucion.");
    process.exitCode = 1;
  } else if (Number(result?.totalFailed) > 0) {
    process.exitCode = 1;
  }
}
