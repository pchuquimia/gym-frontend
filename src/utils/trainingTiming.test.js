import { describe, expect, it } from "vitest";
import {
  calculateTimingSummary,
  createTimeEvent,
  estimateSetWorkSeconds,
  removeLatestSetCompletion,
  resolveSetWorkEstimate,
} from "./trainingTiming";

const BASE = Date.parse("2026-08-28T10:00:00.000Z");

describe("trainingTiming", () => {
  it("estima el trabajo de una serie usando sus repeticiones", () => {
    expect(estimateSetWorkSeconds({ entries: [{ reps: 10 }] })).toBe(40);
    expect(estimateSetWorkSeconds({ entries: [{ reps: "" }] })).toBe(45);
    expect(
      estimateSetWorkSeconds({ entries: [{ reps: 10 }, { reps: 10 }] }),
    ).toBe(88);
  });

  it("separa preparación, trabajo estimado y descanso", () => {
    const events = [
      createTimeEvent("session_start", null, BASE),
      createTimeEvent("exercise_selected", "press", BASE),
      createTimeEvent("set_complete", "press", BASE + 300_000, {
        setId: "set-1",
        source: "estimated",
        workSeconds: 40,
      }),
      createTimeEvent("rest_start", "press", BASE + 300_000, {
        setId: "set-1",
        restType: "between_sets",
      }),
      createTimeEvent("rest_end", "press", BASE + 420_000),
      createTimeEvent("session_end", null, BASE + 420_000),
    ];

    expect(calculateTimingSummary(events)).toMatchObject({
      durationSeconds: 420,
      workSeconds: 40,
      restSeconds: 120,
      preparationSeconds: 260,
      hasSetCompletionEvents: true,
    });
  });

  it("usa una medición real cuando la siguiente serie fue iniciada", () => {
    const events = [
      createTimeEvent("set_start", "press", BASE, {
        setId: "set-2",
        source: "manual",
      }),
    ];
    expect(
      resolveSetWorkEstimate({
        events,
        exerciseId: "press",
        setId: "set-2",
        set: { entries: [{ reps: 10 }] },
        completedAtMs: BASE + 52_000,
      }),
    ).toEqual({ workSeconds: 52, source: "measured" });
  });

  it("conserva el cálculo anterior para sesiones sin eventos de serie", () => {
    const events = [
      createTimeEvent("session_start", null, BASE),
      createTimeEvent("exercise_start", "legacy", BASE),
      createTimeEvent("rest_start", "legacy", BASE + 60_000),
      createTimeEvent("rest_end", "legacy", BASE + 90_000),
      createTimeEvent("session_end", null, BASE + 120_000),
    ];
    expect(calculateTimingSummary(events)).toMatchObject({
      durationSeconds: 120,
      workSeconds: 90,
      restSeconds: 30,
      preparationSeconds: null,
      hasSetCompletionEvents: false,
    });
  });

  it("elimina la última medición al reabrir una serie", () => {
    const events = [
      createTimeEvent("set_complete", "press", BASE, {
        setId: "set-1",
        workSeconds: 40,
      }),
      createTimeEvent("set_complete", "press", BASE + 60_000, {
        setId: "set-1",
        workSeconds: 45,
      }),
    ];
    const next = removeLatestSetCompletion(events, "press", "set-1");
    expect(next).toHaveLength(1);
    expect(next[0].workSeconds).toBe(40);
  });
});
