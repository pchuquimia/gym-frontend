import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  Check,
  Columns2,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "../components/library/ConfirmModal";
import Modal from "../components/shared/Modal";
import Button from "../components/ui/button";
import Skeleton from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { useUserProfile } from "../context/UserContext";
import { api } from "../services/api";

const PAGE_SIZE = 12;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const TYPE_OPTIONS = [
  { value: "", label: "Todos los contextos" },
  { value: "gym", label: "Entrenamiento" },
  { value: "home", label: "Fuera del gimnasio" },
  { value: "profile", label: "Perfil" },
];
const CONTEXT_OPTIONS = TYPE_OPTIONS.filter(
  (option) => option.value === "gym" || option.value === "home",
);

const VIEW_OPTIONS = [
  { value: "", label: "Todas las vistas" },
  { value: "front", label: "Frontal" },
  { value: "side", label: "Lateral" },
  { value: "back", label: "Posterior" },
  { value: "other", label: "Otra" },
];

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value, options = {}) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString("es-BO", options) : "Sin fecha";
};

const normalizePhoto = (photo = {}) => ({
  ...photo,
  id: String(photo._id || photo.id || ""),
  view: photo.view || "front",
});

function AuthenticatedPhotoImage({ photo, width, height, alt, className }) {
  const [objectUrl, setObjectUrl] = useState("");
  const contentUrl = photo?.contentUrl || "";
  const contentQuery = useQuery({
    queryKey: ["photo-content", photo?.id, width, height],
    queryFn: () => api.getPhotoContent(contentUrl, { width, height }),
    enabled: Boolean(contentUrl && photo?.id),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    let active = true;
    if (!contentQuery.data) {
      Promise.resolve().then(() => {
        if (active) setObjectUrl("");
      });
      return () => {
        active = false;
      };
    }
    const nextUrl = URL.createObjectURL(contentQuery.data);
    Promise.resolve().then(() => {
      if (active) setObjectUrl(nextUrl);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(nextUrl);
    };
  }, [contentQuery.data]);

  const source = objectUrl || (!contentUrl ? photo?.url || "" : "");
  if (source) {
    return <img src={source} alt={alt} className={className} />;
  }
  if (contentQuery.isLoading) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }
  return (
    <div
      role="img"
      aria-label={`${alt}. Imagen no disponible`}
      className="grid h-full w-full place-items-center bg-[color:var(--bg)] text-[color:var(--text-muted)]"
    >
      <ImagePlus className="h-6 w-6" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base font-semibold text-[color:var(--text)] outline-none dark:rounded-[3px] sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
      <p className="font-black text-[color:var(--text)]">
        No pudimos cargar tus fotos
      </p>
      <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}

function PhotoCard({ photo, label, selected, selectionMode, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${selectionMode ? "Seleccionar" : "Abrir"} foto: ${label}, ${formatDate(photo.date, { day: "2-digit", month: "long", year: "numeric" })}`}
      aria-pressed={selectionMode ? selected : undefined}
      className={`group relative w-full overflow-hidden rounded-lg border bg-[color:var(--card)] text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5722] dark:rounded-[4px] dark:shadow-none dark:focus-visible:ring-[#e2ff00] ${
        selected
          ? "border-[#ff5722] ring-2 ring-[#ff5722]/20 dark:border-[#e2ff00] dark:ring-[#e2ff00]/20"
          : "border-[color:var(--border)] hover:border-[#ff5722] dark:hover:border-[#e2ff00]"
      }`}
    >
      <div className="aspect-[4/5] overflow-hidden bg-black/5 dark:bg-black/20">
        <AuthenticatedPhotoImage
          photo={photo}
          width={520}
          height={680}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/72 p-3 text-white backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-wide text-white/70">
          {formatDate(photo.date, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
        <p className="mt-1 truncate text-sm font-black">{label}</p>
      </div>
      <span className="absolute right-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[10px] font-black text-white backdrop-blur-sm">
        {VIEW_OPTIONS.find((option) => option.value === photo.view)?.label ||
          "Otra"}
      </span>
      {selectionMode ? (
        <span
          className={`absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border ${
            selected
              ? "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
              : "border-white/70 bg-black/40 text-transparent"
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
      ) : null}
    </button>
  );
}

