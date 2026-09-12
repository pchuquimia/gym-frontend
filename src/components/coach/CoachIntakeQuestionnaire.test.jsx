import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoachIntakeQuestionnaire from "./CoachIntakeQuestionnaire";

describe("CoachIntakeQuestionnaire", () => {
  it("impide avanzar una pregunta obligatoria vacía", () => {
    const onComplete = vi.fn();
    render(
      <CoachIntakeQuestionnaire
        questions={[
          {
            key: "goal",
            label: "¿Cuál es tu objetivo?",
            type: "long_text",
            required: true,
          },
        ]}
        answers={{}}
        onAnswersChange={vi.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /enviar evaluación/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esta respuesta es obligatoria.",
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("solicita el detalle configurado cuando la respuesta es sí", () => {
    const onComplete = vi.fn();
    const onAnswersChange = vi.fn();
    const question = {
      key: "injuries",
      label: "¿Tienes alguna lesión?",
      type: "yes_no",
      required: true,
      detailPrompt: "¿Cuál?",
      detailRequired: true,
    };
    const { rerender } = render(
      <CoachIntakeQuestionnaire
        questions={[question]}
        answers={{}}
        onAnswersChange={onAnswersChange}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    const nextAnswers = onAnswersChange.mock.calls.at(-1)[0];
    rerender(
      <CoachIntakeQuestionnaire
        questions={[question]}
        answers={nextAnswers}
        onAnswersChange={onAnswersChange}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /enviar evaluación/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Completa el detalle para continuar.",
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("envía las mismas respuestas que presenta en pantalla", () => {
    const onComplete = vi.fn();
    const answers = { duration: "60 minutos" };
    render(
      <CoachIntakeQuestionnaire
        questions={[
          {
            key: "duration",
            label: "¿Cuánto dura tu sesión?",
            type: "single_choice",
            required: true,
            options: ["30 minutos", "60 minutos"],
          },
        ]}
        answers={answers}
        onAnswersChange={vi.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /enviar evaluación/i }));

    expect(onComplete).toHaveBeenCalledWith(answers);
  });
});
