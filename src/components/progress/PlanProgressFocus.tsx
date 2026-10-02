import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import MobilePageHeader from "../layout/MobilePageHeader";
import { fetchProgressTrainings } from "../../hooks/useProgressData";
import { getTrainingPlansQueryKey } from "../../queries/trainingPlanQueries";
import { api } from "../../services/api";
import { buildPlanProgressData } from "../../utils/planProgressComparison";
import {
  dateLabel,
  filterSessions,
  prepareTrainings,
  rangeForPlan,
  todayKey,
  type Plan,
  type Training,
} from "../../utils/progressDashboard";
import PlanPerformanceChart from "./PlanPerformanceChart";
import "./plan-progress-focus.css";

const EMPTY_TRAININGS: Training[] = [];
const EMPTY_PLANS: Plan[] = [];

interface Props {
  owner: string;
  planId: string;
  onNavigate: (page: string) => void;
  onBack?: (page: string) => void;
}

export default function PlanProgressFocus({ owner, planId, onNavigate, onBack }: Props) {
  const [muscle, setMuscle] = useState("");
  const [comparisonPlanId, setComparisonPlanId] = useState("");
  const [showComparisonPicker, setShowComparisonPicker] = useState(false);
  const trainingsQuery = useQuery({
    queryKey: ["trainings", "progress-full-v1", owner],
    queryFn: ({ signal }) => fetchProgressTrainings(owner, signal),
    enabled: Boolean(owner),
    staleTime: 60_000,
    retry: 1,
  });
  const plansQuery = useQuery<Plan[]>({
    queryKey: getTrainingPlansQueryKey(owner),
    queryFn: () => api.getTrainingPlans(owner),
    enabled: Boolean(owner),
    staleTime: 60_000,
    retry: 1,
  });
  const plans = plansQuery.data || EMPTY_PLANS;
  const plan = plans.find((item) => item._id === planId);
  const today = todayKey();
  const range = plan ? rangeForPlan(plan, today) : null;
  const from = range?.from || "";
  const to = range?.to || "";
  const sessions = useMemo(
    () => prepareTrainings(trainingsQuery.data || EMPTY_TRAININGS),
    [trainingsQuery.data],
  );
  const planSessions = from && from <= to
    ? filterSessions(sessions, {
        from,
        to,
        plan: planId,
        exercise: "",
        muscle: "",
        load: "",
      })
    : [];
  const muscles = [...new Set(planSessions.flatMap((session) =>
    session.exercises.map((exercise) => exercise.stats.muscle),
  ))].sort((left, right) => left.localeCompare(right, "es"));
  const progressOptions = plans.map((item) => ({
    plan: item,
    progress: buildPlanProgressData(item, sessions, muscle, today),
  }));
  const currentProgress = progressOptions.find((item) => item.plan._id === planId)?.progress;
  const otherPlans = progressOptions
    .filter((item) => item.plan._id !== planId && item.plan.status !== "draft")
    .sort((left, right) => right.plan.startDate.localeCompare(left.plan.startDate));
  const comparisonProgress = otherPlans.find((item) =>
    item.plan._id === comparisonPlanId && item.progress?.comparisons,
  )?.progress;
  const loading = trainingsQuery.isPending || plansQuery.isPending;
  const error = trainingsQuery.isError || plansQuery.isError;
  const handleReturn = () => onBack ? onBack("dashboard") : onNavigate("dashboard");

  return (
    <main className="dashboard-shell plan-progress-page mx-auto w-full max-w-md pb-28 text-[color:var(--text)] md:max-w-5xl md:pb-20 xl:max-w-6xl" aria-label="Progreso de la planificación">
      <MobilePageHeader
        title="Progreso del plan"
        variant="detail"
        onBack={handleReturn}
      />
      <header className="plan-progress-header">
        <button type="button" onClick={handleReturn} aria-label="Volver a la página anterior">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
        </button>
        <div>
          <p>PLANIFICACIÓN</p>
          <h2>{plan?.name || "Tu planificación"}</h2>
          {range && range.from <= range.to ? (
            <span>{dateLabel(range.from)} — {dateLabel(range.to)}</span>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="plan-progress-state" role="status">Cargando tu progreso...</div>
      ) : error ? (
        <div className="plan-progress-state" role="alert">
          <p>No pudimos cargar el progreso de este plan.</p>
          <button type="button" onClick={() => {
            void trainingsQuery.refetch();
            void plansQuery.refetch();
          }}>Reintentar</button>
        </div>
      ) : !plan ? (
        <div className="plan-progress-state" role="alert">Esta planificación ya no está disponible.</div>
      ) : !range || range.from > range.to ? (
        <div className="plan-progress-state">El seguimiento aparecerá cuando comience la planificación.</div>
      ) : currentProgress ? (
        <div className="plan-progress-card">
          <div className="plan-progress-card-heading">
            <div>
              <h3>Rendimiento</h3>
            </div>
            <label>
              Grupo muscular
              <select value={muscle} onChange={(event) => {
                setMuscle(event.target.value);
                setComparisonPlanId("");
              }}>
                <option value="">Todos los grupos</option>
                {muscles.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>
          {currentProgress.comparisons > 0 && otherPlans.length > 0 ? (
            <div className="plan-progress-compare-controls">
              {!showComparisonPicker ? (
                <button type="button" className="plan-progress-compare-button" onClick={() => setShowComparisonPicker(true)}>
                  + Comparar con otra planificación
                </button>
              ) : (
                <div className="plan-progress-compare-picker">
                  <label>
                    Comparar con
                    <select value={comparisonProgress?.plan._id || ""} onChange={(event) => setComparisonPlanId(event.target.value)}>
                      <option value="">Elige una planificación</option>
                      {otherPlans.map(({ plan: option, progress }) => (
                        <option key={option._id} value={option._id} disabled={!progress?.comparisons}>
                          {option.name}{progress?.comparisons ? "" : " · Sin registros comparables"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => {
                    setComparisonPlanId("");
                    setShowComparisonPicker(false);
                  }}>{comparisonProgress ? "Quitar comparación" : "Cancelar"}</button>
                  {!otherPlans.some(({ progress }) => progress?.comparisons) ? (
                    <span className="plan-progress-compare-hint">Los otros planes aún no tienen sesiones comparables para este grupo.</span>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
          <PlanPerformanceChart
            current={currentProgress}
            comparison={comparisonProgress}
          />
        </div>
      ) : null}
    </main>
  );
}
