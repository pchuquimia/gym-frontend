import PropTypes from "prop-types";

const formatDelta = (delta) => {
 if (delta === null || Number.isNaN(delta)) return "—";
 const val = Number(delta).toFixed(1);
 return `${delta >= 0 ? "+" : ""}${val}%`;
};

const getBadgeClassByDelta = (delta) => {
 if (delta === null || Number.isNaN(delta))
  return "bg-[color:var(--bg)] text-[color:var(--text-muted)] border-[color:var(--border)]";
 return delta >= 0
  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30";
};

const ExerciseComparisonCard = ({
 exercise,
 delta = null,
 onViewProgress = null,
 index = 0,
}) => {
 const badgeClass = getBadgeClassByDelta(delta);

 return (
  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
   {/* Header */}
   <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
     <h3 className="text-base font-semibold tracking-tight text-[color:var(--text)] line-clamp-2">
      {exercise.exerciseName}
     </h3>
     <p className="mt-1 text-sm text-[color:var(--text-muted)]">{exercise.muscleGroup}</p>
    </div>

    {/* Delta badge */}
    <span
     className={`
      inline-flex items-center
      rounded-full
      px-3 py-1
      text-sm font-semibold
      border
      ${badgeClass}
     `}
    >
     {formatDelta(delta)}
    </span>
   </div>

   {/* Panel HOY */}
   <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
    {/* HOY label */}
    <div className="flex items-center gap-2">
     <span className="h-2 w-2 rounded-full bg-blue-600" />
     <span className="text-xs font-semibold tracking-wide text-[color:var(--text)] uppercase">
      Hoy
     </span>
    </div>

    {/* Top row */}
    <div className="mt-3 grid grid-cols-2 gap-4">
     <div>
      <p className="text-xs text-[color:var(--text-muted)]">Top set</p>
      <p className="mt-1 text-xl font-black text-[color:var(--text)]">
       {exercise.topSet?.weightKg || 0} kg x {exercise.topSet?.reps || 0}
      </p>
     </div>

     <div className="text-right">
      <p className="text-xs text-[color:var(--text-muted)]">1RM Estimado</p>
      <p className="mt-1 text-xl font-black text-[color:var(--text)]">
       {exercise.oneRMTop ? exercise.oneRMTop.toFixed(1) : "—"} kg
      </p>
     </div>
    </div>

    <div className="my-4 h-px bg-[color:var(--border)]" />

    {/* Bottom row */}
    <div className="grid grid-cols-2 gap-4">
     <div>
      <p className="text-xs font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
       Volumen
      </p>
      <p className="mt-1 text-lg font-bold text-[color:var(--text)]">
       {Math.round(exercise.volume || 0)}{" "}
       <span className="font-normal text-[color:var(--text)]">kg·reps</span>
      </p>
     </div>

     <div>
      <p className="text-xs font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
       Sets / Reps
      </p>
      <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
       {exercise.setsCount || 0} sets{" "}
       <span className="font-medium text-[color:var(--text)]">·</span>{" "}
       {exercise.repsTotal || 0} reps
      </p>
     </div>
    </div>
   </div>

   {/* Footer button */}
   <button
    type="button"
    onClick={() => onViewProgress?.(exercise.exerciseId, index)}
    className="
     mt-4 w-full rounded-2xl
     border border-[color:var(--border)]
     bg-[color:var(--card)]
     px-4 py-3
     text-sm font-semibold text-blue-700 dark:text-blue-300
     hover:bg-blue-50 dark:hover:bg-blue-500/10
     active:bg-blue-100
     transition
     focus:outline-none focus:ring-2 focus:ring-blue-500/25
    "
   >
    Ver progreso detallado
   </button>
  </div>
 );
};

ExerciseComparisonCard.propTypes = {
 exercise: PropTypes.object.isRequired,
 delta: PropTypes.number,
 onViewProgress: PropTypes.func,
 index: PropTypes.number,
};

export default ExerciseComparisonCard;
