import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Dumbbell,
  LoaderCircle,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Badge from "../components/ui/badge";
import Button from "../components/ui/button";
import Skeleton from "../components/ui/skeleton";
import { useTrainingData } from "../context/TrainingContext";
import { api } from "../services/api";

const STORAGE_KEY = "history_editor_exercise_id";

const WEIGHT_BASIS_OPTIONS = [
  ["legacy", "Sin interpretar (histórico)"],
  ["total", "Peso total"],
  ["per_side", "Peso por lado"],
  ["per_implement", "Peso por implemento"],
  ["machine", "Peso de máquina"],
  ["additional", "Carga adicional"],
  ["assistance", "Asistencia"],
];

const readStoredExerciseId = () => {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
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
const toSearchValues = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

const getExerciseSearchData = (exercise) => {
  const name = normalizeSearchText(exercise?.name);
  const aliases = [
    ...toSearchValues(exercise?.aliases),
    exercise?.localizedNames?.es,
    exercise?.localizedNames?.en,
    exercise?.nameSpanish,
    exercise?.nameEnglish,
  ]
    .filter(Boolean)
    .map(normalizeSearchText);
  const metadata = [
    getExerciseGroup(exercise),
    ...toSearchValues(exercise?.equipment),
    ...toSearchValues(exercise?.movementPatterns),
  ].map(normalizeSearchText);
  return {
    name,
    aliases,
    haystack: [name, ...aliases, ...metadata].join(" "),
  };
};

const getExerciseSearchRank = (exercise, query) => {
  if (!query) return 4;
  const { name, aliases, haystack } = getExerciseSearchData(exercise);
  const tokens = query.split(" ").filter(Boolean);
  if (!tokens.every((token) => haystack.includes(token))) return Infinity;
  if (name === query || aliases.includes(query)) return 0;
  if (
    name.startsWith(query) ||
    aliases.some((alias) => alias.startsWith(query))
  ) {
    return 1;
  }
  if (name.includes(query) || aliases.some((alias) => alias.includes(query))) {
    return 2;
  }
  return 3;
};

const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "es-BO",
        { day: "2-digit", month: "long", year: "numeric" },
      )
    : "Sin fecha";

const getConfig = (record) => ({
  movementMode:
    record?.movementMode === "unilateral" ? "unilateral" : "bilateral",
  weightBasis: record?.weightBasis || "legacy",
  barWeightKg: Number(record?.barWeightKg) || 0,
  implementCount: Number(record?.implementCount) || 1,
});

const sameConfig = (left, right) =>
  left.movementMode === right.movementMode &&
  left.weightBasis === right.weightBasis &&
  Number(left.barWeightKg) === Number(right.barWeightKg) &&
  Number(left.implementCount) === Number(right.implementCount);

