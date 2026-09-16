import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProgressData } from "../hooks/useProgressData";
import AppChart from "../components/progress/AppChart";
import ProgressOverview from "../components/progress/ProgressOverview";
import ProgressInsights from "../components/progress/ProgressInsights";
import ProgressFilters from "../components/progress/ProgressFilters";
import PlanComparison from "../components/progress/PlanComparison";
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

const EMPTY_TRAININGS: Training[] = [],
  EMPTY_PLANS: Plan[] = [],
  EMPTY_ROUTINES: Routine[] = [];
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
  const [volumeBucket, setVolumeBucket] = useState<"week" | "month">("week");
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
    plans.find((p) => p._id === filters.plan) ||
    (!filters.plan ? plans.find((p) => p.status === "active") : undefined);
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
  const volume = useMemo(
    () =>
      validRange
        ? timeline(current, filters.from, filters.to, volumeBucket)
        : [],
    [current, filters, volumeBucket, validRange],
  );
  const frequency = useMemo(
    () =>
      validRange ? timeline(current, filters.from, filters.to, "week") : [],
    [current, filters, validRange],
  );
  const muscleRows = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((s) =>
      s.exercises.forEach((e) =>
        map.set(
          e.stats.muscle,
          (map.get(e.stats.muscle) || 0) + e.stats.completedSets,
        ),
      ),
    );
    return [...map].sort((a, b) => b[1] - a[1]);
  }, [current]);
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
  const delta = change(summary.sets, prev.sets);
  const isLoading = queries.trainings.isPending;
  return (
    <section
      className="progress-dashboard"
      aria-label="Dashboard de progreso y comparación de planificaciones"
    >
      <header className="progress-header">
        <div>
          <p className="progress-kicker">TU ENTRENAMIENTO, EN PERSPECTIVA</p>
          <h1>
            Progreso<span className="progress-title-dot">.</span>
          </h1>
          <p className="progress-note">
            {athleteName ? `${athleteName} · ` : ""}Entiende tu constancia, tu
            trabajo y lo que cambia entre planes.
          </p>
        </div>
        <button
          className="progress-text-link"
          onClick={() => onNavigate("ejercicio_analitica")}
        >
          Analítica detallada <ArrowUpRight size={16} aria-hidden="true" />
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
          Elige un período válido que termine hoy o antes y no supere 100 años.
        </p>
      ) : (
        <p className="progress-date-context">
          {dateLabel(filters.from)} — {dateLabel(filters.to)} · {summary.days}{" "}
          días{partial ? " · Vista filtrada por ejercicios" : ""}
          {queries.trainings.isFetching && !isLoading ? " · Actualizando…" : ""}
        </p>
      )}
      {queries.trainings.isError ? (
        <section className="progress-message" role="alert">
          <h2>No pudimos cargar el historial completo</h2>
          <p>
            Los resultados se ocultan para evitar conclusiones con datos
            incompletos.
          </p>
          <button onClick={() => void queries.trainings.refetch()}>
            Reintentar historial
          </button>
        </section>
      ) : (
        <>
          <ProgressOverview
            isLoading={isLoading}
            planned={planned}
            summary={summary}
            prev={prev}
            selectedPlan={selectedPlan}
            delta={delta}
            previousFilters={previousFilters}
            partial={partial}
            recordsCount={records.length}
          />
          {!isLoading && !current.length && (
            <div className="progress-message">
              <h2>No hay entrenamientos en esta selección</h2>
              <p>
                Amplía el período o elimina filtros. No mostramos datos de
                demostración en tu historial.
              </p>
              <button onClick={reset}>Restablecer filtros</button>{" "}
              <button onClick={() => onNavigate("registrar")}>
                Registrar entrenamiento
              </button>
            </div>
          )}
          <section
            className="progress-section progress-evolution"
            aria-labelledby="progress-evolution-title"
          >
            <div className="progress-section-heading">
              <div>
                <p className="progress-kicker">
                  LA EVOLUCIÓN, SIN SUPOSICIONES
                </p>
                <h2 id="progress-evolution-title">Cada sesión suma contexto</h2>
              </div>
              <label>
                Métrica
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
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
              description={`${METRICS[metric].label} por ${bucket === "day" ? "día" : bucket === "week" ? "semana" : "mes"}. Los ceros indican ausencia de registros; no una medición de rendimiento. Los extremos pueden ser períodos parciales.`}
              labels={evolution.map((p) => dateLabel(p.date))}
              series={[
                {
                  name: METRICS[metric].label,
                  values: evolution.map((p) =>
                    metric === "minutes" && p.sessions > p.timed
                      ? null
                      : p[metric],
                  ),
                },
              ]}
              unit={METRICS[metric].unit}
              context={evolution.map(
                (p) =>
                  `${p.sessions} sesiones · ${p.sets} series · ${number(p.volume)} kg externos`,
              )}
            />
          </section>
        </>
      )}
      <section className="progress-section" aria-labelledby="planning-title">
        <div className="progress-section-heading">
          <div>
            <p className="progress-kicker">DE LA INTENCIÓN A LA ACCIÓN</p>
            <h2 id="planning-title">Planificado vs. realizado</h2>
          </div>
          {selectedPlan && (
            <span className="progress-badge">{selectedPlan.name}</span>
          )}
        </div>
        {queries.plans.isPending || isLoading ? (
          <div
            className="progress-skeleton"
            style={{ height: 140 }}
            aria-label="Cargando planificación"
            role="status"
          />
        ) : queries.plans.isError ? (
          <p className="progress-message" role="alert">
            No pudimos cargar los planes.{" "}
            <button onClick={() => void queries.plans.refetch()}>
              Reintentar planes
            </button>
          </p>
        ) : queries.trainings.isError ? (
          <p className="progress-note">
            Reintenta el historial para comparar la ejecución.
          </p>
        ) : !planned ? (
          <p className="progress-empty">
            {partial
              ? "El cumplimiento se calcula con sesiones completas. Quita los filtros de ejercicio, músculo y carga para ver esta comparación."
              : selectedPlan
                ? "Este plan no tiene un calendario semanal fijo evaluable en el período. No convertimos un ciclo flexible en fechas incumplidas."
                : "Selecciona una planificación con calendario fijo para comparar lo programado con lo realizado."}
          </p>
        ) : (
          <>
            <p className="progress-note">
              Sólo {selectedPlan?.name}. Coincidencia exacta de plan, bloque y
              fecha; una sesión repetida no cubre dos turnos.
            </p>
            <div className="progress-plan-stats">
              {[
                ["Sesiones en fecha", planned.completed, planned.due],
                [
                  "Ejercicios",
                  planned.actual.exerciseCount,
                  queries.routines.isSuccess ? planned.exercises : null,
                ],
                [
                  "Series",
                  planned.actual.sets,
                  queries.routines.isSuccess ? planned.sets : null,
                ],
              ].map(([label, actual, target]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong>
                    {actual}
                    <small> / {target ?? "—"}</small>
                  </strong>
                  <p>realizado / previsto</p>
                </div>
              ))}
            </div>
            <p className="progress-note">
              {planned.due - planned.completed} turnos sin coincidencia en fecha
              · {planned.unmatched} sesiones vinculadas fuera de coincidencia.{" "}
              {queries.routines.isSuccess && planned.omitted != null
                ? `${planned.omitted} ejercicios previstos sin registro en los turnos programados; ${planned.added} ejercicios añadidos en las sesiones coincidentes.`
                : "Detalle de ejercicios previstos no disponible."}
            </p>
            <p className="progress-note">
              Ejercicios y series previstos son una estimación según la
              estructura actual de las rutinas, no una copia histórica. Incluye
              los turnos de hoy; sin coincidencia no significa necesariamente
              omitido.
            </p>
          </>
        )}
        {queries.routines.isError && (
          <p role="alert" className="progress-note">
            No pudimos cargar la estructura de rutinas.{" "}
            <button onClick={() => void queries.routines.refetch()}>
              Reintentar rutinas
            </button>
          </p>
        )}
      </section>
      {!queries.trainings.isError && (
        <>
          <div className="progress-two-column">
            <section className="progress-section">
              <div className="progress-section-heading">
                <div>
                  <p className="progress-kicker">TRABAJO ACUMULADO</p>
                  <h2>Volumen externo</h2>
                </div>
                <label className="sr-only" htmlFor="progress-volume-bucket">
                  Agrupación de volumen
                </label>
                <select
                  id="progress-volume-bucket"
                  value={volumeBucket}
                  onChange={(e) =>
                    setVolumeBucket(e.target.value as typeof volumeBucket)
                  }
                >
                  <option value="week">Semanal</option>
                  <option value="month">Mensual</option>
                </select>
              </div>
              <AppChart
                loading={isLoading}
                title="Volumen externo"
                kind="bar"
                description="Suma de kg efectivos × repeticiones en series completadas. Los extremos pueden ser parciales."
                unit="kg"
                labels={volume.map((p) => dateLabel(p.date))}
                series={[
                  {
                    name: "Volumen externo",
                    values: volume.map((p) => p.volume),
                  },
                ]}
              />
              <p className="progress-note">
                Fuera de esta suma: {number(summary.machine)} kg·reps de
                máquinas y {number(summary.unknown)} kg·reps sin clasificar.
                Peso corporal y asistencia se siguen en series.
              </p>
            </section>
            <section className="progress-section">
              <p className="progress-kicker">EL HÁBITO DETRÁS DEL TRABAJO</p>
              <h2>Frecuencia semanal</h2>
              <AppChart
                loading={isLoading}
                title="Frecuencia semanal"
                kind="bar"
                description="Sesiones registradas por semana (lunes–domingo). Los extremos se limitan al período seleccionado."
                unit="sesiones"
                labels={frequency.map((p) => dateLabel(p.date))}
                series={[
                  {
                    name: "Sesiones",
                    values: frequency.map((p) => p.sessions),
                    token: "--success",
                  },
                ]}
              />
              <p className="progress-note">
                Promedio normalizado: {number(summary.frequency)}{" "}
                sesiones/semana.{" "}
                {selectedPlan?.scheduleMode === "fixed"
                  ? `Objetivo del plan: ${selectedPlan.weeklySchedule.filter((s) => s.type === "training").length} turnos por semana completa.`
                  : "Sin un objetivo semanal fijo comparable."}
              </p>
            </section>
          </div>
          <section className="progress-section">
            <p className="progress-kicker">DÓNDE CONCENTRAS EL TRABAJO</p>
            <h2>Distribución muscular</h2>
            <AppChart
              loading={isLoading}
              title="Series por grupo muscular"
              kind="bar"
              horizontal
              height={Math.max(220, muscleRows.length * 38)}
              description="Series completadas asignadas al grupo principal registrado, sin duplicar músculos secundarios. Haz clic en una barra o en la tabla para filtrar."
              unit="series"
              labels={muscleRows.map(([m]) => m)}
              series={[
                { name: "Series", values: muscleRows.map(([, n]) => n) },
              ]}
              onSelect={(i) =>
                handleFilters({ ...filters, muscle: muscleRows[i][0] })
              }
            />
            {filters.muscle && (
              <button
                className="progress-reset"
                onClick={() => handleFilters({ ...filters, muscle: "" })}
              >
                Quitar filtro: {filters.muscle}
              </button>
            )}
          </section>
          {!isLoading && validRange && (
            <ActivityHeatmap
              sessions={current}
              from={filters.from}
              to={filters.to}
              onSelect={(date) =>
                handleFilters({ ...filters, from: date, to: date })
              }
            />
          )}
          {queries.plans.isSuccess && !isLoading && (
            <PlanComparison
              plans={plans}
              sessions={sessions}
              routines={routines}
              filters={filters}
            />
          )}
          {!isLoading && <ExerciseProgress sessions={current} />}
          {isLoading ? (
            <div
              className="progress-skeleton"
              style={{ height: 180 }}
              role="status"
              aria-label="Cargando conclusiones"
            />
          ) : (
            <ProgressInsights
              records={records}
              summary={summary}
              delta={delta}
            />
          )}
          {!isLoading && <RecentWorkouts sessions={current} />}
        </>
      )}
      <footer className="progress-footnote">
        Datos de tu historial · Series marcadas como completadas · Rangos
        1M/3M/6M/1Y de 30/90/180/365 días · Sin puntuaciones artificiales.
      </footer>
    </section>
  );
}
