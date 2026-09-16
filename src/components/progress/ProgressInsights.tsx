import { Trophy } from "lucide-react";
import {
  dateLabel,
  number,
  type RecordRow,
  type Totals,
} from "../../utils/progressDashboard";
export default function ProgressInsights({
  records,
  summary,
  delta,
}: {
  records: RecordRow[];
  summary: Totals;
  delta: number | null;
}) {
  return (
    <div className="progress-two-column">
      <section className="progress-section">
        <p className="progress-kicker">MARCAS CON REFERENCIA</p>
        <h2>Récords recientes</h2>
        {!records.length ? (
          <p className="progress-empty">
            No hay nuevas marcas comparables en este período. La primera
            medición establece una referencia, no un récord.
          </p>
        ) : (
          <ul className="progress-records">
            {records
              .slice(-5)
              .reverse()
              .map((r) => (
                <li key={r.id}>
                  <Trophy size={18} aria-hidden="true" />
                  <div>
                    <strong>{r.name}</strong>
                    <p>
                      {number(r.value)} {r.unit}
                    </p>
                    <small>
                      {r.detail} · anterior: {number(r.previous)} ·{" "}
                      {dateLabel(r.date)}
                    </small>
                  </div>
                </li>
              ))}
          </ul>
        )}
        <p className="progress-note">
          1RM: estimación Epley, no levantamiento máximo probado. Se compara el
          mismo ejercicio, sede y configuración registrados; no se verifica
          la equivalencia física entre máquinas.
        </p>
      </section>
      <section className="progress-section">
        <p className="progress-kicker">QUÉ PODEMOS CONCLUIR</p>
        <h2>Lectura de tu progreso</h2>
        <ul className="progress-insights">
          <li>
            <span>Hecho</span>
            <p>
              Registraste {summary.sessions} sesiones y {summary.sets} series
              completadas en {summary.activeDays} días.
            </p>
          </li>
          <li>
            <span>Comparación</span>
            <p>
              {delta == null
                ? "Falta una referencia previa para medir cambios de trabajo."
                : `El número de series ${delta > 0 ? "aumentó" : delta < 0 ? "disminuyó" : "se mantuvo"}${delta ? ` ${number(Math.abs(delta))}%` : ""} frente a los ${summary.days} días anteriores, con los mismos filtros.`}
            </p>
          </li>
          <li>
            <span>Estimación</span>
            <p>
              {records.length
                ? `${records.length} mejoras sobre marcas compatibles. Los récords de fuerza usan 1RM estimado; confírmalos con varias sesiones.`
                : "Todavía no hay evidencia de nuevas marcas compatibles en esta selección; eso no demuestra estancamiento."}
            </p>
          </li>
          <li>
            <span>Límite</span>
            <p>
              Volumen, frecuencia y tiempo describen entrenamiento. Sin medidas
              físicas y contexto de recuperación no permiten concluir ganancia
              muscular ni que un plan sea superior.
            </p>
          </li>
        </ul>
      </section>
    </div>
  );
}
