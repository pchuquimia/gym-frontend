import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import AppChart from "../progress/AppChart";
import { api } from "../../services/api";
import { TRAINING_LIST_FIELDS } from "../../utils/trainingListFields";
import { buildPlanProgressData } from "../../utils/planProgressComparison";
import {
  dateLabel,
  number,
  prepareTrainings,
  todayKey,
  type Plan,
  type Training,
} from "../../utils/progressDashboard";
import "./dashboard-plan-trend.css";

interface Props {
  ownerId: string;
  plan: Plan | null;
  recentTrainings?: Training[];
  variant?: "default" | "sparkline";
  renderPlanCard?: (
    summary: {
      points: string;
      change: string | null;
      changeValue: number | null;
    } | null,
    chart?: ReactNode,
  ) => ReactNode;
}

async function fetchPlanTrainings(
  ownerId: string,
  planId: string,
): Promise<Training[]> {
  const trainings = new Map<string, Training>();
  let cursor = "";
  do {
    const response: {
      items: Training[];
      hasMore: boolean;
      nextCursor?: string;
    } = await api.getTrainings({
      athleteId: ownerId,
      includeTrainingPlanId: planId,
      limit: 200,
      meta: true,
      cursor,
      fields: TRAINING_LIST_FIELDS,
    });
    if (!Array.isArray(response.items))
      throw new Error("Historial no disponible");
    response.items.forEach((training) => trainings.set(training._id, training));
    if (!response.hasMore) break;
    if (!response.nextCursor || response.nextCursor === cursor) {
      throw new Error("Historial incompleto");
    }
    cursor = response.nextCursor;
  } while (cursor);
  return [...trainings.values()];
}

