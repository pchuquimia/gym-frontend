import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock3,
  Copy,
  ImageIcon,
  LoaderCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../ui/button";
import { api } from "../../services/api";

const ACTIVE_STATUSES = new Set(["pending", "processing", "ready"]);

const STATUS_COPY = {
  pending: {
    label: "Pendiente para Codex",
    description: "La solicitud está guardada y lista para ser procesada.",
  },
  processing: {
    label: "Codex está trabajando",
    description: "La propuesta se está generando desde la imagen actual.",
  },
  ready: {
    label: "Propuesta lista",
    description: "Revisa la anatomía antes de reemplazar la imagen actual.",
  },
  failed: {
    label: "No se pudo completar",
    description: "Puedes corregir la instrucción y crear otra solicitud.",
  },
  applied: {
    label: "Imagen aplicada",
    description: "La última propuesta ya forma parte de la biblioteca.",
  },
  cancelled: {
    label: "Solicitud descartada",
    description: "Puedes crear una nueva propuesta cuando quieras.",
  },
};

function ImagePreview({ label, source }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="aspect-square overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
        {source ? (
          <img src={source} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-[color:var(--text-muted)]">
            <div>
              <ImageIcon className="mx-auto h-6 w-6" />
              <p className="mt-2 text-[10px] font-black uppercase">
                Esperando propuesta
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExerciseCodexImageGenerator({
  exercise,
  currentImage,
  onApplied,
}) {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");

  const requestQuery = useQuery({
    queryKey: ["codex-image-request", exercise.id],
    queryFn: () => api.getCodexImageRequests(exercise.id, 1),
    refetchInterval: (query) => {
      const status = query.state.data?.requests?.[0]?.status;
      return status === "pending" || status === "processing" ? 4000 : false;
    },
  });
  const request = requestQuery.data?.requests?.[0] || null;
  const status = request?.status || "";
  const active = ACTIVE_STATUSES.has(status);

  const refreshRequest = () =>
    queryClient.invalidateQueries({
      queryKey: ["codex-image-request", exercise.id],
    });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCodexImageRequest(exercise.id, instruction.trim()),
    onSuccess: async (response) => {
      await refreshRequest();
      toast.success(
        response.reused ? "La solicitud ya estaba pendiente" : "Solicitud creada",
        {
          description: "Codex ya puede procesarla desde el workspace.",
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo crear la solicitud");
    },
  });

  const discardMutation = useMutation({
    mutationFn: () => api.discardCodexImageRequest(request.id),
    onSuccess: async () => {
      await refreshRequest();
      toast.success("Solicitud descartada");
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo descartar la solicitud");
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => api.applyCodexImageRequest(request.id),
    onSuccess: async (response) => {
      await onApplied(response.exercise);
      await refreshRequest();
      toast.success("Imagen de Codex aplicada", {
        description: response.exercise.name,
      });
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo aplicar la propuesta");
    },
  });

  const copyCodexMessage = async () => {
    try {
      await navigator.clipboard.writeText(
        "Procesa las imágenes de ejercicios pendientes del proyecto gym.",
      );
      toast.success("Mensaje para Codex copiado");
    } catch {
      toast.error("No se pudo copiar el mensaje");
    }
  };

  const statusCopy = STATUS_COPY[status];
  const busy =
    createMutation.isPending ||
    discardMutation.isPending ||
    applyMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-[#352018] bg-[color:var(--bg)] p-3 dark:border-[#e2ff00]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black uppercase text-[color:var(--text)]">
              Generador anatómico con Codex
            </p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Crea una solicitud en el proyecto sin utilizar una API key.
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--border)] px-2 py-1 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
            Acceso de Codex
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-[10px] font-black uppercase text-[color:var(--text-muted)] sm:grid-cols-3">
          <span>✓ Conserva pose y equipo</span>
          <span>✓ Músculo principal en rojo</span>
          <span>✓ Revisión antes de publicar</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ImagePreview label="Imagen actual" source={currentImage} />
        <ImagePreview label="Propuesta Codex" source={request?.result?.url} />
      </div>

      {requestQuery.isLoading ? (
        <div className="flex items-center gap-2 border border-[color:var(--border)] p-3 text-xs font-bold text-[color:var(--text-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Consultando solicitudes…
        </div>
      ) : null}

      {statusCopy ? (
        <div className="border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
          <div className="flex items-start gap-3">
            {status === "processing" ? (
              <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#352018] dark:text-[#e2ff00]" />
            ) : (
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#352018] dark:text-[#e2ff00]" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[color:var(--text)]">
                {statusCopy.label}
              </p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                {statusCopy.description}
              </p>
              {request?.id ? (
                <p className="mt-1 truncate text-[10px] font-bold text-[color:var(--text-muted)]">
                  Solicitud {request.id}
                </p>
              ) : null}
              {request?.error ? (
                <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">
                  {request.error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {status === "pending" ? (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={copyCodexMessage}
        >
          <Copy className="h-4 w-4" />
          Copiar mensaje para Codex
        </Button>
      ) : null}

      <details className="border border-[color:var(--border)] bg-[color:var(--bg)]">
        <summary className="cursor-pointer px-3 py-3 text-xs font-black uppercase text-[color:var(--text)]">
          Instrucción adicional (opcional)
        </summary>
        <div className="border-t border-[color:var(--border)] p-3">
          <p className="mb-2 text-xs font-semibold text-[color:var(--text-muted)]">
            El estándar anatómico ya está incluido. Añade solo un ajuste específico para este ejercicio.
          </p>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={4}
            maxLength={2000}
            disabled={active}
            placeholder="Ejemplo: mantener visible el agarre y dejar más margen alrededor del atleta."
            className="w-full resize-y border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-sm font-semibold leading-relaxed text-[color:var(--text)] outline-none disabled:opacity-50 focus:border-[#352018] focus:ring-2 focus:ring-[#352018]/15 dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15"
          />
        </div>
      </details>

      {status === "ready" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={busy}
            onClick={() => discardMutation.mutate()}
          >
            <Trash2 className="h-4 w-4" />
            Descartar
          </Button>
          <Button
            className="gap-2"
            disabled={busy}
            onClick={() => applyMutation.mutate()}
          >
            {applyMutation.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Usar imagen
          </Button>
        </div>
      ) : active ? (
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={busy}
          onClick={() => discardMutation.mutate()}
        >
          <Trash2 className="h-4 w-4" />
          Cancelar solicitud
        </Button>
      ) : (
        <Button
          className="w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!currentImage || busy || requestQuery.isLoading}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {createMutation.isPending
            ? "Creando solicitud…"
            : "Generar con Codex"}
        </Button>
      )}
    </div>
  );
}
