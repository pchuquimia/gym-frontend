import { useState } from "react";
import PropTypes from "prop-types";
import ExerciseOneRMChart from "./ExerciseOneRMChart";
import ExerciseVolumeChart from "./ExerciseVolumeChart";
import ExerciseIntensityChart from "./ExerciseIntensityChart";

const tabs = [
  { key: "fuerza", label: "Fuerza" },
  { key: "volumen", label: "Volumen" },
  { key: "intensidad", label: "Intensidad" },
];

const ranges = [4, 8, 12, 24];

const ExerciseAnalytics = ({
  exerciseId = "",
  workouts = [],
  mode = "dark",
  summary = {},
}) => {
  const [tab, setTab] = useState("fuerza");
  const [range, setRange] = useState(12);
  const [groupBy, setGroupBy] = useState("week");

  return (
    <section className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm dark:rounded-[4px] dark:shadow-none">
      <div className="grid gap-3 border-b border-[color:var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-4">
        <div>
          <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
            Evolucion historica
          </p>
          <h2 className="mt-1 text-xl font-black uppercase leading-none">
            {tab === "fuerza"
              ? "1RM estimado"
              : tab === "volumen"
                ? "Carga acumulada"
                : "Intensidad relativa"}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Agrupacion</span>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
              className="theme-accent-focus h-9 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-[11px] font-black uppercase outline-none"
            >
              <option value="week">Por semana</option>
              <option value="session">Por sesion</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Rango</span>
            <select
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
              className="theme-accent-focus h-9 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-[11px] font-black uppercase outline-none"
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

      <div className="grid grid-cols-3 border-b border-[color:var(--border)] bg-[color:var(--bg)] p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`h-9 text-[11px] font-black uppercase ${
              tab === item.key
                ? "theme-accent-solid"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="px-1 py-2 sm:px-3">
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

      <div className="grid grid-cols-2 border-t border-[color:var(--border)]">
        <div className="p-3 sm:p-4">
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Mejor 1RM
          </p>
          <p className="mt-1 text-lg font-black">{summary.pr || "--"}</p>
        </div>
        <div className="border-l border-[color:var(--border)] p-3 sm:p-4">
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Vs sesion anterior
          </p>
          <p className="mt-1 text-lg font-black text-[#ff5722] dark:text-[#e2ff00]">
            {summary.vsPrevious || "--"}
          </p>
        </div>
      </div>
    </section>
  );
};

ExerciseAnalytics.propTypes = {
  exerciseId: PropTypes.string,
  workouts: PropTypes.arrayOf(PropTypes.object),
  mode: PropTypes.oneOf(["light", "dark"]),
  summary: PropTypes.shape({
    pr: PropTypes.string,
    vsPrevious: PropTypes.string,
  }),
};

export default ExerciseAnalytics;
