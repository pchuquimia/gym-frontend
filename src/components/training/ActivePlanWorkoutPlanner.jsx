import { useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Check,
  Dumbbell,
  Play,
  RotateCcw,
} from "lucide-react";
import Modal from "../shared/Modal";
import OperationLoader from "../system/OperationLoader";
import {
  estimateRoutineCaloriesFromHistory,
  estimateTrainingCalories,
} from "../../utils/calorieEstimate";
import {
  estimateFullSessionDuration,
  formatSessionDuration,
} from "../../utils/sessionDurationEstimate";
import restDayRecoveryImage from "../../assets/rest-day-recovery.webp";

const DAY_SHORT_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const WORKOUT_HERO_IMAGE = "/images/workout-hero-model.webp";
const ROUTINE_HERO_IMAGES = Object.freeze({
  "lower a": "/images/routine-lower-a.webp",
  upper: "/images/routine-upper.webp",
  "lower b": WORKOUT_HERO_IMAGE,
  push: "/images/routine-push.webp",
  pull: "/images/routine-pull.webp",
});

const getRoutineHeroImage = (routine) => {
  const routineName = String(routine?.name || routine?.raw?.name || "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");

  return ROUTINE_HERO_IMAGES[routineName] || WORKOUT_HERO_IMAGE;
};

const getPlanDayDate = (plan, weekIndex, dayIndex) => {
  const date = new Date(plan.startDate);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + weekIndex * 7 + dayIndex);
  return date;
};

const isoDate = (date) => date.toISOString().slice(0, 10);
const shortDate = (date) =>
  date.toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const getRoutineExerciseCount = (routine) =>
  Number(
    routine?.exerciseCount ??
      routine?.raw?.exercises?.length ??
      routine?.exercises?.length ??
      0,
  );

