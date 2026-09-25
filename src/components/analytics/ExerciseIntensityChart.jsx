import { useMemo } from "react";
import PropTypes from "prop-types";
import {
  buildExerciseAnalyticsPoints,
  selectExerciseAnalyticsRange,
} from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel } from "../../utils/trainingMetrics";
import AnalyticsEChart from "./AnalyticsEChart";
import ChartSampleState from "./ChartSampleState";

const EmptyState = () => (
  <div className="grid h-full place-items-center rounded-xl border border-dashed border-[color:var(--border)] p-4 text-center">
    <div>
      <p className="mb-1 text-sm font-semibold text-[color:var(--text)]">
        Sin datos
      </p>
      <p className="text-xs text-[color:var(--text-muted)]">
        Registra peso y repeticiones para calcular la intensidad.
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

const ExerciseIntensityChart = ({
  workouts = [],
  exerciseId,
  rangeWeeks = 12,
  groupBy = "week",
  endWeek = "",
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
  const observedPoints = points.filter((point) => !point.isGap);
  const labels = points.map((point) =>
    groupBy === "week"
      ? formatCompactWeekLabel(point.label)
      : formatSessionLabel(point.label),
  );

  return (
    <div className="h-56">
      {observedPoints.length === 1 ? (
        <ChartSampleState
          value={`${Math.round(observedPoints[0].intensityAverage)}%`}
          detail={`Máximo del periodo: ${Math.round(observedPoints[0].intensityPeak)}%`}
        />
      ) : observedPoints.length ? (
        <AnalyticsEChart
          title="Intensidad relativa"
          description="Porcentaje medio y máximo respecto a tu mejor fuerza."
          labels={labels}
          series={[
            {
              name: "Media",
              values: points.map((point) =>
                point.isGap ? null : Number(point.intensityAverage.toFixed(1)),
              ),
              area: true,
            },
            {
              name: "Máxima",
              values: points.map((point) =>
                point.isGap ? null : Number(point.intensityPeak.toFixed(1)),
              ),
              token: "--text-muted",
              dashed: true,
            },
          ]}
          unit="%"
          max={100}
          height={224}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

ExerciseIntensityChart.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  exerciseId: PropTypes.string.isRequired,
  rangeWeeks: PropTypes.number,
  groupBy: PropTypes.oneOf(["week", "session"]),
  endWeek: PropTypes.string,
};

export default ExerciseIntensityChart;
