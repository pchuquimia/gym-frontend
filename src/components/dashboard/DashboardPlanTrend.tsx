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
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(5, max - min);
    const center = (min + max) / 2;
    const path = points
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${(index / Math.max(1, points.length - 1)) * 480},${40 - ((point.value - center) / span) * 60}`,
      )
      .join(" ");
    const chart = (
      <>
        <svg
          className={`daily-plan-overview__sparkline${change !== null && change < 0 ? " is-negative" : ""}`}
          viewBox="0 0 480 80"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Rendimiento de ${plan.name}`}
        >
          <title>{`Evolución de ${plan.name}: ${summary.change ?? "sin cambio comparable"}`}</title>
          <desc>{`${points.length} registros del plan. Índice base 100; último valor ${summary.points} puntos. Mediana del cambio de cada ejercicio frente a su primer registro compatible, sin acumular porcentajes entre ejercicios.`}</desc>
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="daily-plan-overview__baseline">
          Frente al inicio de cada ejercicio
        </p>
      </>
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
