import { describe, expect, test } from "vitest";
import {
  getTrainingSaveErrorMessage,
  hasRecordedTrainingData,
} from "./trainingSubmission";

describe("training submission", () => {
  test("distingue una plantilla vacia de una serie registrada", () => {
    expect(
      hasRecordedTrainingData([
        { sets: [{ entries: [{ kg: "", reps: "", done: false }] }] },
      ]),
    ).toBe(false);
    expect(
      hasRecordedTrainingData([
        { sets: [{ entries: [{ kg: "0", reps: "12", done: false }] }] },
      ]),
    ).toBe(true);
  });

  test("muestra el mensaje util enviado por la API", () => {
    expect(
      getTrainingSaveErrorMessage({
        response: { data: { error: "La fecha no es valida" } },
      }),
    ).toBe("La fecha no es valida");
  });

  test("conserva el mensaje normalizado por el cliente HTTP", () => {
    expect(
      getTrainingSaveErrorMessage(
        new Error("Ya existe un entrenamiento para esta rutina"),
      ),
    ).toBe("Ya existe un entrenamiento para esta rutina");
  });

  test("explica que el autoguardado conserva el avance ante una falla de red", () => {
    expect(getTrainingSaveErrorMessage({ code: "ERR_NETWORK" })).toContain(
      "sigue guardado",
    );
  });
});
