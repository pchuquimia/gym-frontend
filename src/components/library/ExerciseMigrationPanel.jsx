import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Database,
  History,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../ui/button";
import { api } from "../../services/api";

const normalizeSearch = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const PAGE_SIZE = 80;

function ExerciseThumb({ exercise }) {
  const [failedSrc, setFailedSrc] = useState("");
  const src = exercise?.image || "";
  return (
    <span className="grid h-20 w-[76px] shrink-0 place-items-center overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)] text-xl font-black text-[color:var(--text-muted)]">
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        exercise?.name?.charAt(0) || "?"
      )}
    </span>
  );
}

ExerciseThumb.propTypes = {
  exercise: PropTypes.object,
};

function SearchableExerciseList({
  title,
  label,
  items,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  legacy = false,
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const matchingItems = useMemo(() => {
    const normalized = normalizeSearch(query);
    const terms = normalized
      .split(/\s+/)
      .filter(
        (term) =>
          term.length > 1 &&
          !["de", "del", "con", "en", "el", "la"].includes(term),
      );
    const matches = items.filter((item) => {
      if (!terms.length) return true;
      const equipment = Array.isArray(item.equipment)
        ? item.equipment.join(" ")
        : String(item.equipment || "");
      const haystack = normalizeSearch(
        `${item.name} ${item.nameEnglish} ${item.muscle} ${equipment}`,
      );
      return terms.every((term) => haystack.includes(term));
    });
    if (!legacy) return matches;
    return [...matches].sort((left, right) => {
      const referenceDifference =
        (Number(right.references?.total) || 0) -
        (Number(left.references?.total) || 0);
      if (referenceDifference !== 0) return referenceDifference;
      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });
  }, [items, legacy, query]);
  const visibleItems = matchingItems.slice(0, visibleCount);

  return (
    <section className="min-w-0 border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="border-b border-[color:var(--border)] p-3">
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          {label}
        </p>
        <h2 className="mt-1 text-lg font-black uppercase">{title}</h2>
        <label className="relative mt-3 block">
          <span className="sr-only">Buscar en {title}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(event) => {
              setVisibleCount(PAGE_SIZE);
              onQueryChange(event.target.value);
            }}
            placeholder="Buscar por nombre o músculo"
            className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-base font-bold outline-none sm:text-sm"
          />
        </label>
      </div>

      <div
        role="listbox"
        aria-label={title}
        className="max-h-[330px] divide-y divide-[color:var(--border)] overflow-y-auto"
      >
        {visibleItems.map((exercise) => {
          const selected = selectedId === exercise.id;
          const referenceTotal = Number(exercise.references?.total) || 0;
          return (
            <button
              key={exercise.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(exercise)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                selected
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                  : "hover:bg-[color:var(--bg)]"
              }`}
            >
              <ExerciseThumb exercise={exercise} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black uppercase">
                  {exercise.name}
                </span>
                <span
                  className={`mt-0.5 block truncate text-[11px] font-semibold ${
                    selected
                      ? "text-current/80"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  {exercise.muscle || "Sin grupo"}
                  {legacy ? ` · ${referenceTotal} referencias` : ""}
                </span>
              </span>
              {legacy && referenceTotal > 0 ? (
                <span
                  className={`shrink-0 px-2 py-1 text-[9px] font-black uppercase ${
                    selected
                      ? "border border-current bg-transparent text-current"
                      : "theme-accent-soft"
                  }`}
                >
                  Con historial
                </span>
              ) : null}
              {selected ? (
                <span className="grid h-6 w-6 shrink-0 place-items-center border border-current bg-transparent text-current">
                  <Check className="h-4 w-4" />
                </span>
              ) : null}
            </button>
          );
        })}
        {!visibleItems.length ? (
          <p className="px-4 py-10 text-center text-sm font-semibold text-[color:var(--text-muted)]">
            Sin coincidencias.
          </p>
        ) : null}
      </div>
      <div className="flex min-h-10 items-center justify-between gap-3 border-t border-[color:var(--border)] px-3 py-2">
        <p className="text-[10px] font-bold text-[color:var(--text-muted)]">
          {visibleItems.length} de {matchingItems.length} coincidencias
          {matchingItems.length !== items.length
            ? ` · ${items.length} en total`
            : ""}
        </p>
        {visibleItems.length < matchingItems.length ? (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="shrink-0 text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]"
          >
            Mostrar más
          </button>
        ) : null}
      </div>
    </section>
  );
}

SearchableExerciseList.propTypes = {
  title: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedId: PropTypes.string.isRequired,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  legacy: PropTypes.bool,
};

function ConfirmationDialog({
  action,
  source,
  target,
  onCancel,
  onConfirm,
  busy,
}) {
  if (!action || !source) return null;
  const migration = action === "migrate";
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/65 p-0 sm:place-items-center sm:p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exercise-migration-confirm-title"
        className="w-full max-w-lg border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-red-500">
              Confirmación administrativa
            </p>
            <h2
              id="exercise-migration-confirm-title"
              className="mt-1 text-2xl font-black uppercase"
            >
              {migration ? "Migrar y eliminar" : "Eliminar ejercicio antiguo"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-10 w-10 shrink-0 place-items-center border border-[color:var(--border)]"
            aria-label="Cerrar confirmación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {migration ? (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-y border-[color:var(--border)] py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                Origen
              </p>
              <p className="mt-1 truncate text-sm font-black">{source.name}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                Destino
              </p>
              <p className="mt-1 truncate text-sm font-black">{target?.name}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex gap-3 border-l-2 border-red-500 bg-red-500/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-[color:var(--text-muted)]">
            {migration
              ? "Se reemplazarán todas las referencias y la ficha antigua se eliminará al finalizar."
              : "La ficha se eliminará de forma permanente. Esta acción no se puede deshacer."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            className="h-11 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar
          </Button>
        </div>
      </section>
    </div>
  );
}

ConfirmationDialog.propTypes = {
  action: PropTypes.oneOf(["migrate", "delete"]),
  source: PropTypes.object,
  target: PropTypes.object,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

export default function ExerciseMigrationPanel() {
  const queryClient = useQueryClient();
  const [legacyId, setLegacyId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [legacyQuery, setLegacyQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const candidatesQuery = useQuery({
    queryKey: ["exercise-migration-candidates"],
    queryFn: api.getExerciseMigrationCandidates,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const data = candidatesQuery.data || {};
  const legacy = data.legacy || [];
  const targets = data.targets || [];
  const selectedLegacy = legacy.find((item) => item.id === legacyId) || null;
  const selectedTarget = targets.find((item) => item.id === targetId) || null;

  const refreshRelatedData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["exercise-migration-candidates"],
      }),
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] }),
      queryClient.invalidateQueries({ queryKey: ["exercise-facets"] }),
      queryClient.invalidateQueries({ queryKey: ["exercises"] }),
      queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["trainings"] }),
    ]);
    window.dispatchEvent(new Event("exercise-catalog-migrated"));
  };

  const migrationMutation = useMutation({
    mutationFn: () =>
      api.migrateExerciseCatalogData({
        legacyExerciseId: selectedLegacy.id,
        targetExerciseId: selectedTarget.id,
        deleteLegacy: true,
      }),
    onSuccess: async (result) => {
      toast.success("Datos migrados", {
        description: `${result.sourceExercise.name} → ${result.targetExercise.name}`,
      });
      setLegacyId("");
      setTargetId("");
      setLegacyQuery("");
      setTargetQuery("");
      setConfirmation("");
      await refreshRelatedData();
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo completar la migración");
      setConfirmation("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteLegacyExercise(selectedLegacy.id),
    onSuccess: async (result) => {
      toast.success("Ejercicio antiguo eliminado", {
        description: result.sourceExercise.name,
      });
      setLegacyId("");
      setLegacyQuery("");
      setConfirmation("");
      await refreshRelatedData();
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo eliminar el ejercicio");
      setConfirmation("");
    },
  });

  const busy = migrationMutation.isPending || deleteMutation.isPending;
  const references = selectedLegacy?.references || {
    routines: 0,
    trainings: 0,
    sessions: 0,
    total: 0,
  };

  if (candidatesQuery.isLoading) {
    return (
      <div className="grid min-h-72 place-items-center border border-[color:var(--border)] bg-[color:var(--card)]">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin text-[#ff5722] dark:text-[#e2ff00]" />
          Revisando referencias
        </span>
      </div>
    );
  }

  if (candidatesQuery.isError) {
    return (
      <div className="border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-sm font-bold text-red-500">
          {candidatesQuery.error?.message ||
            "No se pudo cargar el catálogo anterior"}
        </p>
        <Button
          variant="outline"
          className="mt-3 gap-2"
          onClick={() => candidatesQuery.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 divide-x divide-[color:var(--border)] border border-[color:var(--border)] bg-[color:var(--card)] py-3 text-center">
        <div>
          <p className="text-2xl font-black">{data.summary?.legacy || 0}</p>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Antiguos
          </p>
        </div>
        <div>
          <p className="text-2xl font-black text-[#ff5722] dark:text-[#e2ff00]">
            {data.summary?.withReferences || 0}
          </p>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Por migrar
          </p>
        </div>
        <div>
          <p className="text-2xl font-black">{data.summary?.targets || 0}</p>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Nuevos
          </p>
        </div>
      </section>

      {legacy.length ? (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <SearchableExerciseList
              title="Catálogo anterior"
              label="1. Selecciona el origen"
              items={legacy}
              selectedId={legacyId}
              query={legacyQuery}
              onQueryChange={setLegacyQuery}
              legacy
              onSelect={(exercise) => {
                setLegacyId(exercise.id);
                setTargetId("");
                setTargetQuery(exercise.name);
              }}
            />
            <SearchableExerciseList
              title="Catálogo importado"
              label="2. Selecciona el destino"
              items={targets}
              selectedId={targetId}
              query={targetQuery}
              onQueryChange={setTargetQuery}
              onSelect={(exercise) => setTargetId(exercise.id)}
            />
          </div>

          <section className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                  Impacto
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  {selectedLegacy
                    ? selectedLegacy.name
                    : "Selecciona un ejercicio antiguo"}
                </h2>
              </div>
              {selectedLegacy?.mergedIntoExerciseId ? (
                <span className="theme-accent-soft px-2 py-1 text-[10px] font-black uppercase">
                  Migrado previamente
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] py-3 text-center">
              <div>
                <p className="text-xl font-black">{references.routines}</p>
                <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                  Rutinas
                </p>
              </div>
              <div>
                <p className="text-xl font-black">{references.trainings}</p>
                <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                  Entrenamientos
                </p>
              </div>
              <div>
                <p className="text-xl font-black">{references.sessions}</p>
                <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
                  Sesiones
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="h-11 gap-2 border-red-500/40 text-red-500"
                disabled={!selectedLegacy || references.total > 0 || busy}
                title={
                  references.total > 0
                    ? "Migra las referencias antes de eliminar"
                    : "Eliminar ficha antigua"
                }
                onClick={() => setConfirmation("delete")}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar antiguo
              </Button>
              <Button
                className="h-11 gap-2"
                disabled={!selectedLegacy || !selectedTarget || busy}
                onClick={() => setConfirmation("migrate")}
              >
                <Database className="h-4 w-4" />
                Migrar y eliminar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </>
      ) : (
        <section className="grid min-h-64 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
          <div>
            <Check className="mx-auto h-8 w-8 text-[#ff5722] dark:text-[#e2ff00]" />
            <h2 className="mt-3 text-xl font-black uppercase">
              Catálogo anterior limpio
            </h2>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
              No quedan ejercicios antiguos pendientes.
            </p>
          </div>
        </section>
      )}

      {data.recent?.length ? (
        <details className="border border-[color:var(--border)] bg-[color:var(--card)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-black uppercase">
            <History className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
            Operaciones recientes
          </summary>
          <div className="divide-y divide-[color:var(--border)] border-t border-[color:var(--border)]">
            {data.recent.map((item) => (
              <div
                key={item.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
              >
                <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                  {new Date(item.createdAt).toLocaleDateString("es-BO")}
                </p>
                <p className="truncate text-sm font-bold">
                  {item.sourceExercise.name}
                  {item.targetExercise?.name
                    ? ` → ${item.targetExercise.name}`
                    : ""}
                </p>
                <span className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                  {item.operation === "migrate" ? "Migrado" : "Eliminado"}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <ConfirmationDialog
        action={confirmation || null}
        source={selectedLegacy}
        target={selectedTarget}
        busy={busy}
        onCancel={() => setConfirmation("")}
        onConfirm={() => {
          if (confirmation === "migrate") migrationMutation.mutate();
          else if (confirmation === "delete") deleteMutation.mutate();
        }}
      />
    </div>
  );
}
