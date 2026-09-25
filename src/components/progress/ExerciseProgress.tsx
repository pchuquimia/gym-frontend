import { useMemo, useState } from "react";
import {
  dateLabel,
  number,
  performanceKey,
  type SessionRow,
} from "../../utils/progressDashboard";
import AppChart from "./AppChart";

export default function ExerciseProgress({
  sessions,
}: {
  sessions: SessionRow[];
}) {
  const options = [
    ...new Map(
      sessions
        .flatMap((s) => s.exercises)
        .map((e) => [e.exerciseId, e.exerciseName || e.name || e.exerciseId]),
    ).entries(),
  ];
  const [selected, setSelected] = useState("");
  const [scope, setScope] = useState("");
  const [metric, setMetric] = useState<
    "performance" | "weight" | "volume" | "sets" | "reps"
  >("performance");
  const exerciseId = options.some(([id]) => id === selected)
    ? selected
    : options[0]?.[0] || "";
  const groups = useMemo(() => {
    const result = new Map<
      string,
      {
        date: string;
        name: string;
        exercise: SessionRow["exercises"][number];
      }[]
    >();
    sessions.forEach((s) =>
      s.exercises
        .filter((e) => e.exerciseId === exerciseId && e.stats.completedSets > 0)
        .forEach((e) => {
          const key = performanceKey(s, e);
          const rows = result.get(key) || [];
          rows.push({
            date: s.date,
            name: s.routineName || "Entrenamiento",
            exercise: e,
          });
          result.set(key, rows);
        }),
    );
    return result;
  }, [sessions, exerciseId]);
  const scopeKey = groups.has(scope) ? scope : [...groups.keys()][0];
  const rows = groups.get(scopeKey) || [];
  const first = rows[0]?.exercise.stats.performance;
  const strength = first?.metricType === "strength";
  const label =
    metric === "performance"
      ? strength
        ? "Fuerza estimada"
        : "Mejor serie"
      : {
          weight: "Peso de la mejor serie",
          volume: "Trabajo acumulado",
          sets: "Series",
          reps: "Repeticiones",
        }[metric];
  const values = rows.map(({ exercise: e }) =>
    metric === "performance"
      ? (e.stats.performance?.metric ?? null)
      : metric === "weight"
        ? (e.stats.performance?.topSet.weightKg ?? null)
        : metric === "volume"
          ? e.stats.externalKg
          : metric === "sets"
            ? e.stats.completedSets
            : e.stats.reps,
  );
  return (
    <section
      className="progress-section"
      aria-labelledby="exercise-progress-title"
    >
      <div className="progress-section-heading">
        <div>
          <p className="progress-kicker">FUERZA</p>
          <h2 id="exercise-progress-title">Tu fuerza por ejercicio</h2>
        </div>
      </div>
      <div className="progress-exercise-controls">
        <label>
          Ejercicio
          <select
            value={exerciseId}
            onChange={(e) => {
              setSelected(e.target.value);
              setScope("");
            }}
          >
            <option value="" disabled>
              Selecciona un ejercicio
            </option>
            {options.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mostrar
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
          >
            <option value="performance">Fuerza estimada</option>
            <option value="weight">Peso de la mejor serie</option>
            <option value="volume">Trabajo acumulado</option>
            <option value="sets">Series</option>
            <option value="reps">Repeticiones</option>
          </select>
        </label>
        {groups.size > 1 && (
          <label>
            Variante
            <select value={scopeKey} onChange={(e) => setScope(e.target.value)}>
              {[...groups].map(([key, values], i) => (
                <option key={key} value={key}>
                  {i + 1}. {values[0].name} · {values.length} registros ·{" "}
                  {dateLabel(values[0].date)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <AppChart
        title={label}
        description={
          strength && metric === "performance"
            ? "Evolución estimada a partir de tu mejor serie."
            : "Cómo cambió tu mejor resultado en este ejercicio."
        }
        labels={rows.map((r) => dateLabel(r.date))}
        series={[{ name: label, values, token: "--success" }]}
        unit={
          metric === "volume" ||
          metric === "weight" ||
          (metric === "performance" && strength)
            ? "kg"
            : metric === "sets"
              ? "series"
              : "reps"
        }
        context={rows.map(
          (r) =>
            `${r.name} · ${r.exercise.stats.completedSets} series · ${r.exercise.stats.reps} reps`,
        )}
      />
      <p className="progress-note">
        {rows.length}{" "}
        {rows.length === 1 ? "sesión registrada" : "sesiones registradas"}
        {first?.metricType === "assistedRepetitions"
          ? ` · ${number(first.assistanceKg ?? 0)} kg de asistencia`
          : ""}
        .{" "}
        {rows.length < 2
          ? "Registra otra sesión para ver el cambio."
          : "La gráfica muestra tu evolución sesión a sesión."}
      </p>
    </section>
  );
}
