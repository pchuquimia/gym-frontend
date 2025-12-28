import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import { api } from "../services/api";
import { toast } from "sonner";

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES");

const formatDuration = (sec = 0) => {
  const total = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")}`;
};

const branchLabel = (b) => {
  const v = (b || "general").toString().toLowerCase();
  if (v === "general") return "GENERAL";
  return v.toUpperCase();
};

const branchPillClass = (b) => {
  const v = (b || "general").toString().toLowerCase();
  if (v === "miraflores")
    return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-400/25";
  if (v === "sopocachi")
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/25";
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
};

/* FIX: chips consistentes (label arriba / valor abajo centrado) */
const chipBase =
  "min-w-[96px] h-[56px] px-3 py-2 rounded-2xl border text-center " +
  "grid grid-rows-[auto,1fr] place-items-center gap-1";

const chip = {
  duration:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  sets: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/25",
  volume:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/25",
};

function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.2 16.2 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTune(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M4 7h10M18 7h2M4 17h2M10 17h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconCalendar(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M7 3v2M17 3v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconEye(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconPencil(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
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
  );
}

function IconTrash(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 6V4h8v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 6l1 16h10l1-16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
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
      const list = Array.isArray(resp) ? resp : resp?.items || [];
      setTrainings(list);
    } catch (e) {
      setError(e.message || "Error al cargar entrenamientos");
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
    trainings.forEach((t) => set.add(t.routineName || "Sin rutina"));
    return Array.from(set);
  }, [trainings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trainings.filter(
      (t) =>
        (!q ||
          (t.routineName || "").toLowerCase().includes(q) ||
          (t.date || "").includes(q)) &&
        (routineFilter
          ? (t.routineName || "").toLowerCase() === routineFilter.toLowerCase()
          : true)
    );
  }, [trainings, search, routineFilter]);

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm(
      "Eliminar este entrenamiento? Esta accion es permanente."
    );
    if (!ok) return;
    try {
      await api.deleteTraining(id);
      toast.success("Entrenamiento eliminado");
      setTrainings((prev) => prev.filter((t) => (t._id || t.id) !== id));
      if (expandedId === id) setExpandedId("");
    } catch (e) {
      toast.error("No se pudo eliminar el entrenamiento");
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[color:var(--text)]">
              Administrar Sesiones
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="rounded-full px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/25">
              {filtered.length} de {trainings.length}
            </Badge>

            <button
              type="button"
              className="
                h-9 w-9 rounded-xl border border-[color:var(--border)]
                bg-[color:var(--card)] grid place-items-center
                text-[color:var(--text-muted)]
                hover:bg-[color:var(--bg)] transition
                focus:outline-none focus:ring-2 focus:ring-blue-500/25
              "
              aria-label="Notificaciones"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
                <IconSearch />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar rutina o fecha..."
                className="
                  w-full rounded-xl border border-[color:var(--border)]
                  bg-[color:var(--bg)] pl-10 pr-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-blue-500/25
                "
              />
            </div>

            <button
              type="button"
              className="
                h-10 w-10 rounded-xl border border-[color:var(--border)]
                bg-[color:var(--bg)] grid place-items-center
                text-[color:var(--text-muted)]
                hover:bg-[color:var(--card)] transition
                focus:outline-none focus:ring-2 focus:ring-blue-500/25
              "
              aria-label="Opciones"
            >
              <IconTune />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--text-muted)]">
                Desde
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
                  <IconCalendar />
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="
                    w-full rounded-xl border border-[color:var(--border)]
                    bg-[color:var(--bg)] px-3 py-2 text-sm
                    outline-none focus:ring-2 focus:ring-blue-500/25
                  "
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[color:var(--text-muted)]">
                Hasta
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
                  <IconCalendar />
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="
                    w-full rounded-xl border border-[color:var(--border)]
                    bg-[color:var(--bg)] px-3 py-2 text-sm
                    outline-none focus:ring-2 focus:ring-blue-500/25
                  "
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[color:var(--text-muted)]">
              Filtrar por rutina
            </label>
            <select
              value={routineFilter}
              onChange={(e) => setRoutineFilter(e.target.value)}
              className="
                w-full rounded-xl border border-[color:var(--border)]
                bg-[color:var(--bg)] px-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-blue-500/25
              "
            >
              <option value="">Todas</option>
              {routinesInData.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={loadTrainings}
              disabled={loading}
              className="rounded-xl"
            >
              {loading ? "Cargando..." : "Refrescar"}
            </Button>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setFrom("");
                setTo("");
                setSearch("");
                setRoutineFilter("");
                loadTrainings();
              }}
            >
              Limpiar
            </Button>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="pt-1">
          <p className="text-[11px] font-semibold tracking-wide text-[color:var(--text-muted)]">
            HISTORIAL
          </p>
        </div>

        <div className="space-y-3">
          {filtered.map((t) => {
            const id = t._id || t.id;

            // ✅ total sets real (ya lo calculabas)
            const totalSets = (t.exercises || []).reduce(
              (acc, ex) => acc + (ex.sets?.length || 0),
              0
            );

            const branch = t.branch || t.routineBranch || "general";

            // ✅ total volume real según tu API: totalVolume
            const totalVolume = t.totalVolume ?? 0;

            return (
              <Card key={id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--text)] truncate">
                      {t.routineName || "Sin nombre"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)] inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <IconCalendar />
                        {formatDate(t.date)}
                      </span>
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${branchPillClass(
                      branch
                    )}`}
                  >
                    {branchLabel(branch)}
                  </span>
                </div>

                {/* ✅ Chips finales: label arriba, valor abajo, centrado */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* SETS */}
                  <div className={`${chipBase} ${chip.sets}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      Sets
                    </span>
                    <span className="text-sm font-bold">{totalSets}</span>
                  </div>

                  {/* DURACIÓN */}
                  <div className={`${chipBase} ${chip.duration}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      Duración
                    </span>
                    <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                      {formatDuration(t.durationSeconds || 0)}
                    </span>
                  </div>

                  {/* VOLUMEN */}
                  <div className={`${chipBase} ${chip.volume}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      Volumen
                    </span>
                    <span className="text-sm font-bold whitespace-nowrap">
                      {totalVolume}{" "}
                      <span className="text-[11px] opacity-70">kg</span>
                    </span>
                  </div>
                </div>

                <div
                  className="
                    grid grid-cols-3 gap-2
                    rounded-2xl border border-[color:var(--border)]
                    bg-[color:var(--bg)] p-2
                  "
                >
                  <button
                    type="button"
                    className="
                      inline-flex items-center justify-center gap-2
                      rounded-xl px-3 py-2 text-sm font-semibold
                      text-[color:var(--text)]
                      hover:bg-[color:var(--card)] transition
                      focus:outline-none focus:ring-2 focus:ring-blue-500/25
                    "
                    onClick={() =>
                      setExpandedId((prev) => (prev === id ? "" : id))
                    }
                  >
                    <IconEye className="text-[color:var(--text-muted)]" />
                    Ver
                  </button>

                  <button
                    type="button"
                    className="
                      inline-flex items-center justify-center
                      rounded-xl px-3 py-2
                      border border-slate-200 bg-white
                      text-slate-700 hover:bg-slate-50 transition
                      dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800
                      focus:outline-none focus:ring-2 focus:ring-blue-500/25
                    "
                    onClick={() => {
                      if (typeof localStorage !== "undefined") {
                        localStorage.setItem("edit_training_id", id);
                        if (t.date)
                          localStorage.setItem("edit_training_date", t.date);
                      }
                      onNavigate("registrar");
                    }}
                    aria-label="Editar"
                    title="Editar"
                  >
                    <IconPencil />
                  </button>

                  <button
                    type="button"
                    className="
                      inline-flex items-center justify-center
                      rounded-xl px-3 py-2
                      border border-rose-200 bg-rose-50
                      text-rose-700 hover:bg-rose-100 transition
                      dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15
                      focus:outline-none focus:ring-2 focus:ring-rose-500/25
                    "
                    onClick={() => handleDelete(id)}
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    <IconTrash />
                  </button>
                </div>

                {expandedId === id && (
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      {(t.exercises || []).map((ex) => {
                        const sets = ex.sets || [];
                        return (
                          <div
                            key={ex.exerciseId}
                            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex flex-col">
                                <span className="font-semibold">
                                  {ex.exerciseName}
                                </span>
                                <span className="text-[color:var(--text-muted)] text-xs">
                                  {ex.muscleGroup || "—"}
                                </span>
                              </div>
                              <Badge className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                                Sets: {sets.length}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              {sets.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs bg-[color:var(--bg)]"
                                >
                                  <span className="text-[color:var(--text-muted)]">
                                    Set {idx + 1}
                                  </span>
                                  <span className="font-semibold">
                                    {s.weightKg ?? s.weight ?? 0} kg ×{" "}
                                    {s.reps ?? 0}
                                  </span>
                                  <span className="text-[color:var(--text-muted)]">
                                    {s.done ? "✔" : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
