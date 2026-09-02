import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageIcon, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import ExerciseCodexReviewQueue from "../components/library/ExerciseCodexReviewQueue";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import Button from "../components/ui/button";
import Skeleton from "../components/ui/skeleton";
import { api } from "../services/api";

const STATUS_LABELS = {
  pending: "En cola",
  processing: "Generando",
  ready: "Lista para revisar",
  failed: "Con error",
  applied: "Aplicada",
  rejected: "Rehacer",
  skipped: "Omitida",
  cancelled: "Descartada",
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Plan activo" },
  { id: "routine", label: "Solo rutinas" },
];

function ExerciseImageCard({
  item,
  selected,
  specificInstruction,
  expanded,
  onToggle,
  onTogglePrompt,
  onInstructionChange,
}) {
  const unavailable = !item.image || item.latestRequest?.active;
  const status = item.latestRequest?.status;

  return (
    <article
      className={`overflow-hidden rounded-[1.1rem] border bg-[color:var(--card)] transition-colors ${
        selected
          ? "border-[#352018] ring-2 ring-[#352018]/10 dark:border-[#e2ff00] dark:ring-[#e2ff00]/10"
          : "border-[color:var(--border)]"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        disabled={unavailable}
        aria-label={`${selected ? "Quitar" : "Seleccionar"} ${item.name}`}
        aria-pressed={selected}
        className="relative block aspect-square w-full overflow-hidden bg-[color:var(--surface-subtle)] text-left disabled:cursor-not-allowed"
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-300 ${
              selected ? "scale-[1.015]" : ""
            }`}
          />
        ) : (
          <span className="grid h-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-7 w-7" />
          </span>
        )}
        <span
          className={`absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full border shadow-sm backdrop-blur ${
            selected
              ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
              : "border-white/70 bg-black/30 text-transparent"
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
        {status ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#fffaf4]/92 px-2.5 py-1 text-[10px] font-semibold text-[#625851] shadow-sm backdrop-blur dark:bg-black/75 dark:text-white/80">
            {STATUS_LABELS[status] || status}
          </span>
        ) : null}
      </button>

      <div className="p-3.5">
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-[1.25] text-[color:var(--text)]">
          {item.name}
        </h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          {item.primaryMuscleGroup}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-[color:var(--text-muted)]">
          <span>
            {item.routineCount} {item.routineCount === 1 ? "rutina" : "rutinas"}
          </span>
          {item.planCount ? (
            <span>
              {item.planCount} {item.planCount === 1 ? "plan" : "planes"}
            </span>
          ) : null}
          {item.usedAsAlternative ? <span>Alternativa</span> : null}
        </div>

        {selected ? (
          <div className="mt-3 border-t border-[color:var(--border)] pt-3">
            <button
              type="button"
              onClick={() => onTogglePrompt(item.id)}
              className="text-xs font-semibold text-[color:var(--text)] underline decoration-[color:var(--border)] underline-offset-4"
            >
              {expanded
                ? "Cerrar ajuste específico"
                : specificInstruction
                  ? "Editar ajuste específico"
                  : "Agregar ajuste específico"}
            </button>
            {expanded ? (
              <textarea
                value={specificInstruction}
                onChange={(event) =>
                  onInstructionChange(item.id, event.target.value)
                }
                rows={3}
                maxLength={800}
                placeholder="Ej. conservar visible el agarre y el equipo."
                className="mt-3 w-full resize-y rounded-[0.8rem] border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm leading-relaxed text-[color:var(--text)] outline-none focus:border-[#352018] dark:focus:border-[#e2ff00]"
              />
            ) : null}
          </div>
        ) : null}

        {!item.image ? (
          <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
            Necesita una imagen de referencia.
          </p>
        ) : item.latestRequest?.active ? (
          <p className="mt-3 text-xs font-medium text-[color:var(--text-muted)]">
            Ya tiene una propuesta en curso.
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function ExerciseImageStudio({
  onBack,
  onMobileNavVisibilityChange,
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("create");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [masterInstruction, setMasterInstruction] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [specificInstructions, setSpecificInstructions] = useState({});
  const [expandedId, setExpandedId] = useState("");

  useEffect(() => {
    onMobileNavVisibilityChange?.(true);
    return () => onMobileNavVisibilityChange?.(false);
  }, [onMobileNavVisibilityChange]);

  const workspaceQuery = useQuery({
    queryKey: ["exercise-image-workspace"],
    queryFn: () => api.getExerciseImageWorkspace(),
    staleTime: 30 * 1000,
  });
  const items = useMemo(
    () => workspaceQuery.data?.items || [],
    [workspaceQuery.data?.items],
  );
  const summary = workspaceQuery.data?.summary || {};
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "active" && !item.inActivePlan) return false;
        if (filter === "routine" && item.planCount) return false;
        if (!normalizedSearch) return true;
        return [
          item.name,
          item.primaryMuscleGroup,
          ...item.routineNames,
          ...item.planNames,
        ]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalizedSearch);
      }),
    [filter, items, normalizedSearch],
  );
  const selectableVisibleIds = visibleItems
    .filter((item) => item.image && !item.latestRequest?.active)
    .map((item) => item.id);
  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedIds.includes(id));

  const batchMutation = useMutation({
    mutationFn: () =>
      api.createCodexImageBatch({
        exerciseIds: selectedIds,
        masterInstruction: masterInstruction.trim(),
        specificInstructions,
      }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["exercise-image-workspace"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["codex-image-review-queue"],
        }),
      ]);
      setSelectedIds([]);
      setSpecificInstructions({});
      setExpandedId("");
      toast.success(`${result.created} propuestas agregadas`, {
        description: result.failed
          ? `${result.failed} imágenes no pudieron agregarse.`
          : "Podrás aprobarlas antes de publicarlas.",
      });
    },
    onError: (error) => {
      toast.error(error.message || "No se pudieron crear las propuestas");
    },
  });

  const toggleSelection = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !selectableVisibleIds.includes(id));
      }
      return [...new Set([...current, ...selectableVisibleIds])];
    });
  };

  const handleApplied = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["exercise-image-workspace"],
    });
  };

  return (
    <main className="min-h-dvh font-[var(--mobile-ui-font)]">
      <MobilePageHeader
        title="Imágenes de ejercicios"
        variant="detail"
        onBack={onBack}
        className="sticky top-0 z-40 -mx-3 bg-[color:var(--bg)] sm:-mx-4"
      />

      <div className="mx-auto w-full max-w-[1180px] pb-10 md:pt-2">
        <header className="hidden items-end justify-between gap-6 border-b border-[color:var(--border)] pb-5 md:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Administración
            </p>
            <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.035em] text-[color:var(--text)]">
              Imágenes de ejercicios
            </h1>
          </div>
          <p className="max-w-[380px] text-right text-sm leading-relaxed text-[color:var(--text-muted)]">
            Primera etapa: ejercicios usados actualmente en planes o rutinas.
          </p>
        </header>

        <div
          className="mt-4 grid grid-cols-2 rounded-[1rem] bg-[color:var(--surface-subtle)] p-1 md:mt-5 md:w-[360px]"
          role="tablist"
          aria-label="Gestión de imágenes"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            onClick={() => setMode("create")}
            className={`h-10 rounded-[0.75rem] text-sm font-semibold transition ${
              mode === "create"
                ? "bg-[color:var(--card)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            Crear propuestas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "review"}
            onClick={() => setMode("review")}
            className={`h-10 rounded-[0.75rem] text-sm font-semibold transition ${
              mode === "review"
                ? "bg-[color:var(--card)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            Revisar propuestas
          </button>
        </div>

        {mode === "review" ? (
          <div className="mt-5">
            <ExerciseCodexReviewQueue onApplied={handleApplied} />
          </div>
        ) : (
          <>
            <section className="mt-5 rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--text)]">
                    Instrucción maestra
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    Se aplicará a todas las imágenes seleccionadas. El estándar
                    anatómico del proyecto permanece incluido.
                  </p>
                </div>
                <span className="text-xs text-[color:var(--text-muted)]">
                  {masterInstruction.length}/1600
                </span>
              </div>
              <textarea
                value={masterInstruction}
                onChange={(event) => setMasterInstruction(event.target.value)}
                rows={3}
                maxLength={1600}
                placeholder="Ej. conservar el encuadre original, unificar iluminación y mantener fondo gris claro."
                className="mt-4 w-full resize-y rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--bg)] p-3.5 text-sm leading-relaxed text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#352018] dark:focus:border-[#e2ff00]"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4">
                <p className="text-sm text-[color:var(--text-muted)]">
                  {selectedIds.length
                    ? `${selectedIds.length} ${selectedIds.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}`
                    : "Selecciona las imágenes que deseas modificar."}
                </p>
                <Button
                  disabled={!selectedIds.length || batchMutation.isPending}
                  onClick={() => batchMutation.mutate()}
                  className="min-w-[190px]"
                >
                  {batchMutation.isPending ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Crear propuestas
                </Button>
              </div>
            </section>

            <section className="mt-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--text)]">
                    En uso ahora
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {summary.total || 0} ejercicios ·{" "}
                    {summary.inActivePlan || 0} en planes activos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleVisible}
                  disabled={!selectableVisibleIds.length}
                  className="text-sm font-semibold text-[color:var(--text)] disabled:opacity-40"
                >
                  {allVisibleSelected
                    ? "Quitar selección"
                    : "Seleccionar visibles"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <label className="relative block">
                  <span className="sr-only">Buscar ejercicios</span>
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar ejercicio, rutina o plan"
                    className="h-11 w-full rounded-[0.85rem] border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm text-[color:var(--text)] outline-none focus:border-[#352018] dark:focus:border-[#e2ff00]"
                  />
                </label>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {FILTERS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={filter === option.id}
                      onClick={() => setFilter(option.id)}
                      className={`h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition ${
                        filter === option.id
                          ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black"
                          : "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {workspaceQuery.isLoading ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="aspect-[0.72] rounded-[1.1rem]"
                    />
                  ))}
                </div>
              ) : workspaceQuery.isError ? (
                <div className="mt-5 rounded-[1rem] border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/20">
                  <p className="font-semibold text-red-700 dark:text-red-300">
                    No se pudieron cargar las imágenes en uso.
                  </p>
                  <p className="mt-1 text-sm text-red-600/80 dark:text-red-300/80">
                    {workspaceQuery.error?.message || "Inténtalo nuevamente."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => workspaceQuery.refetch()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : visibleItems.length ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {visibleItems.map((item) => (
                    <ExerciseImageCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.includes(item.id)}
                      specificInstruction={specificInstructions[item.id] || ""}
                      expanded={expandedId === item.id}
                      onToggle={toggleSelection}
                      onTogglePrompt={(id) =>
                        setExpandedId((current) => (current === id ? "" : id))
                      }
                      onInstructionChange={(id, value) =>
                        setSpecificInstructions((current) => ({
                          ...current,
                          [id]: value,
                        }))
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1rem] border border-dashed border-[color:var(--border)] p-8 text-center text-sm text-[color:var(--text-muted)]">
                  No hay ejercicios que coincidan con esta vista.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
