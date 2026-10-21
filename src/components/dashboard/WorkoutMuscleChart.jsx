import { ChevronRight } from "lucide-react";
import {
  formatWorkoutDate,
  muscleColor,
  workoutMuscles,
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
}) {
  const max = Math.max(5, ...rows.map((row) => workoutSetCount(row, muscle)));
  const ceiling = Math.ceil(max / 10) * 10;
  const labelInterval = compact ? 3 : Math.max(1, Math.ceil(rows.length / 4));
  return (
    <div className={`workout-series__chart ${compact ? "is-compact" : ""}`}>
      <div className="workout-series__axis" aria-hidden="true">
        <span>{ceiling}</span>
        <span>{ceiling / 2}</span>
        <span>0</span>
      </div>
      <div className="workout-series__plot">
        <div className="workout-series__grid" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div
          className="workout-series__bars"
          role={onSelect ? "group" : "img"}
          aria-label="Series completadas por entrenamiento y músculo"
        >
          {rows.map((row, index) => {
            const sets = workoutSetCount(row, muscle);
            const label = `${row.name}, ${formatWorkoutDate(row.date, true)}: ${sets} ${sets === 1 ? "serie" : "series"}${muscle ? ` de ${muscle}` : ""}`;
            const segments = row.byPrimaryMuscle.filter(
              (item) => !muscle || item.name === muscle,
            );
            const content = (
              <>
                {compact && (index % 2 === 0 || index === rows.length - 1) && (
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
                {!sets && <span className="workout-series__zero" />}
              </>
            );
            return (
              <div key={row.key} className="workout-series__column">
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
                  <div className="workout-series__bar" title={label}>
                    {content}
                  </div>
                )}
                <span className="workout-series__date" aria-hidden="true">
                  {index === 0 ||
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

export default function WorkoutSeriesCard({ rows = [], onOpenDetails }) {
  const visible = rows.slice(-10);
  const muscles = workoutMuscles(visible);
  return (
    <section
      className="workout-series-card"
      aria-labelledby="workout-series-preview-title"
    >
      <div className="workout-series-card__heading">
        <div>
          <h2 id="workout-series-preview-title">Series por entrenamiento</h2>
          <p>
            {visible.length === 1
              ? "Última sesión"
              : `Últimas ${visible.length} sesiones`}{" "}
          </p>
        </div>
      </div>
      {visible.length ? (
        <>
          <WorkoutMuscleBars rows={visible} compact />
          <MuscleLegend muscles={muscles} />
        </>
      ) : (
        <p className="workout-series__empty">
          Completa una serie para ver qué grupos musculares trabajaste.
        </p>
      )}
      {onOpenDetails && (
        <span className="workout-series-card__footer" aria-hidden="true">
          Ver músculos e historial <ChevronRight />
        </span>
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
