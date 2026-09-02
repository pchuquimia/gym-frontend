import { describe, expect, it } from "vitest";
import { sections } from "./navConfig";

const visibleFor = (role) =>
  sections
    .map((section) => ({
      heading: section.heading,
      ids: section.items
        .filter((item) => !item.roles || item.roles.includes(role))
        .map((item) => item.id),
    }))
    .filter((section) => section.ids.length);

describe("configuracion del menu lateral", () => {
  it("muestra primero la navegacion personal y despues las herramientas elevadas", () => {
    const adminSections = visibleFor("Admin");

    expect(adminSections.map((section) => section.heading)).toEqual([
      "Entrenamiento",
      "Progreso",
      "Historial",
      "Cuenta",
      "Coach",
      "Administracion",
    ]);
    expect(adminSections.at(-2).ids).toEqual(["trainer"]);
    expect(adminSections.at(-1).ids).toEqual([
      "coach_admin",
      "editor_historial",
      "imagenes_ejercicios",
    ]);
  });

  it("no expone bloques de coach o administracion al usuario normal", () => {
    expect(visibleFor("Cliente").map((section) => section.heading)).toEqual([
      "Entrenamiento",
      "Progreso",
      "Historial",
      "Cuenta",
    ]);
  });
});
