import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  Columns2,
  ImagePlus,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "../components/library/ConfirmModal";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import Modal from "../components/shared/Modal";
import Button from "../components/ui/button";
import Skeleton from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { useUserProfile } from "../context/UserContext";
import { api } from "../services/api";
import {
  canComparePhoto,
  comparisonDayGap,
  orderComparisonPhotos,
} from "../utils/photoComparison";
import { computePhotoAlignment } from "../utils/photoAlignment";

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

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Solo yo" },
  { value: "coach", label: "También mi coach" },
];

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
  visibility: photo.visibility || "private",
  contentStatus: photo.contentStatus || "available",
});

function AuthenticatedPhotoImage({
  photo,
  width,
  height,
  alt,
  className,
  style,
  onContentReady,
  dataAlignmentMethod,
}) {
  const [objectUrl, setObjectUrl] = useState("");
  const contentUrl = photo?.contentUrl || "";
  const contentQuery = useQuery({
    queryKey: ["photo-content", photo?.id, width, height],
    queryFn: () => api.getPhotoContent(contentUrl, { width, height }),
    enabled: Boolean(
      contentUrl && photo?.id && photo?.contentStatus !== "missing",
    ),
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

  useEffect(() => {
    if (contentQuery.data) onContentReady?.(contentQuery.data);
  }, [contentQuery.data, onContentReady]);

  const source = objectUrl || (!contentUrl ? photo?.url || "" : "");
  if (source) {
    return (
      <img
        src={source}
        alt={alt}
        className={className}
        style={style}
        data-alignment-method={dataAlignmentMethod}
      />
    );
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

function SelectField({ label, value, onChange, options, hideLabel = false }) {
  return (
    <label className={`block ${hideLabel ? "" : "space-y-1.5"}`}>
      <span
        className={
          hideLabel
            ? "sr-only"
            : "text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]"
        }
      >
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
  const missing = photo.contentStatus === "missing";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${selectionMode ? "Seleccionar" : "Abrir"} foto: ${label}, ${formatDate(photo.date, { day: "2-digit", month: "long", year: "numeric" })}`}
      aria-pressed={selectionMode ? selected : undefined}
      disabled={selectionMode && missing}
      className={`group relative w-full overflow-hidden rounded-lg border bg-[color:var(--card)] text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#352018] dark:rounded-[4px] dark:shadow-none dark:focus-visible:ring-[#e2ff00] ${
        selected
          ? "border-[#352018] ring-2 ring-[#352018]/20 dark:border-[#e2ff00] dark:ring-[#e2ff00]/20"
          : "border-[color:var(--border)] hover:border-[#352018] dark:hover:border-[#e2ff00]"
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
      {selectionMode ? (
        <span
          className={`absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border ${
            selected
              ? "border-[#352018] bg-[#352018] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
              : "border-white/70 bg-black/40 text-transparent"
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
      ) : null}
      {missing ? (
        <span className="absolute left-2 top-2 rounded-full bg-[#fffaf4]/95 px-2.5 py-1 text-[10px] font-semibold text-[#6f625b] shadow-sm backdrop-blur dark:bg-black/80 dark:text-white/80">
          Recuperar
        </span>
      ) : null}
    </button>
  );
}

function BeforeAfterSlider({ before, after, beforeLabel, afterLabel }) {
  const [position, setPosition] = useState(50);
  const [beforeBlob, setBeforeBlob] = useState(null);
  const [afterBlob, setAfterBlob] = useState(null);
  const [alignment, setAlignment] = useState({
    scale: 1,
    offsetXPercent: 0,
    offsetYPercent: 0,
    rotationDeg: 0,
    afterScale: 1,
    afterOffsetXPercent: 0,
    afterOffsetYPercent: 0,
    afterRotationDeg: 0,
  });
  const beforeDate = formatDate(before.date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const afterDate = formatDate(after.date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (!beforeBlob || !afterBlob) return undefined;
    let active = true;
    computePhotoAlignment(beforeBlob, afterBlob)
      .then((nextAlignment) => {
        if (active) setAlignment(nextAlignment);
      })
      .catch(() => {
        if (active) {
          setAlignment({
            scale: 1,
            offsetXPercent: 0,
            offsetYPercent: 0,
            rotationDeg: 0,
            afterScale: 1,
            afterOffsetXPercent: 0,
            afterOffsetYPercent: 0,
            afterRotationDeg: 0,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [afterBlob, beforeBlob]);

  return (
    <figure className="mx-auto w-full max-w-[620px]">
      <div className="relative aspect-[4/5] touch-pan-y overflow-hidden rounded-xl bg-black/5 shadow-sm dark:rounded-[4px] dark:bg-black/20 dark:shadow-none">
        <AuthenticatedPhotoImage
          photo={after}
          width={1000}
          height={1250}
          alt={`Después: ${afterLabel}`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out"
          style={{
            transform: `translate(${alignment.afterOffsetXPercent || 0}%, ${alignment.afterOffsetYPercent || 0}%) rotate(${alignment.afterRotationDeg || 0}deg) scale(${alignment.afterScale || 1})`,
          }}
          onContentReady={setAfterBlob}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          aria-hidden="true"
        >
          <AuthenticatedPhotoImage
            photo={before}
            width={1000}
            height={1250}
            alt={`Antes: ${beforeLabel}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out"
            style={{
              transform: `translate(${alignment.offsetXPercent}%, ${alignment.offsetYPercent}%) rotate(${alignment.rotationDeg || 0}deg) scale(${alignment.scale})`,
            }}
            dataAlignmentMethod={alignment.method || "none"}
            onContentReady={setBeforeBlob}
          />
        </div>

        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Antes
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Después
        </span>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.16)]"
          style={{ left: `${position}%` }}
        >
          <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white text-[#352018] shadow-md">
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2.2} />
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label="Deslizar comparación entre antes y después"
          aria-valuetext={`${position}% de la imagen anterior visible`}
          className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-4 text-xs font-medium text-[color:var(--text-muted)]">
        <span>{beforeDate}</span>
        <span>{comparisonDayGap([before, after])} días</span>
        <span>{afterDate}</span>
      </figcaption>
    </figure>
  );
}

export default function PhotosLibrary({ onBack, onNavigate }) {
  const { updateAccount, user } = useAuth();
  const queryClient = useQueryClient();
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
  const [replacing, setReplacing] = useState(false);
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
    visibility: "private",
  });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const currentUserId = String(user?.id || user?._id || "");
  const canManage = !dataOwnerId || String(dataOwnerId) === currentUserId;

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
  const knownMissingCount = photos.filter(
    (photo) => photo.contentStatus === "missing",
  ).length;
  const photoSummaryTotal = Number(summaryQuery.data?.total || 0);
  const photoSummaryMissing = summaryQuery.data?.missing ?? knownMissingCount;
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
  const selectedPhotos = orderComparisonPhotos(
    selectedIds
      .map((id) => photos.find((photo) => photo.id === id))
      .filter(Boolean),
  );
  const selectedView = selectedPhotos[0]?.view || "";

  useEffect(() => {
    setSelectedIds([]);
  }, [typeFilter, viewFilter]);

  const toggleComparison = (photo) => {
    const id = photo.id;
    if (photo.contentStatus === "missing") {
      toast.info("Recupera esta imagen antes de compararla");
      return;
    }
    if (!selectedIds.includes(id) && !canComparePhoto(selectedPhotos, photo)) {
      toast.info("Compara fotos tomadas desde la misma vista corporal");
      return;
    }
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
      visibility: "private",
    });

  const invalidatePhotoQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["photo-library"] }),
      queryClient.invalidateQueries({ queryKey: ["photo-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["photos"] }),
      queryClient.invalidateQueries({ queryKey: ["profile-avatar"] }),
    ]);
  };

  const handleReplace = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activePhoto) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Usa una imagen JPG, PNG o WebP");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    try {
      setReplacing(true);
      const form = new FormData();
      form.append("file", file);
      const saved = normalizePhoto(
        await api.replacePhoto(activePhoto.id, form),
      );
      setActivePhoto(saved);
      await invalidatePhotoQueries();
      toast.success("Imagen recuperada");
    } catch (error) {
      toast.error(error.message || "No se pudo reemplazar la imagen");
    } finally {
      setReplacing(false);
    }
  };

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
        visibility: activePhoto.visibility || "private",
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

  const handleReturn = () => {
    if (onBack) {
      onBack("dashboard");
      return;
    }
    onNavigate?.("dashboard");
  };

  return (
    <main className="photos-shell mx-auto w-full max-w-md pb-28 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]">
      <div className="w-full space-y-4">
        <MobilePageHeader
          title="Fotos de progreso"
          variant="detail"
          onBack={handleReturn}
          className="-mx-[var(--mobile-page-gutter)] border-b border-[color:var(--detail-row-divider)] px-1"
        />
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={handleReturn}
              aria-label="Volver a la página anterior"
              className="hidden h-11 w-11 shrink-0 place-items-center rounded-full text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-subtle)] md:grid"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={2.1} />
            </button>
            <div className="min-w-0">
              <h1 className="hidden text-[36px] font-medium leading-none tracking-[-0.035em] md:block">
                Fotos de progreso
              </h1>
              <p className="text-sm font-medium text-[color:var(--text-muted)] md:mt-1">
                {summaryQuery.isLoading
                  ? "Cargando..."
                  : `${photoSummaryTotal} fotos${photoSummaryMissing ? ` · ${photoSummaryMissing} por recuperar` : ""}`}
              </p>
            </div>
          </div>
          {canManage ? (
            <Button
              className="h-10 gap-2 px-4 text-sm font-semibold"
              onClick={() => setUploadOpen((open) => !open)}
            >
              {uploadOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {uploadOpen ? "Cancelar" : "Nueva foto"}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-bold text-[color:var(--text-muted)]">
              <UsersRound className="h-4 w-4" />
              Solo fotos compartidas contigo
            </span>
          )}
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
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.38fr)]">
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
              <SelectField
                label="Acceso"
                value={meta.visibility}
                onChange={(visibility) =>
                  setMeta((current) => ({ ...current, visibility }))
                }
                options={VISIBILITY_OPTIONS}
              />
            </div>
            <p className="flex items-center gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
              {meta.visibility === "private" ? (
                <LockKeyhole className="h-4 w-4" />
              ) : (
                <UsersRound className="h-4 w-4" />
              )}
              {meta.visibility === "private"
                ? "Esta foto será visible solo para ti."
                : "Tu coach asignado también podrá verla."}
            </p>
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
              <p
                role="status"
                className="text-sm font-bold text-[#352018] dark:text-[#e2ff00]"
              >
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3">
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
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black dark:rounded-[3px] ${mode === value ? "bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black" : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"}`}
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
              hideLabel
            />
            <SelectField
              label="Vista"
              value={viewFilter}
              onChange={setViewFilter}
              options={VIEW_OPTIONS}
              hideLabel
            />
          </div>
        </div>

        {mode === "compare" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[color:var(--text-muted)]">
                {selectedIds.length
                  ? `${selectedIds.length}/2${selectedView ? ` · ${VIEW_OPTIONS.find((option) => option.value === selectedView)?.label}` : ""}`
                  : "Selecciona 2 fotos"}
              </p>
              {selectedIds.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-black text-[#352018] dark:text-[#e2ff00]"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
            {selectedPhotos.length === 2 ? (
              <BeforeAfterSlider
                key={`${selectedPhotos[0].id}:${selectedPhotos[1].id}`}
                before={selectedPhotos[0]}
                after={selectedPhotos[1]}
                beforeLabel={labelFor(selectedPhotos[0])}
                afterLabel={labelFor(selectedPhotos[1])}
              />
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
            {canManage ? (
              <Button
                className="mt-4 gap-2"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Agregar foto
              </Button>
            ) : null}
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
                onClick={() => toggleComparison(photo)}
              />
            ))}
          </div>
        )}

        {!photosQuery.isLoading && photos.length && photosQuery.hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              disabled={photosQuery.isFetchingNextPage}
              onClick={() => photosQuery.fetchNextPage()}
            >
              {photosQuery.isFetchingNextPage ? "Cargando..." : "Cargar más"}
            </Button>
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
            !canManage ? null : editing ? (
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
                {activePhoto.contentStatus === "missing" ? (
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={replacing}
                    onClick={() => replaceInputRef.current?.click()}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${replacing ? "animate-spin" : ""}`}
                    />
                    {replacing ? "Recuperando..." : "Recuperar imagen"}
                  </Button>
                ) : null}
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
                {activePhoto.contentStatus !== "missing" ? (
                  <Button
                    variant="outline"
                    size="icon"
                    title="Usar como foto de perfil"
                    aria-label="Usar como foto de perfil"
                    onClick={setAsAvatar}
                  >
                    <UserRound className="h-4 w-4" />
                  </Button>
                ) : null}
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
              <SelectField
                label="Acceso"
                value={activePhoto.visibility || "private"}
                onChange={(visibility) =>
                  setActivePhoto((photo) => ({ ...photo, visibility }))
                }
                options={VISIBILITY_OPTIONS}
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
              {activePhoto.contentStatus === "missing" ? (
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-4 text-center dark:rounded-[4px]">
                  <p className="text-sm font-black">
                    La imagen original ya no está disponible
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Puedes subirla otra vez sin perder la fecha, la sesión ni la
                    nota.
                  </p>
                </div>
              ) : null}
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
                <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--bg)] px-2 py-1">
                  {activePhoto.visibility === "coach" ? (
                    <UsersRound className="h-3.5 w-3.5" />
                  ) : (
                    <LockKeyhole className="h-3.5 w-3.5" />
                  )}
                  {activePhoto.visibility === "coach"
                    ? "Compartida con coach"
                    : "Privada"}
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
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleReplace}
          />
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