export default function PhotosLibrary() {
  const { updateAccount } = useAuth();
  const { refreshProfile } = useUserProfile();
  const {
    addPhoto,
    updatePhoto,
    deletePhoto,
    trainings = [],
    dataOwnerId = "",
  } = useTrainingData();
  const [mode, setMode] = useState("history");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewFilter, setViewFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [meta, setMeta] = useState({
    date: localDateString(),
    type: "gym",
    view: "front",
    sessionId: "",
    label: "",
  });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const summaryQuery = useQuery({
    queryKey: ["photo-summary", dataOwnerId || "self"],
    queryFn: () => api.getPhotoSummary(dataOwnerId),
    staleTime: 2 * 60 * 1000,
  });

  const photosQuery = useInfiniteQuery({
    queryKey: ["photo-library", dataOwnerId || "self", typeFilter, viewFilter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.getPhotos({
        athleteId: dataOwnerId,
        type: typeFilter,
        view: viewFilter,
        page: pageParam,
        limit: PAGE_SIZE,
        meta: true,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total
        ? lastPage.page + 1
        : undefined,
  });

  const photos = (photosQuery.data?.pages || [])
    .flatMap((page) => page.items || [])
    .map(normalizePhoto);
  const total = photosQuery.data?.pages?.[0]?.total || 0;
  const trainingOptions = useMemo(
    () =>
      trainings
        .slice()
        .sort((a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")),
        )
        .slice(0, 30)
        .map((training) => ({
          id: String(training.id || training._id || ""),
          label: `${formatDate(training.date, { day: "2-digit", month: "short" })} · ${training.routineName || "Entrenamiento"}`,
          routineName: training.routineName || "Entrenamiento",
        })),
    [trainings],
  );
  const trainingMap = useMemo(
    () => new Map(trainingOptions.map((item) => [item.id, item.routineName])),
    [trainingOptions],
  );
  const labelFor = (photo) =>
    photo.routineName ||
    trainingMap.get(String(photo.sessionId || "")) ||
    photo.label ||
    (photo.type === "home" ? "Progreso personal" : "Entrenamiento");
  const selectedPhotos = selectedIds
    .map((id) => photos.find((photo) => photo.id === id))
    .filter(Boolean);

  const toggleComparison = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) return [current[1], id];
      return [...current, id];
    });
  };

  const resetMeta = () =>
    setMeta({
      date: localDateString(),
      type: "gym",
      view: "front",
      sessionId: "",
      label: "",
    });

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setFileError("Usa una imagen JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError("La imagen no puede superar 5 MB.");
      return;
    }
    setUploading(true);
    setFileError("");
    const routineName = meta.sessionId
      ? trainingMap.get(meta.sessionId) || ""
      : "";
    try {
      await addPhoto({
        file,
        ...meta,
        routineName,
        label: meta.label.trim() || routineName,
      });
      toast.success("Foto guardada");
      resetMeta();
      setUploadOpen(false);
    } catch (error) {
      const message = error.message || "No se pudo subir la foto";
      setFileError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const openPhoto = (photo) => {
    setActivePhoto(photo);
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!activePhoto) return;
    const sessionId = activePhoto.sessionId || "";
    try {
      const saved = await updatePhoto(activePhoto.id, {
        date: activePhoto.date,
        type: activePhoto.type,
        view: activePhoto.view,
        label: activePhoto.label || "",
        sessionId: sessionId || null,
        routineName: sessionId ? trainingMap.get(sessionId) || "" : "",
      });
      setActivePhoto(normalizePhoto(saved));
      setEditing(false);
      toast.success("Datos actualizados");
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar la foto");
    }
  };

  const setAsAvatar = async () => {
    if (!activePhoto) return;
    try {
      await updateAccount({ avatarPhotoId: activePhoto.id });
      await refreshProfile();
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar el perfil");
    }
  };

  return (
    <main className="photos-shell mx-auto w-full max-w-md pb-28 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]">
      <div className="w-full space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
              Progreso visual
            </p>
            <h1 className="text-3xl font-black uppercase leading-none">
              Fotos de progreso
            </h1>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
              {summaryQuery.isLoading
                ? "Cargando historial..."
                : `${summaryQuery.data?.total || 0} fotos${summaryQuery.data?.lastDate ? ` · Última: ${formatDate(summaryQuery.data.lastDate, { day: "2-digit", month: "short", year: "numeric" })}` : ""}`}
            </p>
          </div>
          <Button
            className="gap-2 text-xs font-black uppercase"
            onClick={() => setUploadOpen((open) => !open)}
          >
            {uploadOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {uploadOpen ? "Cancelar" : "Agregar foto"}
          </Button>
        </header>

        {uploadOpen ? (
          <section className="space-y-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:rounded-[4px] dark:shadow-none sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Fecha
                </span>
                <input
                  type="date"
                  value={meta.date}
                  max={localDateString()}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-semibold outline-none dark:rounded-[3px] sm:text-sm"
                />
              </label>
              <SelectField
                label="Vista corporal"
                value={meta.view}
                onChange={(view) =>
                  setMeta((current) => ({ ...current, view }))
                }
                options={VIEW_OPTIONS.slice(1)}
              />
              <SelectField
                label="Contexto"
                value={meta.type}
                onChange={(type) =>
                  setMeta((current) => ({
                    ...current,
                    type,
                    sessionId: type === "gym" ? current.sessionId : "",
                  }))
                }
                options={CONTEXT_OPTIONS}
              />
              {meta.type === "gym" ? (
                <SelectField
                  label="Sesión opcional"
                  value={meta.sessionId}
                  onChange={(sessionId) =>
                    setMeta((current) => ({ ...current, sessionId }))
                  }
                  options={[
                    { value: "", label: "Sin vincular" },
                    ...trainingOptions.map((item) => ({
                      value: item.id,
                      label: item.label,
                    })),
                  ]}
                />
              ) : (
                <div />
              )}
            </div>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Nota opcional
              </span>
              <input
                value={meta.label}
                maxLength={240}
                onChange={(event) =>
                  setMeta((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Ej. Inicio de definición"
                className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-semibold outline-none placeholder:text-[color:var(--text-muted)] dark:rounded-[3px] sm:text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                disabled={uploading}
                className="h-11 gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Cámara
              </Button>
              <Button
                disabled={uploading}
                variant="outline"
                className="h-11 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                Archivos
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={handleUpload}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleUpload}
            />
            {uploading ? (
              <p role="status" className="text-sm font-bold text-[#ff5722] dark:text-[#e2ff00]">
                Subiendo foto...
              </p>
            ) : null}
            {fileError ? (
              <p role="alert" className="text-sm font-bold text-red-500">
                {fileError}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--border)] pb-3">
          <div
            className="flex rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-1 dark:rounded-[4px]"
            role="tablist"
            aria-label="Vista de fotos"
          >
            {[
              ["history", CalendarDays, "Historial"],
              ["compare", Columns2, "Comparar"],
            ].map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black dark:rounded-[3px] ${mode === value ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black" : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[360px]">
            <SelectField
              label="Contexto"
              value={typeFilter}
              onChange={setTypeFilter}
              options={TYPE_OPTIONS}
            />
            <SelectField
              label="Vista"
              value={viewFilter}
              onChange={setViewFilter}
              options={VIEW_OPTIONS}
            />
          </div>
        </div>

        {mode === "compare" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[color:var(--text-muted)]">
                Selecciona dos fotos · {selectedIds.length}/2
              </p>
              {selectedIds.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-black text-[#ff5722] dark:text-[#e2ff00]"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
            {selectedPhotos.length === 2 ? (
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-2 dark:rounded-[4px] sm:gap-4 sm:p-4">
                {selectedPhotos.map((photo) => (
                  <figure key={photo.id} className="min-w-0">
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-black/5 dark:bg-black/20">
                      <AuthenticatedPhotoImage
                        photo={photo}
                        width={900}
                        height={1200}
                        alt={labelFor(photo)}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <figcaption className="mt-2 truncate text-center text-xs font-black">
                      {formatDate(photo.date, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {photosQuery.isError ? (
          <ErrorState onRetry={() => photosQuery.refetch()} />
        ) : photosQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center dark:rounded-[4px]">
            <ImagePlus className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
            <p className="mt-3 font-black">Aún no hay fotos en esta vista</p>
            <Button className="mt-4 gap-2" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar foto
            </Button>
          </div>
        ) : mode === "history" ? (
          <section aria-label="Historial cronológico de fotos">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  label={labelFor(photo)}
                  onClick={() => openPhoto(photo)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                label={labelFor(photo)}
                selectionMode
                selected={selectedIds.includes(photo.id)}
                onClick={() => toggleComparison(photo.id)}
              />
            ))}
          </div>
        )}

        {!photosQuery.isLoading && photos.length ? (
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-xs font-semibold text-[color:var(--text-muted)]">
              Mostrando {photos.length} de {total}
            </p>
            {photosQuery.hasNextPage ? (
              <Button
                variant="outline"
                disabled={photosQuery.isFetchingNextPage}
                onClick={() => photosQuery.fetchNextPage()}
              >
                {photosQuery.isFetchingNextPage ? "Cargando..." : "Cargar más"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {activePhoto ? (
        <Modal
          title={labelFor(activePhoto)}
          subtitle={formatDate(activePhoto.date, {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          onClose={() => setActivePhoto(null)}
          footer={
            editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  Guardar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  title="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => {
                    setDeleteTarget(activePhoto);
                    setActivePhoto(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Usar como foto de perfil"
                  aria-label="Usar como foto de perfil"
                  onClick={setAsAvatar}
                >
                  <UserRound className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              </>
            )
          }
        >
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-[color:var(--text-muted)]">
                  Fecha
                </span>
                <input
                  type="date"
                  value={activePhoto.date || ""}
                  max={localDateString()}
                  onChange={(event) =>
                    setActivePhoto((photo) => ({
                      ...photo,
                      date: event.target.value,
                    }))
                  }
                  className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base outline-none dark:rounded-[3px] sm:text-sm"
                />
              </label>
              <SelectField
                label="Vista corporal"
                value={activePhoto.view || "front"}
                onChange={(view) =>
                  setActivePhoto((photo) => ({ ...photo, view }))
                }
                options={VIEW_OPTIONS.slice(1)}
              />
              <SelectField
                label="Contexto"
                value={activePhoto.type || "gym"}
                onChange={(type) =>
                  setActivePhoto((photo) => ({
                    ...photo,
                    type,
                    sessionId: type === "gym" ? photo.sessionId : "",
                  }))
                }
                options={
                  activePhoto.type === "profile"
                    ? TYPE_OPTIONS.slice(1)
                    : CONTEXT_OPTIONS
                }
              />
              {activePhoto.type === "gym" ? (
                <SelectField
                  label="Sesión"
                  value={activePhoto.sessionId || ""}
                  onChange={(sessionId) =>
                    setActivePhoto((photo) => ({ ...photo, sessionId }))
                  }
                  options={[
                    { value: "", label: "Sin vincular" },
                    ...trainingOptions.map((item) => ({
                      value: item.id,
                      label: item.label,
                    })),
                  ]}
                />
              ) : (
                <div />
              )}
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold text-[color:var(--text-muted)]">
                  Nota
                </span>
                <input
                  value={activePhoto.label || ""}
                  maxLength={240}
                  onChange={(event) =>
                    setActivePhoto((photo) => ({
                      ...photo,
                      label: event.target.value,
                    }))
                  }
                  className="theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base outline-none dark:rounded-[3px] sm:text-sm"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-[min(58dvh,560px)] overflow-hidden rounded-lg bg-black/5 dark:rounded-[4px] dark:bg-black/20">
                <AuthenticatedPhotoImage
                  photo={activePhoto}
                  width={1600}
                  height={1600}
                  alt={labelFor(activePhoto)}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-[color:var(--text-muted)]">
                <span className="rounded-md bg-[color:var(--bg)] px-2 py-1">
                  {VIEW_OPTIONS.find(
                    (option) => option.value === activePhoto.view,
                  )?.label || "Otra"}
                </span>
                <span className="rounded-md bg-[color:var(--bg)] px-2 py-1">
                  {TYPE_OPTIONS.find(
                    (option) => option.value === activePhoto.type,
                  )?.label || "Entrenamiento"}
                </span>
              </div>
              {activePhoto.label &&
              activePhoto.label !== labelFor(activePhoto) ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  {activePhoto.label}
                </p>
              ) : null}
            </div>
          )}
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          name={labelFor(deleteTarget)}
          entityLabel="foto"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await deletePhoto(deleteTarget.id);
              setSelectedIds((ids) =>
                ids.filter((id) => id !== deleteTarget.id),
              );
              setDeleteTarget(null);
              toast.success("Foto eliminada");
            } catch (error) {
              toast.error(error.message || "No se pudo eliminar la foto");
            }
          }}
        />
      ) : null}
    </main>
  );
}
