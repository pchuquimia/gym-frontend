import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchProgressTrainings } from "../../hooks/useProgressData";
import {
  buildWorkoutMuscleSeries,
  formatWorkoutDate,
  muscleColor,
  workoutMuscles,
  workoutSetCount,
} from "../../utils/workoutMuscleSeries";
import { MuscleLegend, WorkoutMuscleBars } from "./WorkoutMuscleChart";

export default function WorkoutSeriesDetail({
  ownerId,
  catalogIndex,
  onClose,
}) {
  const history = useQuery({
    queryKey: ["trainings", "progress-full-v1", ownerId],
    queryFn: ({ signal }) => fetchProgressTrainings(ownerId, signal),
    staleTime: 60_000,
    retry: 1,
  });
  const rows = useMemo(
    () => buildWorkoutMuscleSeries(history.data || [], catalogIndex),
    [history.data, catalogIndex],
  );
  const [routine, setRoutine] = useState("");
  const [muscle, setMuscle] = useState("");
  const [windowSize, setWindowSize] = useState(15);
  const [offset, setOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const back = useRef(null);
  useEffect(() => {
    const active = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    back.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      active?.focus?.();
    };
  }, []);
  const routines = [
    ...new Map(rows.map((row) => [row.routineKey, row.name])).entries(),
  ];
  const filtered = rows.filter((row) => !routine || row.routineKey === routine);
  const muscles = workoutMuscles(filtered);
  const activeMuscle = muscles.includes(muscle) ? muscle : "";
  const end = Math.max(
    0,
    filtered.length -
      Math.min(offset, Math.max(0, filtered.length - windowSize)),
  );
  const start = Math.max(0, end - windowSize);
  const visible = filtered.slice(start, end);
  const selected =
    visible.find((row) => row.key === selectedKey) || visible.at(-1);
  const total = filtered.reduce(
    (sum, row) => sum + workoutSetCount(row, activeMuscle),
    0,
  );
  const changeWindow = (value) => {
    setOffset(value);
    setSelectedKey("");
  };
  return (
    <div
      className="workout-series-detail"
      role="dialog"
      aria-modal="true"
      aria-label="Series por entrenamiento"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll(
            "button:not([disabled]), select, input",
          ),
        ].filter((element) => element.getClientRects().length);
        const target = event.shiftKey ? controls.at(-1) : controls[0];
        const boundary = event.shiftKey ? controls[0] : controls.at(-1);
        if (document.activeElement === boundary) {
          event.preventDefault();
          target?.focus();
        }
      }}
    >
      <div className="workout-series-detail__page">
        <header>
          <button
            type="button"
            ref={back}
            onClick={onClose}
            aria-label="Volver al inicio"
          >
            <ArrowLeft />
          </button>
          <h2>Series por entrenamiento</h2>
          <span />
        </header>
        <main>
          {history.isPending ? (
            <p className="workout-series__empty" role="status">
              Cargando historial de entrenamientos…
            </p>
          ) : history.isError ? (
            <div className="workout-series__empty" role="alert">
              <p>No pudimos cargar el historial completo.</p>
              <button
                type="button"
                className="workout-series__retry"
                onClick={() => history.refetch()}
              >
                Reintentar
              </button>
            </div>
          ) : !rows.length ? (
            <p className="workout-series__empty">
              Aún no hay entrenamientos registrados.
            </p>
          ) : (
            <>
              <div className="workout-series-detail__filters">
                <label>
                  Entrenamientos
                  <select
                    value={windowSize}
                    onChange={(event) => {
                      setWindowSize(Number(event.target.value));
                      changeWindow(0);
                    }}
                  >
                    <option value={15}>Últimos 15</option>
                    <option value={20}>Últimos 20</option>
                    <option value={30}>Últimos 30</option>
                  </select>
                </label>
                <label>
                  Rutina
                  <select
                    value={routine}
                    onChange={(event) => {
                      setRoutine(event.target.value);
                      changeWindow(0);
                    }}
                  >
                    <option value="">Todas las rutinas</option>
                    {routines.map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="workout-series-detail__summary">
                <div>
                  <strong>{filtered.length}</strong>
                  <span>entrenamientos</span>
                </div>
                <div>
                  <strong>
                    {filtered.length
                      ? (total / filtered.length).toLocaleString("es-BO", {
                          maximumFractionDigits: 1,
                        })
                      : 0}
                  </strong>
                  <span>
                    {activeMuscle
                      ? `series de ${activeMuscle} por sesión`
                      : "series por sesión"}
                  </span>
                </div>
              </div>
              <section aria-labelledby="workout-series-chart-title">
                <h3 id="workout-series-chart-title">
                  Distribución por músculo
                </h3>
                <p className="workout-series__hint">
                  Cada barra es un entrenamiento
                  {activeMuscle ? ` · ${activeMuscle}` : ""}.
                </p>
                <WorkoutMuscleBars
                  rows={visible}
                  selectedKey={selected?.key}
                  muscle={activeMuscle}
                  onSelect={setSelectedKey}
                />
                <MuscleLegend
                  muscles={muscles}
                  selected={activeMuscle}
                  onSelect={setMuscle}
                />
                <p className="workout-series__hint">
                  Toca una barra para ver el detalle o un grupo para filtrarlo.
                </p>
                <nav
                  className="workout-series__navigation"
                  aria-label="Navegar entrenamientos"
                >
                  <button
                    type="button"
                    aria-label="Entrenamientos anteriores"
                    disabled={start === 0}
                    onClick={() =>
                      changeWindow(
                        Math.min(
                          filtered.length - windowSize,
                          offset + windowSize,
                        ),
                      )
                    }
                  >
                    <ChevronLeft />
                  </button>
                  <p aria-live="polite">
                    Mostrando {filtered.length ? start + 1 : 0}–{end} de{" "}
                    {filtered.length}
                  </p>
                  <button
                    type="button"
                    aria-label="Entrenamientos siguientes"
                    disabled={offset === 0}
                    onClick={() =>
                      changeWindow(Math.max(0, offset - windowSize))
                    }
                  >
                    <ChevronRight />
                  </button>
                </nav>
                {filtered.length > windowSize && (
                  <input
                    className="workout-series__range"
                    type="range"
                    aria-label="Posición en el historial"
                    min={0}
                    max={Math.max(0, filtered.length - windowSize)}
                    value={Math.max(0, filtered.length - windowSize - offset)}
                    onChange={(event) =>
                      changeWindow(
                        filtered.length -
                          windowSize -
                          Number(event.target.value),
                      )
                    }
                  />
                )}
              </section>
              {selected && (
                <section
                  className="workout-series__selected"
                  aria-label="Entrenamiento seleccionado"
                  aria-live="polite"
                >
                  <p className="workout-series__eyebrow">
                    Entrenamiento seleccionado
                  </p>
                  <div className="workout-series__selected-heading">
                    <h3>{selected.name}</h3>
                    <strong>
                      {selected.completedSets}{" "}
                      {selected.completedSets === 1 ? "serie" : "series"}
                    </strong>
                  </div>
                  <p className="workout-series__hint">
                    {formatWorkoutDate(selected.date, true)}
                  </p>
                  <ul>
                    {selected.byPrimaryMuscle.map((item) => (
                      <li key={item.name}>
                        <span>
                          <i
                            style={{ background: muscleColor(item.name) }}
                            aria-hidden="true"
                          />
                          {item.name}
                        </span>
                        <strong>
                          {item.sets} {item.sets === 1 ? "serie" : "series"}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  {!selected.completedSets && (
                    <p className="workout-series__hint">
                      Sin series completadas.
                    </p>
                  )}
                </section>
              )}
              <p className="workout-series__footnote">
                Solo series completadas. Cada serie se asigna al grupo muscular
                principal del ejercicio.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
