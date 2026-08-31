import PropTypes from "prop-types";
import { ResponsiveLine } from "@nivo/line";
import {
  buildExerciseAnalyticsPoints,
  withMovingAverage,
} from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel } from "../../utils/trainingMetrics";
import { nivoTheme } from "../../utils/nivoTheme";
import ChartSampleState from "./ChartSampleState";

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
}) => {
  const full = buildExerciseAnalyticsPoints({
    workouts,
    exerciseId,
    groupBy,
  });
  const trimmed = withMovingAverage(full, "strength", rangeWeeks);

  const series = [
    {
      id: "Fuerza estimada",
      data: trimmed.map((point) => ({
        x: point.key,
        y: Number(point.strength.toFixed(1)),
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
  mode = "dark",
  groupBy = "week",
}) => {
  const { series, points } = buildData({
    workouts,
    exerciseId,
    rangeWeeks,
    groupBy,
  });

  const hasData = points.length >= 1;
  const labelByKey = new Map(points.map((point) => [point.key, point.label]));

  return (
    <div className="space-y-3">
      <div className="h-64 sm:h-72">
        {points.length === 1 ? (
          <ChartSampleState
            value={`${points[0].strength.toFixed(1)} kg`}
            detail={
              points[0].topSet
                ? `${points[0].topSet.weight} kg x ${points[0].topSet.reps}`
                : ""
            }
          />
        ) : hasData ? (
          <ResponsiveLine
            data={series}
            theme={nivoTheme(mode)}
            margin={{ top: 16, right: 12, bottom: 38, left: 46 }}
            xScale={{ type: "point" }}
            yScale={{
              type: "linear",
              stacked: false,
              min: "auto",
              max: "auto",
            }}
            axisBottom={{
              tickPadding: 8,
              tickRotation: -25,
              format: (value) => {
                const label = labelByKey.get(value) || value;
                return groupBy === "week"
                  ? formatCompactWeekLabel(label)
                  : formatSessionLabel(label);
              },
            }}
            axisLeft={{
              legend: "Fuerza (kg)",
              legendOffset: -40,
              legendPosition: "middle",
              tickPadding: 6,
            }}
            colors={
              mode === "dark" ? ["#e2ff00", "#8e8e93"] : ["#352018", "#8e8e93"]
            }
            enablePoints
            pointSize={6}
            curve="monotoneX"
            enableGridX={false}
            useMesh
            tooltip={({ point }) => {
              const { data: d } = point;
              return (
                <div className="rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{point.serieId}</p>
                  <p className="text-[color:var(--text-muted)]">
                    {groupBy === "week"
                      ? formatCompactWeekLabel(d.label)
                      : formatSessionLabel(d.label)}
                  </p>
                  <p>Fuerza: {d.y ? `${Number(d.y).toFixed(1)} kg` : "—"}</p>
                  {d.topSet && (
                    <p className="text-[color:var(--text-muted)]">
                      Top set: {d.topSet.weight} kg x {d.topSet.reps}
                    </p>
                  )}
                </div>
              );
            }}
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
  mode: PropTypes.oneOf(["light", "dark"]),
  groupBy: PropTypes.oneOf(["week", "session"]),
};

export default ExerciseOneRMChart;
