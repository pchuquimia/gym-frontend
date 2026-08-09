import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ListFilter,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import Modal from "../components/shared/Modal";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "--";

const formatDuration = (sec = 0) => {
  const total = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s,
  ).padStart(2, "0")}`;
};

const formatVolume = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })}M`;
  }
  if (num >= 10_000) {
    return `${(num / 1_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })}k`;
  }
  return num.toLocaleString("es-BO", { maximumFractionDigits: 1 });
};

const getDurationParts = (seconds = 0) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return {
    hours: String(Math.floor(total / 3600)),
    minutes: String(Math.floor((total % 3600) / 60)),
    seconds: String(total % 60),
  };
};

const branchLabel = (value) => {
  const branch = (value || "general").toString().toLowerCase();
  if (branch === "general") return "GENERAL";
  return branch.toUpperCase();
};

const branchPillClass = (value) => {
  const branch = (value || "general").toString().toLowerCase();
  if (branch === "sopocachi") {
    return "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#ff5722] dark:bg-[#ff5722] dark:text-white";
  }
  if (branch === "miraflores") {
    return "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-[#f8f8f4] dark:bg-[#f8f8f4] dark:text-black";
  }
  return "border-[#9a9a9f] bg-[#eeeeef] text-[#55555a] dark:border-[#66665f] dark:bg-[#252525] dark:text-[#d0d0c5]";
};

const monthKeyFromDate = (date) => {
  const value = String(date || "");
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "sin-fecha";
};

const monthLabelFromKey = (key) => {
  if (key === "sin-fecha") return "Sin fecha";
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-BO", {
    month: "long",
    year: "numeric",
  });
};

