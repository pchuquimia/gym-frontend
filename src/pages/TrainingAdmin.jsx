import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import { api } from "../services/api";
import { toast } from "sonner";

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES");
const formatDuration = (sec = 0) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

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
        fields: "date,routineId,routineName,durationSeconds,totalVolume,branch,routineBranch,exercises",
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
        (routineFilter ? (t.routineName || "").toLowerCase() === routineFilter.toLowerCase() : true)
    );
  }, [trainings, search, routineFilter]);

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm("Eliminar este entrenamiento? Esta accion es permanente.");
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
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Administrar sesiones</h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Revisa, edita o elimina sesiones (util para limpiar datos de prueba).
            </p>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
            {filtered.length} de {trainings.length} sesiones (limite {limit})
          </Badge>
        </div>

        <Card className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[color:var(--text-muted)]">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-[color:var(--border)] px-2 py-2 text-sm bg-transparent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[color:var(--text-muted)]">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-[color:var(--border)] px-2 py-2 text-sm bg-transparent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[color:var(--text-muted)]">Buscar (fecha o rutina)</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej. 2025-12-15 o Pecho"
                className="rounded-md border border-[color:var(--border)] px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[color:var(--text-muted)]">Filtrar por rutina</label>
              <select
                value={routineFilter}
                onChange={(e) => setRoutineFilter(e.target.value)}
                className="rounded-md border border-[color:var(--border)] px-2 py-2 text-sm bg-transparent"
              >
                <option value="">Todas</option>
                {routinesInData.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadTrainings} disabled={loading}>
              {loading ? "Cargando..." : "Refrescar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFrom("");
                setTo("");
                setSearch("");
                setRoutineFilter("");
                loadTrainings();
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((t) => {
            const id = t._id || t.id;
            const totalSets = (t.exercises || []).reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
            return (
              <Card key={id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
                  <div className="flex flex-col min-w-[200px] whitespace-normal">
                    <span className="text-sm font-semibold">{t.routineName || "Sin nombre"}</span>
                    <span className="text-xs text-[color:var(--text-muted)]">{formatDate(t.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      Sucursal: {t.branch || t.routineBranch || "general"}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      Duracion: {formatDuration(t.durationSeconds || 0)}
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                      Sets: {totalSets}
                    </Badge>
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                      Volumen: {Math.round(t.totalVolume || 0)} kg*reps
                    </Badge>
                    <Button
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setExpandedId((prev) => (prev === id ? "" : id))}
                    >
                      Ver entrenamiento
                    </Button>
                    <Button
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        if (typeof localStorage !== "undefined") {
                          localStorage.setItem("edit_training_id", id);
                          if (t.date) localStorage.setItem("edit_training_date", t.date);
                        }
                        onNavigate("registrar");
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="destructive" className="shrink-0" onClick={() => handleDelete(id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
                {expandedId === id && (
                  <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      {(t.exercises || []).map((ex) => {
                        const sets = ex.sets || [];
                        return (
                          <div key={ex.exerciseId} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex flex-col">
                                <span className="font-semibold">{ex.exerciseName}</span>
                                <span className="text-[color:var(--text-muted)] text-xs">{ex.muscleGroup || "—"}</span>
                              </div>
                              <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Sets: {sets.length}</Badge>
                            </div>
                            <div className="space-y-1">
                              {sets.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded-md border border-[color:var(--border)] px-2 py-1 text-xs bg-[color:var(--card)]"
                                >
                                  <span className="text-[color:var(--text-muted)]">Set {idx + 1}</span>
                                  <span className="font-semibold">
                                    {s.weightKg ?? s.weight ?? 0} kg × {s.reps ?? 0}
                                  </span>
                                  <span className="text-[color:var(--text-muted)]">{s.done ? "✔" : ""}</span>
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
