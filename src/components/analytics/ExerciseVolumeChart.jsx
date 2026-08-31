import { useMemo } from "react";
import PropTypes from "prop-types";
import { ResponsiveBar } from "@nivo/bar";
import { buildExerciseAnalyticsPoints } from "../../utils/exerciseAnalyticsData";
import { formatCompactWeekLabel } from "../../utils/trainingMetrics";
import { nivoTheme } from "../../utils/nivoTheme";

const EmptyState = () => (
  <div className="grid h-full place-items-center border border-dashed border-[color:var(--border)] p-4 text-center">
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
  const bars = points.map((point) => ({
    period: point.key,
    label: point.label,
    volume: Math.round(point.volume),
    sets: point.setsCount,
    reps: point.reps,
  }));
  const labelByKey = new Map(points.map((point) => [point.key, point.label]));

  return (
    <div className="h-64 sm:h-72">
      {points.length ? (
        <ResponsiveBar
          data={bars}
          theme={nivoTheme(mode)}
          keys={["volume"]}
          indexBy="period"
          margin={{ top: 16, right: 12, bottom: 38, left: 52 }}
          padding={0.35}
          colors={mode === "dark" ? ["#e2ff00"] : ["#352018"]}
          axisBottom={{
            tickRotation: -25,
            tickPadding: 8,
            format: (value) => {
              const label = labelByKey.get(value) || value;
              return groupBy === "week"
                ? formatCompactWeekLabel(label)
                : formatSessionLabel(label);
            },
          }}
          axisLeft={{
            legend: "Carga total (kg)",
            legendPosition: "middle",
            legendOffset: -48,
            tickPadding: 6,
          }}
          enableGridY
          enableLabel={false}
          tooltip={({ data }) => (
            <div className="rounded border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
              <p className="font-semibold">
                {groupBy === "week"
                  ? formatCompactWeekLabel(data.label)
                  : formatSessionLabel(data.label)}
              </p>
              <p>{Number(data.volume).toLocaleString("es-BO")} kg totales</p>
              <p className="text-[color:var(--text-muted)]">
                {data.sets} series · {data.reps} repeticiones
              </p>
            </div>
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
  mode: PropTypes.oneOf(["light", "dark"]),
  groupBy: PropTypes.oneOf(["week", "session"]),
};

export default ExerciseVolumeChart;