export default function DashboardPlanTrend({
  ownerId,
  plan,
  recentTrainings = [],
  renderPlanCard,
  variant = "default",
}: Props) {
  const planId = String(plan?._id || "");
  const trainingsQuery = useQuery({
    queryKey: ["dashboard-plan-trend", ownerId, planId],
    queryFn: () => fetchPlanTrainings(ownerId, planId),
    enabled: Boolean(ownerId && planId),
    staleTime: 60_000,
    retry: 1,
    placeholderData: () =>
      recentTrainings.filter(
        (training) => String(training.trainingPlanId || "") === planId,
      ),
  });
  if (!plan) return renderPlanCard?.(null) ?? null;
  const fallback = (content: ReactNode) =>
    renderPlanCard?.(
      null,
      variant === "sparkline" ? (
        <div className="daily-plan-overview__status">{content}</div>
      ) : undefined,
    ) ?? null;
  if (
    trainingsQuery.isPending ||
    (variant === "sparkline" && trainingsQuery.isPlaceholderData)
  )
    return fallback("Cargando evolución del plan…");
  if (trainingsQuery.isError)
    return fallback(
      <>
        No pudimos cargar la evolución.
        <button type="button" onClick={() => void trainingsQuery.refetch()}>
          Reintentar
        </button>
      </>,
    );

  const progress = buildPlanProgressData(
    plan,
    prepareTrainings(trainingsQuery.data || []),
    "",
    todayKey(),
  );
  if (!progress?.comparisons)
    return fallback(
      "La evolución aparecerá al repetir ejercicios comparables.",
    );

  const points = progress.points;
  const change = progress.totalChange;
  const summary = {
    points: number(points.at(-1)?.value ?? 100),
    change:
      change === null ? null : `${change > 0 ? "+" : ""}${number(change)}%`,
    changeValue: change,
  };
  if (variant === "sparkline") {
    const values = points.map((point) => point.value - 100);
    let lower = Math.min(0, Math.floor(Math.min(...values) / 10) * 10);
    let upper = Math.max(0, Math.ceil(Math.max(...values) / 10) * 10);
    if (upper - lower < 10) {
      if (upper === 0 && lower < 0) lower = -10;
      else upper = lower + 10;
    }
    const y = (value: number) => 8 + ((upper - value) / (upper - lower)) * 96;
    // UTC date-only values preserve calendar spacing across daylight-saving changes.
    const timestamp = (date: string) =>
      Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
    const firstDate = timestamp(points[0].date);
    const lastDate = timestamp(points.at(-1)!.date);
    const x = (date: string) =>
      lastDate === firstDate
        ? 240
        : 6 + ((timestamp(date) - firstDate) / (lastDate - firstDate)) * 468;
    const percent = (value: number) =>
      `${value > 0 ? "+" : ""}${number(value)}%`;
    const ticks = [
      upper,
      lower < 0 && upper > 0 ? 0 : (upper + lower) / 2,
      lower,
    ];
    const path = points
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(point.date)},${y(point.value - 100)}`,
      )
      .join(" ");
    const last = points.at(-1)!;
    const chart = (
      <div className="daily-plan-overview__trend">
        <div className="daily-plan-overview__chart-heading" aria-hidden="true">
          <span>Evolución de marcas</span>
          <span className="daily-plan-overview__reference">0% · inicio</span>
        </div>
        <div className="daily-plan-overview__plot">
          <div className="daily-plan-overview__scale" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ top: `${(y(tick) / 112) * 100}%` }}>
                {percent(tick)}
              </span>
            ))}
          </div>
          <svg
            className={`daily-plan-overview__sparkline${change !== null && change < 0 ? " is-negative" : ""}`}
            viewBox="0 0 480 112"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Rendimiento de ${plan.name}`}
          >
            <title>{`Evolución de ${plan.name}: ${summary.change ?? "sin cambio comparable"}`}</title>
            <desc>{`Del ${dateLabel(points[0].date)} al ${dateLabel(last.date)}. ${points.length} días con registros. Variación frente al primer registro compatible de cada ejercicio: ${summary.change}. La línea discontinua del 0% indica el nivel inicial. Las fechas conservan su separación real. El resultado es la mediana de las marcas comparables, sin acumular porcentajes entre ejercicios.`}</desc>
            {ticks
              .filter((tick) => tick !== 0)
              .map((tick) => (
                <line
                  key={tick}
                  x1="0"
                  x2="480"
                  y1={y(tick)}
                  y2={y(tick)}
                  className="daily-plan-overview__grid"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            <path
              d={`${path} L${x(last.date)},${y(0)} L${x(points[0].date)},${y(0)} Z`}
              className="daily-plan-overview__area"
            />
            <line
              x1="0"
              x2="480"
              y1={y(0)}
              y2={y(0)}
              className="daily-plan-overview__zero"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(last.date)}
              cy={y(last.value - 100)}
              r="4"
              fill="currentColor"
              stroke="var(--card)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div
          className={`daily-plan-overview__dates${firstDate === lastDate ? " is-single" : ""}`}
          aria-hidden="true"
        >
          <span>{dateLabel(points[0].date)}</span>
          {firstDate !== lastDate && <span>{dateLabel(last.date)}</span>}
        </div>
        <details className="daily-plan-overview__method">
          <summary>Cómo se calcula</summary>
          <p>
            Compara tus marcas con el primer registro de cada ejercicio en este
            plan, usando la misma configuración. El porcentaje resume el cambio
            típico de los ejercicios comparados (mediana). Los días sin
            registros no añaden cambios.
          </p>
        </details>
      </div>
    );
    return renderPlanCard ? renderPlanCard(summary, chart) : chart;
  }
  return (
    <>
      {renderPlanCard?.(summary)}
      <section
        className="dashboard-plan-trend"
        aria-label={`Evolución de ${plan.name}`}
      >
        <span className="dashboard-plan-trend__axis-label">Puntos</span>
        <AppChart
          title={`Rendimiento de ${plan.name}`}
          description="Índice base 100. Mediana del cambio de cada ejercicio frente a su primer registro compatible en esta planificación, sin acumular porcentajes entre ejercicios."
          labels={points.map((point) => dateLabel(point.date))}
          series={[
            {
              name: "Rendimiento",
              values: points.map((point) => point.value),
              token: "--success",
              hollowSymbols: true,
            },
          ]}
          unit="puntos"
          height={160}
          scale
          valueAxisName="Puntos"
          hideValueAxisName
          axisLabelFontSize={10}
          showLegend={false}
          showDescription={false}
          compactTooltip
          minimal
        />
      </section>
    </>
  );
}