const toEntries = (sets = [], source) =>
  (sets || []).flatMap((set, setIndex) => {
    if (source === "session") {
      return [
        {
          key: `${setIndex}-0`,
          series: setIndex + 1,
          entry: "",
          reps: set?.reps,
          weight: set?.weight,
          done: true,
        },
      ];
    }
    const entries =
      Array.isArray(set?.entries) && set.entries.length ? set.entries : [set];
    return entries.map((entry, entryIndex) => ({
      key: `${setIndex}-${entryIndex}`,
      series: setIndex + 1,
      entry: entries.length > 1 ? String.fromCharCode(65 + entryIndex) : "",
      reps: entry?.reps,
      weight: entry?.weightKg ?? entry?.weight,
      done: entry?.done === true,
    }));
  });

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function RecordCard({ record, saving, onSave }) {
  const original = useMemo(() => getConfig(record), [record]);
  const [config, setConfig] = useState(original);

  const entries = useMemo(
    () => toEntries(record.sets, record.source),
    [record.sets, record.source],
  );
  const dirty = !sameConfig(config, original);

  const updateConfig = (field, value) =>
    setConfig((current) => ({ ...current, [field]: value }));

  return (
    <article
      className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm"
      data-history-record={record.key}
    >
      <div className="flex flex-col gap-3 border-b border-[color:var(--border)] p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black uppercase">
              {formatDate(record.date)}
            </h2>
            <Badge
              variant={record.source === "training" ? "active" : "pending"}
            >
              {record.source === "training"
                ? "Entrenamiento"
                : "Sesión heredada"}
            </Badge>
            <Badge
              variant={
                config.movementMode === "unilateral" ? "enabled" : "default"
              }
            >
              {config.movementMode}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm font-bold text-[color:var(--text-muted)]">
            {record.routineName || "Sin rutina"} · {entries.length}{" "}
            series/entradas
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-[150px_190px_auto]">
          <label>
            <span className="mb-1 block text-[9px] font-black uppercase text-[color:var(--text-muted)]">
              Modalidad
            </span>
            <select
              aria-label={`Modalidad de ${formatDate(record.date)}`}
              value={config.movementMode}
              onChange={(event) =>
                updateConfig("movementMode", event.target.value)
              }
              className="theme-accent-focus h-10 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-xs font-black outline-none"
            >
              <option value="bilateral">Bilateral</option>
              <option value="unilateral">Unilateral</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[9px] font-black uppercase text-[color:var(--text-muted)]">
              Interpretación del peso
            </span>
            <select
              aria-label={`Interpretación del peso de ${formatDate(record.date)}`}
              value={config.weightBasis}
              onChange={(event) =>
                updateConfig("weightBasis", event.target.value)
              }
              className="theme-accent-focus h-10 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-xs font-black outline-none"
            >
              {WEIGHT_BASIS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            className="self-end"
            disabled={!dirty || saving}
            onClick={() => onSave(record, config)}
          >
            {saving ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {config.weightBasis === "per_side" ||
      config.weightBasis === "per_implement" ? (
        <div className="flex flex-wrap gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
          {config.weightBasis === "per_side" ? (
            <label className="w-44">
              <span className="mb-1 block text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                Peso de barra (kg)
              </span>
              <input
                type="number"
                min="0"
                max="500"
                step="0.5"
                value={config.barWeightKg}
                onChange={(event) =>
                  updateConfig("barWeightKg", Number(event.target.value))
                }
                className="theme-accent-focus h-10 w-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-black outline-none"
              />
            </label>
          ) : (
            <label className="w-44">
              <span className="mb-1 block text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                N.º de implementos
              </span>
              <input
                type="number"
                min="1"
                max="4"
                step="1"
                value={config.implementCount}
                onChange={(event) =>
                  updateConfig("implementCount", Number(event.target.value))
                }
                className="theme-accent-focus h-10 w-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-black outline-none"
              />
            </label>
          )}
          <p className="self-end pb-2 text-xs font-semibold text-[color:var(--text-muted)]">
            Esta configuración cambia el cálculo, no los valores registrados.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-left">
          <thead className="bg-[color:var(--bg)] text-[9px] font-black uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            <tr>
              <th className="px-4 py-2">Serie</th>
              <th className="px-4 py-2 text-right">Peso registrado</th>
              <th className="px-4 py-2 text-right">Repeticiones</th>
              <th className="px-4 py-2 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)] text-sm font-bold tabular-nums">
            {entries.map((entry) => (
              <tr key={entry.key}>
                <td className="px-4 py-2.5">
                  {entry.series}
                  {entry.entry}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {entry.weight === null ||
                  entry.weight === undefined ||
                  entry.weight === ""
                    ? "--"
                    : `${Number(entry.weight).toLocaleString("es-BO")} kg`}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {entry.reps === null ||
                  entry.reps === undefined ||
                  entry.reps === ""
                    ? "--"
                    : Number(entry.reps).toLocaleString("es-BO")}
                </td>
                <td className="px-4 py-2.5 text-right text-[10px] uppercase text-[color:var(--text-muted)]">
                  {record.source === "session" || entry.done
                    ? "Completada"
                    : "No completada"}
                </td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-4 py-6 text-center text-sm text-[color:var(--text-muted)]"
                >
                  Este registro no contiene series.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function ExerciseHistoryEditor({
  onNavigate = () => {},
  coachAthlete = null,
}) {
  const queryClient = useQueryClient();
  const { exercises = [], loading: trainingDataLoading } = useTrainingData();
  const [selectedExerciseId, setSelectedExerciseId] =
    useState(readStoredExerciseId);
  const [search, setSearch] = useState("");
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [onlyWithHistory, setOnlyWithHistory] = useState(true);
  const [modeFilter, setModeFilter] = useState("all");
  const [savingKey, setSavingKey] = useState("");
  const athleteId = coachAthlete?.id || "";

  useEffect(() => {
    if (!selectedExerciseId && exercises.length) {
      setSelectedExerciseId(String(exercises[0].id || exercises[0]._id));
    }
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    if (selectedExerciseId && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, selectedExerciseId);
    }
  }, [selectedExerciseId]);

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
  const countsQuery = useQuery({
    queryKey: ["exercise-history-counts", athleteId || "self"],
    queryFn: () => api.getExerciseHistoryCounts({ athleteId }),
    staleTime: 0,
  });

  const selectedExercise = exercises.find(
    (exercise) => getExerciseId(exercise) === selectedExerciseId,
  );
  const muscleOptions = useMemo(
    () =>
      Array.from(new Set(exercises.map(getExerciseGroup))).sort((left, right) =>
        left.localeCompare(right, "es"),
      ),
    [exercises],
  );
  const exerciseCountById = useMemo(
    () =>
      new Map(
        (countsQuery.data?.exercises || []).map((item) => [
          String(item.exerciseId),
          Number(item.count) || 0,
        ]),
      ),
    [countsQuery.data],
  );
  const groupCountByName = useMemo(
    () =>
      new Map(
        (countsQuery.data?.groups || []).map((item) => [
          String(item.group),
          Number(item.count) || 0,
        ]),
      ),
    [countsQuery.data],
  );
  const exerciseMatches = useMemo(() => {
    const normalized = normalizeSearchText(search);
    return exercises
      .map((exercise) => ({
        exercise,
        rank: getExerciseSearchRank(exercise, normalized),
      }))
      .filter(
        ({ exercise, rank }) =>
          Number.isFinite(rank) &&
          (!onlyWithHistory ||
            !countsQuery.data ||
            exerciseCountById.get(getExerciseId(exercise)) > 0) &&
          (muscleFilter === "all" ||
            getExerciseGroup(exercise) === muscleFilter),
      )
      .sort(
        (left, right) =>
          left.rank - right.rank ||
          (exerciseCountById.get(getExerciseId(right.exercise)) || 0) -
            (exerciseCountById.get(getExerciseId(left.exercise)) || 0) ||
          String(left.exercise.name).localeCompare(
            String(right.exercise.name),
            "es",
          ),
      )
      .map(({ exercise }) => exercise);
  }, [
    countsQuery.data,
    exerciseCountById,
    exercises,
    muscleFilter,
    onlyWithHistory,
    search,
  ]);
  const visibleExerciseMatches = exerciseMatches.slice(0, 60);

  const selectExercise = (exercise) => {
    setSelectedExerciseId(getExerciseId(exercise));
    setSearch("");
    setExercisePickerOpen(false);
    setActiveExerciseIndex(0);
    setModeFilter("all");
  };

  const handleExerciseSearchKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setExercisePickerOpen(true);
      setActiveExerciseIndex((current) =>
        Math.min(current + 1, Math.max(visibleExerciseMatches.length - 1, 0)),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveExerciseIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && exercisePickerOpen) {
      event.preventDefault();
      const match = visibleExerciseMatches[activeExerciseIndex];
      if (match) selectExercise(match);
    } else if (event.key === "Escape") {
      setExercisePickerOpen(false);
    }
  };

  const records = useMemo(() => {
    const trainingRecords = (historyQuery.data?.items || []).flatMap(
      (training) =>
        (training.exercises || []).map((exercise, exerciseIndex) => ({
          ...exercise,
          key: `training:${training._id || training.id}:${exerciseIndex}`,
          source: "training",
          sourceId: training._id || training.id,
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

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          modeFilter === "all" || getConfig(record).movementMode === modeFilter,
      ),
    [modeFilter, records],
  );
  const totals = useMemo(
    () => ({
      records: records.length,
      trainings: records.filter((record) => record.source === "training")
        .length,
      sessions: records.filter((record) => record.source === "session").length,
      entries: records.reduce(
        (sum, record) => sum + toEntries(record.sets, record.source).length,
        0,
      ),
      bilateral: records.filter(
        (record) => getConfig(record).movementMode === "bilateral",
      ).length,
      unilateral: records.filter(
        (record) => getConfig(record).movementMode === "unilateral",
      ).length,
    }),
    [records],
  );

  const handleSave = async (record, config) => {
    setSavingKey(record.key);
    try {
      if (record.source === "training") {
        await api.updateTrainingExerciseConfig(
          record.sourceId,
          record.exerciseId,
          config,
        );
      } else {
        await api.updateSessionExerciseConfig(record.sourceId, config);
      }
      await Promise.all([historyQuery.refetch(), sessionsQuery.refetch()]);
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Registro histórico actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar el registro");
    } finally {
      setSavingKey("");
    }
  };

  const loading = historyQuery.isPending || sessionsQuery.isPending;
  const error = historyQuery.error || sessionsQuery.error;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 pb-24 text-[color:var(--text)]">
      <header className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ff5722] dark:text-[#e2ff00]">
            Administración de datos
          </p>
          <h1 className="mt-1 text-3xl font-black uppercase leading-none">
            Editor de historial
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-[color:var(--text-muted)]">
            Revisa todas las series, repeticiones y pesos. Corrige la modalidad
            de cada registro sin modificar sus valores originales.
          </p>
          {coachAthlete?.name ? (
            <p className="mt-2 text-xs font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
              Atleta: {coachAthlete.name}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("ejercicio_analitica")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a analítica
        </Button>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <label>
            <span className="mb-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Grupo muscular
            </span>
            <select
              aria-label="Filtrar por grupo muscular"
              value={muscleFilter}
              onChange={(event) => {
                setMuscleFilter(event.target.value);
                setExercisePickerOpen(true);
                setActiveExerciseIndex(0);
              }}
              disabled={trainingDataLoading}
              className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-black outline-none"
            >
              <option value="all">
                Todos los grupos ({countsQuery.data?.totalSessions || 0}{" "}
                sesiones)
              </option>
              {muscleOptions.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {muscle} ({groupCountByName.get(muscle) || 0} sesiones)
                </option>
              ))}
            </select>
          </label>

          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setExercisePickerOpen(false);
              }
            }}
          >
            <span className="mb-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Buscar y seleccionar ejercicio
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                role="combobox"
                aria-label="Buscar ejercicio"
                aria-autocomplete="list"
                aria-expanded={exercisePickerOpen}
                aria-controls="history-exercise-results"
                aria-activedescendant={
                  exercisePickerOpen &&
                  visibleExerciseMatches[activeExerciseIndex]
                    ? `history-exercise-${getExerciseId(visibleExerciseMatches[activeExerciseIndex])}`
                    : undefined
                }
                value={search}
                onFocus={() => setExercisePickerOpen(true)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setExercisePickerOpen(true);
                  setActiveExerciseIndex(0);
                }}
                onKeyDown={handleExerciseSearchKeyDown}
                placeholder="Escribe nombre, alias, músculo o equipo..."
                autoComplete="off"
                disabled={trainingDataLoading}
                className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-20 text-sm font-bold outline-none"
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => {
                    setSearch("");
                    setActiveExerciseIndex(0);
                  }}
                  className="absolute right-10 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                aria-label={
                  exercisePickerOpen ? "Cerrar resultados" : "Abrir resultados"
                }
                onClick={() => setExercisePickerOpen((current) => !current)}
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[color:var(--text-muted)]"
              >
                <ChevronDown
                  className={`h-4 w-4 transition ${exercisePickerOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {exercisePickerOpen ? (
              <div
                id="history-exercise-results"
                role="listbox"
                aria-label="Resultados de ejercicios"
                className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                  <span>
                    {countsQuery.isPending
                      ? "Contando sesiones..."
                      : `${exerciseMatches.length} ejercicios encontrados`}
                  </span>
                  {exerciseMatches.length > visibleExerciseMatches.length ? (
                    <span>
                      Mostrando las primeras {visibleExerciseMatches.length}
                    </span>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {visibleExerciseMatches.map((exercise, index) => {
                    const exerciseId = getExerciseId(exercise);
                    const equipment = toSearchValues(exercise.equipment).join(
                      ", ",
                    );
                    const selected = exerciseId === selectedExerciseId;
                    const sessionCount = exerciseCountById.get(exerciseId) || 0;
                    return (
                      <button
                        id={`history-exercise-${exerciseId}`}
                        key={exerciseId}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveExerciseIndex(index)}
                        onClick={() => selectExercise(exercise)}
                        className={`flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[color:var(--bg)] ${index === activeExerciseIndex ? "bg-[color:var(--bg)]" : ""}`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff0eb] text-[#ff5722] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]">
                          {selected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Dumbbell className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">
                            {exercise.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {getExerciseGroup(exercise)}
                            {equipment ? ` · ${equipment}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span
                            className={`block text-xs font-black tabular-nums ${sessionCount ? "text-[#ff5722] dark:text-[#e2ff00]" : "text-[color:var(--text-muted)]"}`}
                          >
                            {sessionCount}{" "}
                            {sessionCount === 1 ? "sesión" : "sesiones"}
                          </span>
                          {selected ? (
                            <span className="mt-0.5 block text-[8px] font-black uppercase text-[color:var(--text-muted)]">
                              Seleccionado
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                  {!visibleExerciseMatches.length ? (
                    <div className="px-4 py-8 text-center">
                      <Search className="mx-auto h-6 w-6 text-[color:var(--text-muted)]" />
                      <p className="mt-2 text-sm font-black">
                        Sin coincidencias
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                        Prueba con menos palabras o selecciona otro grupo
                        muscular.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-3">
          <button
            type="button"
            aria-pressed={onlyWithHistory}
            onClick={() => {
              setOnlyWithHistory((current) => !current);
              setExercisePickerOpen(true);
              setActiveExerciseIndex(0);
            }}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${onlyWithHistory ? "border-[#ff5722] bg-[#fff7f4] text-[#a72c09] dark:border-[#e2ff00] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]" : "border-[color:var(--border)] text-[color:var(--text-muted)]"}`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded border ${onlyWithHistory ? "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black" : "border-[color:var(--border)]"}`}
            >
              {onlyWithHistory ? <Check className="h-3 w-3" /> : null}
            </span>
            Solo ejercicios con historial
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Seleccionado
            </span>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#ff5722]/30 bg-[#fff7f4] px-3 text-xs font-black text-[#a72c09] dark:border-[#e2ff00]/25 dark:bg-[#e2ff00]/[0.08] dark:text-[#e2ff00]">
              <Dumbbell className="h-3.5 w-3.5" />
              {selectedExercise?.name || "Selecciona un ejercicio"}
            </span>
            {selectedExercise ? (
              <span className="text-xs font-semibold text-[color:var(--text-muted)]">
                {getExerciseGroup(selectedExercise)} ·{" "}
                {exerciseCountById.get(selectedExerciseId) || 0} sesiones
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        aria-label="Resumen del historial"
      >
        <Metric
          label="Registros"
          value={totals.records}
          detail={`${totals.trainings} actuales + ${totals.sessions} heredados`}
        />
        <Metric
          label="Series / entradas"
          value={totals.entries}
          detail="con peso y repeticiones visibles"
        />
        <Metric
          label="Bilaterales"
          value={totals.bilateral}
          detail="registros configurados"
        />
        <Metric
          label="Unilaterales"
          value={totals.unilateral}
          detail="registros configurados"
        />
      </section>

      <section
        className="flex flex-wrap items-center gap-2"
        aria-label="Filtros de modalidad"
      >
        <SlidersHorizontal className="mr-1 h-4 w-4 text-[color:var(--text-muted)]" />
        {[
          ["all", `Todos (${totals.records})`],
          ["bilateral", `Bilaterales (${totals.bilateral})`],
          ["unilateral", `Unilaterales (${totals.unilateral})`],
        ].map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={modeFilter === value ? "accentSolid" : "outline"}
            onClick={() => setModeFilter(value)}
          >
            {label}
          </Button>
        ))}
      </section>

      {loading ? (
        <div className="space-y-3" aria-label="Cargando historial">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-52 w-full" />
          ))}
        </div>
      ) : error ? (
        <section className="rounded-lg border border-red-300 bg-red-50 p-6 text-center dark:border-red-400/30 dark:bg-red-950/20">
          <Database className="mx-auto h-7 w-7 text-red-500" />
          <p className="mt-2 font-black">No se pudo cargar el historial</p>
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
        </section>
      ) : filteredRecords.length ? (
        <section className="space-y-3" aria-label="Registros históricos">
          {filteredRecords.map((record) => (
            <RecordCard
              key={`${record.key}:${record.movementMode || "bilateral"}:${record.weightBasis || "legacy"}:${record.barWeightKg || 0}:${record.implementCount || 1}`}
              record={record}
              saving={savingKey === record.key}
              onSave={handleSave}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-[color:var(--border)] p-10 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
          <p className="mt-3 font-black">No hay registros para este filtro</p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Selecciona otro ejercicio o cambia el filtro de modalidad.
          </p>
        </section>
      )}

      {records.length ? (
        <p className="flex items-center justify-center gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
          <CalendarDays className="h-4 w-4" /> Ordenado del registro más
          reciente al más antiguo.
        </p>
      ) : null}
    </main>
  );
}
