import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { buildMuscleAnalytics } from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel, toIsoWeek } from "../../utils/trainingMetrics";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import { classifyExerciseLoad } from "../../utils/trainingLoad";
import AnalyticsEChart from "./AnalyticsEChart";
import ExerciseThumbnail from "./ExerciseThumbnail";

const ranges = [8, 12, 24];
const currentWeek = toIsoWeek(new Date().toISOString().slice(0, 10));

const conclusionStyles = {
  improving:
    "border-[#287554]/30 bg-[#287554]/[0.07] dark:border-[#9de2bd]/25 dark:bg-[#9de2bd]/[0.06]",
  declining:
    "border-[#a04742]/30 bg-[#a04742]/[0.07] dark:border-[#f0aaa4]/25 dark:bg-[#f0aaa4]/[0.06]",
  stable: "border-[color:var(--border)] bg-[color:var(--surface-subtle)]",
  insufficient: "border-[color:var(--border)] bg-[color:var(--surface-subtle)]",
};

const formatDelta = (value, digits = 0) => {
  if (!Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
};

const getStatus = (delta) => {
  if (!Number.isFinite(delta)) {
    return {
      label: "Datos insuficientes",
      className: "text-[color:var(--text-muted)]",
    };
  }
  if (delta > 2) {
    return {
      label: "Mejorando",
      className: "text-[#287554] dark:text-[#9de2bd]",
    };
  }
  if (delta < -2) {
    return {
      label: "Bajando",
      className: "text-[#a04742] dark:text-[#f0aaa4]",
    };
  }
  return {
    label: "Estable",
    className: "text-[color:var(--text-muted)]",
  };
};

const MuscleGroupAnalytics = ({ muscle, exercises = [], workouts = [] }) => {
  const [range, setRange] = useState(12);
  const muscleExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          (exercise.muscle || exercise.muscleGroup || "Sin grupo") === muscle,
      ),
    [exercises, muscle],
  );
  const exerciseById = useMemo(
    () => new Map(muscleExercises.map((exercise) => [exercise.id, exercise])),
    [muscleExercises],
  );
  const exerciseProfiles = useMemo(
    () =>
      new Map(
        muscleExercises.map((exercise) => [
          exercise.id,
          {
            loadType: classifyExerciseLoad(exercise),
            weightBasis: exercise.weightBasis || "",
          },
        ]),
      ),
    [muscleExercises],
  );
  const analytics = useMemo(
    () =>
      buildMuscleAnalytics({
        workouts,
        exerciseIds: muscleExercises.map((exercise) => exercise.id),
        rangeWeeks: range,
        exerciseProfiles,
        endWeek: currentWeek,
      }),
    [exerciseProfiles, muscleExercises, range, workouts],
  );
  const status = getStatus(analytics.delta);
  const chartValues = analytics.points
    .map((point) => point.index)
    .filter(Number.isFinite);
  const chartMin = chartValues.length
    ? Math.floor(Math.min(96, ...chartValues) - 2)
    : 94;
  const chartMax = chartValues.length
    ? Math.ceil(Math.max(104, ...chartValues) + 2)
    : 106;
  const maxContribution = Math.max(
    2,
    ...analytics.contributions.map((item) => Math.abs(item.change)),
  );
  const comparisonText = analytics.comparableExercises
    ? `${analytics.improved} mejorando · ${analytics.stable} estables · ${analytics.declined} bajando`
    : "Registra el mismo ejercicio en dos semanas para ver su tendencia.";

  return (
    <section className="exercise-analytics-chart muscle-progress-card overflow-hidden rounded-[22px] bg-[color:var(--card)]">
      <div className="px-4 pb-1 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
              Tendencia del grupo
            </p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
              {muscle}
            </h2>
            <div className="mt-1.5 flex items-end gap-2">
              <strong className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-[color:var(--text)]">
                {formatDelta(analytics.delta)}
              </strong>
              <span
                className={`pb-0.5 text-sm font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-2 text-xs font-normal text-[color:var(--text-muted)]">
              {comparisonText}
            </p>
          </div>
          <label className="shrink-0">
            <span className="sr-only">Rango de semanas</span>
            <select
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
              className="h-10 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-xs font-medium outline-none"
            >
              {ranges.map((item) => (
                <option key={item} value={item}>
                  {item} sem
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <article
        aria-label="Conclusión del progreso"
        className={`mx-4 mt-2 rounded-xl border px-3 py-3 ${
          conclusionStyles[analytics.conclusion.trend]
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Conclusión
            </p>
            <h3 className="mt-1 text-base font-semibold text-[color:var(--text)]">
              {analytics.conclusion.title}
            </h3>
          </div>
        </div>
        <p className="mt-2 text-sm leading-snug text-[color:var(--text)]">
          {analytics.conclusion.summary}
        </p>
      </article>

      <div className="h-[230px] px-1 sm:px-3">
        {analytics.observedPoints >= 2 ? (
          <AnalyticsEChart
            title={`Progreso de ${muscle}`}
            description="Evolución conjunta de los ejercicios comparables del grupo."
            labels={analytics.points.map((point) =>
              formatCompactWeekLabel(point.week),
            )}
            series={[
              {
                name: "Progreso",
                values: analytics.points.map((point) =>
                  point.isGap ? null : Number(point.index.toFixed(1)),
                ),
                area: true,
              },
            ]}
            min={chartMin}
            max={chartMax}
            baseline={100}
            height={230}
            context={analytics.points.map(
              (point) =>
                `${point.exerciseCount} ${point.exerciseCount === 1 ? "ejercicio medido" : "ejercicios medidos"}`,
            )}
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-xs">
              <p className="text-lg font-medium text-[color:var(--text)]">
                Aún no hay una tendencia
              </p>
              <p className="mt-2 text-sm leading-snug text-[color:var(--text-muted)]">
                Necesitamos dos semanas comparables del mismo ejercicio. En
                ejercicios asistidos debe coincidir el nivel de asistencia.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[color:var(--detail-row-divider)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold tracking-[-0.02em] text-[color:var(--text)]">
              Qué está moviendo el resultado
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Cada barra muestra cuánto cambió un ejercicio del grupo.
            </p>
          </div>
          <span className="text-xs text-[color:var(--text-muted)]">
            {analytics.comparableExercises}{" "}
            {analytics.comparableExercises === 1
              ? "ejercicio comparable"
              : "ejercicios comparables"}
          </span>
        </div>

        <div className="mt-2 divide-y divide-[color:var(--detail-row-divider)]">
          {analytics.contributions.slice(0, 6).map((item) => {
            const exercise = exerciseById.get(item.exerciseId);
            const contributionStatus = getStatus(item.change);
            const width = Math.min(
              50,
              (Math.abs(item.change) / maxContribution) * 50,
            );
            const positive = item.change >= 0;

            return (
              <div
                key={item.exerciseId}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 py-2"
              >
                <ExerciseThumbnail
                  src={
                    exercise
                      ? getExerciseImageUrl(exercise, {
                          width: 100,
                          height: 100,
                        })
                      : ""
                  }
                  alt=""
                  className="exercise-analytics-thumb row-span-2 h-10 w-10 rounded-lg"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--text)]">
                    {exercise?.name || "Ejercicio"}
                  </p>
                  <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                    {item.metricLabel}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${contributionStatus.className}`}
                >
                  {formatDelta(item.change)}
                </p>
                <div className="relative col-span-2 col-start-2 mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--segmented-surface)]">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-[color:var(--text-subtle)]" />
                  <span
                    className={`absolute inset-y-0 rounded-full ${
                      item.change > 2
                        ? "bg-[#287554] dark:bg-[#9de2bd]"
                        : item.change < -2
                          ? "bg-[#a04742] dark:bg-[#f0aaa4]"
                          : "bg-[color:var(--text-muted)]"
                    }`}
                    style={
                      positive
                        ? { left: "50%", width: `${width}%` }
                        : { right: "50%", width: `${width}%` }
                    }
                  />
                </div>
              </div>
            );
          })}
          {!analytics.contributions.length ? (
            <p className="py-5 text-sm text-[color:var(--text-muted)]">
              Todavía no hay ejercicios comparables en este periodo.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

MuscleGroupAnalytics.propTypes = {
  muscle: PropTypes.string.isRequired,
  exercises: PropTypes.arrayOf(PropTypes.object),
  workouts: PropTypes.arrayOf(PropTypes.object),
};

export default MuscleGroupAnalytics;
