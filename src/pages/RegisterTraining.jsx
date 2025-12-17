import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flag, MoreVertical } from "lucide-react";
import { Toaster, toast } from "sonner";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import SessionHeader from "../components/training/SessionHeader";
import RoutineSelector from "../components/training/RoutineSelector";
import ExerciseCard from "../components/training/ExerciseCard";
import BottomActionBar from "../components/training/BottomActionBar";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";

const todayISO = new Date().toISOString().slice(0, 10);
const STORAGE_KEY = "active_training";

const formatLongDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatShort = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      })
    : "--";

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const applyHistoryToExercises = (list, historyMap) =>
  (list || []).map((ex) => {
    const hist =
      historyMap.get(ex.id) ||
      historyMap.get(slugify(ex.name || "")) ||
      historyMap.get(ex.exerciseId || "") ||
      historyMap.get(slugify(ex.exerciseName || ""));
    const histSets = hist?.sets || [];
    const prFromHist =
      hist && (hist.weight || hist.reps)
        ? `Ult: ${hist.weight || "--"}kg x ${hist.reps || "--"} | ${formatShort(hist.date)}`
        : null;

    const sets = (ex.sets || []).map((set, idx) => {
      const prev = histSets[idx] || histSets[histSets.length - 1] || {};
      const hasPrev = prev.weight || prev.reps;
      if (!hasPrev) return set;
      const label = `${prev.weight || "--"}kg x ${prev.reps || "--"} | ${formatShort(hist?.date)}`;
      return {
        ...set,
        previousText: !set.previousText || set.previousText === "Sin referencia" ? label : set.previousText,
        kg: set.kg || (prev.weight ? prev.weight : ""),
        reps: set.reps || (prev.reps ? prev.reps : ""),
      };
    });

    return {
      ...ex,
      prText:
        !ex.prText || ex.prText.toLowerCase().includes("sin referencia") || ex.prText.toLowerCase().includes("ult:")
          ? prFromHist || ex.prText || "Sin referencia"
          : ex.prText,
      sets,
    };
  });

