import { describe, expect, test } from "vitest";
import { normalizeUsername, validateUsername } from "./authValidation";

describe("username de autenticación", () => {
  test("normaliza espacios y mayúsculas", () => {
    expect(normalizeUsername("  Juan_Fit  ")).toBe("juan_fit");
  });

  test("valida longitud y caracteres permitidos", () => {
    expect(validateUsername("juan_fit")).toBe("");
    expect(validateUsername("ab")).toMatch(/3 a 20/);
    expect(validateUsername("juan-fit")).toMatch(/3 a 20/);
  });
});
