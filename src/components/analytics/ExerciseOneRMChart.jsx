import PropTypes from "prop-types";
import {
  buildExerciseAnalyticsPoints,
  selectExerciseAnalyticsRange,
  withMovingAverage,
} from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel } from "../../utils/trainingMetrics";
import ChartSampleState from "./ChartSampleState";
import AnalyticsEChart from "./AnalyticsEChart";

const EmptyState = ({ title, description }) => (
  <div className="grid h-full place-items-center border border-dashed border-[color:var(--border)] p-4 text-center text-sm text-[color:var(--text-muted)]">
    <p className="font-semibold text-[color:var(--text)] mb-1">{title}</p>
    <p className="text-[color:var(--text-muted)] text-xs">{description}</p>
  </div>
);

const buildData = ({
  workouts = [],
  exerciseId,
  rangeWeeks = 12,
  groupBy = "week",
  endWeek = "",
}) => {
  const full = buildExerciseAnalyticsPoints({
    workouts,
    exerciseId,
    groupBy,
  });
  const pointsWithTrend = withMovingAverage(
    full,
    "strength",
    Math.max(full.length, rangeWeeks),
  );
  const trimmed = selectExerciseAnalyticsRange(
    pointsWithTrend,
    groupBy,
    rangeWeeks,
    endWeek,
  );

  const series = [
    {
      id: "Fuerza estimada",
      data: trimmed.map((point) => ({
        x: point.key,
        y: point.isGap ? null : Number(point.strength.toFixed(1)),
        label: point.label,
        topSet: point.topSet,
      })),
    },
    {
      id: "Tendencia",
      data: trimmed.map((point) => ({
        x: point.key,
        y: point.movingAverage,
        label: point.label,
        topSet: point.topSet,
      })),
    },
  ];

  return { series, points: trimmed, full };
};

const formatSessionLabel = (value) => {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit" });
};

const ExerciseOneRMChart = ({
  workouts,
  exerciseId,
  rangeWeeks = 12,
  groupBy = "week",
  endWeek = "",
}) => {
  const { series, points } = buildData({
    workouts,
    exerciseId,
    rangeWeeks,
    groupBy,
    endWeek,
  });

  const observedPoints = points.filter((point) => !point.isGap);
  const hasData = observedPoints.length >= 1;
  const labels = points.map((point) =>
    groupBy === "week"
      ? formatCompactWeekLabel(point.label)
      : formatSessionLabel(point.label),
  );

  return (
    <div className="space-y-3">
      <div className="h-56 sm:h-60">
        {observedPoints.length === 1 ? (
          <ChartSampleState
            value={`${observedPoints[0].strength.toFixed(1)} kg`}
            detail={
              observedPoints[0].topSet
                ? `${observedPoints[0].topSet.weight} kg x ${observedPoints[0].topSet.reps}`
                : ""
            }
          />
        ) : hasData ? (
          <AnalyticsEChart
            title="Fuerza estimada"
            description="Evolución de la fuerza estimada y su tendencia."
            labels={labels}
            series={[
              {
                name: "Fuerza",
                values: series[0].data.map((point) => point.y),
                area: true,
              },
              {
                name: "Tendencia",
                values: series[1].data.map((point) => point.y),
                token: "--text-muted",
                dashed: true,
              },
            ]}
            unit="kg"
            min="dataMin"
            height={224}
            context={points.map((point) =>
              point.topSet
                ? `Mejor serie: ${point.topSet.weight} kg × ${point.topSet.reps}`
                : "",
            )}
          />
        ) : (
          <EmptyState
            title="Sin datos"
            description="Registra al menos 1 sesión para ver la curva."
          />
        )}
      </div>
    </div>
  );
};

ExerciseOneRMChart.propTypes = {
  workouts: PropTypes.arrayOf(PropTypes.object),
  exerciseId: PropTypes.string.isRequired,
  rangeWeeks: PropTypes.number,
  groupBy: PropTypes.oneOf(["week", "session"]),
  endWeek: PropTypes.string,
};

export default ExerciseOneRMChart;
