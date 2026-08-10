import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../ui/button";
import { api } from "../../services/api";

const DEFAULT_PROMPT = `Convierte la imagen de referencia en una ilustracion fitness anatomica realista y profesional para una aplicacion de ejercicios. Conserva exactamente la pose, posicion corporal, orientacion, angulo de camara, movimiento y ejercicio mostrados en la imagen original.

Representa a la persona con anatomia humana realista, proporciones correctas, musculatura definida pero natural y apariencia deportiva. Manten ropa adecuada para entrenamiento y evita cualquier apariencia de desnudez.

Identifica anatomicamente los musculos principales que se trabajan y resaltalos en rojo intenso siguiendo con precision su ubicacion, forma, extension y orientacion anatomica. Los musculos secundarios pueden resaltarse con un rojo ligeramente menos intenso cuando sea pertinente. No colorees musculos que no participen de manera relevante. El resaltado debe integrarse de forma realista y permitir distinguir fasciculos y limites musculares sin convertir toda la zona en una mancha roja.

Manten el resto del cuerpo con piel y apariencia natural. Usa un estilo fotorrealista de visualizacion anatomica fitness, alta definicion, iluminacion suave y uniforme de estudio, sombras naturales y fondo blanco o gris muy claro completamente limpio. Sin texto, flechas, etiquetas, logos, marcas de agua ni objetos adicionales.

Genera una imagen cuadrada 1:1, con el cuerpo completamente visible, centrado y con margenes adecuados. La prioridad absoluta es conservar el ejercicio y la posicion original. El resultado debe pertenecer a una biblioteca visual premium y consistente de ejercicios.`;

const dataUrlToFile = async (dataUrl, exerciseId) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], `${exerciseId}-ia.webp`, {
    type: "image/webp",
  });
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
          <div className="grid h-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExerciseAiImageGenerator({
  exercise,
  currentImage,
  replacing,
  onUse,
}) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [generated, setGenerated] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["exercise-ai-image-status"],
    queryFn: api.getExerciseAiImageStatus,
    staleTime: 5 * 60 * 1000,
  });
  const configured = Boolean(statusQuery.data?.configured);

  const generationMutation = useMutation({
    mutationFn: () => api.generateExerciseAiImage(exercise.id, prompt),
    onMutate: () => setGenerated(null),
    onSuccess: (response) => {
      setGenerated(response);
      toast.success("Propuesta generada", {
        description: "Revisala antes de reemplazar la imagen actual.",
      });
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo generar la imagen");
    },
  });

  const discard = () => {
    setGenerated(null);
    generationMutation.reset();
  };

  const accept = async () => {
    if (!generated?.dataUrl) return;
    setAccepting(true);
    try {
      const file = await dataUrlToFile(generated.dataUrl, exercise.id);
      await onUse(file);
      discard();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!configured && !statusQuery.isLoading ? (
        <div className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          Configura <code>OPENAI_API_KEY</code> en el backend para habilitar la
          generacion.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <ImagePreview label="Imagen actual" source={currentImage} />
        <ImagePreview label="Propuesta IA" source={generated?.dataUrl || ""} />
      </div>

      <p className="text-xs font-semibold text-[color:var(--text-muted)]">
        Verifica la pose y los musculos resaltados antes de usar la propuesta.
      </p>

      <details className="border border-[color:var(--border)] bg-[color:var(--bg)]">
        <summary className="cursor-pointer px-3 py-3 text-xs font-black uppercase text-[color:var(--text)]">
          Ajustar prompt
        </summary>
        <div className="border-t border-[color:var(--border)] p-3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={10}
            maxLength={32000}
            className="w-full resize-y border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-sm font-semibold leading-relaxed text-[color:var(--text)] outline-none focus:border-[#ff5722] focus:ring-2 focus:ring-[#ff5722]/15 dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15"
          />
        </div>
      </details>

      {generated ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            className="gap-2"
            disabled={accepting || replacing}
            onClick={discard}
          >
            <Trash2 className="h-4 w-4" />
            Descartar
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={generationMutation.isPending || accepting || replacing}
            onClick={() => generationMutation.mutate()}
          >
            <RefreshCw className="h-4 w-4" />
            Regenerar
          </Button>
          <Button
            className="col-span-2 gap-2 sm:col-span-1"
            disabled={accepting || replacing}
            onClick={accept}
          >
            {accepting || replacing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Usar imagen
          </Button>
        </div>
      ) : (
        <Button
          className="w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={
            !configured ||
            !currentImage ||
            !prompt.trim() ||
            generationMutation.isPending
          }
          onClick={() => generationMutation.mutate()}
        >
          {generationMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generationMutation.isPending
            ? "Generando propuesta..."
            : "Generar imagen con IA"}
        </Button>
      )}
    </div>
  );
}
