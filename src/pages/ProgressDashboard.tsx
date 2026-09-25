import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProgressData } from "../hooks/useProgressData";
import AppChart from "../components/progress/AppChart";
import ProgressOverview from "../components/progress/ProgressOverview";
import ProgressFilters from "../components/progress/ProgressFilters";
import ActivityHeatmap from "../components/progress/ActivityHeatmap";
import ExerciseProgress from "../components/progress/ExerciseProgress";
import RecentWorkouts from "../components/progress/RecentWorkouts";
import {
  change,
  dateLabel,
  daysBetween,
  filterSessions,
  METRICS,
  number,
  personalRecords,
  planning,
  prepareTrainings,
  rangeFor,
  recordsInSelection,
  shiftDay,
  timeline,
  todayKey,
  totals,
  type Filters,
  type Metric,
  type Period,
  type Plan,
  type Routine,
  type Training,
} from "../utils/progressDashboard";
import "../styles/progress-dashboard.css";

const EMPTY_TRAININGS: Training[] = [];
const EMPTY_PLANS: Plan[] = [];
const EMPTY_ROUTINES: Routine[] = [];

interface Props {
  dataOwnerId?: string;
  coachAthlete?: { id: string; name: string } | null;
  onNavigate: (page: string) => void;
}

export default function ProgressDashboard({
  dataOwnerId = "",
  coachAthlete,
  onNavigate,
}: Props) {
  const { user } = useAuth() as { user: { id?: string; _id?: string } | null };
  const owner = dataOwnerId || String(user?.id || user?._id || "");

  return (
    <ProgressContent
      key={owner}
      owner={owner}
      athleteName={dataOwnerId ? coachAthlete?.name : undefined}
      onNavigate={onNavigate}
    />
  );
}

