import { ChevronRight, Moon } from "lucide-react";
import {
  buildWorkoutWeeks,
  formatWorkoutDate,
  muscleColor,
  workoutSetCount,
} from "../../utils/workoutMuscleSeries";
import "./workout-muscle-chart.css";

export function MuscleLegend({ muscles, selected = "", onSelect }) {
  return (
    <div className="workout-series__legend" aria-label="Grupos musculares">
      {muscles.map((name) =>
        onSelect ? (
          <button
            key={name}
            type="button"
            aria-pressed={selected === name}
            onClick={() => onSelect(selected === name ? "" : name)}
          >
            <i style={{ background: muscleColor(name) }} aria-hidden="true" />
            {name}
          </button>
        ) : (
          <span key={name}>
            <i style={{ background: muscleColor(name) }} aria-hidden="true" />
            {name}
          </span>
        ),
      )}
    </div>
  );
}

export function WorkoutMuscleBars({
  rows,
  selectedKey,
  muscle = "",
  onSelect,
  compact = false,
  calendar = false,
}) {
  const max = Math.max(5, ...rows.map((row) => workoutSetCount(row, muscle)));
  const ceiling = Math.ceil(max / 10) * 10;
  const labelInterval = compact ? 3 : Math.max(1, Math.ceil(rows.length / 4));
  return (
    <div
      className={`workout-series__chart ${compact ? "is-compact" : ""} ${calendar ? "is-calendar" : ""}`}
    >
      {!calendar && (
        <div className="workout-series__axis" aria-hidden="true">
          <span>{ceiling}</span>
          <span>{ceiling / 2}</span>
          <span>0</span>
        </div>
      )}
      <div className="workout-series__plot">
        <div className="workout-series__grid" aria-hidden="true">
          <i />
          {!calendar && <i />}
          <i />
        </div>
        <div
          className="workout-series__bars"
          role={onSelect || calendar ? "group" : "img"}
          aria-label={
            calendar
              ? "Series diarias por músculo, agrupadas por semana"
              : "Series completadas por entrenamiento y músculo"
          }
        >
          {rows.map((row, index) => {
            const sets = workoutSetCount(row, muscle);
            const statusLabel = {
              rest: "Descanso / sin entrenamiento registrado",
              pending: "Hoy, todavía sin entrenamiento registrado",
              "empty-session": "Entrenamiento sin series completadas",
            }[row.status];
            const label = calendar
              ? `${formatWorkoutDate(row.date, true)}${row.isToday ? " (hoy)" : ""}: ${statusLabel || `${sets} series · ${row.sessions} ${row.sessions === 1 ? "entrenamiento" : "entrenamientos"} · ${row.name} · ${segmentsLabel(row.byPrimaryMuscle)}`}`
              : `${row.name}, ${formatWorkoutDate(row.date, true)}: ${sets} ${sets === 1 ? "serie" : "series"}${muscle ? ` de ${muscle}` : ""}`;
            const segments = row.byPrimaryMuscle.filter(
              (item) => !muscle || item.name === muscle,
            );
            const content = (
              <>
                {compact &&
                  (calendar
                    ? sets > 0
                    : index % 2 === 0 || index === rows.length - 1) && (
                    <span
                      className="workout-series__total"
                      aria-hidden="true"
                      style={{
                        bottom: `calc(${(sets / ceiling) * 100}% + 5px)`,
                      }}
                    >
                      {sets}
                    </span>
                  )}
                {onSelect && row.key === selectedKey && (
                  <span
                    className="workout-series__value"
                    aria-hidden="true"
                    style={{ bottom: `calc(${(sets / ceiling) * 100}% + 8px)` }}
                  >
                    {sets} {sets === 1 ? "serie" : "series"}
                  </span>
                )}
                <span
                  className="workout-series__stack"
                  style={{ height: `${(sets / ceiling) * 100}%` }}
                >
                  {segments.map((item) => (
                    <span
                      key={item.name}
                      style={{
                        background: muscleColor(item.name),
                        flexGrow: item.sets,
                      }}
                    />
                  ))}
                </span>
                {!sets &&
                  (calendar && row.status === "rest" ? (
                    <Moon
                      className="workout-series__rest-day"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="workout-series__zero" />
                  ))}
              </>
            );
            return (
              <div
                key={row.key}
                className={`workout-series__column${calendar ? ` is-${row.status}${row.isToday ? " is-today" : ""}${row.isWeekStart ? " is-week-start" : ""}` : ""}`}
              >
                {onSelect ? (
                  <button
                    type="button"
                    className="workout-series__bar"
                    aria-label={label}
                    aria-pressed={row.key === selectedKey}
                    onClick={() => onSelect(row.key)}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className="workout-series__bar"
                    title={label}
                    role={calendar ? "img" : undefined}
                    aria-label={calendar ? label : undefined}
                  >
                    {content}
                  </div>
                )}
                <span className="workout-series__date" aria-hidden="true">
                  {calendar
                    ? row.dayNumber
                    : index === 0 ||
                        index === rows.length - 1 ||
                        (index % labelInterval === 0 && index < rows.length - 2)
                      ? formatWorkoutDate(row.date)
                      : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WorkoutSeriesCard({ rows = [], date, onOpenDetails }) {
  const weeks = buildWorkoutWeeks(rows, date).map((fullRange, index) => {
    const range = fullRange.filter((day) => day.status !== "future");
    return {
      range,
      current: index === 1,
      label: ["Semana anterior", "Esta semana"][index],
      days: range,
    };
  });
  const visible = weeks.flatMap((week, weekIndex) =>
    week.days.map((day, dayIndex) => ({
      ...day,
      isWeekStart: weekIndex > 0 && dayIndex === 0,
    })),
  );
  return (
    <section
      className="workout-series-card"
      aria-labelledby="workout-series-preview-title"
    >
      <div className="workout-series-card__heading">
        <div>
          <h2 id="workout-series-preview-title">Series por entrenamiento</h2>
        </div>
        {onOpenDetails && <ChevronRight aria-hidden="true" />}
      </div>
      {visible.some((day) => day.completedSets > 0) ? (
        <>
          <div
            className="workout-series__weeks"
            aria-label="Semanas mostradas"
            style={{
              gridTemplateColumns: weeks
                .map((week) => `${week.days.length}fr`)
                .join(" "),
            }}
          >
            {weeks.map((week) => (
              <span
                key={week.range[0].key}
                aria-label={`${week.label}: ${formatWorkoutDate(week.range[0].date, true)} – ${formatWorkoutDate(week.range.at(-1).date, true)}`}
              >
                {week.current ? (
                  <strong>{formatWeekRange(week.range)}</strong>
                ) : (
                  formatWeekRange(week.range)
                )}
              </span>
            ))}
          </div>
          <WorkoutMuscleBars rows={visible} compact calendar />
        </>
      ) : (
        <p className="workout-series__empty">
          Completa una serie para ver qué grupos musculares trabajaste.
        </p>
      )}
      {onOpenDetails && (
        <button
          type="button"
          className="workout-series-card__open"
          onClick={onOpenDetails}
          aria-label="Ver series por grupo muscular por entrenamiento"
        />
      )}
    </section>
  );
}

function segmentsLabel(segments) {
  return segments.map((item) => `${item.name}: ${item.sets}`).join(", ");
}

function formatWeekRange(week) {
  const first = week[0];
  const last = week.at(-1);
  if (first.key === last.key) return formatWorkoutDate(first.date);
  return first.date.slice(0, 7) === last.date.slice(0, 7)
    ? `${first.dayNumber}–${formatWorkoutDate(last.date)}`
    : `${formatWorkoutDate(first.date)}–${formatWorkoutDate(last.date)}`;
}
