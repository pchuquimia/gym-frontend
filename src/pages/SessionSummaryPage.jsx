import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ChevronDown } from "lucide-react";
import {
  compareExercise,
  compareMuscle,
  summarizeSession,
} from "../utils/sessionAnalytics";
import { useTrainingData } from "../context/TrainingContext";
import { useRoutines } from "../context/RoutineContext";
import { getExerciseImageUrl } from "../utils/cloudinary";

const formatDateLong = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "--";

const formatDelta = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const formatNumber = (value, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return num.toFixed(digits);
};

const deltaBadgeClass = (value) => {
  if (value === null || value === undefined || Number.isNaN(value))
    return "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]";
  if (value >= 1)
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (value <= -1)
    return "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
};

const formatMuscleLabel = (value) => {
  if (!value) return "Otros";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const flattenSets = (sets = []) =>
  (sets || []).flatMap((set) => {
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : null;
    if (!entries) {
      return [
        {
          weightKg: Number(set?.weightKg ?? set?.weight ?? set?.kg ?? 0) || 0,
          reps: Number(set?.reps ?? 0) || 0,
        },
      ];
    }
    return entries.map((entry) => ({
      weightKg: Number(entry?.weightKg ?? entry?.weight ?? entry?.kg ?? 0) || 0,
      reps: Number(entry?.reps ?? 0) || 0,
    }));
  });

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
        {children}
      </h2>
    </div>
  );
}