function ProgressContent({
  owner,
  athleteName,
  onNavigate,
}: {
  owner: string;
  athleteName?: string;
  onNavigate: (page: string) => void;
}) {
  const queries = useProgressData(owner);
  const raw = queries.trainings.data || EMPTY_TRAININGS;
  const plans = queries.plans.data || EMPTY_PLANS;
  const routines = queries.routines.data || EMPTY_ROUTINES;
  const sessions = useMemo(() => prepareTrainings(raw), [raw]);
  const today = todayKey();
  const [period, setPeriod] = useState<Period | "">("1M");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });
  const [dimensions, setDimensions] = useState({
    plan: "",
    exercise: "",
    muscle: "",
    load: "",
  });
  const [metric, setMetric] = useState<Metric>("sets");

  const filters = useMemo<Filters>(
    () => ({
      ...dimensions,
      ...(period ? rangeFor(period, today, sessions[0]?.date) : customDates),
    }),
    [dimensions, period, today, sessions, customDates],
  );
  const validRange =
    filters.from <= filters.to &&
    filters.to <= today &&
    daysBetween(filters.from, filters.to) <= 36525;
  const current = useMemo(
    () => (validRange ? filterSessions(sessions, filters) : []),
    [sessions, filters, validRange],
  );
  const previousFilters = useMemo(() => {
    const days = validRange ? daysBetween(filters.from, filters.to) : 1;
    return {
      ...filters,
      from: shiftDay(filters.from || today, -days),
      to: shiftDay(filters.from || today, -1),
    };
  }, [filters, validRange, today]);
  const previous = useMemo(
    () => (validRange ? filterSessions(sessions, previousFilters) : []),
    [sessions, previousFilters, validRange],
  );
  const summary = useMemo(
    () => totals(current, filters.from || today, filters.to || today),
    [current, filters, today],
  );
  const prev = useMemo(
    () => totals(previous, previousFilters.from, previousFilters.to),
    [previous, previousFilters],
  );
  const allRecords = useMemo(() => personalRecords(sessions), [sessions]);
  const records = useMemo(
    () => recordsInSelection(allRecords, current),
    [allRecords, current],
  );
  const selectedPlan =
    plans.find((plan) => plan._id === filters.plan) ||
    (!filters.plan
      ? plans.find((plan) => plan.status === "active")
      : undefined);
  const partial = Boolean(filters.exercise || filters.muscle || filters.load);
  const planned = useMemo(
    () =>
      validRange && !partial
        ? planning(selectedPlan, current, routines, filters.from, filters.to)
        : null,
    [selectedPlan, current, routines, filters, partial, validRange],
  );
  const bucket =
    summary.days <= 7 ? "day" : summary.days <= 365 ? "week" : "month";
  const evolution = useMemo(
    () =>
      validRange ? timeline(current, filters.from, filters.to, bucket) : [],
    [current, filters, bucket, validRange],
  );
  const frequency = useMemo(
    () =>
      validRange ? timeline(current, filters.from, filters.to, "week") : [],
    [current, filters, validRange],
  );
  const muscleRows = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((session) =>
      session.exercises.forEach((exercise) =>
        map.set(
          exercise.stats.muscle,
          (map.get(exercise.stats.muscle) || 0) + exercise.stats.completedSets,
        ),
      ),
    );
    return [...map].sort((left, right) => right[1] - left[1]);
  }, [current]);
  const latestStrength = (() => {
    for (
      let sessionIndex = current.length - 1;
      sessionIndex >= 0;
      sessionIndex -= 1
    ) {
      const session = current[sessionIndex];
      for (
        let exerciseIndex = session.exercises.length - 1;
        exerciseIndex >= 0;
        exerciseIndex -= 1
      ) {
        const exercise = session.exercises[exerciseIndex];
        const performance = exercise.stats.performance;
        if (performance?.metricType === "strength") {
          return {
            name: exercise.exerciseName || exercise.name || exercise.exerciseId,
            value: performance.metric,
            date: session.date,
            detail: `${number(performance.topSet.weightKg)} kg × ${performance.topSet.reps} reps`,
          };
        }
      }
    }
    return null;
  })();

  const handleFilters = (next: Filters) => {
    if (next.from !== filters.from || next.to !== filters.to) {
      setPeriod("");
      setCustomDates({ from: next.from, to: next.to });
    }
    setDimensions({
      plan: next.plan,
      exercise: next.exercise,
      muscle: next.muscle,
      load: next.load,
    });
  };
  const reset = () => {
    setPeriod("1M");
    setDimensions({ plan: "", exercise: "", muscle: "", load: "" });
  };
  const isLoading = queries.trainings.isPending;
  const delta = change(summary.sets, prev.sets);

  return (
    <section
      className="progress-dashboard"
      aria-label="Analíticas de entrenamiento"
    >
      <header className="progress-header">
        <div>
          <p className="progress-kicker">TU PROGRESO</p>
          <h1>Analíticas</h1>
          <p className="progress-note">
            {athleteName ? `${athleteName} · ` : ""}Una vista simple de cómo
            avanzan tus entrenamientos.
          </p>
        </div>
        <button
          className="progress-text-link"
          onClick={() => onNavigate("ejercicio_analitica")}
        >
          Ver por ejercicio <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </header>

      <ProgressFilters
        filters={filters}
        period={period}
        plans={plans}
        sessions={sessions}
        onChange={handleFilters}
        onPeriod={setPeriod}
        onReset={reset}
      />

      {!validRange ? (
        <p className="progress-message" role="alert">
          Elige un período válido que termine hoy o antes.
        </p>
      ) : (
        <p className="progress-date-context">
          {dateLabel(filters.from)} — {dateLabel(filters.to)}
          {partial ? " · Vista filtrada" : ""}
          {queries.trainings.isFetching && !isLoading ? " · Actualizando…" : ""}
        </p>
      )}

      {queries.trainings.isError ? (
        <section className="progress-message" role="alert">
          <h2>No pudimos cargar tus analíticas</h2>
          <button onClick={() => void queries.trainings.refetch()}>
            Reintentar
          </button>
        </section>
      ) : (
        <>
          <ProgressOverview
            isLoading={isLoading}
            planned={planned}
            summary={summary}
            prev={prev}
            delta={delta}
            records={records}
            latestStrength={latestStrength}
          />

          {!isLoading && !current.length ? (
            <div className="progress-message">
              <h2>No hay entrenamientos en este período</h2>
              <button onClick={reset}>Restablecer filtros</button>{" "}
              <button onClick={() => onNavigate("registrar")}>
                Registrar entrenamiento
              </button>
            </div>
          ) : null}

          <section
            className="progress-section progress-evolution"
            aria-labelledby="progress-evolution-title"
          >
            <div className="progress-section-heading">
              <div>
                <p className="progress-kicker">EVOLUCIÓN</p>
                <h2 id="progress-evolution-title">Tu progreso en el tiempo</h2>
              </div>
              <label>
                Mostrar
                <select
                  value={metric}
                  onChange={(event) => setMetric(event.target.value as Metric)}
                >
                  {Object.entries(METRICS).map(([id, value]) => (
                    <option key={id} value={id}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <AppChart
              loading={isLoading}
              title="Evolución del entrenamiento"
              description={`${METRICS[metric].label} por ${bucket === "day" ? "día" : bucket === "week" ? "semana" : "mes"}.`}
              labels={evolution.map((point) => dateLabel(point.date))}
              series={[
                {
                  name: METRICS[metric].label,
                  values: evolution.map((point) =>
                    metric === "minutes" && point.sessions > point.timed
                      ? null
                      : point[metric],
                  ),
                },
              ]}
              unit={METRICS[metric].unit}
            />
          </section>

          {!queries.trainings.isError && current.length ? (
            <>
              {!isLoading ? <ExerciseProgress sessions={current} /> : null}

              <div className="progress-two-column progress-visual-grid">
                <section className="progress-section">
                  <p className="progress-kicker">SESIONES</p>
                  <h2>Entrenamientos por semana</h2>
                  <AppChart
                    loading={isLoading}
                    title="Sesiones por semana"
                    kind="bar"
                    description="Tu ritmo de entrenamiento semana a semana."
                    unit="sesiones"
                    labels={frequency.map((point) => dateLabel(point.date))}
                    series={[
                      {
                        name: "Sesiones",
                        values: frequency.map((point) => point.sessions),
                        token: "--success",
                      },
                    ]}
                  />
                </section>

                <section className="progress-section">
                  <p className="progress-kicker">ZONAS MUSCULARES</p>
                  <h2>Dónde entrenas más</h2>
                  <AppChart
                    loading={isLoading}
                    title="Series por zona muscular"
                    kind="bar"
                    horizontal
                    height={Math.max(240, muscleRows.length * 38)}
                    description="Series realizadas por grupo muscular."
                    unit="series"
                    labels={muscleRows.map(([muscle]) => muscle)}
                    series={[
                      {
                        name: "Series",
                        values: muscleRows.map(([, sets]) => sets),
                      },
                    ]}
                    onSelect={(index) =>
                      handleFilters({
                        ...filters,
                        muscle: muscleRows[index][0],
                      })
                    }
                  />
                  {filters.muscle ? (
                    <button
                      className="progress-reset"
                      onClick={() => handleFilters({ ...filters, muscle: "" })}
                    >
                      Ver todos los músculos
                    </button>
                  ) : null}
                </section>
              </div>

              {!isLoading && validRange ? (
                <ActivityHeatmap
                  sessions={current}
                  from={filters.from}
                  to={filters.to}
                  onSelect={(date) =>
                    handleFilters({ ...filters, from: date, to: date })
                  }
                />
              ) : null}

              {!isLoading ? <RecentWorkouts sessions={current} /> : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
