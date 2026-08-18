import { useEffect, useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Database,
  Dumbbell,
  Gauge,
  HeartPulse,
  Layers3,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { api } from "../services/api";
import { useThemeMode } from "../hooks/useThemeMode";
import { nivoTheme } from "../utils/nivoTheme";
import OperationLoader from "../components/system/OperationLoader";
import PremiumGate from "../components/shared/PremiumGate";
import { useAuth } from "../context/AuthContext";
import { hasPremiumFeature, PREMIUM_FEATURES } from "../utils/premium";

const compact = (value) => {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1_000_000)
    return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return Math.round(number).toLocaleString("es-BO");
};

const formatDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
      })
    : "--";

const correlationLabel = (value) => {
  if (value === null || value === undefined) return "Sin datos";
  const strength = Math.abs(value);
  if (strength >= 0.7) return "Fuerte";
  if (strength >= 0.4) return "Moderada";
  return "Debil";
};

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
      </div>
      <p className="mt-3 text-2xl font-black leading-none">{value}</p>
      <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
        {detail}
      </p>
    </article>
  );
}

function SectionHeader({ eyebrow, title, meta }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black uppercase leading-none">
          {title}
        </h2>
      </div>
      {meta ? (
        <span className="text-[11px] font-bold text-[color:var(--text-muted)]">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 overflow-hidden bg-[color:var(--border)]">
      <div
        className="h-full bg-[#ff5722] dark:bg-[#e2ff00]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function EmptyData() {
  return (
    <div className="grid min-h-72 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
      <div>
        <Database className="mx-auto h-8 w-8 text-[#ff5722] dark:text-[#e2ff00]" />
        <h2 className="mt-3 text-xl font-black uppercase">
          Aun no hay una muestra analizable
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-[color:var(--text-muted)]">
          El panel se habilitara con tus sesiones registradas. Las predicciones
          requieren al menos tres semanas de historial.
        </p>
      </div>
    </div>
  );
}

const decisionState = {
  optimal: {
    label: "Condicion optima",
    tone: "text-emerald-600 dark:text-[#e2ff00]",
    icon: CheckCircle2,
  },
  caution: {
    label: "Entrenar con ajustes",
    tone: "text-amber-600 dark:text-amber-300",
    icon: AlertTriangle,
  },
  recovery: {
    label: "Priorizar recuperacion",
    tone: "text-red-600 dark:text-red-300",
    icon: HeartPulse,
  },
};

const factorTone = {
  positive: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  negative: "border-red-500/30 bg-red-500/5",
  neutral: "border-[color:var(--border)] bg-[color:var(--bg)]",
};

function DecisionSupport({ decision }) {
  if (!decision) return null;
  const state = decisionState[decision.state] || decisionState.caution;
  const StateIcon = state.icon;
  const adjustment = decision.adjustment || {};
  const adjustmentText =
    adjustment.minPercent === 0
      ? `0 a +${adjustment.maxPercent}%`
      : `${adjustment.minPercent}% a ${adjustment.maxPercent}%`;
  return (
    <div className="space-y-5">
      <section className="grid gap-4 border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div className="grid h-24 w-24 place-items-center border border-[color:var(--border)] bg-[color:var(--bg)]">
          <div className="text-center">
            <p className={`text-3xl font-black ${state.tone}`}>
              {decision.score}
            </p>
            <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
              de 100
            </p>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <StateIcon className={`h-5 w-5 ${state.tone}`} />
            <h2 className={`text-xl font-black uppercase ${state.tone}`}>
              {state.label}
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-6">
            {decision.recommendation}
          </p>
          <p className="mt-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Confianza {decision.confidence} · Ajuste sugerido {adjustmentText}
          </p>
          <p className="mt-2 text-[10px] font-semibold text-[color:var(--text-muted)]">
            Orientacion deportiva basada en tus registros; no sustituye una
            evaluacion medica.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard
          label="Carga 7 dias"
          value={`${compact(decision.load.acuteVolume)} kg`}
          detail={
            decision.load.ratio
              ? `${Math.round(decision.load.ratio * 100)}% del patron previo`
              : "Aun sin patron comparable"
          }
          icon={Gauge}
        />
        <MetricCard
          label="Sesiones"
          value={decision.load.sessionsLast7Days}
          detail={`${decision.load.consecutiveDays} dias consecutivos`}
          icon={Activity}
        />
        <MetricCard
          label="Adherencia"
          value={
            decision.adherence.percentage === null
              ? "--"
              : `${decision.adherence.percentage}%`
          }
          detail={
            decision.adherence.target
              ? `${decision.adherence.completed}/${decision.adherence.target} sesiones del plan`
              : "Sin plan activo"
          }
          icon={CheckCircle2}
        />
        <MetricCard
          label="Peso 30 dias"
          value={
            decision.weight.change30dPercent === null
              ? "--"
              : `${decision.weight.change30dPercent > 0 ? "+" : ""}${decision.weight.change30dPercent}%`
          }
          detail={`${decision.weight.observations} pesajes considerados`}
          icon={TrendingUp}
        />
      </section>

      <section>
        <SectionHeader
          eyebrow="Explicabilidad"
          title="Factores de la recomendacion"
          meta={`${decision.factors.length} señales`}
        />
        <div className="grid gap-2 md:grid-cols-2">
          {decision.factors.map((factor) => (
            <article
              key={factor.code}
              className={`border p-4 ${factorTone[factor.tone] || factorTone.neutral}`}
            >
              <p className="text-sm font-black">{factor.label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-muted)]">
                {factor.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const progressionStatus = {
  progressing: {
    label: "Progresando",
    tone: "text-emerald-600 dark:text-[#e2ff00]",
  },
  plateau: {
    label: "Estancamiento",
    tone: "text-amber-600 dark:text-amber-300",
  },
  declining: { label: "En descenso", tone: "text-red-600 dark:text-red-300" },
  stable: { label: "Estable", tone: "text-[color:var(--text)]" },
  limited: { label: "Datos limitados", tone: "text-[color:var(--text-muted)]" },
};

function ExerciseProgression({ progression }) {
  if (!progression?.items?.length) {
    return (
      <div className="grid min-h-64 place-items-center border border-dashed border-[color:var(--border)] text-center">
        <div>
          <Dumbbell className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
          <p className="mt-3 text-sm font-black">Sin ejercicios analizables</p>
          <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Registra cargas y repeticiones para construir tendencias.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <MetricCard
          label="Ejercicios"
          value={progression.exercisesAnalyzed}
          detail="con carga y repeticiones"
          icon={Dumbbell}
        />
        <MetricCard
          label="Acciones"
          value={progression.actionable}
          detail="tendencias que requieren revision"
          icon={BrainCircuit}
        />
        <MetricCard
          label="Estado"
          value={progression.available ? "Listo" : "Inicial"}
          detail="se requieren 3 sesiones por ejercicio"
          icon={Database}
        />
      </section>
      <section>
        <SectionHeader
          eyebrow="Progresion inteligente"
          title="Siguiente accion por ejercicio"
          meta="1RM estimado"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {progression.items.map((exercise) => {
            const status =
              progressionStatus[exercise.status] || progressionStatus.stable;
            return (
              <article
                key={exercise.exerciseId}
                className="border border-[color:var(--border)] bg-[color:var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">
                      {exercise.name}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                      {exercise.muscleGroup} · {exercise.sessionCount} sesiones
                      · confianza {exercise.confidence}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-black uppercase ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] py-3 text-center">
                  <div>
                    <p className="text-lg font-black">
                      {exercise.current.oneRM} kg
                    </p>
                    <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      1RM estimado
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-black">
                      {exercise.current.weight} × {exercise.current.reps}
                    </p>
                    <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Mejor serie
                    </p>
                  </div>
                  <div>
                    <p className={`text-lg font-black ${status.tone}`}>
                      {exercise.changePercent === null
                        ? "--"
                        : `${exercise.changePercent > 0 ? "+" : ""}${exercise.changePercent}%`}
                    </p>
                    <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Tendencia
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-l-2 border-[#ff5722] pl-3 dark:border-[#e2ff00]">
                  <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                    Siguiente accion
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5">
                    {exercise.suggestion}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function DataIntelligencePage({
  coachAthlete = null,
  onNavigate,
}) {
  const { user } = useAuth();
  const { isDark } = useThemeMode();
  const [activeTab, setActiveTab] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await api.getTrainingIntelligence(coachAthlete?.id || ""));
    } catch (requestError) {
      setError(requestError.message || "No se pudo generar el analisis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // `load` only depends on the selected coach context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachAthlete?.id]);

  const weeklyChart = useMemo(
    () =>
      (data?.weekly || []).slice(-16).map((item) => ({
        ...item,
        label: formatDate(item.week),
      })),
    [data?.weekly],
  );
  const accent = isDark ? "#e2ff00" : "#ff5722";
  const canUseAdvanced =
    hasPremiumFeature(user, PREMIUM_FEATURES.LOAD_RECOVERY) &&
    hasPremiumFeature(user, PREMIUM_FEATURES.EXERCISE_PROGRESSION);

  return (
    <main className="analytics-shell mx-auto w-full max-w-md space-y-4 pb-24 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]">
      <header className="border-b border-[color:var(--border)] pb-4">
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          Analitica aplicada
        </p>
        <h1 className="mt-1 text-[30px] font-black uppercase leading-none md:text-[36px]">
          Inteligencia de datos
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] font-semibold text-[color:var(--text-muted)]">
          Decide como entrenar hoy y cual debe ser el siguiente paso en cada
          ejercicio usando tu historial real.
        </p>
      </header>

      <nav
        className="grid grid-cols-4 border border-[color:var(--border)] bg-[color:var(--card)] p-1"
        aria-label="Secciones del analisis"
      >
        {[
          ["today", "Hoy"],
          ["progression", "Progreso"],
          ["overview", "Tendencias"],
          ["data", "Datos"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`h-10 min-w-0 px-1 text-[10px] font-black uppercase sm:px-4 sm:text-[11px] ${
              activeTab === id
                ? "theme-accent-solid"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="min-h-72 border border-[color:var(--border)] bg-[color:var(--card)]">
          <OperationLoader
            active
            delayMs={0}
            mode="inline"
            title="Procesando historial"
            description="Preparando metricas, tendencias y modelos analiticos."
          />
        </div>
      ) : error ? (
        <div className="border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm font-bold text-red-500">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 h-10 border border-red-500/40 px-4 text-xs font-black uppercase text-red-500"
          >
            Reintentar
          </button>
        </div>
      ) : !data?.dataset?.sessions ? (
        <EmptyData />
      ) : (
        <>
          {activeTab === "today" ? (
            canUseAdvanced && data.advanced?.available ? (
              <DecisionSupport decision={data.advanced.decisionSupport} />
            ) : (
              <PremiumGate
                plan={user?.role === "Entrenador" ? "Coach Pro" : "Athlete Pro"}
                title="Decisiones de carga y recuperacion"
                description="Combina actividad, check-ins, adherencia y pesajes para recomendar como entrenar hoy."
                onNavigate={onNavigate}
              />
            )
          ) : null}

          {activeTab === "progression" ? (
            canUseAdvanced && data.advanced?.available ? (
              <ExerciseProgression
                progression={data.advanced.exerciseProgression}
              />
            ) : (
              <PremiumGate
                plan={user?.role === "Entrenador" ? "Coach Pro" : "Athlete Pro"}
                title="Progresion inteligente por ejercicio"
                description="Detecta progresos, estancamientos y descensos para sugerir la siguiente carga."
                onNavigate={onNavigate}
              />
            )
          ) : null}

          {activeTab === "overview" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <MetricCard
                  label="Sesiones"
                  value={data.dataset.sessions}
                  detail={`${data.dataset.firstDate || "--"} a ${data.dataset.lastDate || "--"}`}
                  icon={Activity}
                />
                <MetricCard
                  label="Volumen total"
                  value={`${compact(data.totals.volume)} kg`}
                  detail={`${compact(data.totals.sets)} series`}
                  icon={TrendingUp}
                />
                <MetricCard
                  label="Observaciones"
                  value={compact(data.dataset.setEntries)}
                  detail="series con carga y repeticiones"
                  icon={Database}
                />
                <MetricCard
                  label="Calidad"
                  value={`${data.dataset.completeness}%`}
                  detail="campos utiles completos"
                  icon={Sigma}
                />
              </section>

              <section>
                <SectionHeader
                  eyebrow="Visualizacion"
                  title="Carga semanal"
                  meta={`${weeklyChart.length} semanas`}
                />
                <div className="h-64 border border-[color:var(--border)] bg-[color:var(--card)] p-2 sm:h-72 sm:p-3">
                  <ResponsiveBar
                    data={weeklyChart}
                    keys={["volume"]}
                    indexBy="label"
                    theme={nivoTheme(isDark ? "dark" : "light")}
                    margin={{ top: 12, right: 8, bottom: 36, left: 48 }}
                    padding={0.28}
                    colors={accent}
                    borderRadius={2}
                    enableLabel={false}
                    axisBottom={{ tickRotation: -25, tickPadding: 8 }}
                    axisLeft={{ tickPadding: 6, format: compact }}
                    enableGridX={false}
                    tooltip={({ data: point }) => (
                      <div className="border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-xl">
                        <p className="font-black">Semana del {point.label}</p>
                        <p>
                          {compact(point.volume)} kg · {point.sessions} sesiones
                        </p>
                        <p className="text-[color:var(--text-muted)]">
                          {point.sets} series ·{" "}
                          {Math.round(point.durationMinutes)} min
                        </p>
                      </div>
                    )}
                  />
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                        Prediccion analitica
                      </p>
                      <h2 className="mt-1 text-xl font-black uppercase">
                        Proxima semana
                      </h2>
                    </div>
                    <BrainCircuit className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                  </div>
                  {data.prediction.available ? (
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[color:var(--border)] pt-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                          Volumen previsto
                        </p>
                        <p className="mt-1 text-3xl font-black">
                          {compact(data.prediction.nextWeekVolume)}{" "}
                          <span className="text-sm">kg</span>
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                          Rango 80%: {compact(data.prediction.lower80)}–
                          {compact(data.prediction.upper80)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                          Tendencia
                        </p>
                        <p
                          className={`mt-1 text-3xl font-black ${data.prediction.trendPercent >= 0 ? "text-[#ff5722] dark:text-[#e2ff00]" : "text-red-500"}`}
                        >
                          {data.prediction.trendPercent > 0 ? "+" : ""}
                          {data.prediction.trendPercent}%
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                          Confianza {data.prediction.confidence} · R²{" "}
                          {data.prediction.r2}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-[color:var(--border)] pt-4 text-sm font-semibold text-[color:var(--text-muted)]">
                      {data.prediction.reason}
                    </p>
                  )}
                </div>

                <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                        Control de datos
                      </p>
                      <h2 className="mt-1 text-xl font-black uppercase">
                        Anomalias
                      </h2>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    {data.anomalies.length}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    sesiones fuera del patron habitual
                  </p>
                  {data.anomalies[0] ? (
                    <div className="mt-4 border-t border-[color:var(--border)] pt-3 text-xs">
                      <p className="font-black">
                        {data.anomalies[0].routineName}
                      </p>
                      <p className="mt-1 text-[color:var(--text-muted)]">
                        {formatDate(data.anomalies[0].date)} ·{" "}
                        {compact(data.anomalies[0].volume)} kg · carga{" "}
                        {data.anomalies[0].direction}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "statistics" ? (
            <div className="space-y-6">
              <section>
                <SectionHeader
                  eyebrow="Estadistica aplicada"
                  title="Distribucion por sesion"
                  meta={`${data.dataset.sessions} observaciones`}
                />
                <div className="overflow-x-auto border border-[color:var(--border)] bg-[color:var(--card)]">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-[color:var(--bg)] text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-3">Variable</th>
                        <th>Media</th>
                        <th>Mediana</th>
                        <th>P25–P75</th>
                        <th>Desv. est.</th>
                        <th>Variacion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border)] text-[13px] font-bold">
                      {[
                        ["Volumen (kg)", data.descriptive.volume],
                        ["Duracion (min)", data.descriptive.duration],
                        ["Series", data.descriptive.sets],
                      ].map(([label, stats]) => (
                        <tr key={label}>
                          <td className="px-4 py-3 font-black">{label}</td>
                          <td>{compact(stats.mean)}</td>
                          <td>{compact(stats.median)}</td>
                          <td>
                            {compact(stats.p25)}–{compact(stats.p75)}
                          </td>
                          <td>{compact(stats.standardDeviation)}</td>
                          <td>{stats.coefficientVariation}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                {[
                  [
                    "Volumen y duracion",
                    data.descriptive.correlations.volumeDuration,
                  ],
                  [
                    "Volumen y series",
                    data.descriptive.correlations.volumeSets,
                  ],
                ].map(([label, value]) => (
                  <article
                    key={label}
                    className="border border-[color:var(--border)] bg-[color:var(--card)] p-4"
                  >
                    <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                      Correlacion de Pearson
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black uppercase">
                          {label}
                        </h3>
                        <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                          Relacion {correlationLabel(value).toLowerCase()}
                        </p>
                      </div>
                      <p className="text-3xl font-black text-[#ff5722] dark:text-[#e2ff00]">
                        {value ?? "--"}
                      </p>
                    </div>
                  </article>
                ))}
              </section>

              <section>
                <SectionHeader
                  eyebrow="Deteccion estadistica"
                  title="Sesiones atipicas"
                  meta="|z| ≥ 1.8"
                />
                <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] bg-[color:var(--card)]">
                  {data.anomalies.length ? (
                    data.anomalies.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)_120px_80px] sm:items-center"
                      >
                        <p className="text-xs font-black">
                          {formatDate(item.date)}
                        </p>
                        <p className="truncate text-sm font-bold">
                          {item.routineName}
                        </p>
                        <p className="text-sm font-black">
                          {compact(item.volume)} kg
                        </p>
                        <span
                          className={`justify-self-end text-xs font-black ${item.direction === "alta" ? "text-[#ff5722] dark:text-[#e2ff00]" : "text-red-500"}`}
                        >
                          z {item.zScore}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">
                      No se detectaron sesiones fuera del patron.
                    </p>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "models" ? (
            <div className="space-y-6">
              <section className="grid gap-3 lg:grid-cols-2">
                <article className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                        Modelo predictivo
                      </p>
                      <h2 className="mt-1 text-xl font-black uppercase">
                        Regresion lineal
                      </h2>
                    </div>
                    <TrendingUp className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] py-3 text-center">
                    <div>
                      <p className="text-2xl font-black">
                        {data.prediction.sampleSize}
                      </p>
                      <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                        Semanas
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-black">
                        {data.prediction.available ? data.prediction.r2 : "--"}
                      </p>
                      <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                        R²
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-black">
                        {data.prediction.available
                          ? compact(data.prediction.slopePerWeek)
                          : "--"}
                      </p>
                      <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                        kg/sem
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    Estado:{" "}
                    {data.prediction.available
                      ? `confianza ${data.prediction.confidence}`
                      : data.prediction.reason}
                  </p>
                </article>

                <article className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                        Machine Learning
                      </p>
                      <h2 className="mt-1 text-xl font-black uppercase">
                        Segmentacion de carga
                      </h2>
                    </div>
                    <Layers3 className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                  </div>
                  {data.machineLearning.available ? (
                    <div className="mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                      {data.machineLearning.clusters.map((cluster) => (
                        <div
                          key={cluster.label}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-black">
                              {cluster.label}
                            </p>
                            <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                              {compact(cluster.averageVolume)} kg ·{" "}
                              {cluster.averageSets} series ·{" "}
                              {cluster.averageDuration} min
                            </p>
                          </div>
                          <span className="theme-accent-soft px-2 py-1 text-[10px] font-black">
                            {cluster.share}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm font-semibold text-[color:var(--text-muted)]">
                      {data.machineLearning.reason}
                    </p>
                  )}
                </article>
              </section>

              <section className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                      Deep Learning
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase">
                      Preparacion del dataset
                    </h2>
                  </div>
                  <BrainCircuit className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                  <div>
                    <p className="text-4xl font-black">
                      {data.deepLearning.readiness}%
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                      Preparacion
                    </p>
                  </div>
                  <div>
                    <ProgressBar value={data.deepLearning.readiness} />
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                      <span>
                        {data.deepLearning.currentSessions}/
                        {data.deepLearning.requiredSessions} sesiones
                      </span>
                      <span>
                        {data.deepLearning.sequenceCoverage}% secuencias
                        completas
                      </span>
                      <span>{data.deepLearning.modelType}</span>
                    </div>
                  </div>
                </div>
                <p
                  className={`mt-4 border-t border-[color:var(--border)] pt-3 text-xs font-black uppercase ${data.deepLearning.ready ? "text-emerald-600 dark:text-[#e2ff00]" : "text-[color:var(--text-muted)]"}`}
                >
                  {data.deepLearning.ready
                    ? "Dataset listo para entrenamiento controlado"
                    : "Modelo no entrenado: muestra insuficiente"}
                </p>
              </section>
            </div>
          ) : null}

          {activeTab === "data" ? (
            <div className="space-y-6">
              <section>
                <SectionHeader
                  eyebrow="Big Data"
                  title="Flujo de procesamiento"
                  meta={`${data.dataset.setEntries} registros utiles`}
                />
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    [
                      Database,
                      "Almacenamiento",
                      data.infrastructure.storage,
                      `${data.dataset.sessions} sesiones persistidas`,
                    ],
                    [
                      Layers3,
                      "Procesamiento",
                      data.infrastructure.aggregation,
                      `hasta ${data.dataset.recordLimit} sesiones por analisis`,
                    ],
                    [
                      Cloud,
                      "Entrega",
                      data.infrastructure.delivery,
                      `${data.infrastructure.rawRowsSent} filas crudas enviadas`,
                    ],
                  ].map(([Icon, label, value, detail]) => (
                    <article
                      key={label}
                      className="border border-[color:var(--border)] bg-[color:var(--card)] p-4"
                    >
                      <Icon className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                      <p className="mt-4 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-black">{value}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                        {detail}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                      Calidad del dataset
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase">
                      Cobertura analitica
                    </h2>
                  </div>
                  <Database className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs font-black">
                    <span>Campos completos</span>
                    <span>{data.dataset.completeness}%</span>
                  </div>
                  <ProgressBar value={data.dataset.completeness} />
                </div>
                <div className="mt-5 grid grid-cols-3 divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] py-3 text-center">
                  <div>
                    <p className="text-2xl font-black">
                      {compact(data.dataset.sessions)}
                    </p>
                    <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Sesiones
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">
                      {compact(data.dataset.exerciseObservations)}
                    </p>
                    <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Ejercicios
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">
                      {compact(data.dataset.setEntries)}
                    </p>
                    <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                      Entradas
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-[color:var(--text-muted)]">
                  Ventana: {data.dataset.firstDate || "--"} a{" "}
                  {data.dataset.lastDate || "--"} · agregado en servidor ·
                  respuesta sin series crudas.
                </p>
              </section>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
