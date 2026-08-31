import { useEffect, useState } from "react";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import OperationLoader from "../components/system/OperationLoader";
import PremiumGate from "../components/shared/PremiumGate";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserContext";
import { api } from "../services/api";
import { hasPremiumFeature, PREMIUM_FEATURES } from "../utils/premium";

const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "es-BO",
        { day: "numeric", month: "short" },
      )
    : "--";

const formatSessions = (value) => {
  const count = Number(value) || 0;
  return `${count} ${count === 1 ? "sesión" : "sesiones"}`;
};

function MetricCard({ label, value, detail, className = "" }) {
  return (
    <article
      className={`dashboard-pilot__metric dashboard-weekly-metric overflow-hidden rounded-lg bg-[color:var(--card)] ${className}`}
    >
      <p className="dashboard-weekly-metric__label text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="dashboard-weekly-metric__value-row flex items-end gap-1.5">
        <span className="dashboard-weekly-metric__value text-[color:var(--text)]">
          {value}
        </span>
      </div>
      <div className="dashboard-weekly-metric__footer">
        <span>{detail}</span>
      </div>
    </article>
  );
}

function SectionHeader({ title, meta }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="dashboard-pilot__section-label text-xs font-semibold uppercase text-[color:var(--text-muted)]">
        {title}
      </h2>
      {meta ? (
        <span className="text-xs font-medium text-[color:var(--text-muted)]">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function EmptyData() {
  return (
    <div className="dashboard-pilot__card rounded-lg bg-[color:var(--card)] px-6 py-12 text-center">
      <h2 className="text-xl font-semibold">Aún no hay datos suficientes</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--text-muted)]">
        Registra al menos tres semanas de entrenamiento para empezar a detectar
        tendencias útiles.
      </p>
    </div>
  );
}

const decisionState = {
  optimal: {
    label: "Puedes entrenar como estaba previsto",
    tone: "text-emerald-700 dark:text-[#e2ff00]",
  },
  caution: {
    label: "Entrena con ajustes",
    tone: "text-amber-700 dark:text-amber-300",
  },
  recovery: {
    label: "Prioriza la recuperación",
    tone: "text-red-600 dark:text-red-300",
  },
};

function DecisionSupport({ decision }) {
  if (!decision) return null;
  const state = decisionState[decision.state] || decisionState.caution;
  const target = Number(decision.adherence?.target) || 0;
  const completed = Number(decision.adherence?.completed) || 0;
  const latestCheckIn = decision.latestCheckIn;

  return (
    <div className="space-y-6">
      <section className="dashboard-pilot__card overflow-hidden rounded-lg bg-[color:var(--card)]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[color:var(--text-muted)]">
                Recomendación para hoy
              </p>
              <h2
                className={`mt-1.5 text-2xl font-semibold leading-tight tracking-[-0.03em] ${state.tone}`}
              >
                {state.label}
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-semibold tracking-[-0.04em]">
                {decision.score}
              </p>
              <p className="text-[10px] text-[color:var(--text-muted)]">
                de 100
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6">
            {decision.recommendation}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[color:var(--detail-row-divider)] px-5 py-3 text-xs text-[color:var(--text-muted)] sm:px-6">
          <span>Confianza {decision.confidence}</span>
          {!latestCheckIn ? <span>Falta tu estado diario</span> : null}
        </div>
      </section>

      <section className="dashboard-weekly-grid md:!grid-cols-3">
        <MetricCard
          label="Últimos 7 días"
          value={decision.load.sessionsLast7Days}
          detail={
            decision.load.consecutiveDays > 1
              ? `${decision.load.consecutiveDays} días seguidos`
              : "sin acumulación de días"
          }
        />
        <MetricCard
          label="Plan semanal"
          value={target ? `${completed}/${target}` : "--"}
          detail={target ? "sesiones completadas" : "sin objetivo activo"}
        />
        <MetricCard
          label="Estado diario"
          value={latestCheckIn ? latestCheckIn.score : "--"}
          className="col-span-2 md:col-span-1"
          detail={
            latestCheckIn
              ? `registrado el ${formatDate(latestCheckIn.dateKey)}`
              : "completa tu check-in"
          }
        />
      </section>

      <section>
        <SectionHeader
          title="Qué estamos considerando"
          meta={`${decision.factors.length} ${decision.factors.length === 1 ? "señal" : "señales"}`}
        />
        <div className="dashboard-pilot__card divide-y divide-[color:var(--detail-row-divider)] overflow-hidden rounded-lg bg-[color:var(--card)]">
          {decision.factors.map((factor) => (
            <div key={factor.code} className="px-4 py-3.5">
              <p className="text-sm font-medium">{factor.label}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                {factor.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const progressionStatus = {
  progressing: {
    label: "Mejorando",
    tone: "text-emerald-700 dark:text-[#e2ff00]",
  },
  plateau: {
    label: "Sin cambios",
    tone: "text-amber-700 dark:text-amber-300",
  },
  declining: {
    label: "Revisar",
    tone: "text-red-600 dark:text-red-300",
  },
  stable: { label: "Estable", tone: "text-[color:var(--text)]" },
  limited: {
    label: "Faltan datos",
    tone: "text-[color:var(--text-muted)]",
  },
};

function ExerciseProgression({ progression }) {
  if (!progression?.items?.length) {
    return (
      <div className="dashboard-pilot__card rounded-lg bg-[color:var(--card)] px-6 py-10 text-center">
        <p className="text-base font-semibold">Aún no podemos comparar ejercicios</p>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Registra cargas y repeticiones en varias sesiones.
        </p>
      </div>
    );
  }

  return (
    <section>
      <SectionHeader
        title="Progreso por ejercicio"
        meta={`${progression.exercisesAnalyzed} analizados`}
      />
      <div className="dashboard-pilot__card divide-y divide-[color:var(--detail-row-divider)] overflow-hidden rounded-lg bg-[color:var(--card)]">
        {progression.items.map((exercise) => {
          const status =
            progressionStatus[exercise.status] || progressionStatus.stable;
          const trend =
            exercise.changePercent === null
              ? "Aún sin tendencia"
              : `${exercise.changePercent > 0 ? "+" : ""}${exercise.changePercent}%`;

          return (
            <article key={exercise.exerciseId} className="px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-5">
                    {exercise.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                    {exercise.muscleGroup} · {formatSessions(exercise.sessionCount)}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${status.tone}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span>
                  Última serie: {exercise.current.weight} kg × {exercise.current.reps}
                </span>
                <span className={status.tone}>{trend}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                {exercise.suggestion}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function DataIntelligencePage({
  coachAthlete = null,
  onNavigate,
}) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
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
      setError(requestError.message || "No se pudo generar el análisis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // `load` only depends on the selected coach context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachAthlete?.id]);

  const canUseAdvanced =
    hasPremiumFeature(user, PREMIUM_FEATURES.LOAD_RECOVERY) &&
    hasPremiumFeature(user, PREMIUM_FEATURES.EXERCISE_PROGRESSION);

  return (
    <main className="dashboard-shell dashboard-pilot data-intelligence-page mx-auto w-full max-w-md space-y-6 px-[6px] pb-10 pt-0 text-[color:var(--text)] md:max-w-5xl md:space-y-4 md:px-0 xl:max-w-6xl 2xl:max-w-[1280px]">
      <MobilePageHeader
        title="Inteligencia"
        actions={
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-main-menu"))}
            className="dashboard-mobile-avatar h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--card)]"
            aria-label="Abrir menú principal"
          >
            <ProfileAvatar
              photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
              name={profile?.name || user?.name}
              className="h-full w-full"
              fallbackClassName="bg-[#ead8dd] text-sm font-semibold text-[#4a2430]"
            />
          </button>
        }
      />
      <header className="dashboard-pilot__header hidden items-center border-b border-transparent pb-3 md:flex dark:border-[#252525] dark:pb-4">
        <h1 className="text-[22px] font-bold leading-none tracking-[-0.035em] md:text-3xl">
          Inteligencia
        </h1>
      </header>

      <nav
        className="grid grid-cols-2 rounded-xl bg-[color:var(--segmented-surface)] p-1"
        aria-label="Secciones del análisis"
      >
        {[
          ["today", "Hoy"],
          ["progression", "Ejercicios"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`h-10 rounded-lg px-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? "theme-accent-solid shadow-sm"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="dashboard-pilot__card min-h-72 rounded-lg bg-[color:var(--card)]">
          <OperationLoader
            active
            delayMs={0}
            mode="inline"
            title="Analizando tu historial"
            description="Preparando recomendaciones y tendencias."
          />
        </div>
      ) : error ? (
        <div className="dashboard-pilot__card rounded-lg border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm font-medium text-red-500">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 h-10 rounded-xl border border-red-500/40 px-4 text-sm font-medium text-red-500"
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
                title="Recomendación para hoy"
                description="Combina tu actividad, estado diario y planificación para ayudarte a decidir cómo entrenar."
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
                title="Progreso por ejercicio"
                description="Compara tus sesiones y muestra dónde mejoras o necesitas revisar la carga."
                onNavigate={onNavigate}
              />
            )
          ) : null}
        </>
      )}
    </main>
  );
}
