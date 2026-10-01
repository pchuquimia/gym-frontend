import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";

const REASONS = {
  previous_catalog: "Catálogo anterior",
  merged: "Fusionado con otra ficha",
  review: "Pendiente de revisión",
  inactive: "Desactivado",
};
const EMPTY_ITEMS = [];

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

export default function InactiveExerciseReviewPanel({ onOpenMigration }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyId, setBusyId] = useState("");
  const query = useQuery({
    queryKey: ["inactive-exercises-review"],
    queryFn: api.getInactiveExercises,
    staleTime: 30_000,
  });
  const items = query.data?.items || EMPTY_ITEMS;
  const visible = useMemo(() => items.filter((item) =>
    (reason === "all" || item.reason === reason) &&
    normalize(`${item.name} ${item.nameEnglish} ${item.muscle} ${item.id}`)
      .includes(normalize(search.trim())),
  ), [items, reason, search]);
  const selected = items.filter((item) => selectedIds.has(item.id));
  const deletable = selected.filter((item) => !item.references?.total);
  const referenced = selected.length - deletable.length;

  const refreshCatalog = async () => {
    await queryClient.invalidateQueries({ queryKey: ["inactive-exercises-review"] });
    queryClient.invalidateQueries({ queryKey: ["exercise-facets"] });
    queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
  };

  const restore = async (item) => {
    setBusyId(item.id);
    try {
      await api.restoreInactiveExercise(item.id);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      await refreshCatalog();
      toast.success(`${item.name} vuelve al catálogo`);
    } catch (error) {
      toast.error(error.message || "No se pudo activar el ejercicio");
    } finally {
      setBusyId("");
    }
  };

  const deleteSelected = async () => {
    setConfirmDelete(false);
    setBusyId("deleting");
    let deleted = 0;
    let failed = 0;
    for (const item of deletable) {
      try {
        await api.permanentlyDeleteInactiveExercise(item.id);
        deleted += 1;
      } catch {
        failed += 1;
      }
    }
    setSelectedIds(new Set());
    await refreshCatalog();
    setBusyId("");
    if (deleted) toast.success(`${deleted} ${deleted === 1 ? "ficha eliminada" : "fichas eliminadas"}`);
    if (failed) toast.error(`${failed} no se pudieron eliminar. Revisa sus referencias y vuelve a intentarlo.`);
  };

  return (
    <section className="space-y-4 font-sans text-[color:var(--text)]">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Revisar ejercicios desactivados</h2>
            <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">
              Decide cuáles vuelven al catálogo y cuáles se eliminan. Una ficha fusionada ya se conserva en su destino; las que tienen historial o rutinas deben migrarse antes de borrarse.
            </p>
          </div>
          <button type="button" onClick={() => query.refetch()} aria-label="Actualizar lista" className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)]">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm font-medium">{items.length} desactivados · {selected.length} seleccionados para eliminar</p>
        {items.some((item) => item.reason === "previous_catalog" && item.references?.total > 0) && onOpenMigration ? (
          <button type="button" onClick={onOpenMigration} className="mt-2 text-xs font-semibold text-[color:var(--accent)] underline underline-offset-2">
            Migrar referencias del catálogo anterior
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3">
          <Search className="h-4 w-4 text-[color:var(--text-muted)]" />
          <input aria-label="Buscar ejercicios desactivados" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o músculo" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <select aria-label="Filtrar motivo" value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm">
          <option value="all">Todos los motivos</option>
          {Object.entries(REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {query.isLoading ? <p className="p-6 text-sm">Cargando fichas y referencias…</p> : null}
      {query.isError ? <p className="rounded-xl border border-red-500/30 p-4 text-sm">No se pudo cargar la revisión. Usa «Actualizar lista» para reintentar.</p> : null}
      {query.isSuccess ? (
        <div className="space-y-2">
          {visible.map((item) => {
            const hasReferences = Number(item.references?.total) > 0;
            return (
              <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:flex-nowrap">
                {item.image ? (
                  <img src={item.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl bg-[color:var(--surface-subtle)] object-cover" />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[color:var(--surface-subtle)] text-xs text-[color:var(--text-muted)]">Sin imagen</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">{item.muscle || "Sin grupo"} · {REASONS[item.reason]} · {item.source === "previous_catalog" ? "Catálogo anterior" : "Catálogo importado"}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {item.references?.routines || 0} rutinas · {item.references?.trainings || 0} entrenamientos · {item.references?.sessions || 0} registros de serie
                  </p>
                  {item.mergedIntoExerciseId ? <p className="mt-1 text-xs">Conservado en: {item.mergedIntoExerciseId}</p> : null}
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <button type="button" disabled={Boolean(busyId) || Boolean(item.mergedIntoExerciseId)} onClick={() => restore(item)} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border)] px-3 text-xs font-semibold disabled:opacity-45 sm:flex-none" title={item.mergedIntoExerciseId ? "Esta ficha ya fue fusionada; conserva la ficha de destino" : undefined}>
                    <Check className="h-4 w-4" /> {item.mergedIntoExerciseId ? "Ya fusionado" : "Conservar"}
                  </button>
                  <label className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold sm:flex-none ${hasReferences ? "border-[color:var(--border)] opacity-50" : "border-red-500/40 text-red-600"}`} title={hasReferences ? "Migra sus referencias antes de eliminar" : undefined}>
                    <input type="checkbox" aria-label={`Seleccionar ${item.name} para eliminar`} checked={selectedIds.has(item.id)} disabled={hasReferences || Boolean(busyId)} onChange={(event) => setSelectedIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })} />
                    {hasReferences ? "Migrar antes" : "Eliminar"}
                  </label>
                </div>
              </article>
            );
          })}
          {!visible.length ? <p className="p-6 text-center text-sm text-[color:var(--text-muted)]">No hay fichas con estos filtros.</p> : null}
        </div>
      ) : null}

      {selected.length ? (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-[color:var(--card)] p-3 shadow-lg">
          <span className="text-sm font-medium">{deletable.length} para eliminar{referenced ? ` · ${referenced} con referencias` : ""}</span>
          <button type="button" disabled={!deletable.length || Boolean(busyId)} onClick={() => setConfirmDelete(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Eliminar seleccionados
          </button>
        </div>
      ) : null}

      {confirmDelete ? (
        <div role="dialog" aria-modal="true" aria-label="Confirmar eliminación definitiva" className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[color:var(--card)] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">Eliminar {deletable.length} {deletable.length === 1 ? "ejercicio" : "ejercicios"} definitivamente</h3>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Esta acción borra las fichas de la base de datos. No se puede deshacer. El servidor comprobará nuevamente que no tengan referencias.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-xl px-4 text-sm">Cancelar</button>
              <button type="button" onClick={deleteSelected} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white">Eliminar definitivamente</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
