import { useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  LOAD_LABELS,
  PERIODS,
  type Filters,
  type Period,
  type Plan,
  type SessionRow,
} from "../../utils/progressDashboard";

interface Props {
  filters: Filters;
  period: Period | "";
  plans: Plan[];
  sessions: SessionRow[];
  onChange: (f: Filters) => void;
  onPeriod: (p: Period) => void;
  onReset: () => void;
}
export default function ProgressFilters({
  filters,
  period,
  plans,
  sessions,
  onChange,
  onPeriod,
  onReset,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const exercises = [
    ...new Map(
      sessions
        .flatMap((s) => s.exercises)
        .map((e) => [e.exerciseId, e.exerciseName || e.name || e.exerciseId]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const muscles = [
    ...new Set(sessions.flatMap((s) => s.exercises.map((e) => e.stats.muscle))),
  ].sort();
  const active = [
    filters.plan,
    filters.exercise,
    filters.muscle,
    filters.load,
  ].filter(Boolean).length;
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });
  return (
    <div className="progress-controls">
      <div
        className="progress-periods"
        role="group"
        aria-label="Período de progreso"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            aria-pressed={p === period}
            onClick={() => onPeriod(p)}
          >
            {p === "ALL" ? "Todo" : p}
          </button>
        ))}
      </div>
      <label className="progress-plan-select">
        <span className="sr-only">Planificación</span>
        <select
          aria-label="Planificación"
          value={filters.plan}
          onChange={(e) => set("plan", e.target.value)}
        >
          <option value="">Todos los planes</option>
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="progress-filter-button"
        onClick={() => dialog.current?.showModal()}
      >
        <SlidersHorizontal size={16} aria-hidden="true" /> Filtros
        {active ? ` (${active})` : ""}
      </button>
      <button className="progress-reset" onClick={onReset}>
        Restablecer
      </button>
      <dialog
        ref={dialog}
        className="progress-filter-dialog"
        aria-labelledby="progress-filter-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="progress-dialog-body">
          <header>
            <h2 id="progress-filter-title">Elige qué quieres ver</h2>
            <button
              aria-label="Cerrar filtros"
              onClick={() => dialog.current?.close()}
            >
              <X size={20} />
            </button>
          </header>
          <label>
            Desde
            <input
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(e) => e.target.value && set("from", e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              onChange={(e) => e.target.value && set("to", e.target.value)}
            />
          </label>
          <label>
            Grupo muscular
            <select
              value={filters.muscle}
              onChange={(e) => set("muscle", e.target.value)}
            >
              <option value="">Todos los grupos</option>
              {muscles.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Ejercicio
            <select
              value={filters.exercise}
              onChange={(e) => set("exercise", e.target.value)}
            >
              <option value="">Todos los ejercicios</option>
              {exercises.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de carga
            <select
              value={filters.load}
              onChange={(e) => set("load", e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(LOAD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="progress-primary"
            onClick={() => dialog.current?.close()}
          >
            Ver resultados
          </button>
        </div>
      </dialog>
    </div>
  );
}
