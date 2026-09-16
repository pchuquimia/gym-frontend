import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ResponsiveLine } from "@nivo/line";
import { buildMuscleAnalytics } from "../../utils/exerciseAnalyticsData";
import {
  formatCompactWeekLabel,
  toIsoWeek,
} from "../../utils/trainingMetrics";
import { getExerciseImageUrl } from "../../utils/cloudinary";
import { nivoTheme } from "../../utils/nivoTheme";
import { classifyExerciseLoad } from "../../utils/trainingLoad";
import ExerciseThumbnail from "./ExerciseThumbnail";

const ranges = [8, 12, 24];
const currentWeek = toIsoWeek(new Date().toISOString().slice(0, 10));

const conclusionStyles = {
  improving:
    "border-[#287554]/30 bg-[#287554]/[0.07] dark:border-[#9de2bd]/25 dark:bg-[#9de2bd]/[0.06]",
  declining:
    "border-[#a04742]/30 bg-[#a04742]/[0.07] dark:border-[#f0aaa4]/25 dark:bg-[#f0aaa4]/[0.06]",
  stable: "border-[color:var(--border)] bg-[color:var(--surface-subtle)]",
  insufficient:
    "border-[color:var(--border)] bg-[color:var(--surface-subtle)]",
};

const confidenceStyles = {
  high: "text-[#287554] dark:text-[#9de2bd]",
  medium: "text-[color:var(--text)]",
  low: "text-[#9a681c] dark:text-[#e7bc75]",
  insufficient: "text-[color:var(--text-muted)]",
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

const MuscleGroupAnalytics = ({
  muscle,
  exercises = [],
  workouts = [],
  mode = "dark",
}) => {
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
    ? `${analytics.improved} mejorando · ${analytics.stable} estables · ${analytics.declined} bajando · cambio mediano desde el primer registro al último`
    : "Registra el mismo ejercicio en dos semanas comparables.";
  const methodParts = [
    analytics.metricCounts.strength
      ? `${analytics.metricCounts.strength} por fuerza`
      : "",
    analytics.metricCounts.repetitions
      ? `${analytics.metricCounts.repetitions} por repeticiones`
      : "",
    analytics.metricCounts.assistedRepetitions
      ? `${analytics.metricCounts.assistedRepetitions} asistidos comparables`
      : "",
  ].filter(Boolean);

  return (
    <section className="exercise-analytics-chart muscle-progress-card overflow-hidden rounded-3xl bg-[color:var(--card)]">
      <div className="px-4 pb-2 pt-5 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Progreso de {muscle}
            </p>
            <div className="mt-2 flex items-end gap-2">
              <strong className="text-[38px] font-medium leading-none tracking-[-0.045em] text-[color:var(--text)]">
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
              className="h-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-medium outline-none"
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
        className={`mx-4 mt-2 rounded-2xl border px-4 py-3 sm:mx-5 ${
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
          <span
            className={`shrink-0 text-xs font-semibold ${
              confidenceStyles[analytics.conclusion.confidence]
            }`}
          >
            {analytics.conclusion.confidenceLabel}
          </span>
        </div>
        <p className="mt-2 text-sm leading-snug text-[color:var(--text)]">
          {analytics.conclusion.summary}
        </p>
        <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">
          Evidencia: {analytics.conclusion.evidence}.
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          {analytics.conclusion.limitation}
        </p>
      </article>

      <div className="h-[270px] px-1 sm:h-[310px] sm:px-3">
        {analytics.observedPoints >= 2 ? (
          <ResponsiveLine
            data={[
              {
                id: "Progreso del grupo",
                data: analytics.points.map((point) => ({
                  x: point.week,
                  y: point.isGap ? null : Number(point.index.toFixed(1)),
                  exercises: point.exerciseCount,
                })),
              },
            ]}
            theme={nivoTheme(mode)}
            margin={{ top: 22, right: 18, bottom: 42, left: 42 }}
            xScale={{ type: "point" }}
            yScale={{
              type: "linear",
              min: chartMin,
              max: chartMax,
              stacked: false,
            }}
            axisBottom={{
              tickPadding: 10,
              tickRotation: -25,
              format: formatCompactWeekLabel,
            }}
            axisLeft={{
              tickPadding: 7,
              tickValues: 5,
              format: (value) => Math.round(value),
            }}
            markers={[
              {
                axis: "y",
                value: 100,
                lineStyle: {
                  stroke: mode === "dark" ? "#73736a" : "#aaa69d",
                  strokeWidth: 1,
                  strokeDasharray: "5 5",
                },
                legend: "Inicio",
                legendPosition: "top-left",
                textStyle: {
                  fill: mode === "dark" ? "#b8b8a6" : "#77736b",
                  fontSize: 11,
                },
              },
            ]}
            colors={mode === "dark" ? ["#e2ff00"] : ["#181918"]}
            curve="monotoneX"
            lineWidth={3}
            enableArea
            areaOpacity={0.12}
            enableGridX={false}
            pointSize={8}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serieColor" }}
            pointColor={mode === "dark" ? "#151515" : "#fffdf7"}
            useMesh
            animate
            motionConfig="gentle"
            tooltip={({ point }) => (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-xl">
                <p className="font-medium">
                  {formatCompactWeekLabel(point.data.x)}
                </p>
                <p className="mt-1 text-base font-semibold">
                  Índice {Number(point.data.y).toFixed(1)}
                </p>
                <p className="text-[color:var(--text-muted)]">
                  {formatDelta(Number(point.data.y) - 100, 1)} desde el inicio
                </p>
                <p className="text-[color:var(--text-muted)]">
                  {point.data.exercises}{" "}
                  {point.data.exercises === 1
                    ? "ejercicio medido esta semana"
                    : "ejercicios medidos esta semana"}
                </p>
              </div>
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

      <div className="border-t border-[color:var(--detail-row-divider)] px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[color:var(--text)]">
              Qué está moviendo el resultado
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
              100 representa el primer registro comparable de cada ejercicio.
              Cada punto usa solo mediciones de esa semana; no arrastra valores
              anteriores. Los espacios son semanas sin registros.
            </p>
            {methodParts.length ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {methodParts.join(" · ")}. La fuerza usa e1RM; el peso corporal,
                la mejor serie por repeticiones.
              </p>
            ) : null}
            {analytics.assistedPending ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {analytics.assistedPending}{" "}
                {analytics.assistedPending === 1
                  ? "ejercicio asistido necesita"
                  : "ejercicios asistidos necesitan"}{" "}
                dos semanas con el mismo nivel de asistencia.
              </p>
            ) : null}
          </div>
          <span className="text-xs text-[color:var(--text-muted)]">
            {analytics.comparableExercises}{" "}
            {analytics.comparableExercises === 1
              ? "ejercicio comparable"
              : "ejercicios comparables"}
          </span>
        </div>

        <div className="mt-4 divide-y divide-[color:var(--detail-row-divider)]">
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
                className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 py-3"
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
                  className="exercise-analytics-thumb row-span-2 h-11 w-11 rounded-lg"
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
  mode: PropTypes.oneOf(["light", "dark"]),
};

export default MuscleGroupAnalytics;