function ProgressRing({ value }) {
  const progress = Math.min(100, Math.max(0, Math.round(value || 0)));

  return (
    <div
      className="training-schedule__progress-ring relative grid h-16 w-16 shrink-0 place-items-center"
      role="img"
      aria-label={`${progress}% del objetivo completado`}
    >
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle
          cx="22"
          cy="22"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-[#dedede] dark:text-[#252525]"
        />
        <circle
          cx="22"
          cy="22"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeDasharray={`${progress * 1.068} 106.8`}
          className="text-[#352018] dark:text-[#d8ff00]"
        />
      </svg>
      <strong className="absolute text-base font-bold tabular-nums">
        {progress}%
      </strong>
    </div>
  );
}

export default function ActivePlanWorkoutPlanner({
  plan,
  routines,
  trainings,
  loading,
  error,
  selectedWeek,
  currentDate,
  onRetry,
  onOpenPlans,
  onStart,
  onAdvance,
  advancing,
  preparingRoutineId,
  weightKg,
}) {
  const [overrideCandidate, setOverrideCandidate] = useState(null);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(null);

  if (loading) {
    return (
      <div className="training-schedule-state overflow-hidden rounded-3xl bg-[color:var(--card)]">
        <OperationLoader
          active
          delayMs={0}
          mode="inline"
          title="Cargando entrenamiento"
          description="Sincronizando tu plan vigente y las rutinas disponibles."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="training-schedule-state rounded-3xl border border-red-400/40 bg-red-500/10 p-5">
        <p className="text-sm font-bold">No se pudo cargar el entrenamiento.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-11 border border-current px-4 text-xs font-bold uppercase"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="training-schedule-state rounded-3xl bg-[color:var(--card)] p-6 text-center">
        <CalendarDays className="mx-auto h-7 w-7 text-[#352018] dark:text-[#d8ff00]" />
        <h2 className="mt-4 text-xl font-bold uppercase">
          No hay una planificacion vigente
        </h2>
        <p className="mt-2 text-xs font-semibold text-[color:var(--text-muted)]">
          Activa una planificacion para definir tu siguiente entrenamiento.
        </p>
        <button
          type="button"
          onClick={onOpenPlans}
          className="mt-5 h-11 border border-[#352018] px-4 text-xs font-bold uppercase text-[#2a1711] dark:border-[#d8ff00] dark:text-[#d8ff00]"
        >
          Ver planificaciones
        </button>
      </div>
    );
  }

  const sequential = plan.scheduleMode !== "fixed";
  const schedule = plan.weeklySchedule || [];
  const routineById = new Map(
    (routines || []).map((routine) => [
      String(routine.id || routine._id),
      routine,
    ]),
  );
  const currentCycleIndex = Math.min(
    Math.max(0, schedule.length - 1),
    Math.max(0, Number(plan.cycleProgress?.currentIndex || 0)),
  );
  const today = currentDate || new Date().toLocaleDateString("en-CA");
  const weekStart = getPlanDayDate(plan, selectedWeek, 0);
  const weekEnd = getPlanDayDate(plan, selectedWeek, 6);
  const weekTrainings = (trainings || []).filter((training) => {
    const date = String(training.date || "").slice(0, 10);
    return date >= isoDate(weekStart) && date <= isoDate(weekEnd);
  });
  const trainingDays = schedule.filter((day) => day.type === "training");
  const matchesCompletedSlot = (day, index, training) => {
    const plannedDate = isoDate(getPlanDayDate(plan, selectedWeek, index));
    const samePlanSlot =
      training.trainingPlanId &&
      String(training.trainingPlanId) === String(plan._id || plan.id) &&
      String(training.trainingPlanSlotId || "") === String(day.slotId || "");
    return (
      samePlanSlot ||
      (String(training.routineId) === String(day.routineId) &&
        String(training.date).slice(0, 10) === plannedDate)
    );
  };
  const completedThisWeek = sequential
    ? 0
    : schedule.filter((day, index) => {
        if (day.type !== "training" || !day.routineId) return false;
        return weekTrainings.some((training) =>
          matchesCompletedSlot(day, index, training),
        );
      }).length;
  const targetCount = sequential
    ? Math.max(1, schedule.length)
    : Math.max(1, trainingDays.length);
  const completedCount = sequential ? currentCycleIndex : completedThisWeek;
  const progress = (completedCount / targetCount) * 100;
  const planKey = String(plan._id || plan.id || "active-plan");
  const getDayView = (day, index) => {
    const date = sequential ? null : getPlanDayDate(plan, selectedWeek, index);
    const dateValue = date ? isoDate(date) : "";
    const current = sequential
      ? index === currentCycleIndex
      : dateValue === today;
    const routine = day.routineId
      ? routineById.get(String(day.routineId))
      : null;
    const completedTraining = !sequential
      ? weekTrainings.find((training) =>
          matchesCompletedSlot(day, index, training),
        )
      : null;
    const rest = day.type !== "training";
    const completed =
      Boolean(completedTraining) ||
      (sequential && index < currentCycleIndex && !rest);
    const sessionDuration = routine
      ? estimateFullSessionDuration(routine, trainings)
      : null;
    const historicalCalories = routine
      ? estimateRoutineCaloriesFromHistory(routine, trainings, {
          weightKg,
        })
      : null;
    const durationSeconds = sessionDuration?.seconds || 0;
    const plannedCalories = durationSeconds
      ? estimateTrainingCalories({ durationSeconds }, { weightKg }).calories
      : 0;

    return {
      day,
      index,
      date,
      dateValue,
      current,
      routine,
      rest,
      completed,
      preparing: preparingRoutineId === String(day.routineId),
      exerciseCount: getRoutineExerciseCount(routine),
      durationSeconds,
      duration: Math.max(0, Math.round(durationSeconds / 60)),
      durationSource: sessionDuration?.source || "estimate",
      durationSampleSize: sessionDuration?.sampleSize || 0,
      calories: historicalCalories?.calories || plannedCalories,
      calorieSource: historicalCalories ? "history" : "estimate",
      calorieSampleSize: historicalCalories?.sampleSize || 0,
      heroImage: routine ? getRoutineHeroImage(routine) : "",
      title: rest
        ? day.type === "rest"
          ? "Descanso completo"
          : "Recuperación activa"
        : routine?.name || day.focus || "Entrenamiento",
    };
  };
  const dayViews = schedule.map(getDayView);
  const todayIndex = dayViews.findIndex((day) => day.current);
  const defaultSelectedIndex = todayIndex >= 0 ? todayIndex : 0;
  const requestedSelectedIndex =
    selectedScheduleDay?.planKey === planKey
      ? Number(selectedScheduleDay.index)
      : defaultSelectedIndex;
  const selectedIndex = Math.min(
    Math.max(0, requestedSelectedIndex),
    Math.max(0, dayViews.length - 1),
  );
  const selectedDay = dayViews[selectedIndex] || null;
  const selectedDurationLabel = selectedDay?.duration
    ? formatSessionDuration(selectedDay.duration)
    : "";
  const plannedCalories = selectedDay?.calories || 0;
  return (
    <>
      <section className="training-schedule bg-[#f5f5f5] p-4 text-[#151515] dark:bg-[#050505] dark:text-white md:border md:border-[color:var(--border)] md:p-6">
        <header className="training-schedule__summary flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="training-schedule__eyebrow text-xs font-bold uppercase text-[#686868] dark:text-[#c8c8aa]">
              Plan activo
            </p>
            <h2 className="training-schedule__title mt-1 font-condensed text-[2rem] font-bold uppercase leading-none sm:text-4xl">
              {sequential ? "Tu ciclo" : "Esta semana"}
            </h2>
            <p className="training-schedule__plan-name mt-2 truncate text-sm font-semibold text-[#686868] dark:text-[#b8b8a6]">
              {plan.name}
            </p>
          </div>

          <div className="training-schedule__progress flex shrink-0 items-center gap-3 border-l border-[#d1d1d1] pl-3 dark:border-[#303030]">
            <ProgressRing value={progress} />
            <div className="hidden min-w-0 sm:block">
              <p className="text-xs font-bold uppercase text-[#686868] dark:text-[#c8c8aa]">
                {sequential ? "Progreso" : "Esta semana"}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#5f5f5f] dark:text-[#d0d0b8]">
                {sequential
                  ? `${currentCycleIndex + 1} de ${schedule.length}`
                  : `${completedThisWeek} de ${trainingDays.length}`}
              </p>
            </div>
          </div>
        </header>

        <div className="training-schedule__period mt-4 flex items-center justify-between border-y border-[#d7d7d7] py-3 text-xs font-bold dark:border-[#282828]">
          <span>
            {sequential
              ? `${schedule.length} bloques del ciclo`
              : `Semana ${selectedWeek + 1}`}
          </span>
          <span className="text-[#686868] dark:text-[#b8b8a6]">
            {sequential
              ? `${completedCount} completados`
              : `${shortDate(weekStart)} - ${shortDate(weekEnd)}`}
          </span>
        </div>

        {dayViews.length ? (
          <>
            <div className="training-schedule__days-wrap mt-4">
              <div
                className="training-schedule__days grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${dayViews.length}, minmax(0, 1fr))`,
                }}
              >
                {dayViews.map((dayView) => {
                  const selected = dayView.index === selectedIndex;
                  return (
                    <button
                      key={dayView.day.slotId || dayView.index}
                      type="button"
                      onClick={() =>
                        setSelectedScheduleDay({
                          planKey,
                          index: dayView.index,
                        })
                      }
                      aria-pressed={selected}
                      aria-label={`Ver ${
                        sequential
                          ? `día ${dayView.index + 1}`
                          : DAY_SHORT_NAMES[dayView.index]
                      }: ${dayView.title}`}
                      className={`training-schedule__day relative flex h-[62px] min-w-0 flex-col items-center justify-center border text-center transition-colors ${
                        dayView.completed
                          ? "training-schedule__day--completed"
                          : ""
                      } ${
                        selected
                          ? "border-2 border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                          : dayView.completed
                            ? "border-[#c9c9c9] bg-[#e9e9e9] text-[#777] dark:border-[#292929] dark:bg-[#0b0b0b] dark:text-[#777]"
                            : "border-[#d6d6d6] text-[#666] hover:border-[#352018] hover:text-[#2a1711] dark:border-[#303030] dark:text-[#c8c8aa] dark:hover:border-[#d8ff00] dark:hover:text-[#d8ff00]"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">
                        {sequential ? "Día" : DAY_SHORT_NAMES[dayView.index]}
                      </span>
                      <strong className="mt-1 text-xl font-bold leading-none tabular-nums">
                        {sequential
                          ? dayView.index + 1
                          : dayView.date?.getUTCDate()}
                      </strong>
                      {dayView.completed ? (
                        <span
                          className="training-schedule__day-check absolute bottom-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-current"
                          aria-hidden="true"
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span
                          className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                            dayView.current
                              ? "bg-[#352018] dark:bg-[#d8ff00]"
                              : dayView.rest
                                ? "border border-[#8e8e93] dark:border-[#c8c8aa]"
                                : "bg-transparent"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <article
              className={`training-schedule__selection ${selectedDay.routine || selectedDay.rest ? "training-schedule__selection--hero" : ""} ${
                selectedDay.completed
                  ? "training-schedule__selection--completed"
                  : ""
              } mt-3 border p-4 ${
                selectedDay.completed
                  ? "border-[#d6d6d6] bg-[#f1f1f1] text-[#555] dark:border-[#303030] dark:bg-[#101010] dark:text-[#b8b8a6]"
                  : selectedDay.current
                    ? "border-2 border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-[0_8px_24px_rgba(53,32,24,0.18)] dark:shadow-[0_0_24px_rgba(216,255,0,0.14)]"
                    : "border-[#d6d6d6] bg-white dark:border-[#303030] dark:bg-[#121212]"
              }`}
            >
              {selectedDay.routine || selectedDay.rest ? (
                <div
                  className="training-schedule__hero hidden"
                  aria-hidden="true"
                >
                  <div className="training-schedule__hero-fallback">
                    {selectedDay.rest ? (
                      <BedDouble className="h-12 w-12" />
                    ) : (
                      <Dumbbell className="h-12 w-12" />
                    )}
                  </div>
                  <img
                    src={
                      selectedDay.rest
                        ? restDayRecoveryImage
                        : selectedDay.heroImage
                    }
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                  <div className="training-schedule__hero-shade" />
                  <span className="training-schedule__hero-badge">
                    {selectedDay.rest
                      ? selectedDay.current
                        ? "Descanso de hoy"
                        : "Descanso programado"
                      : selectedDay.completed
                        ? "Completada"
                        : selectedDay.current
                          ? "Entrenamiento de hoy"
                          : sequential
                            ? `Día ${selectedDay.index + 1}`
                            : DAY_SHORT_NAMES[selectedDay.index]}
                  </span>
                </div>
              ) : null}

              <div className="flex items-start gap-3.5">
                <div className="training-schedule__selected-date grid h-[68px] w-[62px] shrink-0 place-items-center border border-[#dddddd] bg-white text-center text-[#666] dark:border-[#292929] dark:bg-[#121212] dark:text-[#c8c8aa]">
                  <div>
                    <span className="block text-sm font-bold uppercase leading-none">
                      {sequential ? "Día" : DAY_SHORT_NAMES[selectedDay.index]}
                    </span>
                    <strong className="mt-1 block text-3xl font-bold leading-none tabular-nums">
                      {sequential
                        ? selectedDay.index + 1
                        : selectedDay.date?.getUTCDate()}
                    </strong>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedDay.current ? (
                      <span className="training-schedule__today-badge border border-current bg-transparent px-2 py-1 text-[10px] font-bold uppercase text-current">
                        {sequential ? "Actual" : "Hoy"}
                      </span>
                    ) : null}
                    {!selectedDay.completed &&
                    !selectedDay.rest &&
                    plan.goal ? (
                      <span
                        className={`training-schedule__goal text-xs font-bold uppercase ${
                          selectedDay.current
                            ? "text-current"
                            : "text-[#2a1711] dark:text-[#d8ff00]"
                        }`}
                      >
                        {plan.goal}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="training-schedule__selected-title mt-1.5 font-condensed text-2xl font-bold uppercase leading-none sm:text-3xl">
                    {selectedDay.title}
                  </h3>

                  <div
                    className={`mt-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold ${
                      selectedDay.current
                        ? "text-current/80"
                        : "text-[#555] dark:text-[#d0d0b8]"
                    }`}
                  >
                    {selectedDay.rest ? (
                      <span className="inline-flex items-center gap-1.5">
                        <BedDouble className="h-4 w-4" />
                        {selectedDay.day.type === "rest"
                          ? "Recuperación programada"
                          : "Movilidad ligera"}
                      </span>
                    ) : (
                      <>
                        {selectedDay.duration ? (
                          <>
                            <span
                              className="training-schedule__duration"
                              title={
                                selectedDay.durationSource === "history"
                                  ? `Promedio total de ${selectedDay.durationSampleSize} ${selectedDay.durationSampleSize === 1 ? "sesión" : "sesiones"}, incluidos los descansos`
                                  : "Duración total estimada, incluidos los descansos entre series"
                              }
                              aria-label={
                                selectedDay.durationSource === "history"
                                  ? `${selectedDurationLabel} en promedio por sesión, incluidos los descansos`
                                  : `${selectedDurationLabel} estimados para la sesión completa, incluidos los descansos`
                              }
                            >
                              {selectedDay.durationSource === "history"
                                ? `${selectedDurationLabel} `
                                : `~${selectedDurationLabel} total`}
                            </span>
                            {plannedCalories ? (
                              <>
                                <span
                                  className="training-schedule__metric-divider"
                                  aria-hidden="true"
                                >
                                  |
                                </span>
                                <span
                                  title={
                                    selectedDay.calorieSource === "history"
                                      ? `Promedio del cálculo real del dashboard en las últimas ${selectedDay.calorieSampleSize} ${selectedDay.calorieSampleSize === 1 ? "sesión" : "sesiones"} de esta rutina`
                                      : "Estimación inicial hasta completar esta rutina"
                                  }
                                  aria-label={`${plannedCalories} calorías estimadas, ${
                                    selectedDay.calorieSource === "history"
                                      ? `calculadas con el promedio real de ${selectedDay.calorieSampleSize} ${selectedDay.calorieSampleSize === 1 ? "sesión" : "sesiones"}`
                                      : "calculadas con la duración planificada"
                                  }`}
                                >
                                  {plannedCalories} Cal
                                </span>
                              </>
                            ) : null}
                          </>
                        ) : null}
                        <span className="training-schedule__exercise-count inline-flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {selectedDay.exerciseCount}{" "}
                          {Number(selectedDay.exerciseCount) === 1
                            ? "ejercicio"
                            : "ejercicios"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selectedDay.completed && selectedDay.routine ? (
                <div
                  className="training-schedule__completed-state mt-5 flex h-14 items-center justify-center gap-2.5 border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-5 text-sm font-bold"
                  role="status"
                  aria-label="Rutina completada"
                >
                  <span className="training-schedule__completed-state-icon grid h-7 w-7 place-items-center rounded-full bg-[#352018] text-white dark:bg-[#d8ff00] dark:text-black">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span>Rutina completada</span>
                </div>
              ) : selectedDay.current && selectedDay.routine ? (
                <div className="training-schedule__action-row mt-5 flex">
                  <button
                    type="button"
                    onClick={() =>
                      onStart(
                        selectedDay.routine.id || selectedDay.routine._id,
                        selectedDay.day.slotId,
                        {
                          isScheduleOverride: false,
                          scheduledDate: selectedDay.dateValue,
                          dayIndex: selectedDay.index,
                        },
                      )
                    }
                    disabled={selectedDay.preparing}
                    className="training-schedule__primary-action flex h-14 w-full items-center justify-center gap-3 bg-[#352018] px-5 text-sm font-bold uppercase text-white disabled:opacity-60 dark:bg-[#d8ff00] dark:text-black sm:ml-auto sm:w-auto"
                  >
                    {selectedDay.preparing ? (
                      <RotateCcw className="h-4 w-4 animate-spin" />
                    ) : null}
                    {selectedDay.preparing
                      ? "PREPARANDO ENTRENAMIENTO"
                      : "INICIAR ENTRENAMIENTO"}
                  </button>
                </div>
              ) : null}

              {!selectedDay.current &&
              !selectedDay.completed &&
              !selectedDay.rest &&
              selectedDay.routine ? (
                <button
                  type="button"
                  onClick={() => setOverrideCandidate(selectedDay)}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 border border-[#9a9a9a] px-4 text-xs font-bold uppercase text-[#444] transition-colors hover:border-[#352018] hover:text-[#2a1711] dark:border-[#4a4a4a] dark:text-[#d0d0b8] dark:hover:border-[#d8ff00] dark:hover:text-[#d8ff00] sm:ml-auto sm:w-auto"
                >
                  <Play className="h-4 w-4" />
                  Entrenar esta rutina
                </button>
              ) : null}

              {sequential && selectedDay.current && selectedDay.rest ? (
                <button
                  type="button"
                  onClick={onAdvance}
                  disabled={advancing}
                  className="mt-4 h-12 w-full border border-[#352018] px-4 text-xs font-bold uppercase text-[#2a1711] disabled:opacity-60 dark:border-[#d8ff00] dark:text-[#d8ff00] sm:ml-auto sm:w-auto"
                >
                  {advancing ? "Actualizando..." : "Completar descanso"}
                </button>
              ) : null}

              {!sequential && selectedDay.current && selectedDay.rest ? (
                <p className="mx-4 mt-4 border-t border-[#d7d7d7] pt-3 text-sm leading-6 text-[#686868] dark:border-[#303030] dark:text-[#b8b8a6] sm:mx-5">
                  La recuperación forma parte del plan. Si entrenarás hoy,
                  selecciona otro día de la agenda.
                </p>
              ) : null}
            </article>
          </>
        ) : (
          <div className="mt-4 border border-dashed border-[color:var(--border)] p-5 text-center text-sm text-[color:var(--text-muted)]">
            Este plan todavía no tiene días configurados.
          </div>
        )}
      </section>
      {overrideCandidate ? (
        <Modal
          title="Entrenar otro día del plan"
          subtitle={overrideCandidate.title}
          onClose={() => setOverrideCandidate(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setOverrideCandidate(null)}
                className="h-11 border border-[color:var(--border)] px-4 text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const candidate = overrideCandidate;
                  setOverrideCandidate(null);
                  onStart(
                    candidate.routine.id || candidate.routine._id,
                    candidate.day.slotId,
                    {
                      isScheduleOverride: true,
                      scheduledDate:
                        candidate.scheduledDate || candidate.dateValue,
                      dayIndex: candidate.index,
                      scheduleMode: plan.scheduleMode,
                    },
                  );
                }}
                className="h-11 bg-[#352018] px-4 text-xs font-bold uppercase text-white dark:bg-[#d8ff00] dark:text-black"
              >
                Confirmar cambio
              </button>
            </>
          }
        >
          <div className="border-l-4 border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-[color:var(--accent-contrast)]">
            <p className="text-sm font-bold text-current">
              Esta sesión quedará registrada como una excepción del plan.
            </p>
            <p className="mt-2 text-sm leading-6 text-current/80">
              {sequential
                ? "El ciclo continuará desde el bloque posterior al que elegiste."
                : "La rutina contará para esta semana, aunque se realice en una fecha distinta a la programada."}
            </p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
