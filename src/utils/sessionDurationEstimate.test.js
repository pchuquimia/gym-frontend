import { describe, expect, it } from "vitest";
import {
  estimateFullSessionDuration,
  formatSessionDuration,
} from "./sessionDurationEstimate";

describe("estimateFullSessionDuration", () => {
  it("averages complete sessions of the same routine", () => {
    const result = estimateFullSessionDuration(
      { id: "lower-b", name: "Lower B" },
      [
        { routineId: "lower-b", durationSeconds: 3600, date: "2026-08-20" },
        { routineId: "lower-b", durationSeconds: 4200, date: "2026-08-13" },
        { routineId: "upper-a", durationSeconds: 7200, date: "2026-08-10" },
      ],
    );

    expect(result).toMatchObject({
      minutes: 65,
      source: "history",
      sampleSize: 2,
      includesRest: true,
    });
  });

  it("uses work plus rest when an old session has no total duration", () => {
    const result = estimateFullSessionDuration(
      { id: "lower-b" },
      [{ routineId: "lower-b", workSeconds: 1800, restSeconds: 900 }],
    );

    expect(result.minutes).toBe(45);
    expect(result.source).toBe("history");
  });

  it("estimates the full session from planned sets and rest", () => {
    const result = estimateFullSessionDuration({
      id: "new-routine",
      raw: {
        exercises: [
          { sets: 3, restSeconds: 90 },
          { sets: 3, restSeconds: 90 },
          { sets: 3, restSeconds: 90 },
          { sets: 3, restSeconds: 90 },
        ],
      },
    });

    expect(result.minutes).toBe(32);
    expect(result.source).toBe("estimate");
    expect(result.includesRest).toBe(true);
  });
});

describe("formatSessionDuration", () => {
  it("shows minutes below one hour", () => {
    expect(formatSessionDuration(47)).toBe("47 min");
  });

  it("shows hours and remaining minutes", () => {
    expect(formatSessionDuration(98)).toBe("1 h 38 min");
  });

  it("omits zero remaining minutes", () => {
    expect(formatSessionDuration(120)).toBe("2 h");
  });
});
