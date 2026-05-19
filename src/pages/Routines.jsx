import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Copy,
  Dumbbell,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import Modal from "../components/shared/Modal";
import { getExerciseImageUrl } from "../utils/cloudinary";
import { useRoutines } from "../context/RoutineContext";
import { useTrainingData } from "../context/TrainingContext";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";

const BRANCH_OPTIONS = ["sopocachi", "miraflores"];
const DEFAULT_BRANCH = "sopocachi";
const ROUTINE_LIBRARY_DRAFT_KEY = "routine_edit_library_draft";
const TRAINING_ROUTINES_RETURN_KEY = "training_routines_return";

const normalizeBranch = (value) =>
  BRANCH_OPTIONS.includes(value) ? value : DEFAULT_BRANCH;

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toValidDate = (value) => {
  if (!value) return null;
  const normalized =
    typeof value === "string" && value.length <= 10
      ? `${value}T00:00:00`
      : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatShortDate = (value) => {
  const d = toValidDate(value);
  if (!d) return "Sin registros";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

const getDateTimestamp = (value) => {
  const d = toValidDate(value);
  return d ? d.getTime() : 0;
};

const getISODateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const d = toValidDate(value);
  if (!d) return null;
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const branchLabel = (value) => {
  const branch = normalizeBranch(value);
  return branch.charAt(0).toUpperCase() + branch.slice(1);
};

const groupByMuscle = (items = []) => {
  const map = new Map();
  items.forEach((item, idx) => {
    const key = item.muscle || "Sin grupo";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ ...item, idx });
  });
  return Array.from(map.entries());
};

const exerciseMatchesBranch = (exercise, branch) => {
  const branches = exercise.branches || [];
  return branches.includes(branch) || branches.includes("general");
};

const readRoutineLibraryDraft = () => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(ROUTINE_LIBRARY_DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    return draft?.routine ? draft : null;
  } catch {
    return null;
  }
};

const hasTrainingReturn = () => {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(TRAINING_ROUTINES_RETURN_KEY));
};

const resolveExerciseFromLibrary = (availableExercises, entry = {}) => {
  const meta = availableExercises.find(
    (item) =>
      item.id === entry.exerciseId ||
      item.id === entry.id ||
      item.name === entry.name,
  );
  return {
    exerciseId:
      entry.exerciseId || entry.id || meta?.id || slugify(entry.name || ""),
    name: meta?.name || entry.name || "Ejercicio",
    muscle: meta?.muscle || entry.muscle || "Sin grupo",
    sets: Number(entry.sets) || 3,
    image: meta?.image || entry.image || "",
    imagePublicId: meta?.imagePublicId || entry.imagePublicId || "",
    supportsUnilateral: Boolean(
      entry.supportsUnilateral || meta?.supportsUnilateral,
    ),
    movementMode:
      entry.movementMode === "unilateral" ? "unilateral" : "bilateral",
    isExtra: Boolean(entry.isExtra),
    alternatives: (entry.alternatives || []).map((alt) =>
      resolveExerciseFromLibrary(availableExercises, alt),
    ),
  };
};

const movementModeFrom = (value) =>
  value === "unilateral" ? "unilateral" : "bilateral";

const movementOptions = [
  { id: "solo", label: "Solo bilateral" },
  { id: "bilateral", label: "Bilateral" },
  { id: "unilateral", label: "Unilateral" },
];

const movementOptionFrom = (exercise = {}) => {
  if (!exercise.supportsUnilateral && exercise.movementMode !== "unilateral") {
    return "solo";
  }
  return movementModeFrom(exercise.movementMode);
};

const applyMovementOption = (option) => ({
  supportsUnilateral: option !== "solo",
  movementMode: option === "unilateral" ? "unilateral" : "bilateral",
});

const serializeMovement = (exercise = {}) => {
  const movementMode = movementModeFrom(exercise.movementMode);
  return {
    supportsUnilateral: Boolean(
      exercise.supportsUnilateral || movementMode === "unilateral",
    ),
    movementMode,
  };
};

