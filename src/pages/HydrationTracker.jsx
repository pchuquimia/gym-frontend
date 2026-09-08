import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import OperationLoader from "../components/system/OperationLoader";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import { api } from "../services/api";

const AMOUNTS = [250, 350, 500, 750, 1000];
const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const dateFromKey = (dateKey) => {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const shiftDateKey = (dateKey, days) => {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};

const getWeekStart = (dateKey) => {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDateKey(date);
};

const formatMl = (value) =>
  new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );

const formatAverage = (value) => {
  const amount = Number(value || 0);
  if (amount < 1000) return `${formatMl(amount)} ml`;
  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(amount / 1000)} L`;
};

function AnimatedHydrationValue({ value, reduceMotion, duration = 0.62 }) {
  const targetValue = Math.max(0, Number(value || 0));
  const isWideValue = formatMl(targetValue).length >= 5;
  const animatedValue = useMotionValue(targetValue);
  const formattedValue = useTransform(animatedValue, (latest) =>
    formatMl(Math.round(latest)),
  );

  useEffect(() => {
    if (reduceMotion) {
      animatedValue.set(targetValue);
      return undefined;
    }

    const controls = animate(animatedValue, targetValue, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [animatedValue, duration, reduceMotion, targetValue]);

  return (
    <>
      <motion.strong
        className={isWideValue ? "is-wide" : undefined}
        aria-hidden="true"
      >
        {formattedValue}
      </motion.strong>
      <span className="sr-only" aria-live="polite">
        {formatMl(targetValue)} mililitros registrados
      </span>
    </>
  );
}

function HydrationModal({ children, onClose }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="hydration-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className="hydration-modal__sheet"
        initial={reduceMotion ? false : { y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduceMotion ? undefined : { y: 20, opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <button
          type="button"
          className="hydration-modal__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function HydrationTracker({
  onBack,
  onNavigate,
  coachAthlete = null,
  onMobileNavVisibilityChange,
}) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const amountRailRef = useRef(null);
  const amountButtonRefs = useRef(new Map());
  const amountScrollAnimationRef = useRef(null);
  const hasPositionedAmountRef = useRef(false);
  const athleteId = coachAthlete?.id || coachAthlete?._id || "";
  const todayKey = useMemo(() => localDateKey(), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [goalError, setGoalError] = useState("");
  const [modal, setModal] = useState("");
  const [goalDraft, setGoalDraft] = useState("2500");
  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => shiftDateKey(weekStart, 6), [weekStart]);
  const queryKey = ["hydration", athleteId || "self", selectedDate, weekStart];
  const hydrationQuery = useQuery({
    queryKey,
    queryFn: () =>
      api.getHydration({
        athleteId,
        date: selectedDate,
        from: weekStart,
        to: weekEnd,
      }),
    staleTime: 15 * 1000,
  });
  const summary = hydrationQuery.data?.summary || {
    totalMl: 0,
    goalMl: 2500,
    progress: 0,
    averageMl: 0,
    completed: false,
    lastEntry: null,
  };
  const isCompletingGoal = busyAction === "complete";
  const progressAnimationDuration = isCompletingGoal ? 1.15 : 0.5;
  const weekDays = useMemo(() => {
    const source = new Map(
      (hydrationQuery.data?.days || []).map((day) => [day.dateKey, day]),
    );
    return DAY_LABELS.map((label, index) => {
      const dateKey = shiftDateKey(weekStart, index);
      return {
        label,
        dateKey,
        ...(source.get(dateKey) || { totalMl: 0, progress: 0, completed: false }),
      };
    });
  }, [hydrationQuery.data?.days, weekStart]);

  useEffect(() => {
    onMobileNavVisibilityChange?.(true);
    return () => onMobileNavVisibilityChange?.(false);
  }, [onMobileNavVisibilityChange]);

  useEffect(() => {
    if (modal === "goal") setGoalDraft(String(summary.goalMl || 2500));
  }, [modal, summary.goalMl]);

  useLayoutEffect(() => {
    const rail = amountRailRef.current;
    const selectedButton = amountButtonRefs.current.get(selectedAmount);
    if (!rail || !selectedButton) return;

    const targetLeft =
      selectedButton.offsetLeft -
      (rail.clientWidth - selectedButton.clientWidth) / 2;

    amountScrollAnimationRef.current?.stop();

    if (reduceMotion || !hasPositionedAmountRef.current) {
      rail.scrollLeft = targetLeft;
      hasPositionedAmountRef.current = true;
      return undefined;
    }

    const controls = animate(rail.scrollLeft, targetLeft, {
      duration: 0.72,
      ease: [0.45, 0, 0.2, 1],
      onUpdate: (latest) => {
        rail.scrollTo({ left: latest, behavior: "auto" });
      },
    });
    amountScrollAnimationRef.current = controls;

    return () => controls.stop();
  }, [hydrationQuery.isLoading, reduceMotion, selectedAmount]);

  const refreshHydration = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hydration"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] }),
    ]);
  };

  const addWater = async () => {
    if (busyAction) return;
    setActionError("");
    setBusyAction("add");
    try {
      await api.addHydration({
        ownerId: athleteId || undefined,
        dateKey: selectedDate,
        amountMl: selectedAmount,
      });
      await refreshHydration();
    } catch (error) {
      setActionError(error.message || "No se pudo registrar el agua");
    } finally {
      setBusyAction("");
    }
  };

  const undoLast = async () => {
    const entryId = summary.lastEntry?._id || summary.lastEntry?.id;
    if (!entryId || busyAction) return;
    setActionError("");
    setBusyAction("undo");
    try {
      await api.deleteHydrationEntry(entryId);
      await refreshHydration();
    } catch (error) {
      setActionError(error.message || "No se pudo deshacer el registro");
    } finally {
      setBusyAction("");
    }
  };

  const completeGoal = async () => {
    if (summary.completed || busyAction) return;
    setActionError("");
    setBusyAction("complete");
    try {
      await api.completeHydration({
        ownerId: athleteId || undefined,
        dateKey: selectedDate,
      });
      await refreshHydration();
    } catch (error) {
      setActionError(error.message || "No se pudo completar la meta");
    } finally {
      setBusyAction("");
    }
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    const goalMl = Number(goalDraft);
    if (!Number.isFinite(goalMl) || goalMl < 500 || goalMl > 6000) {
      setGoalError("La meta debe estar entre 500 y 6000 ml.");
      return;
    }
    setGoalError("");
    setBusyAction("goal");
    try {
      await api.updateHydrationGoal({
        ownerId: athleteId || undefined,
        goalMl,
      });
      await refreshHydration();
      setModal("");
    } catch (error) {
      setGoalError(error.message || "No se pudo actualizar la meta");
    } finally {
      setBusyAction("");
    }
  };

  const handleBack = () => {
    if (typeof onBack === "function") onBack();
    else onNavigate?.("dashboard");
  };
  return (
    <main className="hydration-tracker">
      <MobilePageHeader
        title="Hidratación"
        variant="detail"
        onBack={handleBack}
        mobileOnly={false}
        className="hydration-tracker__page-header"
        actions={
          <>
            <label className="hydration-tracker__date-button">
              <CalendarDays aria-hidden="true" />
              <span className="sr-only">Cambiar fecha</span>
              <input
                type="date"
                value={selectedDate}
                max={todayKey}
                onChange={(event) => setSelectedDate(event.target.value)}
                aria-label="Fecha de hidratación"
              />
            </label>
            <button
              type="button"
              className="hydration-tracker__header-action"
              onClick={() => setModal("info")}
              aria-label="Información"
            >
              <Info />
            </button>
          </>
        }
      />

      {hydrationQuery.isLoading ? (
        <OperationLoader
          active
          delayMs={0}
          mode="inline"
          title="Preparando tu reto"
          description="Cargando tu hidratación de hoy."
        />
      ) : hydrationQuery.error ? (
        <section className="hydration-tracker__error" role="alert">
          <h2>No pudimos cargar tu hidratación</h2>
          <p>Tu información sigue segura. Intenta conectarte nuevamente.</p>
          <button type="button" onClick={() => hydrationQuery.refetch()}>
            Reintentar
          </button>
        </section>
      ) : (
        <>
          <section className="hydration-tracker__today">
            <div
              className="hydration-tracker__ring"
              role="progressbar"
              aria-label="Progreso de hidratación"
              aria-valuemin="0"
              aria-valuemax={summary.goalMl}
              aria-valuenow={Math.min(summary.totalMl, summary.goalMl)}
            >
              <svg viewBox="0 0 240 240" aria-hidden="true">
                <circle className="hydration-tracker__ring-track" cx="120" cy="120" r="105" pathLength="100" />
                <motion.circle
                  className="hydration-tracker__ring-value"
                  cx="120"
                  cy="120"
                  r="105"
                  pathLength="100"
                  initial={false}
                  animate={{ strokeDasharray: `${summary.progress} ${100 - summary.progress}` }}
                  transition={{
                    duration: reduceMotion ? 0 : progressAnimationDuration,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </svg>
              <div className="hydration-tracker__ring-copy">
                <AnimatedHydrationValue
                  value={summary.totalMl}
                  reduceMotion={reduceMotion}
                  duration={progressAnimationDuration}
                />
                <span>de {formatMl(summary.goalMl)} ml</span>
                <button
                  type="button"
                  onClick={() => {
                    setGoalError("");
                    setModal("goal");
                  }}
                >
                  Editar
                </button>
              </div>
            </div>

            <div
              ref={amountRailRef}
              className="hydration-tracker__amounts"
              aria-label="Cantidad de agua"
            >
              {AMOUNTS.map((amount) => (
                <motion.button
                  key={amount}
                  ref={(node) => {
                    if (node) amountButtonRefs.current.set(amount, node);
                    else amountButtonRefs.current.delete(amount);
                  }}
                  type="button"
                  onClick={() => setSelectedAmount(amount)}
                  className={selectedAmount === amount ? "is-selected" : ""}
                  aria-pressed={selectedAmount === amount}
                  animate={{
                    opacity: selectedAmount === amount ? 1 : 0.42,
                    scale: selectedAmount === amount ? 1 : 0.88,
                  }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.48,
                    ease: [0.45, 0, 0.2, 1],
                  }}
                >
                  {amount} ml
                </motion.button>
              ))}
            </div>

            <div className="hydration-tracker__controls">
              <button
                type="button"
                className="hydration-tracker__control hydration-tracker__control--secondary"
                onClick={undoLast}
                disabled={!summary.lastEntry || Boolean(busyAction)}
                aria-label="Deshacer último registro"
              >
                {busyAction === "undo" ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              </button>
              <button
                type="button"
                className="hydration-tracker__add"
                onClick={addWater}
                disabled={Boolean(busyAction)}
                aria-label={`Agregar ${selectedAmount} mililitros`}
              >
                {busyAction === "add" ? <Loader2 className="animate-spin" /> : <Plus />}
              </button>
              <AnimatePresence initial={false}>
                {!summary.completed ? (
                  <motion.button
                    key="complete-hydration"
                    type="button"
                    className="hydration-tracker__control hydration-tracker__control--complete"
                    onClick={completeGoal}
                    disabled={Boolean(busyAction)}
                    aria-label="Completar la meta de hidratación"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.68 }}
                    transition={{
                      duration: reduceMotion ? 0 : isCompletingGoal ? 0.4 : 0.24,
                      delay: reduceMotion ? 0 : isCompletingGoal ? 0.72 : 0,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {busyAction === "complete" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Check />
                    )}
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false}>
              {actionError ? (
                <motion.p
                  className="hydration-tracker__inline-error"
                  role="alert"
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                >
                  {actionError}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </section>

          <section className="hydration-tracker__week">
            <div>
              <h2>Esta semana</h2>
              <p>Promedio {formatAverage(summary.averageMl)}</p>
            </div>
            <div className="hydration-tracker__bars">
              {weekDays.map((day) => (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => day.dateKey <= todayKey && setSelectedDate(day.dateKey)}
                  disabled={day.dateKey > todayKey}
                  className={day.dateKey === selectedDate ? "is-selected" : ""}
                  aria-label={`${day.label}: ${formatMl(day.totalMl)} ml`}
                >
                  <span className="hydration-tracker__bar-track">
                    <motion.i
                      initial={false}
                      animate={{ height: `${Math.max(0, Math.min(100, day.progress))}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.35 }}
                    />
                  </span>
                  <b>{day.label}</b>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <AnimatePresence>
        {modal === "goal" ? (
          <HydrationModal onClose={() => setModal("")}>
            <form onSubmit={saveGoal}>
              <p className="hydration-modal__eyebrow">Meta diaria</p>
              <h2>¿Cuánta agua quieres beber?</h2>
              <p className="hydration-modal__description">
                Ajusta el objetivo a tu rutina y a las indicaciones de tu profesional de salud.
              </p>
              <label className="hydration-modal__field">
                <span>Mililitros</span>
                <input
                  type="number"
                  min="500"
                  max="6000"
                  step="50"
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  autoFocus
                />
              </label>
              {goalError ? (
                <p className="hydration-modal__field-error" role="alert">
                  {goalError}
                </p>
              ) : null}
              <button
                type="submit"
                className="hydration-modal__primary"
                disabled={busyAction === "goal"}
              >
                {busyAction === "goal" ? "Guardando…" : "Guardar meta"}
              </button>
            </form>
          </HydrationModal>
        ) : null}
        {modal === "info" ? (
          <HydrationModal onClose={() => setModal("")}>
            <p className="hydration-modal__eyebrow">Tu reto</p>
            <h2>Constancia, no perfección</h2>
            <p className="hydration-modal__description">
              Suma cada vaso durante el día. La misión se completa automáticamente al alcanzar tu meta.
            </p>
            <button
              type="button"
              className="hydration-modal__primary"
              onClick={() => setModal("")}
            >
              Entendido
            </button>
          </HydrationModal>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
