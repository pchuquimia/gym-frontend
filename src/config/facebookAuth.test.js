import { describe, expect, it } from "vitest";
import { getFacebookLoginUrl } from "./facebookAuth";

describe("facebookAuth", () => {
  it("construye el inicio de OAuth sin exponer secretos", () => {
    const url = new URL(
      getFacebookLoginUrl({
        remember: true,
        emailMarketingConsent: false,
      }),
    );

    expect(url.pathname).toBe("/api/auth/facebook");
    expect(url.searchParams.get("remember")).toBe("1");
    expect(url.searchParams.get("marketing")).toBe("0");
    expect(url.toString()).not.toMatch(/secret/i);
  });
});
