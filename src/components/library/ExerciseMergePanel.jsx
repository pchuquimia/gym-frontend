import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import Modal from "../shared/Modal";
import { api } from "../../services/api";

const normalizeSearch = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchesSearch = (exercise, query) => {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  return normalizeSearch(
    [
      exercise.name,
      exercise.nameEnglish,
      exercise.muscle,
      ...(exercise.equipment || []),
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(normalized);
};

const getSessionLabel = (exercise) => {
  const trainingSessions = Number(exercise?.references?.trainings) || 0;
  const legacySessions = Number(exercise?.references?.sessions) || 0;
  const count = Number.isFinite(Number(exercise?.references?.uniqueSessions))
    ? Number(exercise.references.uniqueSessions)
    : Math.max(trainingSessions, legacySessions);
  return `${count} ${count === 1 ? "sesión" : "sesiones"}`;
};

function ExerciseImage({ exercise, size = "small" }) {
  const [failed, setFailed] = useState(false);
  const dimensions = size === "large" ? "h-16 w-16" : "h-12 w-12";

  return (
    <span
      className={`${dimensions} grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[color:var(--surface-subtle)] text-lg font-semibold text-[color:var(--text-muted)]`}
    >
      {exercise?.image && !failed ? (
        <img
          src={exercise.image}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        exercise?.name?.charAt(0) || "?"
      )}
    </span>
  );
}

ExerciseImage.propTypes = {
  exercise: PropTypes.object,
  size: PropTypes.oneOf(["small", "large"]),
};

function ExercisePicker({
  title,
  helper,
  query,
  onQueryChange,
  items,
  selectedId,
  onSelect,
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[color:var(--text)]">
          {title}
        </h2>
        <p className="mt-0.5 font-sans text-[13px] text-[color:var(--text-muted)]">
          {helper}
        </p>
      </div>

      <label className="flex h-11 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 focus-within:border-[color:var(--border-strong)]">
        <Search className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar ejercicio"
          className="min-w-0 flex-1 border-0 bg-transparent font-sans text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
        />
      </label>

      <div className="mt-2 max-h-[340px] overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {items.length ? (
          items.map((exercise) => {
            const selected = selectedId === exercise.id;
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelect(exercise.id)}
                className={`flex w-full items-center gap-3 border-b border-[color:var(--detail-row-divider)] p-3 text-left transition-colors last:border-b-0 ${
                  selected
                    ? "bg-[color:var(--surface-subtle)]"
                    : "hover:bg-[color:var(--surface-subtle)]"
                }`}
              >
                <ExerciseImage exercise={exercise} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium tracking-[-0.01em] text-[color:var(--text)]">
                    {exercise.name}
                  </span>
                  <span className="mt-0.5 block truncate font-sans text-[12px] text-[color:var(--text-muted)]">
                    {[
                      exercise.muscle || "Sin clasificación",
                      ...(exercise.equipment || []),
                      getSessionLabel(exercise),
                    ].join(" · ")}
                  </span>
                </span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    selected
                      ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                      : "border-[color:var(--border-strong)] text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-4 py-10 text-center font-sans text-sm text-[color:var(--text-muted)]">
            No hay coincidencias.
          </p>
        )}
      </div>
    </section>
  );
}

ExercisePicker.propTypes = {
  title: PropTypes.string.isRequired,
  helper: PropTypes.string.isRequired,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

const referenceItems = (references = {}) => [
  { label: "Rutinas", value: references.routines || 0 },
  { label: "Entrenamientos", value: references.trainings || 0 },
  { label: "Registros", value: references.sessions || 0 },
];

export default function ExerciseMergePanel() {
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [confirming, setConfirming] = useState(false);

  const candidatesQuery = useQuery({
    queryKey: ["exercise-merge-candidates"],
    queryFn: api.getExerciseMergeCandidates,
    staleTime: 60_000,
  });
  const impactQuery = useQuery({
    queryKey: ["exercise-merge-impact", sourceId],
    queryFn: () => api.getExerciseMergeImpact(sourceId),
    enabled: Boolean(sourceId),
  });

  const candidates = useMemo(
    () => candidatesQuery.data?.items || [],
    [candidatesQuery.data?.items],
  );
  const source = candidates.find((item) => item.id === sourceId) || null;
  const target = candidates.find((item) => item.id === targetId) || null;
  const sourceItems = useMemo(
    () =>
      candidates.filter(
        (item) => item.id !== targetId && matchesSearch(item, sourceQuery),
      ),
    [candidates, sourceQuery, targetId],
  );
  const targetItems = useMemo(
    () =>
      candidates.filter(
        (item) => item.id !== sourceId && matchesSearch(item, targetQuery),
      ),
    [candidates, sourceId, targetQuery],
  );

  const mergeMutation = useMutation({
    mutationFn: () =>
      api.mergeExercises({
        sourceExerciseId: sourceId,
        targetExerciseId: targetId,
      }),
    onSuccess: async () => {
      const sourceName = source?.name || "El duplicado";
      const targetName = target?.name || "el ejercicio principal";
      setConfirming(false);
      setSourceId("");
      setTargetId("");
      setSourceQuery("");
      setTargetQuery("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["exercise-merge-candidates"],
        }),
        queryClient.invalidateQueries({ queryKey: ["exercise-library"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-facets"] }),
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["routines"] }),
        queryClient.invalidateQueries({ queryKey: ["trainings"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
      window.dispatchEvent(new Event("exercise-catalog-migrated"));
      toast.success(`Los datos de ${sourceName} pasaron a ${targetName}`);
    },
    onError: (error) => {
      toast.error(error?.message || "No se pudo fusionar los ejercicios");
    },
  });

  const references = impactQuery.data?.references || {};
  const canMerge = Boolean(source && target && !mergeMutation.isPending);

  if (candidatesQuery.isLoading) {
    return (
      <div className="grid min-h-72 place-items-center text-[color:var(--text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (candidatesQuery.isError) {
    return (
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
        <p className="font-sans text-sm text-[color:var(--text-muted)]">
          No se pudo cargar el catálogo.
        </p>
        <button
          type="button"
          onClick={() => candidatesQuery.refetch()}
          className="mt-3 text-sm font-semibold text-[color:var(--text)] underline underline-offset-4"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-1 pb-8">
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
        <p className="font-sans text-[13px] leading-5 text-[color:var(--text-muted)]">
          Une los datos cuando un mismo movimiento fue registrado con nombres
          distintos. Ambos ejercicios seguirán disponibles en la biblioteca.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExercisePicker
          title="1. Elige el duplicado"
          helper="Sus datos pasarán al otro ejercicio; su ficha se conservará."
          query={sourceQuery}
          onQueryChange={setSourceQuery}
          items={sourceItems}
          selectedId={sourceId}
          onSelect={setSourceId}
        />
        <ExercisePicker
          title="2. Elige cuál conservar"
          helper="Aquí se reunirán las rutinas, sesiones y series."
          query={targetQuery}
          onQueryChange={setTargetQuery}
          items={targetItems}
          selectedId={targetId}
          onSelect={setTargetId}
        />
      </div>

      {source ? (
        <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <ExerciseImage exercise={source} size="large" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[12px] text-[color:var(--text-muted)]">
                Se moverá desde
              </p>
              <p className="truncate text-[17px] font-semibold tracking-[-0.015em]">
                {source.name}
              </p>
            </div>
            {target ? (
              <>
                <ArrowRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[12px] text-[color:var(--text-muted)]">
                    Recibirá los datos
                  </p>
                  <p className="truncate text-[17px] font-semibold tracking-[-0.015em]">
                    {target.name}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <p className="mt-4 border-t border-[color:var(--detail-row-divider)] pt-4 font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            Impacto total en el sistema
          </p>
          <div className="mt-3 grid grid-cols-3">
            {impactQuery.isFetching
              ? referenceItems().map((item) => (
                  <div key={item.label} className="text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-[color:var(--text-muted)]" />
                    <p className="mt-1 font-sans text-[11px] text-[color:var(--text-muted)]">
                      {item.label}
                    </p>
                  </div>
                ))
              : referenceItems(references).map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-xl font-semibold tracking-[-0.02em]">
                      {item.value}
                    </p>
                    <p className="font-sans text-[11px] text-[color:var(--text-muted)]">
                      {item.label}
                    </p>
                  </div>
                ))}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        disabled={!canMerge}
        onClick={() => setConfirming(true)}
        className="h-12 w-full rounded-lg bg-[#352018] px-5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35 dark:bg-[#e2ff00] dark:text-black"
      >
        Fusionar ejercicios
      </button>

      {confirming && source && target ? (
        <Modal
          title="Confirmar fusión"
          subtitle="El historial no se perderá"
          onClose={() => setConfirming(false)}
          size="small"
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-11 rounded-lg border border-[color:var(--border)] px-5 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={mergeMutation.isPending}
                onClick={() => mergeMutation.mutate()}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#352018] px-5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#e2ff00] dark:text-black"
              >
                {mergeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Confirmar
              </button>
            </>
          }
        >
          <div className="space-y-4 font-sans text-sm leading-6 text-[color:var(--text-muted)]">
            <p>
              <strong className="text-[color:var(--text)]">
                {source.name}
              </strong>{" "}
              seguirá visible en la biblioteca, pero sus datos pasarán a{" "}
              <strong className="text-[color:var(--text)]">
                {target.name}
              </strong>
              .
            </p>
            <p>
              Se trasladarán rutinas, entrenamientos y series registradas. No
              se eliminará ni se desactivará ninguna ficha.
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
