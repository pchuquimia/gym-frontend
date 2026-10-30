import { describe, expect, test } from "vitest";
import {
  getBodyweightCompletionIssue,
  getTrainingSaveErrorMessage,
  hasRecordedTrainingData,
  usesBodyweightLoad,
  isTrainingScheduleConfirmationRequired,
} from "./trainingSubmission";

describe("training submission", () => {
  test("reconoce la confirmación de fecha normalizada por el cliente HTTP y la respuesta original", () => {
    expect(
      isTrainingScheduleConfirmationRequired({
        status: 409,
        code: "TRAINING_SCHEDULE_CONFIRMATION_REQUIRED",
      }),
    ).toBe(true);
    expect(
      isTrainingScheduleConfirmationRequired({
        response: {
          status: 409,
          data: { code: "TRAINING_SCHEDULE_CONFIRMATION_REQUIRED" },
        },
      }),
    ).toBe(true);
    expect(
      isTrainingScheduleConfirmationRequired({
        status: 409,
        message: "Confirma que deseas entrenar un dia distinto al planificado",
      }),
    ).toBe(true);
    expect(
      isTrainingScheduleConfirmationRequired({
        status: 409,
        message: "Ya existe un entrenamiento",
      }),
    ).toBe(false);
    expect(
      isTrainingScheduleConfirmationRequired(new Error("Network Error")),
    ).toBe(false);
  });
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

  test("reconoce fondos y dominadas como ejercicios de peso corporal", () => {
    expect(usesBodyweightLoad({ name: "Fondos para pecho" })).toBe(true);
    expect(usesBodyweightLoad({ name: "Dominadas pronas" })).toBe(true);
    expect(usesBodyweightLoad({ weightBasis: "additional" })).toBe(true);
    expect(usesBodyweightLoad({ name: "Press de banca" })).toBe(false);
  });

  test("distingue peso vacio de cero confirmado en peso corporal", () => {
    const exercise = { name: "Fondos para pecho", weightBasis: "additional" };
    expect(getBodyweightCompletionIssue(exercise, { kg: "", reps: "10" })).toBe(
      "missing_weight",
    );
    expect(
      getBodyweightCompletionIssue(exercise, { kg: "0", reps: "10" }),
    ).toBe("confirm_bodyweight");
    expect(
      getBodyweightCompletionIssue(exercise, { kg: "15", reps: "10" }),
    ).toBeNull();
  });

  test("exige repeticiones al completar una serie de peso corporal", () => {
    expect(
      getBodyweightCompletionIssue(
        { loadType: "bodyweight" },
        { kg: "0", reps: "" },
      ),
    ).toBe("missing_reps");
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
