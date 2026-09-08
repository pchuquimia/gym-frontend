import { describe, expect, it } from "vitest";
import { getExerciseAnimationUrl } from "./cloudinary";

describe("getExerciseAnimationUrl", () => {
  it("prefiere la URL original para conservar el GIF animado", () => {
    const originalUrl =
      "https://res.cloudinary.com/demo/image/upload/v123/exercises/demo.gif";

    expect(
      getExerciseAnimationUrl({
        media: {
          animation: {
            url: originalUrl,
            publicId: "exercises/demo",
            format: "gif",
          },
        },
      }),
    ).toBe(originalUrl);
  });

  it("fuerza formato animado cuando solo existe el publicId", () => {
    const url = getExerciseAnimationUrl({
      media: {
        animation: {
          publicId: "exercises/demo",
          format: "gif",
          version: 123,
        },
      },
    });

    expect(url).toContain("/f_gif/v123/exercises/demo");
    expect(url).not.toContain("f_auto");
  });
});
