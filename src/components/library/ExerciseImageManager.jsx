import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  ImageIcon,
  LoaderCircle,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import Button from "../ui/button";
import Skeleton from "../ui/skeleton";
import ExerciseCodexImageGenerator from "./ExerciseCodexImageGenerator";
import ExerciseCodexReviewQueue from "./ExerciseCodexReviewQueue";
import { api } from "../../services/api";
import { getExerciseImageUrl } from "../../utils/cloudinary";

const PAGE_SIZE = 60;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_FIELDS =
  "name,localizedNames,type,ownerId,bodyRegion,primaryMuscleGroup,image,imagePublicId,media.image,isActive";

const normalizeExercise = (exercise = {}) => ({
  ...exercise,
  id: exercise._id || exercise.id,
});

const readDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight, url });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    image.src = url;
  });

function ExerciseImageRow({ exercise, selected, onSelect }) {
  const image = getExerciseImageUrl(exercise, { preset: "thumbnail" });
  return (
    <button
      type="button"
      aria-label={`Editar imagen de ${exercise.name}`}
      onClick={() => onSelect(exercise)}
      className={`grid min-h-[88px] w-full grid-cols-[80px_minmax(0,1fr)_20px] items-center gap-3 border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722]/30 dark:focus-visible:ring-[#e2ff00]/30 ${
        selected
          ? "border-[#ff5722] bg-[#ff5722]/5 dark:border-[#e2ff00] dark:bg-[#e2ff00]/5"
          : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[#ff5722]/60 dark:hover:border-[#e2ff00]/60"
      }`}
    >
      <div className="h-20 w-20 overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-[color:var(--text-muted)]">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-base font-black uppercase leading-tight text-[color:var(--text)]">
          {exercise.name}
        </p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          {exercise.primaryMuscleGroup ||
            exercise.bodyRegion ||
            "Sin clasificar"}
        </p>
        <span className="mt-1 inline-block text-[9px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          {exercise.type === "custom" ? "Personalizado" : "Catalogo"}
        </span>
      </div>
      <ChevronRight
        className={`h-5 w-5 ${
          selected
            ? "text-[#ff5722] dark:text-[#e2ff00]"
            : "text-[color:var(--text-muted)]"
        }`}
      />
    </button>
  );
}

function Preview({ label, size, source, wide = false }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text)]">
          {label}
        </span>
        <span className="hidden text-[10px] font-bold text-[color:var(--text-muted)] sm:inline">
          {size}
        </span>
      </div>
      <div
        className={`overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)] ${
          wide ? "aspect-video" : "aspect-square"
        }`}
      >
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

