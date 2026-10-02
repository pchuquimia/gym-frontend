import { useQuery } from "@tanstack/react-query";
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

export default function DashboardPlanTrend({ ownerId, plan }: Props) {
  const planId = String(plan?._id || "");
  const trainingsQuery = useQuery({
    queryKey: ["dashboard-plan-trend", ownerId, planId],
    queryFn: () => fetchPlanTrainings(ownerId, planId),
    enabled: Boolean(ownerId && planId),
    staleTime: 60_000,
    retry: 1,
  });
  if (!plan || trainingsQuery.isPending || trainingsQuery.isError) return null;

  const progress = buildPlanProgressData(
    plan,
    prepareTrainings(trainingsQuery.data || []),
    "",
    todayKey(),
  );
  if (!progress?.comparisons) return null;

  const points = progress.points;
  return (
    <section className="dashboard-plan-trend" aria-label={`Evolución de ${plan.name}`}>
      <div className="dashboard-plan-trend__summary">
        <div className="dashboard-plan-trend__stat">
          <span>Índice de rendimiento</span>
          <strong>{number(points.at(-1)?.value ?? 100)} <small>puntos</small></strong>
        </div>
        {progress.totalChange !== null ? (
          <div className="dashboard-plan-trend__stat dashboard-plan-trend__stat--change">
            <span>Cambio desde la primera sesión</span>
            <strong className={progress.totalChange > 0 ? "is-positive" : progress.totalChange < 0 ? "is-negative" : ""}>
              {progress.totalChange > 0 ? "+" : ""}{number(progress.totalChange)}%
            </strong>
          </div>
        ) : null}
      </div>
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
        height={180}
        scale
        valueAxisName="Puntos"
        showLegend={false}
        showDescription={false}
        compactTooltip
        minimal
      />
    </section>
  );
}
