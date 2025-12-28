import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Spinner from "../components/ui/spinner";
import { useTrainingData } from "../context/TrainingContext";
import { toast } from "sonner";

const initialGoals = {
  bench1rm: {
    label: "Press Banca (1RM)",
    current: 0,
    target: 0,
    muscle: "Pecho",
  },
  deadlift1rm: {
    label: "Peso Muerto (1RM)",
    current: 0,
    target: 0,
    muscle: "Espalda/Femoral",
  },
  squat1rm: {
    label: "Sentadilla (1RM)",
    current: 0,
    target: 0,
    muscle: "Piernas",
  },
  bodyweight: {
    label: "Peso Corporal",
    current: 0,
    target: 0,
    muscle: "General",
  },
  sessionsWeek: {
    label: "Entrenamientos por semana",
    current: 0,
    target: 0,
    muscle: "General",
  },
};

const goalExerciseMap = {
  bench1rm: [
    "press-de-banca",
    "press-de-banca-inclinado-con-barra",
    "press-de-banca-con-barra",
  ],
  deadlift1rm: ["peso-muerto"],
  squat1rm: ["sentadilla-con-barra", "sentadilla-hacka"],
};

const computeBestOneRM = (trainings = []) => {
  const best = {};
  trainings.forEach((t) => {
    (t.exercises || []).forEach((ex) => {
      const name = ex.exerciseName || ex.exerciseId;
      const muscle = ex.muscleGroup || ex.muscle || "General";
      (ex.sets || []).forEach((s) => {
        const w = Number(s.weightKg || 0);
        const r = Number(s.reps || 0);
        if (!w || !r) return;
        const oneRM = w * (1 + r / 30);
        const key = ex.exerciseId || ex.exerciseName;
        if (!best[key] || oneRM > best[key].oneRM)
          best[key] = { oneRM, name, muscle };
      });
    });
  });
  return best;
};

/** UI helpers */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const format1 = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toFixed(1) : "0.0";

const unitForGoal = (label = "", key = "") => {
  const t = (label || key).toLowerCase();
  if (t.includes("entren")) return ""; // sesiones/semana
  return "kg";
};