export default function ExerciseImageManager() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editorMode, setEditorMode] = useState("manual");
  const [managerMode, setManagerMode] = useState("review");

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const exercisesQuery = useInfiniteQuery({
    queryKey: ["exercise-image-manager", query],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.getExercises({
        q: query,
        page: pageParam,
        limit: PAGE_SIZE,
        meta: true,
        fields: IMAGE_FIELDS,
      }),
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    staleTime: 30 * 1000,
  });

  const exercises = useMemo(
    () =>
      (exercisesQuery.data?.pages || [])
        .flatMap((page) => page.items || [])
        .map(normalizeExercise),
    [exercisesQuery.data],
  );
  const total = exercisesQuery.data?.pages?.[0]?.total || 0;

  const resetFile = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectExercise = (exercise) => {
    resetFile();
    setEditorMode("manual");
    setSelected(exercise);
  };

  const handleFile = async (nextFile) => {
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      toast.error("Usa una imagen JPG, PNG o WebP");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      toast.error("La imagen no puede superar 10 MB");
      return;
    }
    try {
      resetFile();
      const dimensions = await readDimensions(nextFile);
      setFile(nextFile);
      setPreview(dimensions);
      if (dimensions.width < 1200 || dimensions.height < 900) {
        toast.warning("La imagen es menor a 1200 x 900 y puede perder nitidez");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const replaceMutation = useMutation({
    mutationFn: (replacementFile) =>
      api.replaceExerciseImage(selected.id, replacementFile || file),
    onSuccess: async (response) => {
      const updated = normalizeExercise(response.exercise);
      setSelected(updated);
      resetFile();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercise-image-manager"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-library"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-facets"] }),
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["routines"] }),
      ]);
      window.dispatchEvent(
        new CustomEvent("exercise-media-updated", {
          detail: { exerciseId: updated.id, exercise: updated },
        }),
      );
      toast.success("Imagen reemplazada", { description: updated.name });
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo reemplazar la imagen");
    },
  });

  const handleAppliedExercise = async (updatedExercise) => {
    const updated = normalizeExercise(updatedExercise);
    if (selected?.id === updated.id) setSelected(updated);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["exercise-image-manager"] }),
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] }),
      queryClient.invalidateQueries({ queryKey: ["exercise-facets"] }),
      queryClient.invalidateQueries({ queryKey: ["exercises"] }),
      queryClient.invalidateQueries({ queryKey: ["routines"] }),
    ]);
    window.dispatchEvent(
      new CustomEvent("exercise-media-updated", {
        detail: { exerciseId: updated.id, exercise: updated },
      }),
    );
  };

  const currentSources = selected
    ? {
        thumbnail: getExerciseImageUrl(selected, { preset: "thumbnail" }),
        card: getExerciseImageUrl(selected, { preset: "card" }),
        detail: getExerciseImageUrl(selected, { preset: "detail" }),
      }
    : {};
  const sourceDimensions = selected?.media?.image;

  return (
    <section className="space-y-4">
      <div
        className="grid grid-cols-2 border border-[color:var(--border)] bg-[color:var(--card)] p-1"
        role="tablist"
        aria-label="Flujo de gestión de imágenes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={managerMode === "review"}
          onClick={() => setManagerMode("review")}
          className={`flex h-11 items-center justify-center gap-2 px-3 text-xs font-black uppercase ${
            managerMode === "review"
              ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Revisar propuestas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={managerMode === "manual"}
          onClick={() => setManagerMode("manual")}
          className={`flex h-11 items-center justify-center gap-2 px-3 text-xs font-black uppercase ${
            managerMode === "manual"
              ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          <Search className="h-4 w-4" />
          Buscar ejercicio
        </button>
      </div>

      {managerMode === "review" ? (
        <ExerciseCodexReviewQueue onApplied={handleAppliedExercise} />
      ) : (
        <>
          <div className="border-l-4 border-[#ff5722] bg-[color:var(--card)] p-4 dark:border-[#e2ff00]">
            <div className="flex items-start gap-3">
              <UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5722] dark:text-[#e2ff00]" />
              <div>
                <h2 className="text-lg font-black uppercase leading-none text-[color:var(--text)]">
                  Una imagen maestra
                </h2>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                  Recomendado: 1600 x 1600 px, JPG, PNG o WebP, maximo 10 MB. Se
                  convertira a WebP conservando la proporcion.
                </p>
              </div>
            </div>
          </div>

          <label className="relative block">
            <span className="sr-only">
              Buscar ejercicio para cambiar imagen
            </span>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              type="search"
              inputMode="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ejercicio"
              className="h-12 w-full rounded border border-[color:var(--border)] bg-[color:var(--card)] pl-11 pr-4 text-base font-semibold text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#ff5722] focus:ring-2 focus:ring-[#ff5722]/15 dark:focus:border-[#e2ff00] dark:focus:ring-[#e2ff00]/15 sm:text-sm"
            />
          </label>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.4fr)]">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Ejercicios
                </p>
                <span className="text-xs font-bold text-[color:var(--text-muted)]">
                  {total}
                </span>
              </div>
              <div className="space-y-2 lg:max-h-[calc(100dvh-16rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:[scrollbar-color:var(--border)_transparent] lg:[scrollbar-width:thin]">
                {exercisesQuery.isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-[88px] w-full rounded"
                      />
                    ))
                  : exercises.map((exercise) => (
                      <ExerciseImageRow
                        key={exercise.id}
                        exercise={exercise}
                        selected={selected?.id === exercise.id}
                        onSelect={selectExercise}
                      />
                    ))}
                {!exercisesQuery.isLoading && exercises.length === 0 ? (
                  <div className="border border-dashed border-[color:var(--border)] p-6 text-center text-sm font-bold text-[color:var(--text-muted)]">
                    No se encontraron ejercicios.
                  </div>
                ) : null}
                {exercisesQuery.hasNextPage ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={exercisesQuery.isFetchingNextPage}
                    onClick={() => exercisesQuery.fetchNextPage()}
                  >
                    {exercisesQuery.isFetchingNextPage
                      ? "Cargando..."
                      : "Cargar mas"}
                  </Button>
                ) : null}
              </div>
            </div>

            <div
              className={
                selected
                  ? "fixed inset-0 z-[90] overflow-y-auto bg-[color:var(--bg)] p-3 lg:sticky lg:inset-auto lg:z-auto lg:top-4 lg:overflow-visible lg:bg-transparent lg:p-0"
                  : "hidden lg:sticky lg:top-4 lg:block"
              }
            >
              {selected ? (
                <div className="space-y-5 border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5722] dark:text-[#e2ff00]">
                        Imagen del ejercicio
                      </p>
                      <h3 className="truncate text-xl font-black uppercase text-[color:var(--text)]">
                        {selected.name}
                      </h3>
                      {sourceDimensions?.width ? (
                        <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">
                          Actual: {sourceDimensions.width} x{" "}
                          {sourceDimensions.height} px
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetFile();
                        setSelected(null);
                      }}
                      className="grid h-9 w-9 shrink-0 place-items-center border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)] lg:hidden"
                      aria-label="Volver a la lista de ejercicios"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div
                    className="grid grid-cols-2 border border-[color:var(--border)] bg-[color:var(--bg)] p-1"
                    role="tablist"
                    aria-label="Origen de la nueva imagen"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorMode === "manual"}
                      onClick={() => setEditorMode("manual")}
                      className={`flex h-10 items-center justify-center gap-2 text-xs font-black uppercase ${
                        editorMode === "manual"
                          ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                          : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      <UploadCloud className="h-4 w-4" />
                      Carga manual
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorMode === "ai"}
                      onClick={() => {
                        resetFile();
                        setEditorMode("ai");
                      }}
                      className={`flex h-10 items-center justify-center gap-2 text-xs font-black uppercase ${
                        editorMode === "ai"
                          ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                          : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generar con Codex
                    </button>
                  </div>

                  {editorMode === "manual" ? (
                    <>
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) =>
                          handleFile(event.target.files?.[0])
                        }
                      />
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleFile(event.dataTransfer.files?.[0]);
                        }}
                        className="grid min-h-28 w-full place-items-center border-2 border-dashed border-[color:var(--border)] bg-[color:var(--bg)] p-4 text-center transition hover:border-[#ff5722] dark:hover:border-[#e2ff00]"
                      >
                        <span>
                          <UploadCloud className="mx-auto h-6 w-6 text-[#ff5722] dark:text-[#e2ff00]" />
                          <span className="mt-2 block text-sm font-black uppercase text-[color:var(--text)]">
                            {file ? file.name : "Seleccionar nueva imagen"}
                          </span>
                          {preview ? (
                            <span className="mt-1 block text-xs font-bold text-[color:var(--text-muted)]">
                              {preview.width} x {preview.height} px
                            </span>
                          ) : null}
                        </span>
                      </button>

                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <Preview
                          label="Miniatura"
                          size="240 x 240"
                          source={preview?.url || currentSources.thumbnail}
                        />
                        <Preview
                          label="Tarjeta"
                          size="480 x 480"
                          source={preview?.url || currentSources.card}
                        />
                        <Preview
                          label="Detalle"
                          size="1280 x 720"
                          source={preview?.url || currentSources.detail}
                          wide
                        />
                      </div>

                      <Button
                        className="w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!file || replaceMutation.isPending}
                        onClick={() => replaceMutation.mutate(file)}
                      >
                        {replaceMutation.isPending ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {replaceMutation.isPending
                          ? "Reemplazando..."
                          : "Reemplazar imagen"}
                      </Button>
                    </>
                  ) : (
                    <ExerciseCodexImageGenerator
                      key={selected.id}
                      exercise={selected}
                      currentImage={currentSources.card}
                      onApplied={handleAppliedExercise}
                    />
                  )}
                </div>
              ) : (
                <div className="grid min-h-72 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
                  <div>
                    <ImageIcon className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
                    <p className="mt-3 text-base font-black uppercase text-[color:var(--text)]">
                      Selecciona un ejercicio
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
                      Veras la imagen actual y sus tres formatos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
