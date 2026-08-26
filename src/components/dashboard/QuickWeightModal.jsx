import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, LoaderCircle, Weight, X } from "lucide-react";

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

export default function QuickWeightModal({ open, onClose, onSave }) {
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
      setWeight("");
      phaseRef.current = "idle";
      setPhase("idle");
      setError("");
    }, 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 180);
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
  }, [open]);

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
        1350,
      );
    } catch (requestError) {
      changePhase("idle");
      setError(requestError.message || "No se pudo guardar el pesaje.");
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={
            phase === "saving"
              ? "Guardando pesaje"
              : phase === "success"
                ? "Peso registrado"
                : "Peso actual"
          }
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar registro de peso"
            onClick={phase === "saving" ? undefined : onClose}
          />
          <motion.section
            initial={
              reduceMotion ? { opacity: 0 } : { y: 28, opacity: 0, scale: 0.98 }
            }
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }
            }
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative w-full max-w-sm rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-[color:var(--text)] shadow-2xl sm:p-6 dark:rounded-[4px]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {phase === "saving" ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <span className="theme-accent-soft mx-auto grid h-16 w-16 place-items-center rounded-full border">
                    <LoaderCircle
                      className={`h-8 w-8 ${reduceMotion ? "" : "animate-spin"}`}
                    />
                  </span>
                  <h2 className="mt-5 text-xl font-black uppercase">
                    Guardando pesaje
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                    Confirmando tu peso con el servidor.
                  </p>
                  <div
                    className="mt-6 flex justify-center gap-2"
                    aria-hidden="true"
                  >
                    {[0, 1, 2].map((index) => (
                      <motion.span
                        key={index}
                        className="theme-accent-solid h-1.5 w-10 border-0"
                        animate={
                          reduceMotion
                            ? { opacity: 0.8 }
                            : {
                                opacity: [0.25, 1, 0.25],
                                scaleX: [0.75, 1, 0.75],
                              }
                        }
                        transition={
                          reduceMotion
                            ? undefined
                            : {
                                duration: 1.2,
                                repeat: Infinity,
                                delay: index * 0.18,
                              }
                        }
                      />
                    ))}
                  </div>
                </motion.div>
              ) : phase === "success" ? (
                <motion.div
                  key="success"
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.65, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white dark:bg-[#e2ff00] dark:text-black"
                  >
                    <Check className="h-8 w-8 stroke-[3]" />
                  </motion.span>
                  <h2 className="mt-5 text-xl font-black uppercase">
                    Peso registrado
                  </h2>
                  <p className="mt-2 text-3xl font-black text-[#ff5722] dark:text-[#e2ff00]">
                    {numericWeight.toLocaleString("es-BO", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    KG
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)]">
                        <Weight className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                          Pesaje diario
                        </p>
                        <h2
                          id="quick-weight-title"
                          className="mt-0.5 text-xl font-black uppercase"
                        >
                          Peso actual
                        </h2>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Cerrar"
                      className="grid h-10 w-10 shrink-0 place-items-center border border-[color:var(--border)]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <label className="mt-6 block">
                    <span className="sr-only">Peso actual en kilogramos</span>
                    <span className="relative block">
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
                        placeholder="0.0"
                        className="theme-accent-focus h-20 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-20 text-center text-4xl font-black tabular-nums outline-none"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-sm font-black text-[color:var(--text-muted)]">
                        KG
                      </span>
                    </span>
                  </label>
                  <p
                    className={`mt-2 min-h-5 text-center text-xs font-bold ${error ? "text-red-500" : "text-[color:var(--text-muted)]"}`}
                    role={error ? "alert" : undefined}
                  >
                    {error ||
                      (weight && !validWeight
                        ? "Ingresa un peso entre 25 y 400 kg."
                        : "")}
                  </p>
                  <button
                    type="submit"
                    disabled={!validWeight}
                    className="mt-3 h-12 w-full bg-[#ff5722] text-sm font-black uppercase text-white transition disabled:cursor-not-allowed disabled:bg-[color:var(--border)] disabled:text-[color:var(--text-muted)] dark:bg-[#e2ff00] dark:text-black"
                  >
                    Confirmar peso
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
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};
