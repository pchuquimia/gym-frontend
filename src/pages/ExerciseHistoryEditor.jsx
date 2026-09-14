import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  LoaderCircle,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import ExerciseThumbnail from "../components/analytics/ExerciseThumbnail";
import Button from "../components/ui/button";
import Skeleton from "../components/ui/skeleton";
import { useTrainingData } from "../context/TrainingContext";
import { api } from "../services/api";
import { getExerciseImageUrl } from "../utils/cloudinary";

const STORAGE_KEY = "history_editor_exercise_id";

const WEIGHT_BASIS_LABELS = {
  legacy: "Registro histórico",
  total: "Peso total",
  per_side: "Peso por lado",
  per_implement: "Peso por implemento",
  machine: "Peso de máquina",
  additional: "Carga adicional",
  assistance: "Asistencia",
};

const normalizeSearchText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getExerciseId = (exercise) => String(exercise?.id || exercise?._id || "");

const getExerciseGroup = (exercise) =>
  String(
    exercise?.primaryMuscleGroup ||
      exercise?.muscle ||
      exercise?.muscleGroup ||
      "Sin grupo",
  );

const getExerciseSearchText = (exercise) =>
  normalizeSearchText(
    [
      exercise?.name,
      ...(exercise?.aliases || []),
      exercise?.localizedNames?.es,
      exercise?.localizedNames?.en,
      getExerciseGroup(exercise),
      ...(exercise?.equipment || []),
    ]
      .filter(Boolean)
      .join(" "),
  );

const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "es-BO",
        { day: "2-digit", month: "short", year: "numeric" },
      )
    : "Sin fecha";

const getRecordConfig = (record) => ({
  movementMode:
    record?.movementMode === "unilateral" ? "unilateral" : "bilateral",
  weightBasis: record?.weightBasis || "legacy",
  barWeightKg: Number(record?.barWeightKg) || 0,
  implementCount: Number(record?.implementCount) || 1,
});

const toEditableEntries = (sets = [], source) =>
  (sets || []).flatMap((set, setIndex) => {
    if (source === "session") {
      return [
        {
          key: `${setIndex}:0`,
          setIndex,
          entryIndex: 0,
          label: String(setIndex + 1),
          weight: set?.weight ?? "",
          reps: set?.reps ?? "",
        },
      ];
    }
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : [set];
    return entries.map((entry, entryIndex) => ({
      key: `${setIndex}:${entryIndex}`,
      setIndex,
      entryIndex,
      label: `${setIndex + 1}${
        entries.length > 1 ? String.fromCharCode(65 + entryIndex) : ""
      }`,
      weight: entry?.weightKg ?? entry?.weight ?? "",
      reps: entry?.reps ?? "",
    }));
  });

const serializeEditableState = (mode, entries) =>
  JSON.stringify({
    mode,
    entries: entries.map(({ setIndex, entryIndex, weight, reps }) => ({
      setIndex,
      entryIndex,
      weight: weight === "" ? null : Number(weight),
      reps: reps === "" ? null : Number(reps),
    })),
  });