function MetricBox({ label, value, suffix = "", accent = false }) {
  return (
    <div className="min-w-0 text-left">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-base font-black tabular-nums leading-none ${
          accent
            ? "text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]"
            : "text-[color:var(--text)]"
        }`}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-[11px] font-bold text-[color:var(--text-muted)]">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function SessionHistory({
  onNavigate = () => {},
  ownerId = "",
  ownerName = "",
  embedded = false,
  prepareTrainingContext = () => true,
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const isCoach = ["Admin", "Entrenador"].includes(user?.role);
  const viewingAthlete = Boolean(ownerId);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [routineFilter, setRoutineFilter] = useState("");
  const [actionMenuId, setActionMenuId] = useState("");
  const [monthVisibility, setMonthVisibility] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [durationEditor, setDurationEditor] = useState(null);
  const [savingDuration, setSavingDuration] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);
  const limit = 5000;

  const loadTrainings = async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError("");
      const resp = await api.getTrainings({
        page: 1,
        limit,
        from: from || undefined,
        to: to || undefined,
        fields:
          "date,routineId,routineName,durationSeconds,totalVolume,branch,routineBranch,sessionType,supervisedBy,exercises",
        athleteId: ownerId || undefined,
        meta: true,
      });
      if (requestId !== requestIdRef.current) return;
      setTrainings(Array.isArray(resp) ? resp : resp?.items || []);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || "Error al cargar entrenamientos");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, ownerId, to]);

  const routinesInData = useMemo(() => {
    const set = new Set();
    trainings.forEach((training) =>
      set.add(training.routineName || "Sin rutina"),
    );
    return Array.from(set);
  }, [trainings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trainings.filter((training) => {
      const matchesSearch =
        !q ||
        (training.routineName || "").toLowerCase().includes(q) ||
        (training.date || "").includes(q);
      const matchesRoutine = routineFilter
        ? (training.routineName || "").toLowerCase() ===
          routineFilter.toLowerCase()
        : true;
      return matchesSearch && matchesRoutine;
    });
  }, [routineFilter, search, trainings]);
  const trainingGroups = useMemo(() => {
    const groups = new Map();
    [...filtered]
      .sort((left, right) =>
        String(right.date || "").localeCompare(String(left.date || "")),
      )
      .forEach((training) => {
        const key = monthKeyFromDate(training.date);
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            label: monthLabelFromKey(key),
            trainings: [],
          });
        }
        groups.get(key).trainings.push(training);
      });
    return Array.from(groups.values());
  }, [filtered]);

  useEffect(() => {
    if (!actionMenuId) return undefined;
    const closeMenu = (event) => {
      if (!event.target.closest("[data-session-actions]")) {
        setActionMenuId("");
      }
    };
    const closeMenuWithKeyboard = (event) => {
      if (event.key === "Escape") setActionMenuId("");
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenuWithKeyboard);
    };
  }, [actionMenuId]);

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setRoutineFilter("");
  };

  const activeFiltersCount = [from, to, routineFilter].filter(Boolean).length;

  const handleDelete = async () => {
    const id = deleteTarget?._id || deleteTarget?.id;
    if (!id) return;
    try {
      setDeleting(true);
      await api.deleteTraining(id);
      toast.success("Entrenamiento eliminado");
      setTrainings((prev) =>
        prev.filter((item) => (item._id || item.id) !== id),
      );
      setDeleteTarget(null);
    } catch (_err) {
      toast.error("No se pudo eliminar el entrenamiento");
    } finally {
      setDeleting(false);
    }
  };

  const handleViewTraining = (training) => {
    if (prepareTrainingContext(training) === false) {
      toast.info("Hay una sesiÃ³n activa en otro contexto");
      return;
    }
    const id = training._id || training.id;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
      localStorage.setItem("view_training_id", id);
      if (training.date)
        localStorage.setItem("view_training_date", training.date);
    }
    onNavigate("registrar", { trainingView: true });
  };

  const openDurationEditor = (training) => {
    if (!isAdmin) return;
    setDurationEditor({
      id: training._id || training.id,
      routineName: training.routineName || "Sin nombre",
      ...getDurationParts(training.durationSeconds),
    });
  };

  const updateDurationPart = (field, value) => {
    const digits = String(value || "").replace(/\D/g, "");
    const max = field === "hours" ? 24 : 59;
    const normalized =
      digits === "" ? "" : String(Math.min(max, Number(digits)));
    setDurationEditor((current) =>
      current ? { ...current, [field]: normalized } : current,
    );
  };

  const handleSaveDuration = async () => {
    if (!isAdmin || !durationEditor?.id) return;
    const durationSeconds =
      (Number(durationEditor.hours) || 0) * 3600 +
      (Number(durationEditor.minutes) || 0) * 60 +
      (Number(durationEditor.seconds) || 0);
    if (durationSeconds > 86400) {
      toast.error("La duración máxima es de 24 horas.");
      return;
    }
    try {
      setSavingDuration(true);
      const updated = await api.updateTrainingDuration(
        durationEditor.id,
        durationSeconds,
      );
      setTrainings((current) =>
        current.map((training) =>
          (training._id || training.id) === durationEditor.id
            ? { ...training, durationSeconds: updated.durationSeconds }
            : training,
        ),
      );
      setDurationEditor(null);
      toast.success("Duración actualizada.");
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar la duración.");
    } finally {
      setSavingDuration(false);
    }
  };

  return (
    <section
      className={
        embedded
          ? "text-[color:var(--text)]"
          : "management-shell min-h-screen text-[color:var(--text)]"
      }
    >
      <div
        className={
          embedded
            ? "w-full space-y-4"
            : "mx-auto w-full max-w-md space-y-4 pb-24 md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]"
        }
      >
        <header className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="theme-accent-text text-[10px] font-black uppercase tracking-[0.18em]">
                Historial
              </p>
              <h1
                className={`mt-1 truncate font-black uppercase text-[color:var(--text)] ${
                  embedded ? "text-xl" : "text-2xl sm:text-3xl"
                }`}
              >
                {viewingAthlete && ownerName
                  ? `Historial de ${ownerName}`
                  : "Historial de sesiones"}
              </h1>
            </div>
            {!embedded ? (
              <Button
                type="button"
                onClick={() => {
                  if (prepareTrainingContext() !== false) {
                    onNavigate("registrar");
                  }
                }}
                className="theme-accent-solid h-10 shrink-0 rounded-lg px-3 dark:rounded-[3px]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva sesión</span>
              </Button>
            ) : null}
          </div>
        </header>

        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm dark:rounded-[4px] md:p-4">
          <div className="flex items-center gap-2">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rutina o fecha..."
                className="theme-accent-focus h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] pl-12 pr-4 text-sm font-semibold outline-none transition placeholder:text-[color:var(--text-muted)] dark:rounded-[3px]"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className={`relative grid h-12 w-12 place-items-center rounded-lg border transition dark:rounded-[3px] ${
                filtersOpen || activeFiltersCount
                  ? "theme-accent-soft"
                  : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
              }`}
              aria-label="Opciones de filtro"
            >
              <ListFilter className="h-5 w-5" />
              {activeFiltersCount ? (
                <span className="theme-accent-solid absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          </div>

          {activeFiltersCount || search ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-bold text-[color:var(--text-muted)]"
                >
                  Busqueda
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {from || to ? (
                <button
                  type="button"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-bold text-[color:var(--text-muted)]"
                >
                  Fechas
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {routineFilter ? (
                <button
                  type="button"
                  onClick={() => setRoutineFilter("")}
                  className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-bold text-[color:var(--text-muted)]"
                >
                  <span className="max-w-[180px] truncate">
                    {routineFilter}
                  </span>
                  <X className="h-3.5 w-3.5 shrink-0" />
                </button>
              ) : null}
            </div>
          ) : null}

          {filtersOpen ? (
            <div className="mt-4 space-y-4 border-t border-[color:var(--border)] pt-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="min-w-0 space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Desde
                  </span>
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm outline-none dark:rounded-[3px]"
                  />
                </label>

                <label className="min-w-0 space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Hasta
                  </span>
                  <input
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm outline-none dark:rounded-[3px]"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Rutina
                </span>
                <select
                  value={routineFilter}
                  onChange={(event) => setRoutineFilter(event.target.value)}
                  className="theme-accent-focus h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-sm font-semibold outline-none dark:rounded-[3px]"
                >
                  <option value="">Todas</option>
                  {routinesInData.map((routine) => (
                    <option key={routine} value={routine}>
                      {routine}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={loadTrainings}
                  disabled={loading}
                  className="h-11 rounded-lg dark:rounded-[3px]"
                >
                  {loading ? "Cargando..." : "Actualizar"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-lg dark:rounded-[3px]"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:rounded-[3px] dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Sesiones registradas
            </p>
            <span className="text-xs font-bold text-[color:var(--text-muted)]">
              {filtered.length} sesiones
            </span>
          </div>

          <div className="space-y-3">
            {!loading && !filtered.length ? (
              <div className="col-span-full border border-dashed border-[color:var(--border)] bg-[color:var(--card)] px-5 py-10 text-center">
                <CalendarDays className="mx-auto h-7 w-7 text-[color:var(--text-muted)]" />
                <p className="mt-3 text-base font-bold">
                  Sin sesiones para mostrar
                </p>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  Ajusta los filtros o registra un nuevo entrenamiento.
                </p>
              </div>
            ) : null}
            {trainingGroups.map((group, groupIndex) => {
              const isMonthOpen =
                monthVisibility[group.key] ?? groupIndex === 0;

              return (
                <section key={group.key} className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMonthVisibility((current) => ({
                        ...current,
                        [group.key]: !isMonthOpen,
                      }))
                    }
                    className={`flex h-11 w-full items-center gap-3 rounded-lg border px-3 text-left transition dark:rounded-[3px] ${
                      isMonthOpen
                        ? "border-[color:var(--accent)] bg-[color:var(--card)]"
                        : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--accent)]"
                    }`}
                    aria-expanded={isMonthOpen}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0 text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]" />
                    <span className="min-w-0 flex-1 truncate text-sm font-black uppercase text-[color:var(--text)]">
                      {group.label}
                    </span>
                    <span className="text-xs font-bold text-[color:var(--text-muted)]">
                      {group.trainings.length}{" "}
                      {group.trainings.length === 1 ? "sesión" : "sesiones"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${
                        isMonthOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isMonthOpen ? (
                    <div className="grid gap-2">
                      {group.trainings.map((training) => {
                        const id = training._id || training.id;
                        const canManage =
                          !viewingAthlete ||
                          (isCoach &&
                            training.sessionType === "supervised" &&
                            String(training.supervisedBy || "") ===
                              String(user?.id || user?._id || ""));
                        const totalSets = (training.exercises || []).reduce(
                          (acc, exercise) => acc + (exercise.sets?.length || 0),
                          0,
                        );
                        const branch =
                          training.branch ||
                          training.routineBranch ||
                          "general";
                        const totalVolume = training.totalVolume ?? 0;

                        return (
                          <article
                            key={id}
                            tabIndex={0}
                            aria-label={`Abrir rutina de ${training.routineName || "la sesión"}`}
                            onClick={(event) => {
                              if (event.target.closest("button")) return;
                              setActionMenuId("");
                              handleViewTraining(training);
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.target !== event.currentTarget ||
                                !["Enter", " "].includes(event.key)
                              ) {
                                return;
                              }
                              event.preventDefault();
                              handleViewTraining(training);
                            }}
                            className="grid min-w-0 cursor-pointer grid-cols-1 gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm outline-none transition hover:border-[color:var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] dark:rounded-[4px] md:grid-cols-[minmax(240px,1.7fr)_72px_120px_120px] md:items-center md:gap-4 md:px-4"
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h2 className="truncate text-lg font-black uppercase text-[color:var(--text)]">
                                  {training.routineName || "Sin nombre"}
                                </h2>
                                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-[color:var(--text-muted)]">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatDate(training.date)}
                                </p>
                              </div>
                              <div className="relative flex shrink-0 items-center gap-1">
                                <span
                                  className={`rounded-[3px] border px-2 py-1 text-[10px] font-black tracking-[0.1em] ${branchPillClass(
                                    branch,
                                  )}`}
                                >
                                  {branchLabel(branch)}
                                </span>
                                {canManage ? (
                                  <div data-session-actions>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setActionMenuId((current) =>
                                          current === id ? "" : id,
                                        );
                                      }}
                                      className="grid h-8 w-8 place-items-center rounded-[3px] text-[color:var(--text-muted)] transition hover:bg-[color:var(--bg)] hover:text-[color:var(--text)]"
                                      aria-label="Opciones de la sesión"
                                      aria-expanded={actionMenuId === id}
                                      aria-haspopup="menu"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                    {actionMenuId === id ? (
                                      <div
                                        role="menu"
                                        className="absolute right-0 top-9 z-30 w-44 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-xl dark:rounded-[3px]"
                                      >
                                        {isAdmin ? (
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setActionMenuId("");
                                              openDurationEditor(training);
                                            }}
                                            className="flex h-10 w-full items-center gap-2 rounded-[3px] px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)]"
                                          >
                                            <Clock3 className="h-4 w-4" />
                                            Editar duración
                                          </button>
                                        ) : null}
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setActionMenuId("");
                                            setDeleteTarget(training);
                                          }}
                                          className="flex h-10 w-full items-center gap-2 rounded-[3px] px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Eliminar sesión
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 border-y border-[color:var(--border)] py-2.5 md:contents">
                              <MetricBox label="Sets" value={totalSets} />
                              <MetricBox
                                label="Duración"
                                value={formatDuration(
                                  training.durationSeconds || 0,
                                )}
                              />
                              <MetricBox
                                label="Volumen"
                                value={formatVolume(totalVolume)}
                                suffix="kg"
                                accent
                              />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>
      </div>

      {isAdmin && durationEditor ? (
        <Modal
          title="Editar duración"
          subtitle={durationEditor.routineName}
          onClose={() => {
            if (!savingDuration) setDurationEditor(null);
          }}
          footer={
            <Button
              type="button"
              className="h-11 min-w-32 rounded-lg dark:rounded-[3px]"
              disabled={savingDuration}
              onClick={handleSaveDuration}
            >
              {savingDuration ? "Guardando..." : "Guardar duración"}
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="theme-accent-soft flex items-center gap-3 rounded-lg border p-3 dark:rounded-[3px]">
              <Clock3 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold text-[color:var(--text-muted)]">
                Este ajuste reemplaza la duración calculada por el cronómetro.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["hours", "Horas"],
                ["minutes", "Minutos"],
                ["seconds", "Segundos"],
              ].map(([field, label]) => (
                <label key={field} className="min-w-0 space-y-1.5">
                  <span className="block truncate text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                    {label}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={durationEditor[field]}
                    onChange={(event) =>
                      updateDurationPart(field, event.target.value)
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    className="theme-accent-focus h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-center text-lg font-black tabular-nums outline-none dark:rounded-[3px]"
                    aria-label={label}
                  />
                </label>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal
          title="Eliminar entrenamiento"
          subtitle={deleteTarget.routineName || "Sin nombre"}
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          footer={
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="h-11 rounded-lg bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-60 dark:rounded-[3px]"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          }
        >
          <p className="text-sm font-semibold text-[color:var(--text-muted)]">
            Se eliminaran las series, pesos y volumen registrados en esta
            sesion. Esta accion no se puede deshacer.
          </p>
        </Modal>
      ) : null}
    </section>
  );
}

export default function TrainingAdmin({
  onNavigate = () => {},
  onSelectCoachAthlete = () => true,
}) {
  return (
    <SessionHistory
      onNavigate={onNavigate}
      prepareTrainingContext={() => onSelectCoachAthlete(null)}
    />
  );
}