function MetricTile({ label, value, suffix = "", refValue }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black leading-none text-[color:var(--text)]">
        {value}
        {suffix ? (
          <span className="ml-1 text-[10px] font-bold text-[color:var(--text-muted)]">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
        {refValue}
      </p>
    </div>
  );
}

function SessionSummaryPage({
  sessions: propSessions = [],
  currentSession: propCurrentSession,
  onViewExerciseAnalytics = null,
  onNavigate = null,
}) {
  const { trainings: ctxTrainings = [], exercises: exerciseMeta = [] } =
    useTrainingData();
  const { routines = [] } = useRoutines();

  const [selectedId, setSelectedId] = useState(() => {
    if (typeof localStorage !== "undefined")
      return localStorage.getItem("last_training_id") || null;
    return null;
  });
  const [showList, setShowList] = useState(false);
  const [menuRoutine, setMenuRoutine] = useState("");

  const routineBranch = useMemo(() => {
    const map = new Map();
    routines.forEach((r) => map.set(r.id, r.branch || "general"));
    return map;
  }, [routines]);

  const normalizedCtxSessions = useMemo(() => {
    if (!ctxTrainings.length) return [];
    return ctxTrainings
      .map((t) => ({
        id: t.id || t._id || `${t.date}-${t.routineId || ""}`,
        date: t.date,
        routineName: t.routineName || "Entrenamiento",
        routineBranch: routineBranch.get(t.routineId) || "general",
        exercises: (t.exercises || []).map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          muscleGroup:
            ex.muscleGroup ||
            exerciseMeta.find((m) => m.id === ex.exerciseId)?.muscle ||
            "Sin grupo",
          sets: flattenSets(ex.sets || []),
        })),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [ctxTrainings, exerciseMeta, routineBranch]);

  const { currentSummary, currentDate, currentId } = useMemo(() => {
    const baseSessions = propSessions.length
      ? propSessions
      : normalizedCtxSessions;

    if (!baseSessions.length)
      return {
        currentSummary: summarizeSession({}),
        currentDate: "",
        currentId: "",
      };

    const sorted = baseSessions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const current =
      propCurrentSession ||
      sorted.find((s) => s.id === selectedId) ||
      sorted[0];

    return {
      currentSummary: summarizeSession(current || {}),
      currentDate: current?.date,
      currentId: current?.id,
    };
  }, [propSessions, normalizedCtxSessions, propCurrentSession, selectedId]);

  const historySummaries = useMemo(() => {
    const baseSessions = propSessions.length
      ? propSessions
      : normalizedCtxSessions;
    return baseSessions
      .map((s) => summarizeSession(s))
      .filter((s) => s && s.date);
  }, [propSessions, normalizedCtxSessions]);

  const muscleComparisons = useMemo(() => {
    const groups = currentSummary.groups || {};
    return Object.keys(groups)
      .map((key) => compareMuscle(currentSummary, historySummaries, key))
      .filter(Boolean)
      .map((entry) => ({
        ...entry,
        label: formatMuscleLabel(entry.muscleKey),
      }));
  }, [currentSummary, historySummaries]);

  const highlightMuscles = useMemo(() => {
    return muscleComparisons;
  }, [muscleComparisons]);

  const exerciseComparisons = useMemo(() => {
    const list = currentSummary.exercises || [];
    return list
      .map(
        (ex) =>
          compareExercise(currentSummary, historySummaries, ex.exerciseId) || {
            today: ex,
            ref: null,
            delta: null,
            status: "Sin referencia",
            refCount: 0,
          }
      )
      .filter(Boolean);
  }, [currentSummary, historySummaries]);

  const exerciseGroupsBySessionOrder = useMemo(() => {
    const groups = [];
    const indexByMuscle = new Map();

    exerciseComparisons.forEach((entry, index) => {
      const muscleKey = entry.today?.muscleGroup || "Sin grupo";
      if (!indexByMuscle.has(muscleKey)) {
        indexByMuscle.set(muscleKey, groups.length);
        groups.push({
          key: muscleKey,
          label: formatMuscleLabel(muscleKey),
          items: [],
        });
      }
      groups[indexByMuscle.get(muscleKey)].items.push({
        ...entry,
        sessionOrder: index + 1,
      });
    });

    return groups;
  }, [exerciseComparisons]);

  const handleViewProgress = (exerciseId) => {
    if (onViewExerciseAnalytics) onViewExerciseAnalytics(exerciseId);
    else if (onNavigate) onNavigate("ejercicio_analitica");
  };

  const groupedSessions = useMemo(() => {
    const map = new Map();
    normalizedCtxSessions.forEach((s) => {
      const key = s.routineName || "Sin rutina";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries()).map(([routine, list]) => {
      const sorted = list
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return [routine, sorted.slice(0, 6)];
    });
  }, [normalizedCtxSessions]);

  const selectedRoutineName =
    propCurrentSession?.routineName ||
    normalizedCtxSessions.find((s) => s.id === currentId)?.routineName ||
    "Seleccionar sesión";

  return (
  <div className="mx-auto w-full max-w-5xl space-y-4 pb-24">
    <header className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
          {formatDateLong(currentDate || "")}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
          Últimas 7 sesiones
        </span>
      </div>

      {normalizedCtxSessions.length > 0 && (
        <section className="relative rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
          <button
            type="button"
            onClick={() => setShowList((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                Sesión reciente
              </p>
              <p className="mt-1 truncate text-base font-bold text-[color:var(--text)]">
                {selectedRoutineName}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition ${
                showList ? "rotate-180" : ""
              }`}
            />
          </button>

          {showList && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setShowList(false)}
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden"
              />

              <div
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl md:max-w-[520px]"
                role="dialog"
                aria-label="Sesiones recientes"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Seleccionar sesión
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowList(false)}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                  <div className="md:border-r border-[color:var(--border)]">
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
                        Rutinas
                      </p>
                    </div>

                    <div className="max-h-56 md:max-h-80 overflow-auto pb-2">
                      {groupedSessions.map(([routine]) => {
                        const active = routine === menuRoutine;
                        return (
                          <button
                            key={routine}
                            type="button"
                            onClick={() =>
                              setMenuRoutine((prev) =>
                                prev === routine ? "" : routine
                              )
                            }
                            className={`w-full text-left px-4 py-2.5 text-sm transition ${
                              active
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                : "text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">
                                {routine}
                              </span>
                              <span
                                className={`text-xs ${
                                  active
                                    ? "text-blue-700/80 dark:text-blue-300/80"
                                    : "text-[color:var(--text-muted)]"
                                }`}
                              >
                                ›
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
                        Fechas
                      </p>
                    </div>

                    <div className="max-h-56 md:max-h-80 overflow-auto pb-2">
                      {menuRoutine ? (
                        (groupedSessions.find(
                          ([r]) => r === menuRoutine
                        )?.[1] || []).map((s) => {
                          const isCurrent = s.id === currentId;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedId(s.id);
                                setShowList(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition ${
                                isCurrent
                                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">
                                    {formatDateLong(s.date)}
                                  </p>
                                  <p className="text-xs text-[color:var(--text-muted)] truncate">
                                    {s.routineName}
                                  </p>
                                </div>

                                <span className="shrink-0 inline-flex items-center rounded-full bg-[color:var(--bg)] text-[color:var(--text)] text-[11px] px-2 py-0.5">
                                  {s.routineBranch || "general"}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-10 text-sm text-[color:var(--text-muted)]">
                          Selecciona una rutina para ver sus fechas.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </header>

    <section className="space-y-3">
      <SectionTitle>Por grupo muscular</SectionTitle>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {highlightMuscles.length ? (
          highlightMuscles.map((muscle) => (
            <span
              key={muscle.muscleKey}
              className={`inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-[11px] font-black ${deltaBadgeClass(
                muscle.delta
              )}`}
            >
              {muscle.label} {formatDelta(muscle.delta)}
            </span>
          ))
        ) : (
          <span className="text-xs text-[color:var(--text-muted)]">
            Sin comparativos recientes.
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {muscleComparisons.length ? (
          muscleComparisons.map((muscle) => {
            const today = muscle.today || {};
            const ref = muscle.ref || {};
            return (
              <article
                key={muscle.muscleKey}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-[color:var(--text)]">
                      {muscle.label}
                    </p>
                    <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                      Ref: {muscle.refCount || 0} entrenamientos
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${deltaBadgeClass(
                      muscle.delta
                    )}`}
                  >
                    {formatDelta(muscle.delta)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MetricTile label="Índice fuerza" value={formatNumber(today.strengthIndex, 1)} refValue={`Avg 7: ${formatNumber(ref.strengthIndex, 1)}`} />
                  <MetricTile label="Volumen" value={`${formatNumber(today.volume, 0)}`} suffix="kg·reps" refValue={`Avg 7: ${formatNumber(ref.volume, 0)}`} />
                  <MetricTile label="Sets" value={formatNumber(today.setsCount, 0)} refValue={`Avg 7: ${formatNumber(ref.setsCount, 1)}`} />
                  <MetricTile label="Mejor 1RM" value={formatNumber(today.bestOneRM, 1)} suffix="kg" refValue={`Avg 7: ${formatNumber(ref.bestOneRM, 1)} kg`} />
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--text-muted)]">
            Aún no hay datos por grupo muscular.
          </div>
        )}
      </div>
    </section>

    <section className="space-y-3">
      <SectionTitle>Ejercicios de la sesión</SectionTitle>

      <div className="space-y-4">
        {exerciseGroupsBySessionOrder.length ? (
          exerciseGroupsBySessionOrder.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[color:var(--text)]">
                  {group.label}
                </h3>
                <span className="rounded-full bg-[color:var(--card)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                  {group.items.length} ejercicios
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((entry) => {
                  const ex = entry.today || {};
                  const topSet = ex.topSet || {};
                  const meta = exerciseMeta.find(
                    (item) => item.id === ex.exerciseId,
                  );
                  const imageUrl = meta
                    ? getExerciseImageUrl(meta, { width: 160, height: 160 })
                    : "";
                  return (
                    <article
                      key={`${group.key}-${ex.exerciseId}-${entry.sessionOrder}`}
                      className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]"
                    >
                      <div className="flex items-start gap-3 p-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)]">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={ex.exerciseName}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[11px] text-[color:var(--text-muted)]">
                              Sin imagen
                            </div>
                          )}
                          <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded bg-slate-950/75 px-1 text-[10px] font-black text-white">
                            {entry.sessionOrder}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[color:var(--text)]">
                            {ex.exerciseName}
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            Orden realizado #{entry.sessionOrder}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${deltaBadgeClass(
                            entry.delta,
                          )}`}
                        >
                          {formatDelta(entry.delta)}
                        </span>
                      </div>

                      <div className="mx-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Hoy
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-[color:var(--text-muted)]">
                              Top set
                            </p>
                            <p className="text-base font-semibold text-[color:var(--text)]">
                              {formatNumber(topSet.weightKg, 1)} kg x{" "}
                              {topSet.reps ?? "--"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-[color:var(--text-muted)]">
                              1RM estimado
                            </p>
                            <p className="text-base font-semibold text-[color:var(--text)]">
                              {formatNumber(ex.oneRMTop, 1)} kg
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[color:var(--border)] pt-3 text-[11px] text-[color:var(--text-muted)]">
                          <div>
                            <p className="uppercase tracking-[0.2em]">
                              Volumen
                            </p>
                            <p className="text-sm font-semibold text-[color:var(--text)]">
                              {formatNumber(ex.volume, 0)} kg·reps
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="uppercase tracking-[0.2em]">
                              Sets / reps
                            </p>
                            <p className="text-sm font-semibold text-[color:var(--text)]">
                              {ex.setsCount || 0} sets · {ex.repsTotal || 0}{" "}
                              reps
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewProgress(ex.exerciseId)}
                        className="mt-4 w-full bg-[color:var(--bg)] px-3 py-3 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                      >
                        Ver progreso detallado
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--text-muted)]">
            Aún no hay ejercicios registrados en esta sesión.
          </div>
        )}
      </div>
    </section>

    {!normalizedCtxSessions.length && (
      <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--text-muted)]">
        Aún no hay sesiones guardadas para mostrar el resumen.
      </div>
    )}
  </div>
);
}

SessionSummaryPage.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object),
  currentSession: PropTypes.object,
  onViewExerciseAnalytics: PropTypes.func,
  onNavigate: PropTypes.func,
};

export default SessionSummaryPage;


