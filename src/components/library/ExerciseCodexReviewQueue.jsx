import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Clock3,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import Button from "../ui/button";

const REJECTION_REASONS = [
  "Pose incorrecta",
  "Músculos incorrectos",
  "Banda o equipo incorrecto",
  "Anatomía poco natural",
  "Encuadre o recorte",
  "Demasiado rojo",
];

const summaryValue = (summary, key) => Number(summary?.[key]) || 0;

function ReviewImage({ label, source }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="aspect-square overflow-hidden border border-[color:var(--border)] bg-white">
        {source ? (
          <img src={source} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
      </div>
    </div>
  );
}

function QueueMetric({ label, value, accent = false }) {
  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2">
      <p
        className={`text-lg font-black ${
          accent
            ? "text-[#352018] dark:text-[#e2ff00]"
            : "text-[color:var(--text)]"
        }`}
      >
        {value}
      </p>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

export default function ExerciseCodexReviewQueue({ onApplied }) {
  const queryClient = useQueryClient();
  const [showReasons, setShowReasons] = useState(false);
  const [reason, setReason] = useState("");

  const queueQuery = useQuery({
    queryKey: ["codex-image-review-queue"],
    queryFn: () => api.getCodexImageReviewQueue(20),
    refetchInterval: (query) => {
      const summary = query.state.data?.summary;
      return summaryValue(summary, "pending") ||
        summaryValue(summary, "processing")
        ? 5000
        : false;
    },
  });

  const requests = queueQuery.data?.requests || [];
  const current = requests[0] || null;
  const summary = queueQuery.data?.summary || {};
  const autoQueueEnabled = queueQuery.data?.autoQueue?.enabled !== false;
  const exercise = current?.exercise || {};
  const exerciseName =
    exercise.localizedNames?.es || current?.exerciseName || exercise.name || "";
  const muscleCopy = useMemo(
    () =>
      [exercise.primaryMuscleGroup, ...(exercise.primaryMuscles || [])]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(" · "),
    [exercise.primaryMuscleGroup, exercise.primaryMuscles],
  );

  const reviewMutation = useMutation({
    mutationFn: ({ decision, reviewReason = "" }) =>
      api.reviewCodexImageRequest(current.id, decision, reviewReason),
    onSuccess: async (response, variables) => {
      if (variables.decision === "approve" && response.exercise) {
        await onApplied?.(response.exercise);
        toast.success("Imagen aprobada", { description: exerciseName });
      } else if (variables.decision === "regenerate") {
        toast.success("Nueva generación solicitada", {
          description: variables.reviewReason || exerciseName,
        });
      } else {
        toast.success("Propuesta omitida", { description: exerciseName });
      }
      setReason("");
      setShowReasons(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["codex-image-review-queue"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["codex-image-request", current.exerciseId],
        }),
      ]);
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo revisar la propuesta");
    },
  });
  const reviewProposal = reviewMutation.mutate;
  const isReviewPending = reviewMutation.isPending;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!current || isReviewPending) return;
      const tagName = event.target?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tagName)) return;
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        reviewProposal({ decision: "approve" });
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        reviewProposal({ decision: "skip" });
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setShowReasons(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, isReviewPending, reviewProposal]);

  const refreshQueue = async () => {
    await queueQuery.refetch();
    toast.success("Bandeja actualizada");
  };

  if (queueQuery.isLoading) {
    return (
      <div className="grid min-h-72 place-items-center border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#352018] dark:text-[#e2ff00]" />
          <p className="mt-3 text-xs font-black uppercase text-[color:var(--text-muted)]">
            Preparando bandeja
          </p>
        </div>
      </div>
    );
  }

  if (queueQuery.isError) {
    return (
      <div className="border border-red-300 bg-red-50 p-5 text-center dark:border-red-900 dark:bg-red-950/30">
        <p className="font-black uppercase text-red-700 dark:text-red-300">
          No se pudo cargar la bandeja
        </p>
        <Button className="mt-4 gap-2" onClick={() => queueQuery.refetch()}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="border-l-4 border-[#352018] bg-[color:var(--card)] p-4 dark:border-[#e2ff00]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#352018] dark:text-[#e2ff00]" />
              <h2 className="text-lg font-black uppercase text-[color:var(--text)]">
                Revisión automática
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-[color:var(--text-muted)]">
              Codex prepara las propuestas. Tú solo apruebas, corriges u omites.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${
                autoQueueEnabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  autoQueueEnabled ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {autoQueueEnabled
                ? "Autoencolado activo"
                : "Autoencolado pausado"}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Actualizar bandeja"
              onClick={refreshQueue}
            >
              <RefreshCw
                className={`h-4 w-4 ${queueQuery.isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <QueueMetric
          label="Por revisar"
          value={summaryValue(summary, "ready")}
          accent
        />
        <QueueMetric
          label="Generando"
          value={summaryValue(summary, "processing")}
        />
        <QueueMetric label="En cola" value={summaryValue(summary, "pending")} />
        <QueueMetric
          label="Con error"
          value={summaryValue(summary, "failed")}
        />
      </div>

      {!current ? (
        <div className="grid min-h-80 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
          <div>
            {summaryValue(summary, "pending") ||
            summaryValue(summary, "processing") ? (
              <Clock3 className="mx-auto h-9 w-9 text-[#352018] dark:text-[#e2ff00]" />
            ) : (
              <Check className="mx-auto h-9 w-9 text-emerald-500" />
            )}
            <h3 className="mt-3 text-xl font-black uppercase text-[color:var(--text)]">
              {summaryValue(summary, "pending") ||
              summaryValue(summary, "processing")
                ? "Codex está preparando imágenes"
                : "Todo revisado"}
            </h3>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
              {summaryValue(summary, "pending") ||
              summaryValue(summary, "processing")
                ? "Las propuestas aparecerán aquí automáticamente."
                : "No hay propuestas esperando una decisión."}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#352018] dark:text-[#e2ff00]">
                Propuesta 1 de {summaryValue(summary, "ready")}
              </p>
              <h3 className="mt-1 text-xl font-black uppercase leading-tight text-[color:var(--text)] sm:text-2xl">
                {exerciseName}
              </h3>
              <p className="mt-1 text-xs font-bold uppercase text-[color:var(--text-muted)]">
                {muscleCopy || exercise.bodyRegion || "Anatomía por revisar"}
              </p>
            </div>
            <span className="shrink-0 border border-[color:var(--border)] px-2 py-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
              Intento {current.attempt || 1}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <ReviewImage
              label="Imagen actual"
              source={current.referenceImage}
            />
            <ReviewImage label="Propuesta Codex" source={current.result?.url} />
          </div>

          {showReasons ? (
            <div className="mt-4 border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase text-[color:var(--text)]">
                  ¿Qué debe corregir Codex?
                </p>
                <button
                  type="button"
                  onClick={() => setShowReasons(false)}
                  className="text-xs font-black uppercase text-[color:var(--text-muted)]"
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {REJECTION_REASONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={reason === item}
                    onClick={() => setReason(item)}
                    className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                      reason === item
                        ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                        : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Describe otro ajuste específico"
                className="mt-3 w-full resize-y border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-sm font-semibold text-[color:var(--text)] outline-none focus:border-[#352018] dark:focus:border-[#e2ff00]"
              />
              <Button
                variant="outline"
                className="mt-3 w-full gap-2"
                disabled={isReviewPending}
                onClick={() =>
                  reviewProposal({
                    decision: "regenerate",
                    reviewReason: reason,
                  })
                }
              >
                <RotateCcw className="h-4 w-4" />
                Regenerar y siguiente
              </Button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-[auto_auto_1fr]">
            <Button
              variant="outline"
              className="gap-2"
              disabled={isReviewPending}
              onClick={() => reviewProposal({ decision: "skip" })}
            >
              <SkipForward className="h-4 w-4" />
              Omitir
              <span className="hidden opacity-60 md:inline">S</span>
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={isReviewPending}
              onClick={() => setShowReasons((value) => !value)}
            >
              <RotateCcw className="h-4 w-4" />
              Regenerar
              <span className="hidden opacity-60 md:inline">R</span>
            </Button>
            <Button
              className="gap-2 sm:justify-self-stretch"
              disabled={isReviewPending}
              onClick={() => reviewProposal({ decision: "approve" })}
            >
              {isReviewPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Aprobar y siguiente
              <ChevronRight className="h-4 w-4" />
              <span className="hidden opacity-70 md:inline">A</span>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
