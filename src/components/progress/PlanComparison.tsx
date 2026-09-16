import { useMemo, useState } from "react";
import {
  comparePlans,
  dateLabel,
  number,
  planning,
  personalRecords,
  recordsInSelection,
  type Filters,
  type Plan,
  type Routine,
  type SessionRow,
} from "../../utils/progressDashboard";
import AppChart from "./AppChart";

interface Props {
  plans: Plan[];
  sessions: SessionRow[];
  routines: Routine[];
  filters: Filters;
}
export default function PlanComparison({
  plans,
  sessions,
  routines,
  filters,
}: Props) {
  const ordered = useMemo(
    () =>
      [...plans]
        .filter((p) => ["active", "completed"].includes(p.status))
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [plans],
  );
  const current = ordered.find((p) => p.status === "active") || ordered[0];
  const [selectionA, setA] = useState("");
  const [selectionB, setB] = useState("");
  const aId = selectionA || current?._id || "";
  const bId =
    selectionB ||
    ordered.find(
      (p) => p._id !== aId && p.startDate <= (current?.startDate || ""),
    )?._id ||
    "";
  const comparison = useMemo(
    () => comparePlans(ordered, aId, bId, sessions, filters),
    [ordered, aId, bId, sessions, filters],
  );
  const partial = Boolean(filters.exercise || filters.muscle || filters.load);
  const records = useMemo(() => personalRecords(sessions), [sessions]);
  const [metric, setMetric] = useState<"frequency" | "volume" | "sets">(
    "frequency",
  );
  const options = (selected: string) =>
    ordered.map((p) => (
      <option value={p._id} disabled={p._id === selected} key={p._id}>
        {p.name}
        {p.status === "active" ? " · actual" : ""}
      </option>
    ));
  return (
    <section
      className="progress-section"
      aria-labelledby="plan-comparison-title"
    >
      <div className="progress-section-heading">
        <div>
          <p className="progress-kicker">DOS PLANES · UNA MISMA BASE</p>
          <h2 id="plan-comparison-title">¿Qué cambió entre planes?</h2>
        </div>
      </div>
      <p className="progress-note">
        Comparación independiente del período y del plan del encabezado.
        Mantiene tus filtros de ejercicio, músculo y carga. Usa el mismo número
        de días desde el inicio de cada plan.
      </p>
      {ordered.length < 2 ? (
        <p className="progress-empty">
          Necesitas al menos dos planificaciones activas o completadas para
          comparar su ejecución.
        </p>
      ) : (
        <>
          <div className="progress-comparison-controls">
            <label>
              Plan A
              <select value={aId} onChange={(e) => setA(e.target.value)}>
                {options(bId)}
              </select>
            </label>
            <span aria-hidden="true">vs.</span>
            <label>
              Plan B
              <select value={bId} onChange={(e) => setB(e.target.value)}>
                {options(aId)}
              </select>
            </label>
          </div>
          {!comparison ? (
            <p className="progress-empty">
              Selecciona dos planes distintos que ya hayan comenzado.
            </p>
          ) : (
            <>
              <p className="progress-note">
                Primeros {comparison.days} días · A:{" "}
                {dateLabel(comparison.a.from)}–{dateLabel(comparison.a.to)} · B:{" "}
                {dateLabel(comparison.b.from)}–{dateLabel(comparison.b.to)}.
              </p>
              <label className="progress-inline-label">
                Comparar
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as typeof metric)}
                >
                  <option value="frequency">Sesiones / semana</option>
                  <option value="volume">Volumen externo / semana</option>
                  <option value="sets">Series / semana</option>
                </select>
              </label>
              <AppChart
                title="Comparación de planes"
                kind="bar"
                height={210}
                description="Valores normalizados por semana; más volumen no demuestra que un plan sea más eficaz."
                unit={
                  metric === "volume"
                    ? "kg/sem"
                    : metric === "sets"
                      ? "series/sem"
                      : "sesiones/sem"
                }
                labels={["Mismo tiempo de exposición"]}
                series={[comparison.a, comparison.b].map((p, i) => ({
                  name: `${i ? "B" : "A"} · ${p.plan.name}`,
                  token: i ? "--success" : "--accent",
                  values: [
                    metric === "frequency"
                      ? p.totals.frequency
                      : (p.totals[metric] * 7) / comparison.days,
                  ],
                }))}
              />
              <div className="progress-table-scroll">
                <table>
                  <caption>Resultados en ventanas de igual duración</caption>
                  <thead>
                    <tr>
                      <th scope="col">Métrica</th>
                      <th scope="col">Plan A</th>
                      <th scope="col">Plan B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        "sessions",
                        "sets",
                        "reps",
                        "volume",
                        "activeDays",
                      ] as const
                    ).map((key, i) => (
                      <tr key={key}>
                        <th scope="row">
                          {
                            [
                              "Sesiones",
                              "Series",
                              "Repeticiones",
                              "Volumen externo (kg)",
                              "Días activos",
                            ][i]
                          }
                        </th>
                        <td>{number(comparison.a.totals[key])}</td>
                        <td>{number(comparison.b.totals[key])}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Duración media registrada (min)</th>
                      {[comparison.a, comparison.b].map((p) => (
                        <td key={p.plan._id}>
                          {p.totals.timed
                            ? number(p.totals.minutes / p.totals.timed)
                            : "Sin registro"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Cumplimiento en fecha</th>
                      {[comparison.a, comparison.b].map((p) => {
                        const adherence = partial
                          ? null
                          : planning(p.plan, p.sessions, routines, p.from, p.to)
                              ?.adherence;
                        return (
                          <td key={p.plan._id}>
                            {adherence == null
                              ? "No comparable"
                              : `${number(adherence)}%`}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th scope="row">Nuevas marcas compatibles</th>
                      {[comparison.a, comparison.b].map((p) => (
                        <td key={p.plan._id}>
                          {recordsInSelection(records, p.sessions).length}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="progress-note">
                Diferencias de A frente a B:{" "}
                {number(
                  comparison.a.totals.frequency - comparison.b.totals.frequency,
                )}{" "}
                sesiones/semana ·{" "}
                {number(
                  ((comparison.a.totals.volume - comparison.b.totals.volume) *
                    7) /
                    comparison.days,
                )}{" "}
                kg externos/semana. Tiempo disponible: A{" "}
                {comparison.a.totals.timed}/{comparison.a.totals.sessions}{" "}
                sesiones; B {comparison.b.totals.timed}/
                {comparison.b.totals.sessions}.
              </p>
              <p className="progress-note">
                No atribuimos mejoras físicas al plan sin controlar ejercicios,
                esfuerzo y recuperación. Las diferencias describen lo
                registrado, no una relación causal.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
