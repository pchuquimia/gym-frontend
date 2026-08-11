import { useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Play,
  RotateCcw,
} from "lucide-react";
import Modal from "../shared/Modal";
import OperationLoader from "../system/OperationLoader";

const DAY_SHORT_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

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
  Number(routine?.exerciseCount ?? routine?.exercises?.length ?? 0);

const getRoutineDuration = (routine) =>
  Number(
    routine?.estimatedDuration ??
      routine?.durationMinutes ??
      routine?.duration ??
      0,
  );

function ProgressRing({ value }) {
  const progress = Math.min(100, Math.max(0, Math.round(value || 0)));

  return (
    <div
      className="relative grid h-16 w-16 shrink-0 place-items-center"
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
          className="text-[#ff5722] dark:text-[#d8ff00]"
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
}) {
  const [overrideCandidate, setOverrideCandidate] = useState(null);

  if (loading) {
    return (
      <div className="border border-[color:var(--border)] bg-[color:var(--card)]">
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
      <div className="border border-red-400/40 bg-red-500/10 p-5">
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
      <div className="border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
        <CalendarDays className="mx-auto h-7 w-7 text-[#ff5722] dark:text-[#d8ff00]" />
        <h2 className="mt-4 text-xl font-bold uppercase">
          No hay una planificacion vigente
        </h2>
        <p className="mt-2 text-xs font-semibold text-[color:var(--text-muted)]">
          Activa una planificacion para definir tu siguiente entrenamiento.
        </p>
        <button
          type="button"
          onClick={onOpenPlans}
          className="mt-5 h-11 border border-[#ff5722] px-4 text-xs font-bold uppercase text-[#c52d00] dark:border-[#d8ff00] dark:text-[#d8ff00]"
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

  return (
    <>
    <section className="training-schedule bg-[#f5f5f5] pb-4 text-[#151515] dark:bg-[#050505] dark:text-white md:border md:border-[color:var(--border)] md:p-6">
      <header className="pb-5">
        <p className="text-xs font-bold uppercase text-[#686868] dark:text-[#c8c8aa]">
          Plan vigente
        </p>
        <h2 className="mt-1 text-[2rem] font-bold uppercase leading-none sm:text-4xl">
          {sequential ? "Ciclo de entrenamiento" : "Agenda semanal"}
        </h2>
        <p className="mt-2 text-sm font-semibold text-[#686868] dark:text-[#b8b8a6]">
          {plan.name}
        </p>
      </header>

      <div className="flex items-center gap-4 border border-[#d1d1d1] bg-white p-4 dark:border-[#303030] dark:bg-[#121212]">
        <ProgressRing value={progress} />
        <div className="min-w-0">
          <p className="text-base font-bold uppercase">
            {sequential ? "Progreso del ciclo" : "Objetivo semanal"}
          </p>
          <p className="text-sm font-semibold text-[#5f5f5f] dark:text-[#d0d0b8]">
            {sequential
              ? `Bloque ${currentCycleIndex + 1} de ${schedule.length}`
              : `${completedThisWeek} de ${trainingDays.length} entrenamientos`}
          </p>
        </div>
      </div>

      {!sequential ? (
        <div className="mt-4 flex items-center justify-between border-b border-[#d7d7d7] pb-3 text-xs font-bold dark:border-[#282828]">
          <span>Semana {selectedWeek + 1}</span>
          <span className="text-[#686868] dark:text-[#b8b8a6]">
            {shortDate(weekStart)} - {shortDate(weekEnd)}
          </span>
        </div>
      ) : null}

      <div className="mt-5 space-y-2.5">
        {schedule.map((day, index) => {
          const date = sequential
            ? null
            : getPlanDayDate(plan, selectedWeek, index);
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
          const preparing = preparingRoutineId === String(day.routineId);
          const exerciseCount = getRoutineExerciseCount(routine);
          const duration = getRoutineDuration(routine);
          const title = rest
            ? day.type === "rest"
              ? "Descanso completo"
              : "Recuperacion activa"
            : routine?.name || day.focus || "Entrenamiento";

          return (
            <article
              key={day.slotId || index}
              className={`border bg-white dark:bg-[#121212] ${
                current
                  ? "border-2 border-[#ff5722] p-4 shadow-[0_8px_24px_rgba(255,87,34,0.12)] dark:border-[#d8ff00] dark:bg-[#171b0c] dark:shadow-[0_0_24px_rgba(216,255,0,0.12)]"
                  : completed
                    ? "border-[#c9c9c9] bg-[#e9e9e9] p-4 dark:border-[#292929] dark:bg-[#0b0b0b]"
                    : rest
                      ? "border-dashed border-[#cecece] p-4 dark:border-[#303030]"
                      : "border-[#d6d6d6] p-4 dark:border-[#303030]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`grid h-[68px] w-[62px] shrink-0 place-items-center border text-center ${
                    current
                      ? "border-2 border-[#ff5722] text-[#c52d00] dark:border-[#d8ff00] dark:text-[#d8ff00]"
                      : completed
                        ? "border-[#cfcfcf] bg-[#dfdfdf] text-[#777] dark:border-[#242424] dark:bg-[#101010] dark:text-[#777]"
                        : "border-[#dddddd] text-[#666] dark:border-[#292929] dark:text-[#c8c8aa]"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-bold uppercase leading-none">
                      {sequential ? "Dia" : DAY_SHORT_NAMES[index]}
                    </span>
                    <strong className="mt-1 block text-3xl font-bold leading-none">
                      {sequential ? index + 1 : date?.getUTCDate()}
                    </strong>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {current ? (
                      <span className="bg-[#ff5722] px-2 py-1 text-[10px] font-bold uppercase text-white dark:bg-[#d8ff00] dark:text-black">
                        Actual
                      </span>
                    ) : null}
                    {!rest && plan.goal ? (
                      <span
                        className={`text-xs font-bold uppercase ${
                          completed
                            ? "text-[#777] dark:text-[#777]"
                            : "text-[#c52d00] dark:text-[#d8ff00]"
                        }`}
                      >
                        {plan.goal}
                      </span>
                    ) : null}
                  </div>
                  <h3
                    className={`mt-1 font-bold uppercase leading-none ${
                      current ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                    } ${completed ? "text-[#777] line-through decoration-2 dark:text-[#777]" : ""}`}
                  >
                    {title}
                  </h3>

                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold ${
                      completed
                        ? "text-[#777] dark:text-[#777]"
                        : "text-[#555] dark:text-[#d0d0b8]"
                    }`}
                  >
                    {rest ? (
                      <span className="inline-flex items-center gap-1.5">
                        <BedDouble className="h-4 w-4" />
                        {day.type === "rest"
                          ? "Recuperacion"
                          : "Movilidad ligera"}
                      </span>
                    ) : (
                      <>
                        {duration ? (
                          <span className="inline-flex items-center gap-1 border border-[#dedede] px-2 py-1 dark:border-[#303030]">
                            <Clock3 className="h-3.5 w-3.5" /> {duration} min
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 border border-[#dedede] px-2 py-1 dark:border-[#303030]">
                          <Dumbbell className="h-3.5 w-3.5" /> {exerciseCount}{" "}
                          ejercicios
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {completed ? (
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[#ff5722] bg-[#fff5f2] text-[#ff5722] dark:border-[#d8ff00] dark:bg-[#151900] dark:text-[#d8ff00]"
                    aria-label="Entrenamiento completado"
                  >
                    <Check className="h-5 w-5 stroke-[3]" />
                  </span>
                ) : null}
              </div>

              {current && routine ? (
                <button
                  type="button"
                  onClick={() =>
                    onStart(routine.id || routine._id, day.slotId, {
                      isScheduleOverride: false,
                      scheduledDate: dateValue,
                      dayIndex: index,
                    })
                  }
                  disabled={preparing}
                  className="mt-5 flex h-14 w-full items-center justify-center gap-3 bg-[#ff5722] text-sm font-bold uppercase text-white disabled:opacity-60 dark:bg-[#d8ff00] dark:text-black"
                >
                  {preparing ? (
                    <RotateCcw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                  {preparing
                    ? "Preparando entrenamiento"
                    : "Iniciar entrenamiento"}
                </button>
              ) : null}

              {!current && !completed && !rest && routine ? (
                <button
                  type="button"
                  onClick={() =>
                    setOverrideCandidate({
                      routine,
                      day,
                      index,
                      scheduledDate: dateValue,
                      title,
                    })
                  }
                  className="mt-4 h-11 w-full border border-[#9a9a9a] text-xs font-bold uppercase text-[#444] transition hover:border-[#ff5722] hover:text-[#c52d00] dark:border-[#4a4a4a] dark:text-[#d0d0b8] dark:hover:border-[#d8ff00] dark:hover:text-[#d8ff00]"
                >
                  Elegir este entrenamiento
                </button>
              ) : null}

              {sequential && current && rest ? (
                <button
                  type="button"
                  onClick={onAdvance}
                  disabled={advancing}
                  className="mt-5 h-12 w-full border border-[#ff5722] text-xs font-bold uppercase text-[#c52d00] disabled:opacity-60 dark:border-[#d8ff00] dark:text-[#d8ff00]"
                >
                  {advancing ? "Actualizando..." : "Completar descanso"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
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
                    scheduledDate: candidate.scheduledDate,
                    dayIndex: candidate.index,
                    scheduleMode: plan.scheduleMode,
                  },
                );
              }}
              className="h-11 bg-[#ff5722] px-4 text-xs font-bold uppercase text-white dark:bg-[#d8ff00] dark:text-black"
            >
              Confirmar cambio
            </button>
          </>
        }
      >
        <div className="border-l-4 border-[#ff5722] bg-[#ff5722]/5 p-4 dark:border-[#d8ff00] dark:bg-[#d8ff00]/5">
          <p className="text-sm font-bold text-[color:var(--text)]">
            Esta sesión quedará registrada como una excepción del plan.
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
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
