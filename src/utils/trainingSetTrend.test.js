import { describe, expect, it } from "vitest";
import {
  getTrainingSetTrend,
  getTrainingSetTrendLabel,
} from "./trainingSetTrend";

describe("trainingSetTrend", () => {
  it("considera mejora cuando ninguna métrica retrocede", () => {
    expect(
      getTrainingSetTrend({
        latestWeight: 32.5,
        earlierWeight: 30,
        latestReps: 12,
        earlierReps: 12,
      }),
    ).toBe("up");
  });

  it("considera descenso cuando ninguna métrica mejora", () => {
    expect(
      getTrainingSetTrend({
        latestWeight: 30,
        earlierWeight: 32.5,
        latestReps: 10,
        earlierReps: 12,
      }),
    ).toBe("down");
  });

  it("mantiene neutral una compensación entre peso y repeticiones", () => {
    expect(
      getTrainingSetTrend({
        latestWeight: 35,
        earlierWeight: 30,
        latestReps: 8,
        earlierReps: 12,
      }),
    ).toBe("mixed");
  });

  it("compara la métrica disponible sin inventar la otra", () => {
    expect(
      getTrainingSetTrend({
        latestWeight: 30,
        earlierWeight: 30,
        latestReps: 11,
        earlierReps: 10,
      }),
    ).toBe("up");
  });

  it("explica el estado con lenguaje comparativo", () => {
    expect(getTrainingSetTrendLabel("mixed")).toBe(
      "Aumentó una métrica y redujo la otra",
    );
  });
});
