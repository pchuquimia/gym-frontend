import { afterEach, describe, expect, it } from "vitest";
import {
  clearCoachInvitation,
  invitationTokenFromPath,
  normalizeCoachInvitationToken,
  readCoachInvitation,
  storeCoachInvitation,
} from "./coachInvitation";

const token = "a".repeat(43);

describe("coachInvitation", () => {
  afterEach(() => clearCoachInvitation());

  it("extrae un token válido desde la ruta pública", () => {
    expect(invitationTokenFromPath(`/invitacion/${token}`)).toBe(token);
    expect(invitationTokenFromPath(`/invitacion/${token}/`)).toBe(token);
  });

  it("rechaza tokens y rutas manipuladas", () => {
    expect(normalizeCoachInvitationToken("corto")).toBe("");
    expect(invitationTokenFromPath("/invitacion/token-invalido")).toBe("");
    expect(invitationTokenFromPath(`/otra-ruta/${token}`)).toBe("");
  });

  it("conserva la invitación durante el acceso del alumno", () => {
    storeCoachInvitation(token);
    expect(readCoachInvitation()).toBe(token);
    clearCoachInvitation();
    expect(readCoachInvitation()).toBe("");
  });
});
