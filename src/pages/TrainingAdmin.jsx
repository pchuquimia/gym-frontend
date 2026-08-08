import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Eye,
  ListFilter,
  Pencil,
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
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES") : "--";

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
  return num.toLocaleString("es-ES", { maximumFractionDigits: 2 });
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
  if (branch === "miraflores") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/20 dark:text-violet-200";
  }
  if (branch === "sopocachi") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/10 dark:text-slate-200";
};

function MetricBox({ label, value, suffix = "", tone = "white" }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-[color:var(--text)]";

  return (
    <div className="min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-3 text-center dark:rounded-[3px] sm:px-3">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-[color:var(--text-muted)] sm:text-[10px] sm:tracking-[0.14em]">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-base font-black leading-none sm:text-xl ${toneClass}`}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[10px] font-bold sm:ml-1 sm:text-[11px]">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export default function TrainingAdmin({ onNavigate = () => {} }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [routineFilter, setRoutineFilter] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [durationEditor, setDurationEditor] = useState(null);
  const [savingDuration, setSavingDuration] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const limit = 5000;

  const loadTrainings = async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await api.getTrainings({
        page: 1,
        limit,
        from: from || undefined,
        to: to || undefined,
        fields:
          "date,routineId,routineName,durationSeconds,totalVolume,branch,routineBranch,exercises",
        meta: true,
      });
      setTrainings(Array.isArray(resp) ? resp : resp?.items || []);
    } catch (err) {
      setError(err.message || "Error al cargar entrenamientos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

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
  const visibleTrainings = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(12);
  }, [from, routineFilter, search, to]);

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setRoutineFilter("");
    loadTrainings();
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
      if (expandedId === id) setExpandedId("");
      setDeleteTarget(null);
    } catch (_err) {
      toast.error("No se pudo eliminar el entrenamiento");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (training) => {
    const id = training._id || training.id;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("edit_training_id", id);
      if (training.date)
        localStorage.setItem("edit_training_date", training.date);
    }
    onNavigate("registrar");
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
    <main className="management-shell min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-0 py-2 pb-24 sm:px-6 sm:py-6 lg:px-10">
        <header className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Historial
              </p>
              <h1 className="mt-1 truncate font-condensed text-3xl font-bold uppercase leading-none text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]">
                Historial de sesiones
              </h1>
            </div>
            <Button
              type="button"
              onClick={() => onNavigate("registrar")}
              className="theme-accent-solid h-10 shrink-0 rounded-lg px-3 dark:rounded-[3px]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva sesion</span>
            </Button>
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
              className={`relative grid h-12 w-12 place-items-center rounded-xl border transition ${
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
                  className="h-11 rounded-xl"
                >
                  {loading ? "Cargando..." : "Actualizar"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Historial
            </p>
            <span className="text-sm font-bold text-[color:var(--text-muted)]">
              {filtered.length} sesiones
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {!loading && !filtered.length ? (
              <div className="col-span-full border border-dashed border-[color:var(--border)] bg-[color:var(--card)] px-5 py-10 text-center">
                <CalendarDays className="mx-auto h-7 w-7 text-[color:var(--text-muted)]" />
                <p className="mt-3 text-base font-bold">Sin sesiones para mostrar</p>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  Ajusta los filtros o registra un nuevo entrenamiento.
                </p>
              </div>
            ) : null}
            {visibleTrainings.map((training) => {
              const id = training._id || training.id;
              const totalSets = (training.exercises || []).reduce(
                (acc, exercise) => acc + (exercise.sets?.length || 0),
                0,
              );
              const branch =
                training.branch || training.routineBranch || "general";
              const totalVolume = training.totalVolume ?? 0;

              return (
                <article
                  key={id}
                  className="min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black leading-tight text-[color:var(--text)]">
                        {training.routineName || "Sin nombre"}
                      </h2>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                        <CalendarDays className="h-5 w-5" />
                        {formatDate(training.date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-black tracking-wide ${branchPillClass(
                        branch,
                      )}`}
                    >
                      {branchLabel(branch)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    <MetricBox label="Sets" value={totalSets} tone="emerald" />
                    <MetricBox
                      label="Duración"
                      value={formatDuration(training.durationSeconds || 0)}
                    />
                    <MetricBox
                      label="Volumen"
                      value={formatVolume(totalVolume)}
                      suffix="kg"
                      tone="amber"
                    />
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => openDurationEditor(training)}
                      className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] text-xs font-bold text-[color:var(--text-muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)] dark:rounded-[3px] dark:hover:text-[color:var(--accent)]"
                    >
                      <Clock3 className="h-4 w-4" />
                      Editar duración
                    </button>
                  ) : null}

                  <div className="mt-4 grid grid-cols-3 divide-x divide-[color:var(--border)] border-t border-[color:var(--border)] pt-3">
                    <button
                      type="button"
                      className="inline-flex h-11 min-w-0 items-center justify-center gap-1 text-xs font-semibold text-[color:var(--text)] sm:gap-2 sm:text-sm"
                      onClick={() =>
                        setExpandedId((prev) => (prev === id ? "" : id))
                      }
                    >
                      <Eye className="h-5 w-5 shrink-0" />
                      Ver
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 min-w-0 items-center justify-center gap-1 text-xs font-semibold text-[color:var(--text)] sm:gap-2 sm:text-sm"
                      onClick={() => handleEdit(training)}
                    >
                      <Pencil className="h-5 w-5 shrink-0" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 min-w-0 items-center justify-center gap-1 text-xs font-semibold text-[color:var(--text)] sm:gap-2 sm:text-sm"
                      onClick={() => setDeleteTarget(training)}
                    >
                      <Trash2 className="h-5 w-5 shrink-0" />
                      Eliminar
                    </button>
                  </div>

                  {expandedId === id ? (
                    <div className="mt-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 dark:rounded-[3px]">
                      <div className="grid gap-3">
                        {(training.exercises || []).map((exercise) => {
                          const sets = exercise.sets || [];
                          return (
                            <div
                              key={exercise.exerciseId || exercise.exerciseName}
                              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 dark:rounded-[3px]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold">
                                    {exercise.exerciseName}
                                  </p>
                                  <p className="truncate text-xs text-[color:var(--text-muted)]">
                                    {exercise.muscleGroup || "Sin grupo"}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-[color:var(--bg)] px-2 py-1 text-[10px] font-bold text-[color:var(--text-muted)]">
                                  {sets.length} sets
                                </span>
                              </div>
                              <div className="mt-3 space-y-1">
                                {sets.map((set, index) => (
                                  <div
                                    key={index}
                                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-[color:var(--bg)] px-3 py-2 text-xs"
                                  >
                                    <span className="shrink-0 text-[color:var(--text-muted)]">
                                      Set {index + 1}
                                    </span>
                                    <span className="min-w-0 truncate text-right font-semibold">
                                      {set.weightKg ?? set.weight ?? 0} kg x{" "}
                                      {set.reps ?? 0}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          {visibleCount < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 12)}
              className="mt-4 h-11 w-full border border-[color:var(--border)] bg-[color:var(--card)] text-sm font-bold uppercase text-[color:var(--accent-strong)] hover:border-[color:var(--accent)] dark:text-[color:var(--accent)]"
            >
              Mostrar 12 sesiones mas
            </button>
          ) : null}
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
              className="h-11 min-w-32 rounded-xl"
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
    </main>
  );
}
