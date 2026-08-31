import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import ExerciseOneRMChart from "./ExerciseOneRMChart";
import ExerciseVolumeChart from "./ExerciseVolumeChart";
import ExerciseIntensityChart from "./ExerciseIntensityChart";
import { buildExerciseAnalyticsPoints } from "../../utils/exerciseAnalyticsData";

const tabs = [
  { key: "fuerza", label: "Fuerza" },
  { key: "volumen", label: "Carga" },
  { key: "intensidad", label: "Intensidad" },
];

const ranges = [4, 8, 12, 24];

const formatNumber = (value) =>
  Math.round(Number(value) || 0).toLocaleString("es-BO");

const formatWeight = (value) =>
  (Number(value) || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 2,
  });

const ExerciseAnalytics = ({
  exerciseId = "",
  workouts = [],
  mode = "dark",
}) => {
  const [tab, setTab] = useState("fuerza");
  const [range, setRange] = useState(12);
  const [groupBy, setGroupBy] = useState("week");
  const chartReading = useMemo(() => {
    const points = buildExerciseAnalyticsPoints({
      workouts,
      exerciseId,
      groupBy,
    }).slice(-range);

    const dataKey = {
      fuerza: "strength",
      volumen: "volume",
      intensidad: "intensityAverage",
    }[tab];
    const selectedValues = points
      .map((value) => value[dataKey])
      .filter(Boolean);
    const currentPoint = points.at(-1) || null;
    const current = selectedValues.at(-1) || 0;
    const previous = selectedValues.at(-2) || 0;
    const best = selectedValues.length ? Math.max(...selectedValues) : 0;
    const change = previous ? ((current - previous) / previous) * 100 : null;
    const formatValue = (value) => {
      if (!value) return "--";
      if (tab === "fuerza") return `${formatNumber(value)} kg`;
      if (tab === "volumen") return `${formatNumber(value)} kg`;
      return `${formatNumber(value)}%`;
    };

    const currentDetail = (() => {
      if (!currentPoint) return "Sin registros en este periodo";
      if (tab === "fuerza") {
        return currentPoint.topSet
          ? `Serie base: ${formatWeight(currentPoint.topSet.weight)} kg × ${currentPoint.topSet.reps}`
          : "Sin serie válida";
      }
      if (tab === "volumen") {
        return `${currentPoint.setsCount} ${currentPoint.setsCount === 1 ? "serie" : "series"} · ${currentPoint.reps} repeticiones`;
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
          : tab === "fuerza"
            ? "La línea oscura muestra tu fuerza estimada y la gris la tendencia."
            : tab === "volumen"
              ? "Suma el peso levantado en todas las repeticiones del periodo."
              : "Compara el peso usado con tu mejor fuerza estimada.",
      currentDetail,
      comparisonLabel:
        groupBy === "week" ? "Semana anterior" : "Sesión anterior",
    };
  }, [exerciseId, groupBy, range, tab, workouts]);

  return (
    <section className="exercise-analytics-chart overflow-hidden rounded-2xl bg-[color:var(--card)]">
      <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <h2 className="text-xl font-medium leading-none tracking-[-0.025em]">
            {tab === "fuerza"
              ? "Fuerza estimada"
              : tab === "volumen"
                ? "Carga acumulada"
                : "Intensidad relativa"}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Agrupación</span>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
              className="theme-accent-focus h-10 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-medium outline-none"
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
              className="theme-accent-focus h-10 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-medium outline-none"
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

      <div className="mx-4 grid grid-cols-3 rounded-xl bg-[color:var(--segmented-surface)] p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`h-9 rounded-lg text-xs font-medium ${
              tab === item.key
                ? "theme-accent-solid"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="px-1 pb-2 pt-3 sm:px-3">
        {tab === "fuerza" ? (
          <ExerciseOneRMChart
            workouts={workouts}
            exerciseId={exerciseId}
            rangeWeeks={range}
            mode={mode}
            groupBy={groupBy}
          />
        ) : null}
        {tab === "volumen" ? (
          <ExerciseVolumeChart
            workouts={workouts}
            exerciseId={exerciseId}
            rangeWeeks={range}
            mode={mode}
            groupBy={groupBy}
          />
        ) : null}
        {tab === "intensidad" ? (
          <ExerciseIntensityChart
            workouts={workouts}
            exerciseId={exerciseId}
            rangeWeeks={range}
            mode={mode}
            groupBy={groupBy}
          />
        ) : null}
      </div>

      <section className="analytics-chart-reading border-t border-[color:var(--border)] px-4 py-4">
        {chartReading.description ? (
          <p className="text-sm font-normal leading-snug text-[color:var(--text-muted)]">
            {chartReading.description}
          </p>
        ) : null}
        <p className="mt-1.5 text-xs font-medium text-[color:var(--text)]">
          {chartReading.currentDetail}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <dt>Actual</dt>
            <dd>{chartReading.current}</dd>
          </div>
          <div>
            <dt>Mejor del rango</dt>
            <dd>{chartReading.best}</dd>
          </div>
          <div>
            <dt>{chartReading.comparisonLabel}</dt>
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
  mode: PropTypes.oneOf(["light", "dark"]),
};

export default ExerciseAnalytics;