function RoutineModal({
  mode = "create",
  initialData,
  onSave,
  onClose,
  onOpenLibrary,
  availableExercises,
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [branch, setBranch] = useState(() =>
    normalizeBranch(initialData?.branch),
  );
  const [selectedMuscle, setSelectedMuscle] = useState(
    availableExercises?.[0]?.muscle || "Pecho",
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [exercises, setExercises] = useState(() =>
    (initialData?.exercises || []).map((ex) =>
      resolveExerciseFromLibrary(availableExercises, ex),
    ),
  );

  const muscleOptions = useMemo(() => {
    const set = new Set();
    availableExercises.forEach((ex) => {
      if (ex.muscle) set.add(ex.muscle);
    });
    return Array.from(set);
  }, [availableExercises]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableExercises
      .filter((ex) => exerciseMatchesBranch(ex, branch))
      .filter((ex) => !selectedMuscle || ex.muscle === selectedMuscle)
      .filter((ex) => !query || ex.name.toLowerCase().includes(query))
      .slice(0, 24);
  }, [availableExercises, branch, selectedMuscle, search]);

  const groupedSelected = useMemo(() => groupByMuscle(exercises), [exercises]);

  const addExercise = (exercise) => {
    if (!exercise || !exerciseMatchesBranch(exercise, branch)) {
      setError("Este ejercicio no esta disponible en la sede seleccionada.");
      return;
    }
    setError("");
    setExercises((prev) => [
      ...prev,
      {
        name: exercise.name,
        exerciseId: exercise.id,
        sets: 3,
        muscle: exercise.muscle,
        image: exercise.image || "",
        imagePublicId: exercise.imagePublicId || "",
        supportsUnilateral: Boolean(exercise.supportsUnilateral),
        movementMode: "bilateral",
        isExtra: false,
        alternatives: [],
      },
    ]);
  };

  const updateExercise = (idx, patch) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)),
    );
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveExercise = (idx, direction) => {
    setExercises((prev) => {
      const nextIndex = idx + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const addAlternative = (idx, optionId) => {
    const option = availableExercises.find((ex) => ex.id === optionId);
    if (!option) return;
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== idx) return ex;
        const exists = (ex.alternatives || []).some(
          (alt) => alt.exerciseId === option.id,
        );
        if (exists || ex.exerciseId === option.id) return ex;
        return {
          ...ex,
          alternatives: [
            ...(ex.alternatives || []),
            resolveExerciseFromLibrary(availableExercises, option),
          ],
        };
      }),
    );
  };

  const updateAlternative = (idx, alternativeId, patch) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === idx
          ? {
              ...ex,
              alternatives: (ex.alternatives || []).map((alt) =>
                alt.exerciseId === alternativeId ? { ...alt, ...patch } : alt,
              ),
            }
          : ex,
      ),
    );
  };

  const removeAlternative = (idx, alternativeId) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === idx
          ? {
              ...ex,
              alternatives: (ex.alternatives || []).filter(
                (alt) => alt.exerciseId !== alternativeId,
              ),
            }
          : ex,
      ),
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Ponle un nombre a la rutina.");
      return;
    }
    if (!exercises.length) {
      setError("Agrega al menos un ejercicio.");
      return;
    }
    setError("");
    onSave({
      ...initialData,
      id: initialData?.id || slugify(name),
      name: name.trim(),
      description: `${exercises.length} ejercicios.`,
      branch: normalizeBranch(branch),
      exercises: exercises.map((ex) => ({
        ...ex,
        exerciseId: ex.exerciseId || slugify(ex.name),
        sets: Number(ex.sets) || 1,
        ...serializeMovement(ex),
        isExtra: Boolean(ex.isExtra),
        alternatives: (ex.alternatives || []).map((alt) => ({
          exerciseId: alt.exerciseId || slugify(alt.name),
          name: alt.name,
          muscle: alt.muscle,
          image: alt.image || "",
          imagePublicId: alt.imagePublicId || "",
          ...serializeMovement(alt),
        })),
      })),
    });
  };

  const buildDraftRoutine = () => ({
    ...initialData,
    id: initialData?.id || slugify(name),
    name: name.trim() || initialData?.name || "Rutina sin nombre",
    description: `${exercises.length} ejercicios.`,
    branch: normalizeBranch(branch),
    exercises: exercises.map((ex) => ({
      ...ex,
      exerciseId: ex.exerciseId || slugify(ex.name),
      sets: Number(ex.sets) || 1,
      ...serializeMovement(ex),
      isExtra: Boolean(ex.isExtra),
      alternatives: (ex.alternatives || []).map((alt) => ({
        exerciseId: alt.exerciseId || slugify(alt.name),
        name: alt.name,
        muscle: alt.muscle,
        image: alt.image || "",
        imagePublicId: alt.imagePublicId || "",
        ...serializeMovement(alt),
      })),
    })),
  });

  const handleOpenLibrary = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        ROUTINE_LIBRARY_DRAFT_KEY,
        JSON.stringify({
          mode,
          sourceRoutineId: initialData?.id || slugify(name),
          sourceRoutineName:
            name.trim() || initialData?.name || "Rutina sin nombre",
          routine: buildDraftRoutine(),
          savedAt: Date.now(),
        }),
      );
    }
    onOpenLibrary?.();
  };

  return (
    <Modal
      title={mode === "create" ? "Nueva rutina" : "Editar rutina"}
      subtitle="Arma el orden real de entrenamiento y agrega solo lo necesario."
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-[color:var(--text-muted)]">
            {exercises.length} ejercicios
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenLibrary}>
              Biblioteca
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {mode === "create" ? "Crear rutina" : "Guardar"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[76vh] overflow-y-auto pr-1 text-[color:var(--text)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr,220px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    Nombre
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej. Espalda pesado"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    Sede
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {BRANCH_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setBranch(option)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          branch === option
                            ? "border-blue-400 bg-blue-500/10 text-[color:var(--text)]"
                            : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {branchLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Rutina actual</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Ordena, define series y marca extras.
                  </p>
                </div>
                <Badge variant="secondary" className="text-[11px]">
                  {exercises.length} ejercicios
                </Badge>
              </div>

              {groupedSelected.map(([muscle, list]) => (
                <Card key={muscle} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{muscle}</p>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {list.length}
                    </span>
                  </div>
                  {list.map((ex) => {
                    const thumb = getExerciseImageUrl(ex, {
                      width: 120,
                      height: 120,
                    });
                    const alternativeOptions = availableExercises.filter(
                      (option) =>
                        exerciseMatchesBranch(option, branch) &&
                        option.muscle === ex.muscle &&
                        option.id !== ex.exerciseId &&
                        !(ex.alternatives || []).some(
                          (alt) => alt.exerciseId === option.id,
                        ),
                    );

                    return (
                      <div
                        key={`${ex.exerciseId}-${ex.idx}`}
                        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
                      >
                        <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
                          <div className="h-11 w-11 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={ex.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-[color:var(--text-muted)]">
                                {(ex.name || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {ex.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-1 text-xs text-[color:var(--text-muted)]">
                                Series
                                <input
                                  type="number"
                                  min="1"
                                  className="h-7 w-14 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2 text-center text-xs text-[color:var(--text)]"
                                  value={ex.sets}
                                  onChange={(event) =>
                                    updateExercise(ex.idx, {
                                      sets: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateExercise(ex.idx, {
                                    isExtra: !ex.isExtra,
                                  })
                                }
                                className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                  ex.isExtra
                                    ? "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                                }`}
                              >
                                {ex.isExtra ? "Extra" : "Principal"}
                              </button>
                              <div className="inline-grid grid-cols-3 overflow-hidden rounded-full border border-[color:var(--border)] text-[11px] font-semibold">
                                {movementOptions.map((option) => {
                                  const active =
                                    movementOptionFrom(ex) === option.id;
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() =>
                                        updateExercise(
                                          ex.idx,
                                          applyMovementOption(option.id),
                                        )
                                      }
                                      className={`px-2 py-1 transition ${
                                        active
                                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                          : "text-[color:var(--text-muted)]"
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={ex.idx === 0}
                              onClick={() => moveExercise(ex.idx, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={ex.idx === exercises.length - 1}
                              onClick={() => moveExercise(ex.idx, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600"
                              onClick={() => removeExercise(ex.idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,180px]">
                          <div className="min-w-0 space-y-2">
                            {(ex.alternatives || []).length ? (
                              ex.alternatives.map((alt) => (
                                <div
                                  key={alt.exerciseId}
                                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="min-w-0 truncate text-[11px] font-semibold text-[color:var(--text)]">
                                      {alt.name}
                                    </p>
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] text-red-500"
                                      onClick={() =>
                                        removeAlternative(
                                          ex.idx,
                                          alt.exerciseId,
                                        )
                                      }
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    <div className="inline-grid grid-cols-3 overflow-hidden rounded-full border border-[color:var(--border)] text-[10px] font-semibold">
                                      {movementOptions.map((option) => {
                                        const active =
                                          movementOptionFrom(alt) === option.id;
                                        return (
                                          <button
                                            key={option.id}
                                            type="button"
                                            onClick={() =>
                                              updateAlternative(
                                                ex.idx,
                                                alt.exerciseId,
                                                applyMovementOption(option.id),
                                              )
                                            }
                                            className={`px-2 py-1 transition ${
                                              active
                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                                : "text-[color:var(--text-muted)]"
                                            }`}
                                          >
                                            {option.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-[11px] text-[color:var(--text-muted)]">
                                Sin alternativas
                              </span>
                            )}
                          </div>
                          <select
                            defaultValue=""
                            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1 text-xs text-[color:var(--text)]"
                            onChange={(event) => {
                              if (!event.target.value) return;
                              addAlternative(ex.idx, event.target.value);
                              event.target.value = "";
                            }}
                          >
                            <option value="">Agregar alternativa</option>
                            {alternativeOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              ))}

              {!exercises.length && (
                <Card className="border-dashed p-5 text-center text-sm text-[color:var(--text-muted)]">
                  Agrega ejercicios desde la derecha para construir la rutina.
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Agregar ejercicios</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Filtrado por sede y grupo muscular.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {muscleOptions.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => setSelectedMuscle(muscle)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedMuscle === muscle
                        ? "border-blue-400 bg-blue-500/10 text-[color:var(--text)]"
                        : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] py-2 pl-9 pr-3 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                {filteredExercises.map((exercise) => {
                  const thumb = getExerciseImageUrl(exercise, {
                    width: 100,
                    height: 100,
                  });
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => addExercise(exercise)}
                      className="grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-2 text-left transition hover:border-blue-300"
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={exercise.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-[color:var(--text-muted)]">
                            {(exercise.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {exercise.name}
                        </p>
                        <p className="truncate text-xs text-[color:var(--text-muted)]">
                          {exercise.muscle}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-blue-500" />
                    </button>
                  );
                })}
                {!filteredExercises.length && (
                  <div className="rounded-xl border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--text-muted)]">
                    No hay ejercicios disponibles con este filtro.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Routines({ onNavigate }) {
  const {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
  } = useRoutines();
  const { exercises: libraryExercises, trainings } = useTrainingData();

  const [libraryDraft] = useState(readRoutineLibraryDraft);
  const [modalMode, setModalMode] = useState(() =>
    libraryDraft ? (libraryDraft.mode === "create" ? "create" : "edit") : null,
  );
  const [selectedRoutine, setSelectedRoutine] = useState(
    () => libraryDraft?.routine || null,
  );
  const [activeBranch, setActiveBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [canReturnToTraining, setCanReturnToTraining] =
    useState(hasTrainingReturn);

  const availableExercises = useMemo(() => {
    const seen = new Set();
    return libraryExercises
      .filter((ex) => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        image: ex.image || "",
        imagePublicId: ex.imagePublicId || "",
        branches: ex.branches || ["general"],
        supportsUnilateral: Boolean(ex.supportsUnilateral),
      }));
  }, [libraryExercises]);

  const exerciseMetaMap = useMemo(() => {
    const map = new Map();
    availableExercises.forEach((ex) => {
      map.set(ex.id, ex);
      if (ex.name) map.set(slugify(ex.name), ex);
    });
    return map;
  }, [availableExercises]);

  const routineHistoryMap = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((training) => {
      if (!training?.routineId) return;
      const ts = getDateTimestamp(training.date || training.createdAt);
      const current = map.get(training.routineId) || {
        count: 0,
        lastDate: null,
        lastTs: 0,
      };
      const next = { ...current, count: current.count + 1 };
      if (ts > next.lastTs) {
        next.lastTs = ts;
        next.lastDate = training.date || training.createdAt;
      }
      map.set(training.routineId, next);
    });
    return map;
  }, [trainings]);

  const weekSummary = useMemo(() => {
    const activeDays = new Set();
    (trainings || []).forEach((training) => {
      const key = getISODateKey(training.date || training.createdAt);
      if (key) activeDays.add(key);
    });
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = getISODateKey(date);
      const label = date
        .toLocaleDateString("es-ES", { weekday: "short" })
        .replace(".", "");
      days.push({
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1, 3),
        active: activeDays.has(key),
      });
    }
    return days;
  }, [trainings]);

  const branchCounts = useMemo(() => {
    const counts = { all: routines.length, sopocachi: 0, miraflores: 0 };
    routines.forEach((routine) => {
      const branch = normalizeBranch(routine.branch);
      counts[branch] = (counts[branch] || 0) + 1;
    });
    return counts;
  }, [routines]);

  const routineCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return routines
      .filter((routine) =>
        activeBranch === "all"
          ? true
          : normalizeBranch(routine.branch) === activeBranch,
      )
      .filter((routine) => {
        if (!query) return true;
        return (routine.name || "").toLowerCase().includes(query);
      })
      .map((routine) => {
        const exercises = routine.exercises || [];
        const muscles = new Set();
        let totalSets = 0;
        let extras = 0;
        const preview = [];

        exercises.forEach((ex) => {
          totalSets += Number(ex.sets) || 0;
          if (ex.isExtra) extras += 1;
          const meta =
            exerciseMetaMap.get(ex.exerciseId) ||
            exerciseMetaMap.get(slugify(ex.name));
          const muscle = ex.muscle || meta?.muscle;
          if (muscle) muscles.add(muscle);
          if (preview.length < 3) {
            preview.push({
              name: ex.name || meta?.name || "Ejercicio",
              url: getExerciseImageUrl(meta || ex, {
                width: 120,
                height: 120,
              }),
            });
          }
        });

        const history = routineHistoryMap.get(routine.id) || {
          count: 0,
          lastDate: null,
        };

        return {
          ...routine,
          exerciseCount: exercises.length,
          totalSets,
          extras,
          muscles: Array.from(muscles),
          preview,
          sessionsCount: history.count,
          lastDate: history.lastDate,
        };
      });
  }, [routines, activeBranch, searchTerm, exerciseMetaMap, routineHistoryMap]);

  const totals = useMemo(() => {
    const exerciseCount = routines.reduce(
      (sum, routine) => sum + (routine.exercises || []).length,
      0,
    );
    return {
      routines: routines.length,
      exercises: exerciseCount,
      sessions: trainings?.length || 0,
    };
  }, [routines, trainings]);

  const openCreate = () => {
    setSelectedRoutine(null);
    setModalMode("create");
  };

  const openEdit = (routine) => {
    setSelectedRoutine(routine);
    setModalMode("edit");
  };

  const closeModal = () => {
    setSelectedRoutine(null);
    setModalMode(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ROUTINE_LIBRARY_DRAFT_KEY);
    }
  };

  const handleSave = (routine) => {
    if (modalMode === "create") addRoutine(routine);
    if (modalMode === "edit") updateRoutine(routine.id, routine);
    closeModal();
  };

  const handleReturnToTraining = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TRAINING_ROUTINES_RETURN_KEY);
    }
    setCanReturnToTraining(false);
    onNavigate?.("registrar");
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
              Planificacion
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text)] sm:text-3xl">
              Rutinas
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Crea rutinas simples y manten el orden real de entrenamiento.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canReturnToTraining && (
              <Button
                variant="outline"
                onClick={handleReturnToTraining}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Volver al entrenamiento</span>
              </Button>
            )}
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span>Nueva rutina</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-[color:var(--text-muted)]">Rutinas</p>
            <p className="mt-1 text-2xl font-semibold">{totals.routines}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[color:var(--text-muted)]">Ejercicios</p>
            <p className="mt-1 text-2xl font-semibold">{totals.exercises}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[color:var(--text-muted)]">
              Semana activa
            </p>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {weekSummary.map((day) => (
                <div key={day.key} className="text-center">
                  <div className="text-[10px] text-[color:var(--text-muted)]">
                    {day.label}
                  </div>
                  <div
                    className={`mx-auto mt-1 h-2 w-2 rounded-full ${
                      day.active ? "bg-blue-500" : "bg-[color:var(--border)]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr,260px] lg:items-center">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Todas", count: branchCounts.all },
                {
                  id: "sopocachi",
                  label: "Sopocachi",
                  count: branchCounts.sopocachi,
                },
                {
                  id: "miraflores",
                  label: "Miraflores",
                  count: branchCounts.miraflores,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveBranch(item.id)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    activeBranch === item.id
                      ? "border-blue-400 bg-blue-500/10 text-[color:var(--text)]"
                      : "border-[color:var(--border)] text-[color:var(--text-muted)]"
                  }`}
                >
                  {item.label} · {item.count}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar rutina..."
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] py-2 pl-9 pr-3 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-5 space-y-3">
        {routineCards.map((routine) => (
          <Card key={routine.id} className="p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">
                    {routine.name}
                  </h2>
                  <Badge variant="secondary" className="text-[10px]">
                    {branchLabel(routine.branch)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {routine.exerciseCount} ejercicios
                  </span>
                  <span>{routine.totalSets} series</span>
                  {routine.extras > 0 && <span>{routine.extras} extras</span>}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatShortDate(routine.lastDate)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {routine.muscles.slice(0, 5).map((muscle) => (
                    <Badge key={muscle} className="text-[10px]">
                      {muscle}
                    </Badge>
                  ))}
                  {!routine.muscles.length && (
                    <Badge className="text-[10px]">Sin grupos</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <div className="hidden -space-x-2 sm:flex">
                  {routine.preview.map((item, idx) => (
                    <div
                      key={`${routine.id}-${idx}`}
                      className="h-9 w-9 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--bg)]"
                    >
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-[color:var(--text-muted)]">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(routine)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => duplicateRoutine(routine.id)}
                    aria-label="Duplicar rutina"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deleteRoutine(routine.id)}
                    aria-label="Eliminar rutina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!routineCards.length && (
          <Card className="p-8 text-center">
            <p className="text-sm font-semibold text-[color:var(--text)]">
              No hay rutinas para mostrar.
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Crea una rutina o ajusta los filtros.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              Crear rutina
            </Button>
          </Card>
        )}
      </section>

      {modalMode && (
        <RoutineModal
          mode={modalMode}
          initialData={selectedRoutine}
          availableExercises={availableExercises}
          onSave={handleSave}
          onClose={closeModal}
          onOpenLibrary={() => {
            setSelectedRoutine(null);
            setModalMode(null);
            onNavigate?.("library");
          }}
        />
      )}
    </>
  );
}

export default Routines;