export default function RegisterTraining({ onNavigate = () => {} }) {
  const { routines, loading: routinesLoading } = useRoutines();
  const { exercises: libraryExercises, trainings, sessions } = useTrainingData();

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sessionDate, setSessionDate] = useState(todayISO);
  const timerRef = useRef(null);

  const mergeMeta = (ex) => {
    const meta =
      libraryExercises.find(
        (m) =>
          m.id === ex.id ||
          m.id === ex.exerciseId ||
          slugify(m.name || "") === slugify(ex.name || "") ||
          slugify(m.name || "") === slugify(ex.exerciseName || "")
      ) || {};
    const image =
      ex.image ||
      meta.image ||
      meta.photoUrl ||
      meta.url ||
      meta.thumbnail ||
      (Array.isArray(meta.photos) && meta.photos[0]?.url) ||
      "";
    const muscle = ex.muscle || meta.muscle || ex.muscleGroup || meta.muscleGroup || "Sin grupo";
    return { ...ex, image, muscle };
  };

  const routineOptions = useMemo(
    () =>
      (routines || []).map((r) => ({
        id: r.id,
        name: r.name,
        location: r.branch || "general",
        exerciseCount: (r.exercises || []).length,
        lastDate: formatShort(r.updatedAt || r.createdAt) || "--",
        raw: r,
      })),
    [routines]
  );

  const historyByExercise = useMemo(() => {
    const map = new Map();
    const saveIfNewer = (key, payload) => {
      if (!key) return;
      const current = map.get(key);
      const currentDate = current?.date ? new Date(current.date).getTime() : 0;
      const thisDate = payload.date ? new Date(payload.date).getTime() : 0;
      if (thisDate >= currentDate) map.set(key, payload);
    };

    const normalizeSets = (sets = []) =>
      sets.map((s) => ({
        weight: Number(s.weightKg ?? s.weight ?? s.kg) || 0,
        reps: Number(s.reps ?? s.rep) || 0,
        done: Boolean(s.done),
      }));

    const addEntry = (id, name, date, sets) => {
      const slug = name ? slugify(name) : null;
      const normSets = normalizeSets(sets);
      const payload = {
        date,
        sets: normSets,
        weight: normSets.at(-1)?.weight || 0,
        reps: normSets.at(-1)?.reps || 0,
      };
      saveIfNewer(id, payload);
      saveIfNewer(slug, payload);
    };

    (Array.isArray(sessions) ? sessions : []).forEach((s) => {
      addEntry(s.exerciseId || s.id, s.exerciseName || s.name, s.date || s.createdAt, s.sets || []);
    });

    (Array.isArray(trainings) ? trainings : []).forEach((tr) => {
      const date = tr.date || tr.createdAt;
      (tr.exercises || []).forEach((ex) => {
        addEntry(ex.exerciseId || ex.id, ex.exerciseName || ex.name, date, ex.sets || []);
      });
    });

    return map;
  }, [sessions, trainings]);

  const buildExercisesForRoutine = (routine) => {
    const list = routine?.exercises || [];
    return list.map((ex, idx) => {
      const meta =
        libraryExercises.find(
          (m) => m.id === ex.exerciseId || m.id === ex.id || m.name?.toLowerCase() === ex.name?.toLowerCase()
        ) || {};
      const id = ex.exerciseId || ex.id || slugify(ex.name || `ex-${idx}`);
      const setsCount = Number(ex.sets) || 3;
      const hist =
        historyByExercise.get(id) ||
        historyByExercise.get(slugify(ex.name || "")) ||
        historyByExercise.get(meta.id) ||
        historyByExercise.get(slugify(meta.name || ""));
      const histSets = hist?.sets || [];
      const sets = Array.from({ length: setsCount }).map((_, sIdx) => {
        const prev = histSets[sIdx] || histSets[histSets.length - 1] || {};
        const hasPrev = prev.weight || prev.reps;
        return {
          id: `${id}-set-${sIdx}`,
          previousText: hasPrev
            ? `${prev.weight || "--"}kg x ${prev.reps || "--"} | ${formatShort(hist?.date)}`
            : "Sin referencia",
          kg: hasPrev ? prev.weight : "",
          reps: hasPrev ? prev.reps : "",
          done: Boolean(prev.done),
        };
      });
      const headerText =
        hist && (hist.weight || hist.reps)
          ? `Ult: ${hist.weight || "--"}kg x ${hist.reps || "--"} | ${formatShort(hist.date)}`
          : meta.pr || meta.prText || "Sin referencia";
      return {
        id,
        name: ex.name || meta.name || "Ejercicio",
        prText: headerText,
        image: ex.image || meta.image || "",
        muscle: ex.muscle || ex.muscleGroup || meta.muscle || meta.muscleGroup || "Sin grupo",
        sets,
      };
    });
  };

  useEffect(() => {
    if (!routineOptions.length) return;
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        const snap = JSON.parse(raw);
        const current = routineOptions.find((r) => r.id === snap.selectedRoutineId) || routineOptions[0];
        setSelectedRoutineId(current.id);
        setSelectedRoutine(current);
        if (snap.dateISO) setSessionDate(snap.dateISO);
        const hydrated = applyHistoryToExercises(
          snap.exercises || buildExercisesForRoutine(current.raw),
          historyByExercise
        ).map(mergeMeta);
        setExercises(hydrated);
        setIsRunning(Boolean(snap.isRunning));
        const now = Date.now();
        const baseElapsed = Number(snap.elapsed || 0);
        if (snap.isRunning && snap.startTimestamp) {
          setDurationSeconds(baseElapsed + Math.floor((now - snap.startTimestamp) / 1000));
        } else {
          setDurationSeconds(baseElapsed);
        }
        return;
      } catch (e) {
        console.warn("No se pudo hidratar entrenamiento activo", e);
      }
    }
    const current = routineOptions.find((r) => r.id === selectedRoutineId) || routineOptions[0];
    setSelectedRoutineId(current.id);
    setSelectedRoutine(current);
    setSessionDate(todayISO);
    setExercises(applyHistoryToExercises(buildExercisesForRoutine(current.raw), historyByExercise).map(mergeMeta));
    setIsRunning(false);
  }, [routineOptions, selectedRoutineId, libraryExercises, historyByExercise]);

  const sanitizeExercisesForStorage = (list = []) =>
    list.map((ex) => ({
      id: ex.id,
      name: ex.name,
      prText: ex.prText,
      muscle: ex.muscle,
      sets: (ex.sets || []).map((s) => ({
        id: s.id,
        previousText: s.previousText,
        kg: s.kg,
        reps: s.reps,
        done: s.done,
      })),
    }));

  const saveSnapshot = (override = {}, options = {}) => {
    if (typeof localStorage === "undefined") return;
    let current = {};
    try {
      current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      current = {};
    }
    const baseExercises = override.exercises ?? current.exercises ?? exercises;
    const sanitizedExercises = options.light
      ? current.exercises ?? sanitizeExercisesForStorage(exercises)
      : sanitizeExercisesForStorage(baseExercises);

    const snap = {
      selectedRoutineId: override.selectedRoutineId ?? current.selectedRoutineId ?? selectedRoutineId,
      exercises: sanitizedExercises,
      isRunning: override.isRunning ?? current.isRunning ?? isRunning,
      startTimestamp:
        override.startTimestamp ?? current.startTimestamp ?? (override.isRunning ?? isRunning ? Date.now() : null),
      elapsed: override.elapsed ?? current.elapsed ?? durationSeconds,
      dateISO: override.dateISO ?? current.dateISO ?? sessionDate,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (err) {
      console.warn("No se pudo guardar el entrenamiento activo (quota?)", err);
    }
  };

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }
    timerRef.current = setInterval(() => {
      setDurationSeconds((sec) => {
        const next = sec + 1;
        saveSnapshot({ elapsed: next, isRunning: true, startTimestamp: Date.now() }, { light: true });
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    saveSnapshot({ isRunning: true, startTimestamp: Date.now() });
    toast.success("Entrenamiento iniciado");
  };

  const handlePause = () => {
    setIsRunning(false);
    saveSnapshot({ isRunning: false, startTimestamp: null });
  };

  const handleReset = () => {
    setIsRunning(false);
    setDurationSeconds(0);
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  };

  const handleSelectRoutine = (id) => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setSelectedRoutineId(id);
  };

  const handleAddSet = (exerciseId) => {
    let nextExercises = [];
    setExercises((prev) => {
      nextExercises = prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                { id: `${exerciseId}-set-${Date.now()}`, previousText: "Sin referencia", kg: "", reps: "", done: false },
              ],
            }
          : ex
      );
      return nextExercises;
    });
    toast.success("Set anadido");
    saveSnapshot({ exercises: nextExercises });
  };

  const handleUpdateSet = (exerciseId, setId, field, value) => {
    let nextExercises = [];
    setExercises((prev) => {
      nextExercises = prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : ex
      );
      return nextExercises;
    });
    saveSnapshot({ exercises: nextExercises });
  };

  const handleToggleDone = (exerciseId, setId) => {
    let nextExercises = [];
    setExercises((prev) => {
      nextExercises = prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)) }
          : ex
      );
      return nextExercises;
    });
    saveSnapshot({ exercises: nextExercises });
  };

  const handleRemoveSet = (exerciseId, setId) => {
    let nextExercises = [];
    setExercises((prev) => {
      nextExercises = prev.map((ex) => (ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex));
      return nextExercises;
    });
    saveSnapshot({ exercises: nextExercises });
  };

  const handleRemoveExercise = (exerciseId) => {
    let nextExercises = [];
    setExercises((prev) => {
      nextExercises = prev.filter((ex) => ex.id !== exerciseId);
      return nextExercises;
    });
    toast("Ejercicio eliminado solo para hoy");
    saveSnapshot({ exercises: nextExercises });
  };

  const handleAddExercise = () => {
    const next = [
      ...exercises,
      {
        id: `extra-${Date.now()}`,
        name: "Nuevo ejercicio",
        prText: "Sin referencia previa",
        sets: [{ id: `extra-${Date.now()}-1`, previousText: "Previo: 0", kg: "", reps: "", done: false }],
      },
    ];
    setExercises(next);
    saveSnapshot({ exercises: next });
  };

  const handleFinish = () => {
    setIsRunning(false);
    toast.success("Entrenamiento finalizado");
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  };

  const totalSets = useMemo(() => exercises.reduce((acc, ex) => acc + ex.sets.length, 0), [exercises]);
  const selectorRoutine = selectedRoutine || routineOptions[0];
  const groupedExercises = useMemo(() => {
    const groups = new Map();
    exercises.forEach((ex) => {
      const key = ex.muscle || "Sin grupo";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(ex);
    });
    return Array.from(groups.entries());
  }, [exercises]);

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-md md:max-w-4xl lg:max-w-6xl px-4 pb-28 space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full border border-[color:var(--border)] h-10 w-10">
            <ArrowLeft className="h-5 w-5 text-[color:var(--text)]" />
          </Button>
          <h1 className="text-base font-semibold">Registrar Entrenamiento</h1>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-[color:var(--text-muted)]">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile static bar: duracion + finalizar (simula desktop) */}
        <div className="md:hidden sticky top-0 z-20 bg-[color:var(--bg)] pb-3">
        <div className="flex items-center gap-2">
          <Card className="flex-1 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">Duracion</p>
              <p className="text-base font-semibold text-[color:var(--text)]">
                  {String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:
                  {String(durationSeconds % 60).padStart(2, "0")}
                </p>
            </div>
            <div className="text-[11px] text-[color:var(--text-muted)]">LIVE</div>
          </Card>
          <Button
            className="flex-1 h-[52px] inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white"
            onClick={handleFinish}
            disabled={!exercises.length}
          >
            <Flag className="h-4 w-4" />
            <span>Finalizar</span>
          </Button>
        </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[360px,1fr]">
          <div className="space-y-4">
            <SessionHeader
              title="HOY"
              dateISO={sessionDate}
              durationSeconds={durationSeconds}
              isRunning={isRunning}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onChangeDate={(value) => {
                const nextDate = value || todayISO;
                setSessionDate(nextDate);
                saveSnapshot({ dateISO: nextDate }, { light: true });
              }}
            />

            <Card className="p-4 space-y-3">
              <p className="text-[11px] uppercase text-[color:var(--text-muted)] font-semibold">Rutina seleccionada</p>
              <RoutineSelector
                routine={
                  selectorRoutine || {
                    id: "sin-rutina",
                    name: routinesLoading ? "Cargando..." : "Sin rutinas",
                    location: "general",
                    exerciseCount: 0,
                    lastDate: "--",
                  }
                }
                routines={routineOptions}
                onSelect={handleSelectRoutine}
              />
              <div className="flex gap-2 pt-1">
                <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                  <Button className="w-full" onClick={handleStart} disabled={isRunning}>
                    Iniciar
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-[color:var(--border)] text-[color:var(--text)]"
                    onClick={handleReset}
                  >
                    Reiniciar
                  </Button>
                </motion.div>
              </div>
              <p className="text-xs text-[color:var(--text-muted)]">Ultimo: {selectorRoutine?.lastDate || "--"}</p>
            </Card>

            <Card className="p-4 space-y-1">
              <p className="text-sm font-semibold text-[color:var(--text)]">Resumen rapido</p>
              <p className="text-sm text-[color:var(--text-muted)]">Fecha: {formatLongDate(sessionDate)}</p>
              <p className="text-sm text-[color:var(--text-muted)]">Ejercicios: {exercises.length}</p>
              <p className="text-sm text-[color:var(--text-muted)]">Sets totales: {totalSets}</p>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)] font-semibold">
                  EJERCICIOS ({exercises.length})
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">En progreso</p>
              </div>
              <Badge className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100">Total sets: {totalSets}</Badge>
            </div>

            <div className="space-y-4">
              {groupedExercises.map(([muscle, items]) => (
                <div key={muscle} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-[color:var(--text)]">{muscle}</p>
                    <span className="text-[11px] text-[color:var(--text-muted)]">{items.length} ejercicios</span>
                  </div>
                  <AnimatePresence>
                    {items.map((ex) => (
                      <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        onAddSet={() => handleAddSet(ex.id)}
                        onUpdateSet={(setId, field, value) => handleUpdateSet(ex.id, setId, field, value)}
                        onToggleDone={(setId) => handleToggleDone(ex.id, setId)}
                        onRemoveSet={(setId) => handleRemoveSet(ex.id, setId)}
                        onRemoveExercise={() => handleRemoveExercise(ex.id)}
                        onViewHistory={() => {
                          if (typeof localStorage !== "undefined") localStorage.setItem("last_exercise_id", ex.id);
                          if (typeof onNavigate === "function") onNavigate("ejercicio_analitica");
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ))}

              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-dashed border-[color:var(--border)] text-[color:var(--text)] py-3"
                  onClick={handleAddExercise}
                >
                  + Anadir ejercicio
                </Button>
              </motion.div>
            </div>
          </section>
        </div>
      </div>

      <div className="hidden md:block">
        <BottomActionBar onFinish={handleFinish} disabled={!exercises.length} durationSeconds={durationSeconds} />
      </div>
    </main>
  );
}