const iconForGroup = (group) => {
  const g = (group || "").toLowerCase();
  // SVG mini “badge” icons como screenshot (solo estética)
  const base = "h-10 w-10 rounded-2xl grid place-items-center";
  if (g.includes("pecho"))
    return (
      <div
        className={`${base} bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 7l10 10M17 7L7 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  if (g.includes("espalda") || g.includes("femoral"))
    return (
      <div
        className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4v16M7 8h10M7 16h10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  if (g.includes("general"))
    return (
      <div
        className={`${base} bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12h16M12 4v16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  return (
    <div
      className={`${base} bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-200`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l9 9-9 9-9-9 9-9Z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default function Goals() {
  const { goals, saveGoals, trainings = [], setGoals } = useTrainingData();
  const [form, setForm] = useState(initialGoals);
  const [saving, setSaving] = useState(false);

  const bestOneRM = useMemo(() => computeBestOneRM(trainings), [trainings]);

  useEffect(() => {
    const next = { ...initialGoals, ...(goals || {}) };
    const bestOverall = Math.max(
      ...Object.values(bestOneRM).map((b) => b.oneRM),
      0
    );

    Object.entries(goalExerciseMap).forEach(([goalKey, exIds]) => {
      const bestForGoal = Math.max(
        ...exIds.map((id) => bestOneRM[id]?.oneRM || 0),
        0
      );
      const candidate = bestForGoal > 0 ? bestForGoal : bestOverall;
      if (candidate > 0) {
        const currentStored = Number(next[goalKey]?.current || 0);
        const shouldFill = !currentStored;
        next[goalKey] = {
          ...next[goalKey],
          current: shouldFill
            ? Number(candidate.toFixed(1))
            : currentStored,
        };
      }
    });

    Object.entries(bestOneRM).forEach(([exId, obj]) => {
      if (!next[exId]) {
        next[exId] = {
          label: obj.name || exId,
          current: Number(obj.oneRM.toFixed(1)),
          target: Number(obj.oneRM.toFixed(1)),
          muscle: obj.muscle || "General",
        };
      } else {
        const currentStored = Number(next[exId].current || 0);
        const shouldFill = !currentStored;
        next[exId] = {
          ...next[exId],
          label: next[exId].label || obj.name || exId,
          muscle: next[exId].muscle || obj.muscle || "General",
          current: shouldFill
            ? Number(obj.oneRM.toFixed(1))
            : currentStored,
        };
      }
    });

    setForm(next);
  }, [goals, bestOneRM]);

  const handleChange = (key, field, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: Number(value) || 0 },
    }));
  };

  const handleSave = async () => {
    const prevGoals = goals;
    try {
      setSaving(true);
      if (setGoals) setGoals(form);
      const saved = await saveGoals(form);
      if (saved?.goals) setForm(saved.goals);
      toast.success("Objetivos guardados correctamente");
    } catch (e) {
      console.error("No se pudo guardar objetivos", e);
      if (setGoals) setGoals(prevGoals);
      toast.error("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  /** Grouped data for UI */
  const groups = useMemo(() => {
    const grouped = Object.entries(form).reduce((acc, [key, obj]) => {
      const group = obj.muscle || "General";
      if (!acc[group]) acc[group] = [];
      acc[group].push({ key, obj });
      return acc;
    }, {});
    return Object.entries(grouped).map(([group, items]) => {
      const sorted = items
        .slice()
        .sort((a, b) =>
          (a.obj.label || a.key).localeCompare(b.obj.label || b.key)
        );
      return [group, sorted];
    });
  }, [form]);

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Header (como screenshot) */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Objetivos
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Define tus metas de fuerza y peso corporal. ¡Supera tus marcas!
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              className="h-10 w-10 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] grid place-items-center"
              aria-label="Perfil"
              title="Perfil"
            >
              <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 grid place-items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                🙂
              </div>
            </button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl hidden sm:inline-flex"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4 text-white" />
                  Guardando...
                </span>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-6">
          {groups.map(([group, items]) => (
            <section key={group} className="space-y-3">
              {/* Group header row */}
              <div
                className="flex items-center justify-between rounded-2xl bg-slate-50/80 border border-slate-200/70 px-4 py-3
                              dark:bg-white/5 dark:border-[color:var(--border)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {iconForGroup(group)}
                  <p className="text-base font-semibold truncate">{group}</p>
                </div>

                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
                                 bg-slate-100 text-slate-700 border border-slate-200
                                 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  {items.length} objetivo{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Cards list */}
              <div className="space-y-3">
                {items.map(({ key, obj }) => {
                  const current = Number(obj.current || 0);
                  const target = Number(obj.target || 0);
                  const unit = unitForGoal(obj.label, key);
                  const done = target > 0 && current >= target;

                  const pct =
                    target > 0 ? clamp((current / target) * 100, 0, 100) : 0;
                  const remaining =
                    target > 0 ? Math.max(0, target - current) : 0;

                  const barBg =
                    "h-2 w-full rounded-full bg-slate-200/80 dark:bg-slate-800";
                  const barFill = done
                    ? "h-2 rounded-full bg-emerald-500"
                    : "h-2 rounded-full bg-blue-600";

                  return (
                    <Card key={key} className="p-4">
                      {/* top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-[color:var(--text)] truncate">
                            {obj.label}
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                            Grupo: {obj.muscle || "General"}
                          </p>
                        </div>

                        {/* right action: edit OR check */}
                        {done ? (
                          <div
                            className="h-8 w-8 rounded-full bg-emerald-500 grid place-items-center text-white shrink-0"
                            title="Objetivo alcanzado"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M20 6 9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="h-8 w-8 rounded-full grid place-items-center text-[color:var(--text-muted)]
                                       hover:bg-[color:var(--bg)] transition shrink-0"
                            aria-label="Editar"
                            title="Editar"
                            onClick={() => {
                              // “editar” aquí solo enfoca UX; la edición real es con inputs abajo
                              // no cambia lógica
                              const el = document.getElementById(
                                `goal-target-${key}`
                              );
                              el?.focus?.();
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M12 20h9"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* ACTUAL / META */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
                            ACTUAL
                          </p>

                          {/* input visible pero “bonito” */}
                          <div className="mt-1 flex items-end gap-2">
                            <input
                              type="number"
                              value={obj.current}
                              onChange={(e) =>
                                handleChange(key, "current", e.target.value)
                              }
                              className="w-full max-w-[140px] text-2xl font-bold tracking-tight bg-transparent
                                         border-b border-[color:var(--border)] focus:outline-none focus:border-blue-400"
                            />
                            <span className="text-sm font-semibold text-[color:var(--text-muted)]">
                              {unit}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
                            META
                          </p>

                          <div className="mt-1 flex items-end justify-end gap-2">
                            <input
                              id={`goal-target-${key}`}
                              type="number"
                              value={obj.target}
                              onChange={(e) =>
                                handleChange(key, "target", e.target.value)
                              }
                              className="w-full max-w-[140px] text-2xl font-bold tracking-tight bg-transparent text-blue-600
                                         border-b border-[color:var(--border)] focus:outline-none focus:border-blue-400 text-right"
                            />
                            <span className="text-sm font-semibold text-[color:var(--text-muted)]">
                              {unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className={barBg}>
                          <div
                            className={barFill}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-[color:var(--text-muted)]">
                          {target > 0 ? (
                            <>
                              <span>{Math.round(pct)}% completado</span>
                              {done ? (
                                <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                                  ¡Objetivo alcanzado!
                                </span>
                              ) : (
                                <span>
                                  Faltan {format1(remaining)} {unit}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>Define una meta para ver el progreso.</span>
                          )}
                        </div>
                      </div>

                      {/* Special chip like “Configurar” for general non-kg goals (optional) */}
                      {String(obj.label || "")
                        .toLowerCase()
                        .includes("entren") ? (
                        <div className="mt-3 flex justify-end">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
                                           bg-rose-50 text-rose-700 border border-rose-200
                                           dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-400/25"
                          >
                            Configurar
                          </span>
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Floating + button (como screenshot) */}
      <button
        type="button"
        className="
          fixed bottom-6 right-6
          h-14 w-14 rounded-2xl
          bg-blue-600 text-white shadow-lg
          grid place-items-center
          hover:bg-blue-700 active:bg-blue-800
          focus:outline-none focus:ring-2 focus:ring-blue-500/40
        "
        aria-label="Agregar objetivo"
        title="Agregar objetivo"
        onClick={() =>
          toast.message("Próximo paso: flujo para agregar objetivo (UI)")
        }
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Save button on mobile */}
      <div className="sm:hidden fixed left-0 right-0 bottom-0 p-3 bg-[color:var(--bg)]/90 backdrop-blur border-t border-[color:var(--border)]">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4 text-white" />
              Guardando...
            </span>
          ) : (
            "Guardar objetivos"
          )}
        </Button>
      </div>
    </main>
  );
}