function EditableHistoryRow({ record, columnCount, saving, onSave }) {
  const config = useMemo(() => getRecordConfig(record), [record]);
  const initialEntries = useMemo(
    () => toEditableEntries(record.sets, record.source),
    [record.sets, record.source],
  );
  const [movementMode, setMovementMode] = useState(config.movementMode);
  const [entries, setEntries] = useState(initialEntries);
  const initialState = serializeEditableState(
    config.movementMode,
    initialEntries,
  );
  const dirty = serializeEditableState(movementMode, entries) !== initialState;

  const updateEntry = (index, field, value) => {
    const valid =
      field === "reps" ? /^\d*$/.test(value) : /^\d*(\.\d{0,2})?$/.test(value);
    if (value !== "" && !valid) return;
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  return (
    <tr className="align-top">
      <td className="sticky left-0 z-10 min-w-36 border-r border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3">
        <span className="block text-sm font-black capitalize">
          {formatDate(record.date)}
        </span>
        <span className="mt-1 block max-w-40 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
          {record.routineName || "Sin rutina"}
        </span>
        <span className="mt-0.5 block text-[9px] font-black uppercase text-[color:var(--text-muted)]">
          {record.source === "training" ? "Entrenamiento" : "Sesión heredada"}
        </span>
      </td>
      <td className="min-w-36 px-2 py-3">
        <select
          aria-label={`Modalidad de ${formatDate(record.date)}`}
          value={movementMode}
          onChange={(event) => setMovementMode(event.target.value)}
          className="theme-accent-focus h-10 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-xs font-black outline-none"
        >
          <option value="bilateral">Bilateral</option>
          <option value="unilateral">Unilateral</option>
        </select>
      </td>
      {Array.from({ length: columnCount }, (_, index) => {
        const entry = entries[index];
        return (
          <td key={index} className="min-w-36 px-2 py-3">
            {entry ? (
              <div>
                <span className="mb-1 block text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                  Serie {entry.label}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="relative">
                    <input
                      inputMode="decimal"
                      aria-label={`Peso, serie ${entry.label}, ${formatDate(record.date)}`}
                      value={entry.weight}
                      onChange={(event) =>
                        updateEntry(index, "weight", event.target.value)
                      }
                      className="theme-accent-focus h-10 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 pb-3 pt-1 text-sm font-black tabular-nums outline-none"
                    />
                    <span className="pointer-events-none absolute bottom-1 left-2 text-[8px] font-black uppercase text-[color:var(--text-muted)]">
                      kg
                    </span>
                  </label>
                  <label className="relative">
                    <input
                      inputMode="numeric"
                      aria-label={`Repeticiones, serie ${entry.label}, ${formatDate(record.date)}`}
                      value={entry.reps}
                      onChange={(event) =>
                        updateEntry(index, "reps", event.target.value)
                      }
                      className="theme-accent-focus h-10 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 pb-3 pt-1 text-sm font-black tabular-nums outline-none"
                    />
                    <span className="pointer-events-none absolute bottom-1 left-2 text-[8px] font-black uppercase text-[color:var(--text-muted)]">
                      rep
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <span className="block pt-5 text-center text-sm text-[color:var(--text-muted)]">
                —
              </span>
            )}
          </td>
        );
      })}
      <td className="min-w-28 px-3 py-3 text-right">
        <Button
          size="sm"
          disabled={!dirty || saving}
          onClick={() => onSave(record, movementMode, entries)}
          aria-label={`Guardar cambios de ${formatDate(record.date)}`}
        >
          {saving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="ml-2">Guardar</span>
        </Button>
      </td>
    </tr>
  );
}

export default function ExerciseHistoryEditor({
  onNavigate = () => {},
  onBack = null,
  coachAthlete = null,
}) {
  const queryClient = useQueryClient();
  const { exercises = [], loading: exercisesLoading } = useTrainingData();
  const athleteId = coachAthlete?.id || "";
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState(() =>
    typeof localStorage === "undefined"
      ? ""
      : localStorage.getItem(STORAGE_KEY) || "",
  );
  const [savingKey, setSavingKey] = useState("");
  const historySectionRef = useRef(null);

  const countsQuery = useQuery({
    queryKey: ["exercise-history-counts", athleteId || "self"],
    queryFn: () => api.getExerciseHistoryCounts({ athleteId }),
    staleTime: 0,
  });

  const countByExerciseId = useMemo(
    () =>
      new Map(
        (countsQuery.data?.exercises || []).map((item) => [
          String(item.exerciseId),
          Number(item.count) || 0,
        ]),
      ),
    [countsQuery.data],
  );

  const exerciseCatalogWithHistory = useMemo(() => {
    const catalog = new Map(
      exercises.map((exercise) => [getExerciseId(exercise), exercise]),
    );
    (countsQuery.data?.exercises || []).forEach((item) => {
      const exerciseId = String(item.exerciseId || "");
      if (!exerciseId || catalog.has(exerciseId)) return;
      catalog.set(exerciseId, {
        id: exerciseId,
        name: item.name || exerciseId,
        primaryMuscleGroup: item.group || "Sin grupo",
      });
    });
    return [...catalog.values()];
  }, [countsQuery.data, exercises]);

  const groupedExercises = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search);
    const groups = new Map();
    exerciseCatalogWithHistory
      .filter((exercise) => countByExerciseId.get(getExerciseId(exercise)) > 0)
      .filter(
        (exercise) =>
          !normalizedSearch ||
          getExerciseSearchText(exercise).includes(normalizedSearch),
      )
      .forEach((exercise) => {
        const group = getExerciseGroup(exercise);
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(exercise);
      });
    return [...groups.entries()]
      .map(([group, items]) => [
        group,
        items.sort((left, right) =>
          String(left.name).localeCompare(String(right.name), "es"),
        ),
      ])
      .sort(([left], [right]) => left.localeCompare(right, "es"));
  }, [countByExerciseId, exerciseCatalogWithHistory, search]);

  const exercisesWithHistory = useMemo(
    () => groupedExercises.flatMap(([, items]) => items),
    [groupedExercises],
  );
  const selectedExercise = exerciseCatalogWithHistory.find(
    (exercise) => getExerciseId(exercise) === selectedExerciseId,
  );

  useEffect(() => {
    if (!countsQuery.data || !exerciseCatalogWithHistory.length) return;
    const selectedHasHistory =
      selectedExerciseId && countByExerciseId.get(selectedExerciseId) > 0;
    if (!selectedHasHistory) {
      const first = exerciseCatalogWithHistory.find(
        (exercise) => countByExerciseId.get(getExerciseId(exercise)) > 0,
      );
      if (first) setSelectedExerciseId(getExerciseId(first));
    }
  }, [
    countByExerciseId,
    countsQuery.data,
    exerciseCatalogWithHistory,
    selectedExerciseId,
  ]);

  useEffect(() => {
    if (!selectedExercise) return;
    const group = getExerciseGroup(selectedExercise);
    setActiveGroup(group);
    localStorage.setItem(STORAGE_KEY, selectedExerciseId);
  }, [selectedExercise, selectedExerciseId]);

  const historyQuery = useQuery({
    queryKey: [
      "exercise-history-editor",
      selectedExerciseId,
      athleteId || "self",
    ],
    queryFn: () =>
      api.getExerciseHistory({ exerciseId: selectedExerciseId, athleteId }),
    enabled: Boolean(selectedExerciseId),
    staleTime: 0,
  });

  const sessionsQuery = useQuery({
    queryKey: ["exercise-history-editor-sessions", athleteId || "self"],
    queryFn: () => api.getSessions({ athleteId }),
    enabled: Boolean(selectedExerciseId),
    staleTime: 0,
  });

  const records = useMemo(() => {
    const trainingRecords = (historyQuery.data?.items || []).flatMap(
      (training) =>
        (training.exercises || []).map((exercise, exerciseIndex) => ({
          ...exercise,
          key: `training:${training._id || training.id}:${exerciseIndex}`,
          source: "training",
          sourceId: training._id || training.id,
          exerciseIndex,
          exerciseId: exercise.exerciseId,
          date: training.date || training.createdAt,
          routineName: training.routineName,
        })),
    );
    const sessionRecords = (
      Array.isArray(sessionsQuery.data) ? sessionsQuery.data : []
    )
      .filter(
        (session) => String(session.exerciseId || "") === selectedExerciseId,
      )
      .map((session) => ({
        ...session,
        key: `session:${session._id || session.id}`,
        source: "session",
        sourceId: session._id || session.id,
      }));
    return [...trainingRecords, ...sessionRecords].sort((left, right) =>
      String(right.date || "").localeCompare(String(left.date || "")),
    );
  }, [historyQuery.data, selectedExerciseId, sessionsQuery.data]);

  const columnCount = Math.max(
    1,
    ...records.map(
      (record) => toEditableEntries(record.sets, record.source).length,
    ),
  );

  const selectExercise = (exercise) => {
    setSelectedExerciseId(getExerciseId(exercise));
    setActiveGroup(getExerciseGroup(exercise));
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        historySectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
  };

  const handleSave = async (record, movementMode, entries) => {
    setSavingKey(record.key);
    const payload = {
      ...getRecordConfig(record),
      movementMode,
      ...(record.source === "training"
        ? { exerciseIndex: record.exerciseIndex }
        : {}),
      values: entries.map(({ setIndex, entryIndex, weight, reps }) => ({
        setIndex,
        entryIndex,
        weightKg: weight === "" ? null : Number(weight),
        reps: reps === "" ? null : Number(reps),
      })),
    };
    try {
      let response;
      if (record.source === "training") {
        response = await api.updateTrainingExerciseConfig(
          record.sourceId,
          record.exerciseId,
          payload,
        );
      } else {
        response = await api.updateSessionExerciseConfig(record.sourceId, payload);
      }
      if (Number(response?.historyValuesUpdated) !== payload.values.length) {
        throw new Error(
          "El servidor no confirmó los cambios de peso y repeticiones. Actualiza el backend antes de volver a intentarlo.",
        );
      }
      await Promise.all([historyQuery.refetch(), sessionsQuery.refetch()]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trainings"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
      toast.success("Historial actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el registro");
    } finally {
      setSavingKey("");
    }
  };

  const loading = historyQuery.isPending || sessionsQuery.isPending;
  const error = historyQuery.error || sessionsQuery.error;
  const currentWeightBasis =
    selectedExercise?.weightConfig?.basis ||
    records[0]?.weightBasis ||
    "legacy";

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 pb-24 text-[color:var(--text)]">
      <header className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Administración de datos
          </p>
          <h1 className="mt-1 text-3xl font-black uppercase leading-none">
            Editor de ejercicios
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-[color:var(--text-muted)]">
            Selecciona un ejercicio con datos y sobrescribe sus pesos,
            repeticiones o modalidad directamente desde el historial.
          </p>
          {coachAthlete?.name ? (
            <p className="mt-2 text-xs font-black uppercase">
              Atleta: {coachAthlete.name}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onBack
              ? onBack("ejercicio_analitica")
              : onNavigate("ejercicio_analitica")
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] lg:sticky lg:top-4">
          <div className="border-b border-[color:var(--border)] p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar ejercicio..."
                className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm font-bold outline-none"
              />
            </label>
            <p className="mt-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              {exercisesWithHistory.length} ejercicios con datos
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {exercisesLoading || countsQuery.isPending ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              groupedExercises.map(([group, items]) => {
                const expanded = Boolean(search) || activeGroup === group;
                const groupSessions = items.reduce(
                  (sum, exercise) =>
                    sum + (countByExerciseId.get(getExerciseId(exercise)) || 0),
                  0,
                );
                return (
                  <div
                    key={group}
                    className="border-b border-[color:var(--border)] last:border-0"
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() =>
                        setActiveGroup((current) =>
                          current === group ? "" : group,
                        )
                      }
                      className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left hover:bg-[color:var(--bg)]"
                    >
                      <span>
                        <span className="block text-sm font-black">
                          {group}
                        </span>
                        <span className="block text-[10px] font-semibold text-[color:var(--text-muted)]">
                          {items.length} ejercicios · {groupSessions} registros
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expanded ? (
                      <div className="border-t border-[color:var(--border)] bg-[color:var(--bg)] p-1.5">
                        {items.map((exercise) => {
                          const exerciseId = getExerciseId(exercise);
                          const selected = exerciseId === selectedExerciseId;
                          return (
                            <button
                              key={exerciseId}
                              type="button"
                              onClick={() => selectExercise(exercise)}
                              className={`grid min-h-14 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg p-1.5 text-left text-xs transition ${
                                selected
                                  ? "bg-[#181918] font-black text-white dark:bg-white dark:text-black"
                                  : "font-bold hover:bg-[color:var(--card)]"
                              }`}
                            >
                              <ExerciseThumbnail
                                src={getExerciseImageUrl(exercise, {
                                  width: 96,
                                  height: 96,
                                })}
                                alt=""
                                fallback={(exercise.name || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                                className={`h-10 w-10 rounded-lg text-[10px] font-black ${
                                  selected
                                    ? "bg-white/10 text-white dark:bg-black/10 dark:text-black"
                                    : ""
                                }`}
                              />
                              <span className="min-w-0 truncate">
                                {exercise.name}
                              </span>
                              <span
                                className={`shrink-0 tabular-nums ${
                                  selected
                                    ? "text-white/70 dark:text-black/60"
                                    : "text-[color:var(--text-muted)]"
                                }`}
                              >
                                {countByExerciseId.get(exerciseId) || 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
            {!exercisesLoading &&
            !countsQuery.isPending &&
            !groupedExercises.length ? (
              <p className="p-6 text-center text-sm font-semibold text-[color:var(--text-muted)]">
                No hay ejercicios con datos para esta búsqueda.
              </p>
            ) : null}
          </div>
        </aside>

        <section
          ref={historySectionRef}
          className="min-w-0 scroll-mt-4 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-[color:var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {selectedExercise ? (
                <ExerciseThumbnail
                  src={getExerciseImageUrl(selectedExercise, {
                    width: 144,
                    height: 144,
                  })}
                  alt={selectedExercise.name}
                  fallback={(selectedExercise.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                  className="h-14 w-14 rounded-xl text-sm font-black"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                  Historial editable
                </p>
                <h2 className="mt-1 truncate text-xl font-black">
                  {selectedExercise?.name || "Selecciona un ejercicio"}
                </h2>
                {selectedExercise ? (
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    {getExerciseGroup(selectedExercise)} · {records.length}{" "}
                    registros
                  </p>
                ) : null}
              </div>
            </div>
            {selectedExercise ? (
              <div className="text-left sm:text-right">
                <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                  Los valores representan
                </p>
                <p className="mt-1 text-xs font-black">
                  {WEIGHT_BASIS_LABELS[currentWeightBasis] ||
                    currentWeightBasis}
                </p>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="font-black">No se pudo cargar el historial</p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {error.message}
              </p>
              <Button
                className="mt-4"
                size="sm"
                onClick={() => {
                  historyQuery.refetch();
                  sessionsQuery.refetch();
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : records.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[color:var(--bg)] text-[9px] font-black uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-36 border-r border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2.5">
                      Fecha
                    </th>
                    <th className="min-w-36 px-2 py-2.5">Modalidad</th>
                    {Array.from({ length: columnCount }, (_, index) => (
                      <th key={index} className="min-w-36 px-2 py-2.5">
                        Serie {index + 1}
                      </th>
                    ))}
                    <th className="min-w-28 px-3 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {records.map((record) => (
                    <EditableHistoryRow
                      key={`${record.key}:${JSON.stringify(record.sets)}:${record.movementMode}`}
                      record={record}
                      columnCount={columnCount}
                      saving={savingKey === record.key}
                      onSave={handleSave}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-10 text-center text-sm font-semibold text-[color:var(--text-muted)]">
              Selecciona un ejercicio de la lista para editar su historial.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
