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
  renderPlanCard?: (summary: { points: string; change: string | null; changeValue: number | null } | null) => ReactNode;
}

async function fetchPlanTrainings(ownerId: string, planId: string): Promise<Training[]> {
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
    if (!Array.isArray(response.items)) throw new Error("Historial no disponible");
    response.items.forEach((training) => trainings.set(training._id, training));
    if (!response.hasMore) break;
    if (!response.nextCursor || response.nextCursor === cursor) {
      throw new Error("Historial incompleto");
    }
    cursor = response.nextCursor;
  } while (cursor);
  return [...trainings.values()];
}

export default function DashboardPlanTrend({ ownerId, plan, recentTrainings = [], renderPlanCard }: Props) {
  const planId = String(plan?._id || "");
  const trainingsQuery = useQuery({
    queryKey: ["dashboard-plan-trend", ownerId, planId],
    queryFn: () => fetchPlanTrainings(ownerId, planId),
    enabled: Boolean(ownerId && planId),
    staleTime: 60_000,
    retry: 1,
    placeholderData: () => recentTrainings.filter((training) =>
      String(training.trainingPlanId || "") === planId,
    ),
  });
  if (!plan || trainingsQuery.isPending || trainingsQuery.isError) {
    return renderPlanCard?.(null) ?? null;
  }

  const progress = buildPlanProgressData(
    plan,
    prepareTrainings(trainingsQuery.data || []),
    "",
    todayKey(),
  );
  if (!progress?.comparisons) return renderPlanCard?.(null) ?? null;

  const points = progress.points;
  const change = progress.totalChange;
  return (
    <>
      {renderPlanCard?.({
        points: number(points.at(-1)?.value ?? 100),
        change: change === null ? null : `${change > 0 ? "+" : ""}${number(change)}%`,
        changeValue: change,
      })}
      <section className="dashboard-plan-trend" aria-label={`Evolución de ${plan.name}`}>
        <span className="dashboard-plan-trend__axis-label">Puntos</span>
        <AppChart
          title={`Rendimiento de ${plan.name}`}
          description="Evolución del rendimiento de los mismos ejercicios y configuraciones en esta planificación. El índice comienza en 100."
          labels={points.map((point) => dateLabel(point.date))}
          series={[{
            name: "Rendimiento",
            values: points.map((point) => point.value),
            token: "--success",
          }]}
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
