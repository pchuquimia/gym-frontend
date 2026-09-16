import { Activity, CalendarDays, Clock3, Dumbbell, Trophy } from "lucide-react";
import {
  dateLabel,
  number,
  type Filters,
  type Plan,
  type Totals,
  planning,
} from "../../utils/progressDashboard";
interface Props {
  isLoading: boolean;
  planned: ReturnType<typeof planning>;
  summary: Totals;
  prev: Totals;
  selectedPlan?: Plan;
  delta: number | null;
  previousFilters: Filters;
  partial: boolean;
  recordsCount: number;
}
export default function ProgressOverview({
  isLoading,
  planned,
  summary,
  prev,
  selectedPlan,
  delta,
  previousFilters,
  partial,
  recordsCount,
}: Props) {
  return (
    <>
      {" "}
      {isLoading ? (
        <div
          className="progress-skeleton progress-hero-skeleton"
          role="status"
          aria-label="Cargando métricas de entrenamiento"
        />
      ) : (
        <section
          className="progress-overview"
          aria-labelledby="progress-overview-title"
        >
          <div className="progress-hero-main">
            <p className="progress-kicker" id="progress-overview-title">
              {planned?.adherence != null
                ? "CUMPLIMIENTO EN FECHA"
                : "TU CONSTANCIA"}
            </p>
            <div className="progress-hero-number">
              {planned?.adherence != null
                ? number(planned.adherence, 0)
                : number(summary.activeDays, 0)}
              <span>{planned?.adherence != null ? "%" : "días activos"}</span>
            </div>
            <h2>
              {!summary.sessions
                ? "Tu próximo registro inicia la historia."
                : planned?.adherence != null
                  ? `${planned.completed} de ${planned.due} sesiones programadas.`
                  : `${summary.sessions} entrenamientos. Trabajo que cuenta.`}
            </h2>
            <p>
              {planned?.adherence != null
                ? `${selectedPlan?.name} · sesiones vinculadas al día y al bloque previstos, hasta hoy.`
                : `${summary.activeDays} días con entrenamiento en un período de ${summary.days} días. No es un índice de mejora física.`}
            </p>
          </div>
          <div className="progress-hero-aside">
            <Activity size={24} aria-hidden="true" />
            <p className="progress-kicker">RESPECTO AL PERÍODO ANTERIOR</p>
            <strong>
              {delta == null
                ? "Sin referencia"
                : `${delta > 0 ? "+" : ""}${number(delta)}% en series`}
            </strong>
            <p>
              {delta == null
                ? "No hay series completadas en la ventana anterior para calcular una variación."
                : `${summary.sets} frente a ${prev.sets} series completadas. Describe trabajo realizado, no ganancia muscular.`}
            </p>
            <small>
              {dateLabel(previousFilters.from)} —{" "}
              {dateLabel(previousFilters.to)}
            </small>
          </div>
        </section>
      )}
      <div className="progress-kpis" aria-label="Métricas del período">
        {[
          {
            label: "Entrenamientos",
            value: number(summary.sessions, 0),
            detail: `${summary.activeDays} días activos`,
            Icon: CalendarDays,
          },
          {
            label: "Volumen externo",
            value: `${number(summary.volume, 0)} kg`,
            detail: "Sin sumar máquinas ni asistencia",
            Icon: Dumbbell,
          },
          {
            label: "Frecuencia",
            value: `${number(summary.frequency)} / sem`,
            detail: "Normalizada por días del período",
            Icon: Activity,
          },
          {
            label: "Tiempo registrado",
            value: summary.timed
              ? `${number(summary.minutes, 0)} min`
              : "Sin registro",
            detail: `${summary.timed} de ${summary.sessions} sesiones con tiempo${partial ? " · sesión completa" : ""}`,
            Icon: Clock3,
          },
          {
            label: "Nuevas marcas",
            value: number(recordsCount, 0),
            detail: "Sólo contra historial compatible",
            Icon: Trophy,
          },
        ].map(({ label, value, detail, Icon }) => (
          <article key={label} className="progress-kpi">
            <div>
              <span>{label}</span>
              <Icon size={16} aria-hidden="true" />
            </div>
            {isLoading ? (
              <span className="progress-skeleton progress-kpi-skeleton" />
            ) : (
              <strong>{value}</strong>
            )}
            <small>{detail}</small>
          </article>
        ))}
      </div>
    </>
  );
}
