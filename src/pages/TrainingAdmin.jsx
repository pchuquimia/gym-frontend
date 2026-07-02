import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
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
    <div className="min-w-0 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-3 text-center sm:px-3">
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
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [routineFilter, setRoutineFilter] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setRoutineFilter("");
    loadTrainings();
  };

  const activeFiltersCount = [from, to, routineFilter].filter(Boolean).length;

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm(
      "¿Eliminar este entrenamiento? Esta acción es permanente.",
    );
    if (!ok) return;
    try {
      await api.deleteTraining(id);
      toast.success("Entrenamiento eliminado");
      setTrainings((prev) => prev.filter((item) => (item._id || item.id) !== id));
      if (expandedId === id) setExpandedId("");
    } catch (_err) {
      toast.error("No se pudo eliminar el entrenamiento");
    }
  };

  const handleEdit = (training) => {
    const id = training._id || training.id;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("edit_training_id", id);
      if (training.date) localStorage.setItem("edit_training_date", training.date);
    }
    onNavigate("registrar");
  };

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-0 py-2 pb-24 sm:px-6 sm:py-6 lg:px-10">
        <header className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Historial
              </p>
              <h1 className="mt-1 truncate text-2xl font-black leading-none">
                Sesiones
              </h1>
            </div>
            <span className="shrink-0 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-xs font-black text-[color:var(--text-muted)]">
              {filtered.length}/{trainings.length}
            </span>
          </div>
        </header>

        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm md:p-4">
          <div className="flex items-center gap-2">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rutina o fecha..."
                className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-12 pr-4 text-sm font-semibold outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className={`relative grid h-12 w-12 place-items-center rounded-xl border transition ${
                filtersOpen || activeFiltersCount
                  ? "border-blue-400/50 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                  : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-muted)]"
              }`}
              aria-label="Opciones de filtro"
            >
              <ListFilter className="h-5 w-5" />
              {activeFiltersCount ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
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
                  <span className="max-w-[180px] truncate">{routineFilter}</span>
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
                    className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
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
                    className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
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
                  className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
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
            <button
              type="button"
              className="text-sm font-semibold text-blue-600 dark:text-blue-300"
              onClick={loadTrainings}
            >
              Ver todo
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((training) => {
              const id = training._id || training.id;
              const totalSets = (training.exercises || []).reduce(
                (acc, exercise) => acc + (exercise.sets?.length || 0),
                0,
              );
              const branch = training.branch || training.routineBranch || "general";
              const totalVolume = training.totalVolume ?? 0;

              return (
                <article
                  key={id}
                  className="min-w-0 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm"
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
                      onClick={() => handleDelete(id)}
                    >
                      <Trash2 className="h-5 w-5 shrink-0" />
                      Eliminar
                    </button>
                  </div>

                  {expandedId === id ? (
                    <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                      <div className="grid gap-3">
                        {(training.exercises || []).map((exercise) => {
                          const sets = exercise.sets || [];
                          return (
                            <div
                              key={exercise.exerciseId || exercise.exerciseName}
                              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3"
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
        </section>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700"
        onClick={() => onNavigate("registrar")}
        aria-label="Nueva sesión"
      >
        <Plus className="h-6 w-6" />
      </button>
    </main>
  );
}
