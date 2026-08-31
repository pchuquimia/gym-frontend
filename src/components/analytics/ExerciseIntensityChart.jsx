import { useMemo } from "react";
import PropTypes from "prop-types";
import { ResponsiveLine } from "@nivo/line";
import { buildExerciseAnalyticsPoints } from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel } from "../../utils/trainingMetrics";
import { nivoTheme } from "../../utils/nivoTheme";
import ChartSampleState from "./ChartSampleState";

const EmptyState = () => (
  <div className="grid h-full place-items-center border border-dashed border-[color:var(--border)] p-4 text-center">
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
  mode = "dark",
  groupBy = "week",
}) => {
  const points = useMemo(
    () =>
      buildExerciseAnalyticsPoints({ workouts, exerciseId, groupBy }).slice(
        -rangeWeeks,
      ),
    [exerciseId, groupBy, rangeWeeks, workouts],
  );
  const labelByKey = new Map(points.map((point) => [point.key, point.label]));
  const series = [
    {
      id: "Intensidad media",
      data: points.map((point) => ({
        x: point.key,
        y: Number(point.intensityAverage.toFixed(1)),
        label: point.label,
      })),
    },
    {
      id: "Intensidad máxima",
      data: points.map((point) => ({
        x: point.key,
        y: Number(point.intensityPeak.toFixed(1)),
        label: point.label,
      })),
    },
  ];

  return (
    <div className="h-64 sm:h-72">
      {points.length === 1 ? (
        <ChartSampleState
          value={`${Math.round(points[0].intensityAverage)}%`}
          detail={`Máximo del periodo: ${Math.round(points[0].intensityPeak)}%`}
        />
      ) : points.length ? (
        <ResponsiveLine
          data={series}
          theme={nivoTheme(mode)}
          margin={{ top: 16, right: 12, bottom: 38, left: 46 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: 100, stacked: false }}
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
            legend: "Intensidad",
            legendOffset: -38,
            legendPosition: "middle",
            tickPadding: 6,
            format: (value) => `${value}%`,
          }}
          colors={
            mode === "dark" ? ["#e2ff00", "#8e8e93"] : ["#352018", "#8e8e93"]
          }
          enablePoints
          pointSize={6}
          curve="monotoneX"
          useMesh
          tooltip={({ point }) => (
            <div className="rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
              <p className="font-semibold">{point.serieId}</p>
              <p className="text-[color:var(--text-muted)]">
                {groupBy === "week"
                  ? formatCompactWeekLabel(point.data.label)
                  : formatSessionLabel(point.data.label)}
              </p>
              <p>{Number(point.data.y).toFixed(1)}% de tu mejor fuerza</p>
            </div>
          )}
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
  mode: PropTypes.oneOf(["light", "dark"]),
  groupBy: PropTypes.oneOf(["week", "session"]),
};

export default ExerciseIntensityChart;
