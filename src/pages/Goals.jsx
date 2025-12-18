import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import { useTrainingData } from "../context/TrainingContext";
import { toast } from "sonner";

const initialGoals = {
  bench1rm: { label: "Press Banca (1RM)", current: 0, target: 0, muscle: "Pecho" },
  deadlift1rm: { label: "Peso Muerto (1RM)", current: 0, target: 0, muscle: "Espalda/Femoral" },
  squat1rm: { label: "Sentadilla (1RM)", current: 0, target: 0, muscle: "Piernas" },
  bodyweight: { label: "Peso Corporal", current: 0, target: 0, muscle: "General" },
  sessionsWeek: { label: "Entrenamientos por semana", current: 0, target: 0, muscle: "General" },
};

const goalExerciseMap = {
  bench1rm: ["press-de-banca", "press-de-banca-inclinado-con-barra", "press-de-banca-con-barra"],
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
        if (!best[key] || oneRM > best[key].oneRM) best[key] = { oneRM, name, muscle };
      });
    });
  });
  return best;
};

export default function Goals() {
  const { goals, saveGoals, trainings = [], setGoals } = useTrainingData();
  const [form, setForm] = useState(initialGoals);
  const [saving, setSaving] = useState(false);

  const bestOneRM = useMemo(() => computeBestOneRM(trainings), [trainings]);

  useEffect(() => {
    const next = { ...initialGoals, ...(goals || {}) };
    const bestOverall = Math.max(...Object.values(bestOneRM).map((b) => b.oneRM), 0);
    // Prefill current con best 1RM de los ejercicios mapeados si es mayor
    Object.entries(goalExerciseMap).forEach(([goalKey, exIds]) => {
      const bestForGoal = Math.max(...exIds.map((id) => bestOneRM[id]?.oneRM || 0), 0);
      const candidate = bestForGoal > 0 ? bestForGoal : bestOverall;
      if (candidate > 0) {
        const currentStored = Number(next[goalKey]?.current || 0);
        next[goalKey] = {
          ...next[goalKey],
          current: Math.max(currentStored, Number(candidate.toFixed(1))),
        };
      }
    });
    // Agregar todos los ejercicios con best 1RM como objetivos adicionales
    Object.entries(bestOneRM).forEach(([exId, obj]) => {
      if (!next[exId]) {
        next[exId] = {
          label: obj.name || exId,
          current: Number(obj.oneRM.toFixed(1)),
          target: Number(obj.oneRM.toFixed(1)),
          muscle: obj.muscle || "General",
        };
      } else {
        next[exId] = {
          ...next[exId],
          label: next[exId].label || obj.name || exId,
          muscle: next[exId].muscle || obj.muscle || "General",
          current: Math.max(Number(next[exId].current || 0), Number(obj.oneRM.toFixed(1))),
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
      // Optimistic update for instant feedback
      if (setGoals) setGoals(form);
      toast.success("Objetivos guardados correctamente");
      await saveGoals(form);
    } catch (e) {
      console.error("No se pudo guardar objetivos", e);
      if (setGoals) setGoals(prevGoals);
      toast.error("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-8">Objetivos</h1>
          <p className="text-sm leading-6 text-[color:var(--text-muted)]">
            Define tus metas de fuerza, peso corporal y frecuencia semanal. Se precargan con tus mejores marcas registradas.
          </p>
        </div>

        <Card className="p-5 space-y-5 border border-[color:var(--border)] shadow-sm bg-[color:var(--card)]">
          {Object.entries(
            Object.entries(form).reduce((acc, [key, obj]) => {
              const group = obj.muscle || "General";
              if (!acc[group]) acc[group] = [];
              acc[group].push({ key, obj });
              return acc;
            }, {})
          ).map(([group, items]) => (
            <div key={group} className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)]/60 px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {group}
                </p>
                <span className="text-[11px] font-medium text-[color:var(--text-muted)]">
                  {items.length} objetivo{items.length !== 1 ? "s" : ""}
                </span>
              </div>
              {items
                .sort((a, b) => (a.obj.label || a.key).localeCompare(b.obj.label || b.key))
                .map(({ key, obj }) => (
                  <div key={key} className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold leading-6">{obj.label}</p>
                      {obj.muscle && (
                        <p className="text-[11px] text-[color:var(--text-muted)]">Grupo: {obj.muscle}</p>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[11px] text-[color:var(--text-muted)]">Actual</label>
                      <input
                        type="number"
                        className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-sm"
                        value={obj.current}
                        onChange={(e) => handleChange(key, "current", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[11px] text-[color:var(--text-muted)]">Meta</label>
                      <input
                        type="number"
                        className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 text-sm"
                        value={obj.target}
                        onChange={(e) => handleChange(key, "target", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar objetivos"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
