import type { CSSProperties } from "react";
import { Activity, CalendarDays, Dumbbell, TrendingUp } from "lucide-react";
import {
  dateLabel,
  number,
  type RecordRow,
  type Totals,
  planning,
} from "../../utils/progressDashboard";

interface StrengthReading {
  name: string;
  value: number;
  date: string;
  detail: string;
}

interface Props {
  isLoading: boolean;
  planned: ReturnType<typeof planning>;
  summary: Totals;
  prev: Totals;
  delta: number | null;
  records: RecordRow[];
  latestStrength: StrengthReading | null;
}

export default function ProgressOverview({
  isLoading,
  planned,
  summary,
  prev,
  delta,
  records,
  latestStrength,
}: Props) {
  const sessionMaximum = Math.max(summary.sessions, prev.sessions, 1);
  const latestRecord = records.at(-1) || null;
  const recordMaximum = Math.max(
    latestRecord?.value || 0,
    latestRecord?.previous || 0,
    1,
  );
  const cadence = Math.min(7, Math.round(summary.frequency));
  const adherence = Math.min(100, Math.max(0, planned?.adherence || 0));

  if (isLoading) {
    return (
      <div
        className="progress-skeleton progress-summary-skeleton"
        role="status"
        aria-label="Cargando resumen"
      />
    );
  }

  return (
    <section
      className="progress-visual-summary"
      aria-labelledby="summary-title"
    >
      <div className="progress-summary-heading">
        <div>
          <p className="progress-kicker">RESUMEN</p>
          <h2 id="summary-title">Lo más importante</h2>
        </div>
        <span>{number(summary.frequency)} sesiones por semana</span>
      </div>

      <div className="progress-summary-grid">
        <article className="progress-summary-card progress-summary-card--sessions">
          <div className="progress-summary-card__heading">
            <span className="progress-summary-icon">
              <CalendarDays size={19} aria-hidden="true" />
            </span>
            <span>Sesiones</span>
          </div>
          <strong>{number(summary.sessions, 0)}</strong>
          <p>{summary.activeDays} días con entrenamiento</p>
          <div className="progress-comparison-bars" aria-hidden="true">
            <div>
              <span>Ahora</span>
              <i
                style={{
                  width: `${(summary.sessions / sessionMaximum) * 100}%`,
                }}
              />
            </div>
            <div>
              <span>Antes</span>
              <i
                style={{ width: `${(prev.sessions / sessionMaximum) * 100}%` }}
              />
            </div>
          </div>
        </article>

        <article className="progress-summary-card">
          <div className="progress-summary-card__heading">
            <span className="progress-summary-icon">
              <Activity size={19} aria-hidden="true" />
            </span>
            <span>{planned?.adherence != null ? "Cumplimiento" : "Ritmo"}</span>
          </div>
          {planned?.adherence != null ? (
            <div className="progress-ring-row">
              <span
                className="progress-summary-ring"
                style={
                  { "--progress": `${adherence * 3.6}deg` } as CSSProperties
                }
                aria-hidden="true"
              />
              <strong>{number(adherence, 0)}%</strong>
            </div>
          ) : (
            <>
              <strong>{number(summary.frequency)}</strong>
              <div className="progress-cadence" aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} data-active={index < cadence} />
                ))}
              </div>
            </>
          )}
          <p>
            {planned?.adherence != null
              ? `${planned.completed} de ${planned.due} sesiones del plan`
              : "Sesiones promedio por semana"}
          </p>
        </article>

        <article className="progress-summary-card">
          <div className="progress-summary-card__heading">
            <span className="progress-summary-icon">
              <Dumbbell size={19} aria-hidden="true" />
            </span>
            <span>Última fuerza</span>
          </div>
          <strong>
            {latestStrength ? `${number(latestStrength.value)} kg` : "—"}
          </strong>
          <p className="progress-summary-card__name">
            {latestStrength?.name || "Aún sin registro de fuerza"}
          </p>
          {latestStrength ? (
            <small>
              {latestStrength.detail} · {dateLabel(latestStrength.date)}
            </small>
          ) : null}
        </article>

        <article className="progress-summary-card">
          <div className="progress-summary-card__heading">
            <span className="progress-summary-icon">
              <TrendingUp size={19} aria-hidden="true" />
            </span>
            <span>Último cambio</span>
          </div>
          {latestRecord ? (
            <>
              <strong>
                +
                {number(
                  ((latestRecord.value - latestRecord.previous) /
                    latestRecord.previous) *
                    100,
                )}
                %
              </strong>
              <p className="progress-summary-card__name">{latestRecord.name}</p>
              <div className="progress-record-bars" aria-hidden="true">
                <i
                  style={{
                    height: `${(latestRecord.previous / recordMaximum) * 100}%`,
                  }}
                />
                <i
                  style={{
                    height: `${(latestRecord.value / recordMaximum) * 100}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <strong>
                {delta == null
                  ? "—"
                  : `${delta > 0 ? "+" : ""}${number(delta)}%`}
              </strong>
              <p>Series frente al período anterior</p>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
