import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const TYPE_LABELS = {
  short_text: "Respuesta abierta",
  long_text: "Respuesta abierta de varias líneas",
  number: "Respuesta numérica",
  single_choice: "Elige una opción",
  multiple_choice: "Elige una o varias",
  yes_no: "Decisión binaria",
};

const emptyIntakeAnswer = (question) =>
  question?.type === "multiple_choice"
    ? []
    : question?.type === "yes_no"
      ? { value: "", detail: "" }
      : "";

const intakeAnswerError = (question, answer) => {
  const primaryValue =
    question?.type === "yes_no" && answer && typeof answer === "object"
      ? answer.value
      : answer;
  const isEmpty = Array.isArray(primaryValue)
    ? primaryValue.length === 0
    : String(primaryValue ?? "").trim() === "";

  if (question?.required && isEmpty) return "Esta respuesta es obligatoria.";
  if (
    question?.type === "yes_no" &&
    question.detailRequired &&
    primaryValue === "Sí" &&
    !String(answer?.detail || "").trim()
  ) {
    return "Completa el detalle para continuar.";
  }
  return "";
};

function IntakeQuestion({ question, answer, onAnswer, error }) {
  const options = Array.isArray(question.options) ? question.options : [];
  const fieldClass =
    "w-full rounded-[1.5rem] border border-[color:var(--detail-module-border)] bg-[color:var(--card)] px-4 text-base text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)]";

  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
        {TYPE_LABELS[question.type] || "Respuesta"}
      </legend>
      <h2 className="mt-4 font-serif text-[clamp(1.8rem,7vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[color:var(--text)]">
        {question.label}
      </h2>

      {question.type === "long_text" ? (
        <textarea
          value={answer || ""}
          onChange={(event) => onAnswer(event.target.value)}
          rows={6}
          maxLength={1000}
          placeholder="Escribe tu respuesta..."
          aria-label={question.label}
          aria-invalid={Boolean(error)}
          className={`${fieldClass} mt-7 resize-none py-4`}
        />
      ) : null}
      {question.type === "short_text" ? (
        <input
          type="text"
          value={answer || ""}
          onChange={(event) => onAnswer(event.target.value)}
          maxLength={1000}
          placeholder="Escribe tu respuesta..."
          aria-label={question.label}
          aria-invalid={Boolean(error)}
          className={`${fieldClass} mt-7 h-16`}
        />
      ) : null}
      {question.type === "number" ? (
        <input
          type="number"
          inputMode="decimal"
          value={answer || ""}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder="Ingresa un número"
          aria-label={question.label}
          aria-invalid={Boolean(error)}
          className={`${fieldClass} mt-7 h-20 text-center font-serif text-3xl`}
        />
      ) : null}
      {question.type === "yes_no" ? (
        <div className="mt-7">
          <div className="grid grid-cols-2 gap-3">
            {["Sí", "No"].map((option) => {
              const selected = answer?.value === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onAnswer({
                      value: option,
                      detail:
                        answer?.value === option ? answer.detail || "" : "",
                    })
                  }
                  className={`h-20 rounded-[1.5rem] border text-lg font-semibold transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--card)] text-[color:var(--text)]"}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {answer?.value === "Sí" && question.detailPrompt ? (
            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                {question.detailPrompt}{" "}
                {!question.detailRequired ? (
                  <span className="normal-case">(opcional)</span>
                ) : null}
              </span>
              <textarea
                rows={4}
                maxLength={1000}
                value={answer.detail || ""}
                onChange={(event) =>
                  onAnswer({ ...answer, detail: event.target.value })
                }
                placeholder="Escribe los detalles..."
                aria-invalid={Boolean(error)}
                className={`${fieldClass} mt-2 resize-none py-4`}
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {question.type === "single_choice" ? (
        <div className="mt-7 grid gap-3">
          {options.map((option) => {
            const selected = answer === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onAnswer(option)}
                className={`min-h-14 rounded-[1.5rem] border px-5 text-left text-base font-medium transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--card)] text-[color:var(--text)]"}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
      {question.type === "multiple_choice" ? (
        <div className="mt-7 grid gap-3">
          {options.map((option) => {
            const selected = Array.isArray(answer) && answer.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onAnswer(
                    selected
                      ? answer.filter((item) => item !== option)
                      : [...(Array.isArray(answer) ? answer : []), option],
                  )
                }
                className={`flex min-h-14 items-center justify-between rounded-[1.5rem] border px-5 text-left text-base font-medium transition ${selected ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "border-[color:var(--detail-module-border)] bg-[color:var(--card)] text-[color:var(--text)]"}`}
              >
                {option}
                {selected ? <Check className="h-5 w-5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {["single_choice", "multiple_choice"].includes(question.type) &&
      options.length === 0 ? (
        <p className="mt-7 text-sm font-medium text-[color:var(--text-muted)]">
          Esta pregunta todavía no tiene opciones configuradas.
        </p>
      ) : null}

      {error ? (
        <p
          className="mt-4 text-sm font-semibold text-[color:var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default function CoachIntakeQuestionnaire({
  questions,
  answers = {},
  onAnswersChange,
  onComplete,
  onBack,
  submitting = false,
  submitLabel = "Enviar evaluación",
  initialIndex = 0,
  onIndexChange,
}) {
  const safeQuestions = useMemo(
    () => (Array.isArray(questions) ? questions.filter(Boolean) : []),
    [questions],
  );
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(
      Math.max(0, Number(initialIndex) || 0),
      Math.max(0, safeQuestions.length - 1),
    ),
  );
  const [error, setError] = useState("");
  const visibleIndex = Math.min(
    currentIndex,
    Math.max(0, safeQuestions.length - 1),
  );
  const question = safeQuestions[visibleIndex];
  const progress = safeQuestions.length
    ? ((visibleIndex + 1) / safeQuestions.length) * 100
    : 0;

  const setIndex = (nextIndex) => {
    setError("");
    setCurrentIndex(nextIndex);
    onIndexChange?.(nextIndex);
  };

  const updateAnswer = (nextAnswer) => {
    setError("");
    onAnswersChange?.({
      ...answers,
      [question.key]: nextAnswer,
    });
  };

  const goBack = () => {
    if (visibleIndex === 0) onBack?.();
    else setIndex(visibleIndex - 1);
  };

  const goForward = async () => {
    const nextError = intakeAnswerError(question, answers[question.key]);
    if (nextError) {
      setError(nextError);
      return;
    }
    if (visibleIndex === safeQuestions.length - 1) {
      await onComplete?.(answers);
      return;
    }
    setIndex(visibleIndex + 1);
  };

  const skip = () => {
    const nextAnswers = {
      ...answers,
      [question.key]: emptyIntakeAnswer(question),
    };
    onAnswersChange?.(nextAnswers);
    if (visibleIndex === safeQuestions.length - 1) onComplete?.(nextAnswers);
    else setIndex(visibleIndex + 1);
  };

  if (!question) return null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        goForward();
      }}
      className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col bg-[color:var(--surface-subtle)] sm:min-h-[680px]"
    >
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-wide">
          <span className="text-[color:var(--text-muted)]">
            Pregunta {visibleIndex + 1} de {safeQuestions.length}
          </span>
          <span className="normal-case tracking-normal text-[color:var(--text)]">
            {question.required ? "Obligatoria" : "Opcional"}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[color:var(--detail-row-divider)]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 pt-8">
        <IntakeQuestion
          question={question}
          answer={answers[question.key] ?? emptyIntakeAnswer(question)}
          onAnswer={updateAnswer}
          error={error}
        />
      </div>

      <div className="sticky bottom-0 border-t border-[color:var(--detail-row-divider)] bg-[color:var(--surface-subtle)]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[color:var(--detail-module-border)] bg-[color:var(--card)] disabled:opacity-50"
            aria-label={visibleIndex === 0 ? "Volver" : "Pregunta anterior"}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="theme-accent-solid flex h-14 flex-1 items-center justify-center gap-3 rounded-full text-base font-semibold disabled:opacity-50"
          >
            {submitting
              ? "Enviando..."
              : visibleIndex === safeQuestions.length - 1
                ? submitLabel
                : "Continuar"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
        {!question.required ? (
          <button
            type="button"
            onClick={skip}
            disabled={submitting}
            className="mt-3 w-full text-center text-sm text-[color:var(--text-muted)] disabled:opacity-50"
          >
            Saltar
          </button>
        ) : null}
      </div>
    </form>
  );
}
