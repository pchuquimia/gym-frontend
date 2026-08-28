import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const sanitizeWeight = (value) => {
  const normalized = String(value || "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const [integer = "", ...decimalParts] = normalized.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  return decimalParts.length
    ? `${integer.slice(0, 3)}.${decimal}`
    : integer.slice(0, 3);
};

const formatInitialWeight = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "";
  return String(Math.round(numericValue * 100) / 100);
};

const formatLogDate = () =>
  new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

export default function QuickWeightModal({
  currentWeight,
  open,
  onClose,
  onSave,
}) {
  const [weight, setWeight] = useState("");
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const closeTimerRef = useRef(null);
  const phaseRef = useRef("idle");
  const onCloseRef = useRef(onClose);
  const reduceMotion = useReducedMotion();
  const numericWeight = Number(weight);
  const validWeight =
    Number.isFinite(numericWeight) &&
    numericWeight >= 25 &&
    numericWeight <= 400;

  const changePhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const resetTimer = window.setTimeout(() => {
      setWeight(formatInitialWeight(currentWeight));
      phaseRef.current = "idle";
      setPhase("idle");
      setError("");
    }, 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 260);
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && phaseRef.current !== "saving") {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(resetTimer);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentWeight, open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validWeight || phase === "saving") return;
    changePhase("saving");
    setError("");
    try {
      await onSave(numericWeight);
      changePhase("success");
      closeTimerRef.current = window.setTimeout(
        () => onCloseRef.current(),
        1250,
      );
    } catch (requestError) {
      changePhase("idle");
      setError(requestError.message || "No se pudo guardar el pesaje.");
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  if (typeof document === "undefined") return null;

  const dialogLabel =
    phase === "saving"
      ? "Guardando pesaje"
      : phase === "success"
        ? "Peso registrado"
        : "Registrar peso";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] overflow-y-auto bg-[color:var(--bg)] text-[color:var(--text)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
        >
          <motion.section
            initial={reduceMotion ? { opacity: 0 } : { x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: 20, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: "easeOut" }}
            className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col"
          >
            <header className="relative grid h-[72px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[color:var(--detail-row-divider)] px-5 sm:px-7">
              <button
                type="button"
                onClick={phase === "saving" ? undefined : onClose}
                disabled={phase === "saving"}
                className="justify-self-start text-sm font-medium text-[color:var(--text)] disabled:opacity-40"
              >
                Cancelar
              </button>
              <h1 className="text-base font-semibold tracking-[-0.02em]">
                Pesaje
              </h1>
              <span aria-hidden="true" />
            </header>

            <AnimatePresence mode="wait" initial={false}>
              {phase === "saving" || phase === "success" ? (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-sm font-medium text-[color:var(--text-muted)]">
                    {phase === "saving" ? "Guardando tu registro" : "Peso registrado"}
                  </p>
                  <p className="mt-3 text-[56px] font-semibold leading-none tracking-[-0.055em] tabular-nums sm:text-[64px]">
                    {numericWeight.toLocaleString("es-BO", {
                      maximumFractionDigits: 2,
                    })}
                    <span className="ml-2 text-2xl tracking-normal">kg</span>
                  </p>
                  {phase === "saving" ? (
                    <motion.span
                      aria-hidden="true"
                      className="mt-8 h-0.5 w-24 origin-left bg-[#352018] dark:bg-[#e2ff00]"
                      animate={reduceMotion ? undefined : { scaleX: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="flex flex-1 flex-col"
                >
                  <div className="px-5 pb-8 pt-8 sm:px-7 sm:pt-10">
                    <h2 className="max-w-md text-[30px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[34px]">
                      ¿Cuál es tu peso?
                    </h2>
                    <div className="mt-8 flex min-h-16 items-center justify-between gap-4 rounded-[22px] bg-[color:var(--card)] px-5">
                      <span className="text-base font-medium">Fecha</span>
                      <time className="text-sm font-medium text-[color:var(--text-muted)]">
                        {formatLogDate()}
                      </time>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
                    <label className="block w-full max-w-[280px] text-center">
                      <span className="sr-only">Peso actual en kilogramos</span>
                      <span className="flex items-end justify-center border-b border-[color:var(--detail-row-divider)] pb-3">
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="decimal"
                          enterKeyHint="done"
                          autoComplete="off"
                          value={weight}
                          onChange={(event) =>
                            setWeight(sanitizeWeight(event.target.value))
                          }
                          placeholder="0"
                          className="min-w-0 max-w-[205px] bg-transparent text-right text-[62px] font-semibold leading-none tracking-[-0.065em] tabular-nums outline-none placeholder:text-[color:var(--border-strong)] sm:text-[70px]"
                        />
                        <span className="mb-1.5 ml-3 text-2xl font-semibold">kg</span>
                      </span>
                    </label>
                    <p
                      className={`mt-3 min-h-5 text-center text-xs font-medium ${error ? "text-red-500" : "text-[color:var(--text-muted)]"}`}
                      role={error ? "alert" : undefined}
                    >
                      {error ||
                        (weight && !validWeight
                          ? "Ingresa un peso entre 25 y 400 kg."
                          : "")}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!validWeight}
                    className="min-h-16 w-full shrink-0 bg-[#352018] px-6 text-sm font-semibold uppercase tracking-[0.02em] text-white transition disabled:cursor-not-allowed disabled:bg-[color:var(--border)] disabled:text-[color:var(--text-muted)] dark:bg-[#e2ff00] dark:text-black"
                  >
                    Agregar
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

QuickWeightModal.propTypes = {
  currentWeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

QuickWeightModal.defaultProps = {
  currentWeight: null,
};
