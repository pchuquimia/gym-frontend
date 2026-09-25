import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import ExerciseOneRMChart from "./ExerciseOneRMChart";
import ExerciseVolumeChart from "./ExerciseVolumeChart";
import ExerciseIntensityChart from "./ExerciseIntensityChart";
import {
  buildExerciseConclusion,
  buildExerciseAnalyticsPoints,
  selectExerciseAnalyticsRange,
} from "../../utils/exerciseAnalyticsData";
import { toIsoWeek } from "../../utils/trainingMetrics";

const strengthTabs = [
  { key: "fuerza", label: "Fuerza" },
  { key: "volumen", label: "Carga" },
  { key: "intensidad", label: "Carga relativa" },
];

const ranges = [4, 8, 12, 24];
const currentWeek = toIsoWeek(new Date().toISOString().slice(0, 10));

const formatNumber = (value) =>
  Math.round(Number(value) || 0).toLocaleString("es-BO");

const formatWeight = (value) =>
  (Number(value) || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 2,
  });

const ExerciseAnalytics = ({
  exerciseId = "",
  workouts = [],
  loadType = "unknown",
}) => {
  const [tab, setTab] = useState("fuerza");
  const [range, setRange] = useState(12);
  const [groupBy, setGroupBy] = useState("week");
  const [volumeMode, setVolumeMode] = useState("total");
  const usesRepetitions = ["bodyweight", "assisted", "cardio"].includes(
    loadType,
  );
  const tabs = usesRepetitions
    ? [{ key: "volumen", label: "Trabajo" }]
    : strengthTabs;
  const activeTab = usesRepetitions ? "volumen" : tab;

  const chartReading = useMemo(() => {
    const rangePoints = selectExerciseAnalyticsRange(
      buildExerciseAnalyticsPoints({ workouts, exerciseId, groupBy }),
      groupBy,
      range,
      currentWeek,
    );
    const points = rangePoints.filter((point) => !point.isGap);

    const dataKey =
      activeTab === "volumen"
        ? usesRepetitions
          ? volumeMode === "perSession" && groupBy === "week"
            ? "repsPerSession"
            : "reps"
          : volumeMode === "perSession" && groupBy === "week"
            ? "volumePerSession"
            : "volume"
        : { fuerza: "strength", intensidad: "intensityAverage" }[activeTab];
    const selectedValues = points
      .map((value) => value[dataKey])
      .filter((value) => Number.isFinite(value) && value > 0);
    const currentPoint = points.at(-1) || null;
    const current = selectedValues.at(-1) || 0;
    const previous = selectedValues.at(-2) || 0;
    const best = selectedValues.length ? Math.max(...selectedValues) : 0;
    const change = previous ? ((current - previous) / previous) * 100 : null;
    const conclusion = buildExerciseConclusion({
      points: rangePoints,
      metric: dataKey,
      metricType:
        activeTab === "fuerza"
          ? "strength"
          : activeTab === "intensidad"
            ? "intensity"
            : "workload",
      groupBy,
    });
    const formatValue = (value) => {
      if (!value) return "--";
      if (activeTab === "fuerza") return `${formatNumber(value)} kg`;
      if (activeTab === "volumen") {
        return usesRepetitions
          ? `${formatNumber(value)} reps`
          : `${formatNumber(value)} kg`;
      }
      return `${formatNumber(value)}%`;
    };

    const currentDetail = (() => {
      if (!currentPoint) return "Sin registros en este periodo";
      if (activeTab === "fuerza") {
        return currentPoint.topSet
          ? `Serie base: ${formatWeight(currentPoint.topSet.weight)} kg × ${currentPoint.topSet.reps}`
          : "Sin serie válida";
      }
      if (activeTab === "volumen") {
        const sessionDetail =
          groupBy === "week"
            ? `${currentPoint.sessionCount} ${currentPoint.sessionCount === 1 ? "sesión" : "sesiones"} · `
            : "";
        const averageDetail =
          volumeMode === "perSession" && groupBy === "week"
            ? "Promedio por sesión · "
            : "";
        return `${averageDetail}${sessionDetail}${currentPoint.setsCount} ${currentPoint.setsCount === 1 ? "serie" : "series"} · ${currentPoint.reps} repeticiones`;
      }
      return `Máximo del periodo: ${formatNumber(currentPoint.intensityPeak)}%`;
    })();

    return {
      current: formatValue(current),
      best: formatValue(best),
      change:
        change === null
          ? "--"
          : `${change > 0 ? "+" : ""}${Math.round(change)}%`,
      description:
        selectedValues.length < 2
          ? ""
          : activeTab === "fuerza"
            ? "La línea principal muestra el 1RM estimado y la gris el promedio móvil de 3 registros."
            : activeTab === "volumen"
              ? usesRepetitions
                ? "El trabajo se expresa en repeticiones completadas; el peso corporal o la asistencia no se suman como si fueran kilos externos."
                : volumeMode === "perSession" && groupBy === "week"
                  ? "Promedio de volumen por sesión: permite comparar semanas con distinta frecuencia."
                  : "Volumen total de las series completadas: aumenta tanto por el peso como por las repeticiones, series y sesiones."
              : "Carga media de las series completadas como porcentaje de tu mejor 1RM estimado histórico.",
      currentDetail,
      conclusion,
      comparisonLabel:
        groupBy === "week" ? "Registro semanal anterior" : "Sesión anterior",
    };
  }, [
    exerciseId,
    groupBy,
    range,
    activeTab,
    usesRepetitions,
    volumeMode,
    workouts,
  ]);

  return (
    <section className="exercise-analytics-chart overflow-hidden rounded-[22px] bg-[color:var(--card)]">
      <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            Evolución
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-none tracking-[-0.03em]">
            {activeTab === "fuerza"
              ? "Fuerza estimada"
              : activeTab === "volumen"
                ? usesRepetitions
                  ? "Trabajo completado"
                  : volumeMode === "perSession" && groupBy === "week"
                    ? "Volumen medio por sesión"
                    : "Volumen acumulado"
                : "Carga relativa al e1RM"}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Agrupación</span>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
              className="theme-accent-focus h-10 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-xs font-medium outline-none"
            >
              <option value="week">Por semana</option>
              <option value="session">Por sesión</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Rango</span>
            <select
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
              className="theme-accent-focus h-10 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-xs font-medium outline-none"
            >
              {ranges.map((item) => (
                <option key={item} value={item}>
                  {item} {groupBy === "week" ? "sem" : "ses"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        className={`mx-4 grid rounded-full bg-[color:var(--segmented-surface)] p-1 sm:mx-6 ${
          tabs.length === 1 ? "grid-cols-1" : "grid-cols-3"
        }`}
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={activeTab === item.key}
            className={`h-9 rounded-full text-xs font-medium ${
              activeTab === item.key
                ? "theme-accent-solid"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "volumen" && groupBy === "week" ? (
        <div className="mx-4 mt-3 grid grid-cols-2 rounded-full border border-[color:var(--border)] p-1 sm:mx-6">
          {[
            ["total", "Total semanal"],
            ["perSession", "Promedio/sesión"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setVolumeMode(value)}
              aria-pressed={volumeMode === value}
              className={`h-8 rounded-full text-xs font-medium ${
                volumeMode === value
                  ? "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="px-1 pb-2 pt-3 sm:px-4">
        {activeTab === "fuerza" ? (
          <ExerciseOneRMChart
            workouts={workouts}
            exerciseId={exerciseId}
            rangeWeeks={range}
            groupBy={groupBy}
            endWeek={currentWeek}
          />
        ) : null}
        {activeTab === "volumen" ? (
          <ExerciseVolumeChart
            workouts={workouts}
            exerciseId={exerciseId}
            rangeWeeks={range}
            groupBy={groupBy}
            endWeek={currentWeek}
            loadType={loadType}
            valueMode={volumeMode}
          />
        ) : null}
        {activeTab === "intensidad" ? (
          <ExerciseIntensityChart
            workouts={workouts}
            exerciseId={exerciseId}
            rangeWeeks={range}
            groupBy={groupBy}
            endWeek={currentWeek}
          />
        ) : null}
      </div>

      <section className="analytics-chart-reading border-t border-[color:var(--border)] px-4 py-4">
        <article className="rounded-xl bg-[color:var(--surface-subtle)] px-3 py-3 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
              Lectura rápida
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[color:var(--text)]">
              {chartReading.conclusion.title}
            </p>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[color:var(--text-muted)]">
              {chartReading.conclusion.summary}
            </p>
          </div>
          <p className="mt-3 shrink-0 text-xs font-medium text-[color:var(--text-muted)] sm:mt-0 sm:max-w-[220px] sm:text-right">
            {chartReading.currentDetail}
          </p>
        </article>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <dt>Ahora</dt>
            <dd>{chartReading.current}</dd>
          </div>
          <div>
            <dt>Mejor</dt>
            <dd>{chartReading.best}</dd>
          </div>
          <div>
            <dt>Cambio</dt>
            <dd>{chartReading.change}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
};

ExerciseAnalytics.propTypes = {
  exerciseId: PropTypes.string,
  workouts: PropTypes.arrayOf(PropTypes.object),
  loadType: PropTypes.oneOf([
    "external",
    "machine",
    "bodyweight",
    "assisted",
    "cardio",
    "unknown",
  ]),
};

export default ExerciseAnalytics;
