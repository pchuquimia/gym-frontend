import { useMemo } from "react";
import PropTypes from "prop-types";
import {
  buildExerciseAnalyticsPoints,
  selectExerciseAnalyticsRange,
} from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel } from "../../utils/trainingMetrics";
import AnalyticsEChart from "./AnalyticsEChart";

const EmptyState = () => (
  <div className="grid h-full place-items-center rounded-xl border border-dashed border-[color:var(--border)] p-4 text-center">
    <div>
      <p className="mb-1 text-sm font-semibold text-[color:var(--text)]">
        Sin datos
      </p>
      <p className="text-xs text-[color:var(--text-muted)]">
        Registra una sesión para ver el trabajo realizado.
      </p>
    </div>
  </div>
);

const formatSessionLabel = (value) => {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit" });
};

const ExerciseVolumeChart = ({
  workouts = [],
  exerciseId,
  rangeWeeks = 12,
  groupBy = "week",
  endWeek = "",
  loadType = "unknown",
  valueMode = "total",
}) => {
  const points = useMemo(
    () =>
      selectExerciseAnalyticsRange(
        buildExerciseAnalyticsPoints({ workouts, exerciseId, groupBy }),
        groupBy,
        rangeWeeks,
        endWeek,
      ),
    [endWeek, exerciseId, groupBy, rangeWeeks, workouts],
  );
  const usesRepetitions = ["bodyweight", "assisted", "cardio"].includes(
    loadType,
  );
  const isAverage = valueMode === "perSession" && groupBy === "week";
  const rows = points.map((point) => {
    const total = usesRepetitions ? point.reps : point.volume;
    const average = usesRepetitions
      ? point.repsPerSession
      : point.volumePerSession;
    return {
      label:
        groupBy === "week"
          ? formatCompactWeekLabel(point.label)
          : formatSessionLabel(point.label),
      work: point.isGap
        ? null
        : Number((isAverage ? average : total).toFixed(1)),
      sessions: point.sessionCount,
      sets: point.setsCount,
      reps: point.reps,
    };
  });

  return (
    <div className="h-56">
      {points.some((point) => !point.isGap) ? (
        <AnalyticsEChart
          title={usesRepetitions ? "Trabajo completado" : "Volumen"}
          description="Trabajo completado en cada periodo."
          labels={rows.map((item) => item.label)}
          series={[
            {
              name: isAverage ? "Promedio" : "Trabajo",
              values: rows.map((item) => item.work),
              type: "bar",
            },
          ]}
          unit={usesRepetitions ? "reps" : "kg"}
          height={224}
          context={rows.map(
            (item) =>
              `${item.sessions || 1} ${item.sessions === 1 ? "sesión" : "sesiones"} · ${item.sets} series · ${item.reps} reps`,
          )}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

ExerciseVolumeChart.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  exerciseId: PropTypes.string.isRequired,
  rangeWeeks: PropTypes.number,
  groupBy: PropTypes.oneOf(["week", "session"]),
  endWeek: PropTypes.string,
  loadType: PropTypes.oneOf([
    "external",
    "machine",
    "bodyweight",
    "assisted",
    "cardio",
    "unknown",
  ]),
  valueMode: PropTypes.oneOf(["total", "perSession"]),
};

export default ExerciseVolumeChart;
