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
  ChevronDown,
  Columns2,
  ImagePlus,
  LockKeyhole,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "../components/library/ConfirmModal";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import Modal from "../components/shared/Modal";
import PhotoViewSelector from "../components/shared/PhotoViewSelector";
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
const PHOTO_CAPTURE_INTENT_KEY = "rirfit_photo_capture_intent";

const consumePhotoCaptureIntent = () => {
  if (typeof window === "undefined") return false;
  try {
    const requested =
      window.sessionStorage.getItem(PHOTO_CAPTURE_INTENT_KEY) === "1";
    window.sessionStorage.removeItem(PHOTO_CAPTURE_INTENT_KEY);
    return requested;
  } catch {
    return false;
  }
};

const TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "gym", label: "Entrenamiento" },
  { value: "home", label: "Progreso personal" },
  { value: "profile", label: "Perfil" },
];
const PROGRESS_TYPE_OPTIONS = TYPE_OPTIONS.filter(
  (option) => option.value !== "profile",
);
const CONTEXT_OPTIONS = TYPE_OPTIONS.filter(
  (option) => option.value === "gym" || option.value === "home",
);

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Solo tú" },
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
  const [resolvedSource, setResolvedSource] = useState("");
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
        if (active) setResolvedSource("");
      });
      return () => {
        active = false;
      };
    }

    // Data URLs are more reliable than blob URLs in iOS standalone/PWA mode.
    // The backend already returns a resized image, so the memory impact stays
    // bounded while avoiding Safari revoking the source during view changes.
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (active && typeof reader.result === "string") {
        setResolvedSource(reader.result);
      }
    });
    reader.addEventListener("error", () => {
      if (active) setResolvedSource("");
    });
    reader.readAsDataURL(contentQuery.data);

    return () => {
      active = false;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [contentQuery.data]);

  useEffect(() => {
    if (contentQuery.data) onContentReady?.(contentQuery.data);
  }, [contentQuery.data, onContentReady]);

  const source = resolvedSource || (!contentUrl ? photo?.url || "" : "");
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

function SelectField({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
  labelClassName = "",
}) {
  return (
    <label className={`block ${hideLabel ? "" : "space-y-1.5"}`}>
      <span
        className={
          hideLabel
            ? "sr-only"
            : labelClassName ||
              "text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--text-muted)]"
        }
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-accent-focus h-11 w-full rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base font-medium text-[color:var(--text)] outline-none sm:text-sm"
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

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
        checked
          ? "border-[color:var(--accent)] bg-[color:var(--accent)]"
          : "border-[color:var(--border-strong)] bg-[color:var(--surface-subtle)]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full shadow-sm transition-all ${
          checked
            ? "left-[23px] bg-[color:var(--accent-contrast)]"
            : "left-[3px] bg-[color:var(--text-subtle)]"
        }`}
      />
    </button>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="rounded-[1.15rem] border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
      <p className="font-semibold text-[color:var(--text)]">
        No pudimos cargar tus fotos
      </p>
      <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}

function PhotoCard({
  photo,
  label,
  selected,
  selectionMode,
  ownerView = true,
  onClick,
}) {
  const missing = photo.contentStatus === "missing";
  const viewLabel =
    VIEW_OPTIONS.find((option) => option.value === photo.view)?.label ||
    "Otra vista";
  const sharedWithCoach = photo.visibility === "coach";
  const accessLabel = sharedWithCoach
    ? ownerView
      ? "Compartida con tu coach"
      : "Compartida contigo"
    : "Solo para ti";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${selectionMode ? "Seleccionar" : "Abrir"} foto: ${label}, ${formatDate(photo.date, { day: "2-digit", month: "long", year: "numeric" })}`}
      aria-pressed={selectionMode ? selected : undefined}
      disabled={selectionMode && missing}
      className={`group relative w-full overflow-hidden rounded-[1.15rem] border bg-[color:var(--card)] text-left shadow-[var(--shadow-xs)] transition-[transform,border-color,box-shadow] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
        selected
          ? "border-[color:var(--accent)] ring-2 ring-[color:var(--focus-ring)]"
          : "border-[color:var(--border)] hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--surface-subtle)]">
        <AuthenticatedPhotoImage
          photo={photo}
          width={520}
          height={680}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute right-2 top-2 rounded-full border border-white/55 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-[#302d29] shadow-sm backdrop-blur-md">
          {viewLabel}
        </span>
      </div>
      <div className="grid min-h-[4.4rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
        <span className="min-w-0">
          <strong className="block truncate text-[13px] font-semibold leading-tight text-[color:var(--text)]">
            {label}
          </strong>
          <small className="mt-1 block text-[11px] font-medium text-[color:var(--text-muted)]">
            {formatDate(photo.date, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </small>
        </span>
        <span
          className="inline-flex h-7 items-center gap-1 rounded-full bg-[color:var(--surface-subtle)] px-2 text-[color:var(--text-muted)]"
          title={accessLabel}
          aria-label={accessLabel}
        >
          {sharedWithCoach ? (
            <UsersRound className="h-3 w-3" />
          ) : (
            <LockKeyhole className="h-3 w-3" />
          )}
          <span className="text-[9px] font-semibold">
            {sharedWithCoach ? "Coach" : "Solo tú"}
          </span>
        </span>
      </div>
      {selectionMode ? (
        <span
          className={`absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border ${
            selected
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
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

function RecoveryRow({ photo, label, ownerView, onClick }) {
  const viewLabel =
    VIEW_OPTIONS.find((option) => option.value === photo.view)?.label ||
    "Otra vista";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid min-h-[4.25rem] w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--focus-ring)]"
      aria-label={`${ownerView ? "Recuperar" : "Revisar"} foto ${label}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-[0.8rem] bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]">
        <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[13px] font-semibold text-[color:var(--text)]">
          {label}
        </strong>
        <small className="mt-0.5 block truncate text-[11px] font-medium text-[color:var(--text-muted)]">
          {formatDate(photo.date, { day: "2-digit", month: "short" })} ·{" "}
          {viewLabel}
        </small>
      </span>
      <span className="text-[11px] font-semibold text-[color:var(--text)]">
        {ownerView ? "Recuperar" : "No disponible"}
      </span>
    </button>
  );
}

function PhotoActionsMenu({ onEdit, onSetAsAvatar, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="outline"
        size="icon"
        title="Más opciones"
        aria-label="Más opciones de la foto"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          aria-label="Opciones de la foto"
          className="overflow-menu-panel absolute bottom-[calc(100%+0.5rem)] right-0 z-50 w-56"
        >
          {onEdit ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 text-sm"
            >
              <Pencil className="h-4 w-4" /> Editar información
            </button>
          ) : null}
          {onSetAsAvatar ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSetAsAvatar();
              }}
              className="flex w-full items-center gap-2 px-3 text-sm"
            >
              <UserRound className="h-4 w-4" /> Usar como foto de perfil
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 text-sm text-[color:var(--danger)]"
          >
            <Trash2 className="h-4 w-4" /> Eliminar foto
          </button>
        </div>
      ) : null}
    </div>
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
          <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white text-[#181918] shadow-md">
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
  const hasAssignedCoach = Boolean(
    user?.assignedTrainerId || user?.coachIntake?.coachId,
  );
  const [mode, setMode] = useState("history");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewFilter, setViewFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(consumePhotoCaptureIntent);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [fileError, setFileError] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [meta, setMeta] = useState({
    date: localDateString(),
    type: "home",
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
  const availablePhotos = photos.filter(
    (photo) => photo.contentStatus !== "missing",
  );
  const missingPhotos = photos.filter(
    (photo) => photo.contentStatus === "missing",
  );
  const knownMissingCount = photos.filter(
    (photo) => photo.contentStatus === "missing",
  ).length;
  const photoSummaryTotal = Number(summaryQuery.data?.total || 0);
  const photoSummaryMissing = summaryQuery.data?.missing ?? knownMissingCount;
  const photoSummaryAvailable =
    summaryQuery.data?.available ??
    Math.max(photoSummaryTotal - photoSummaryMissing, 0);
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

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

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
      type: "home",
      view: "front",
      sessionId: "",
      label: "",
      visibility: "private",
    });

  const clearPendingPhoto = () => {
    setPendingFile(null);
    setPreviewUrl("");
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setFileError("");
    setDetailsOpen(false);
    clearPendingPhoto();
    resetMeta();
  };

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

  const selectPendingPhoto = (event) => {
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
    setFileError("");
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const savePendingPhoto = async () => {
    if (!pendingFile || uploading) return;
    setUploading(true);
    setFileError("");
    const routineName = meta.sessionId
      ? trainingMap.get(meta.sessionId) || ""
      : "";
    try {
      await addPhoto({
        file: pendingFile,
        ...meta,
        type: meta.sessionId ? "gym" : "home",
        routineName,
        label: meta.label.trim() || routineName,
      });
      toast.success("Foto guardada");
      closeUpload();
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
          actions={
            canManage ? (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-[var(--shadow-xs)] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                aria-label="Añadir foto de progreso"
              >
                <Camera className="h-5 w-5" strokeWidth={1.8} />
              </button>
            ) : null
          }
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
                  : photoSummaryMissing
                    ? `${photoSummaryAvailable} disponibles · ${photoSummaryMissing} por recuperar`
                    : `${photoSummaryAvailable} ${photoSummaryAvailable === 1 ? "foto guardada" : "fotos guardadas"}`}
              </p>
            </div>
          </div>
          {canManage ? (
            <Button
              className="hidden h-10 gap-2 px-4 text-sm font-semibold md:inline-flex"
              onClick={() => setUploadOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nueva foto
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-bold text-[color:var(--text-muted)]">
              <UsersRound className="h-4 w-4" />
              Solo fotos compartidas contigo
            </span>
          )}
        </header>

        {canManage && uploadOpen ? (
          <Modal
            title="Añadir foto"
            subtitle="Crea un registro fácil de comparar."
            size="small"
            mobilePage
            portal
            onClose={closeUpload}
            contentClassName="sm:bg-[color:var(--surface-raised)]"
            footerClassName="max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            footer={
              pendingFile ? (
                <Button
                  disabled={uploading}
                  className="h-[3.25rem] w-full rounded-[1rem]"
                  onClick={savePendingPhoto}
                >
                  {uploading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {uploading ? "Guardando..." : "Guardar foto"}
                </Button>
              ) : (
                <div className="grid w-full grid-cols-2 gap-3">
                  <Button
                    className="h-[3.25rem] min-w-0 gap-2 whitespace-nowrap rounded-[1rem]"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    Tomar foto
                  </Button>
                  <Button
                    variant="outline"
                    className="h-[3.25rem] min-w-0 gap-2 whitespace-nowrap rounded-[1rem]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Galería
                  </Button>
                </div>
              )
            }
          >
            <section className="space-y-5 sm:p-1">
              <PhotoViewSelector
                value={meta.view}
                onChange={(view) =>
                  setMeta((current) => ({ ...current, view }))
                }
                hint="Repite esta vista en futuras fotos para comparar mejor."
              />

              {pendingFile ? (
                <>
                  <figure className="space-y-2">
                    <div className="relative mx-auto aspect-[4/5] max-h-[48dvh] overflow-hidden rounded-[1.15rem] bg-[#1a1917]">
                      <img
                        src={previewUrl}
                        alt="Vista previa de la foto seleccionada"
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#302d29] shadow-sm backdrop-blur">
                        {VIEW_OPTIONS.find(
                          (option) => option.value === meta.view,
                        )?.label || "Otra vista"}
                      </span>
                    </div>
                    <figcaption className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-subtle)]"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Tomar otra
                      </button>
                      <span className="h-4 w-px bg-[color:var(--border)]" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-subtle)]"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        Cambiar
                      </button>
                    </figcaption>
                  </figure>

                  {hasAssignedCoach ? (
                    <div className="flex items-center gap-3 border-y border-[color:var(--border)] py-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]">
                        <UsersRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold">
                          Compartir con mi coach
                        </strong>
                        <small className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                          Podrá verla desde tu seguimiento.
                        </small>
                      </span>
                      <Toggle
                        checked={meta.visibility === "coach"}
                        onChange={(shared) =>
                          setMeta((current) => ({
                            ...current,
                            visibility: shared ? "coach" : "private",
                          }))
                        }
                        label="Compartir foto con mi coach"
                      />
                    </div>
                  ) : null}

                  <div>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((open) => !open)}
                      aria-expanded={detailsOpen}
                      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold"
                    >
                      <span>
                        Añadir detalles
                        <small className="ml-2 font-normal text-[color:var(--text-muted)]">
                          Opcional
                        </small>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[color:var(--text-muted)] transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {detailsOpen ? (
                      <div className="space-y-3 border-t border-[color:var(--border)] pt-3">
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-[color:var(--text-muted)]">
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
                            className="theme-accent-focus h-11 w-full rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base font-medium outline-none sm:text-sm"
                          />
                        </label>
                        <SelectField
                          label="Vincular a una sesión"
                          labelClassName="text-xs font-semibold text-[color:var(--text-muted)]"
                          value={meta.sessionId}
                          onChange={(sessionId) =>
                            setMeta((current) => ({
                              ...current,
                              sessionId,
                              type: sessionId ? "gym" : "home",
                            }))
                          }
                          options={[
                            { value: "", label: "Sin vincular" },
                            ...trainingOptions.map((item) => ({
                              value: item.id,
                              label: item.label,
                            })),
                          ]}
                        />
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-[color:var(--text-muted)]">
                            Nota
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
                            className="theme-accent-focus h-11 w-full rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base font-medium outline-none placeholder:text-[color:var(--text-muted)] sm:text-sm"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[15rem] flex-col items-center justify-center px-6 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text)]">
                    <Camera className="h-7 w-7" strokeWidth={1.6} />
                  </span>
                  <h4 className="mt-4 text-base font-semibold">
                    Prepara tu foto de progreso
                  </h4>
                  <p className="mt-1 max-w-xs text-sm leading-5 text-[color:var(--text-muted)]">
                    Busca buena luz, encuadra el cuerpo y mantén la misma
                    postura en cada registro.
                  </p>
                </div>
              )}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                hidden
                onChange={selectPendingPhoto}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={selectPendingPhoto}
              />
              {fileError ? (
                <p
                  role="alert"
                  className="text-center text-sm font-semibold text-red-500"
                >
                  {fileError}
                </p>
              ) : null}
            </section>
          </Modal>
        ) : null}

        <div className="space-y-2.5 border-b border-[color:var(--border)] pb-3 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
          <div
            className="flex w-full rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--card)] p-1 sm:w-auto"
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
                className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[0.7rem] px-3 text-xs font-semibold transition-colors sm:flex-none ${mode === value ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"}`}
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
              options={PROGRESS_TYPE_OPTIONS}
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
              <p className="text-sm font-medium text-[color:var(--text-muted)]">
                {selectedIds.length
                  ? `${selectedIds.length}/2${selectedView ? ` · ${VIEW_OPTIONS.find((option) => option.value === selectedView)?.label}` : ""}`
                  : "Selecciona 2 fotos de la misma vista"}
              </p>
              {selectedIds.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-semibold text-[color:var(--text)] underline-offset-4 hover:underline"
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

        {mode === "history" && missingPhotos.length ? (
          <section
            aria-labelledby="photos-recovery-title"
            className="overflow-hidden rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--card)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-3 py-2.5">
              <div className="min-w-0">
                <h2
                  id="photos-recovery-title"
                  className="text-[13px] font-semibold text-[color:var(--text)]"
                >
                  Fotos por recuperar
                </h2>
                <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                  Conservan su fecha y sus datos.
                </p>
              </div>
              <span className="rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1 text-[11px] font-semibold">
                {missingPhotos.length}
              </span>
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {missingPhotos.map((photo) => (
                <RecoveryRow
                  key={photo.id}
                  photo={photo}
                  label={labelFor(photo)}
                  ownerView={canManage}
                  onClick={() => openPhoto(photo)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {photosQuery.isError ? (
          <ErrorState onRetry={() => photosQuery.refetch()} />
        ) : photosQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="aspect-[4/5] rounded-[1.15rem]"
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-[1.15rem] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--card)] p-8 text-center shadow-[var(--shadow-xs)]">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]">
              <ImagePlus className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold">Aún no hay fotos en esta vista</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[color:var(--text-muted)]">
              Registra una vista frontal, lateral o posterior para comenzar tu
              historial visual.
            </p>
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
        ) : availablePhotos.length === 0 ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]">
              <ImagePlus className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold">No hay fotos disponibles</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[color:var(--text-muted)]">
              {missingPhotos.length
                ? "Recupera una imagen pendiente para volver a verla o compararla."
                : "Prueba otra combinación de contexto y vista."}
            </p>
          </div>
        ) : mode === "history" ? (
          <section aria-label="Historial cronológico de fotos">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {availablePhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  label={labelFor(photo)}
                  ownerView={canManage}
                  onClick={() => openPhoto(photo)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {availablePhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                label={labelFor(photo)}
                ownerView={canManage}
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
          size="small"
          mobilePage
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
                <PhotoActionsMenu
                  onEdit={
                    activePhoto.contentStatus === "missing"
                      ? () => setEditing(true)
                      : null
                  }
                  onSetAsAvatar={
                    activePhoto.contentStatus !== "missing" ? setAsAvatar : null
                  }
                  onDelete={() => {
                    setDeleteTarget(activePhoto);
                    setActivePhoto(null);
                  }}
                />
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
                ) : (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
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
                  className="theme-accent-focus h-11 w-full rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base outline-none sm:text-sm"
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
              ) : null}
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
                  className="theme-accent-focus h-11 w-full rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base outline-none sm:text-sm"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-[min(62dvh,560px)] overflow-hidden rounded-[1.15rem] bg-[color:var(--surface-subtle)]">
                <AuthenticatedPhotoImage
                  photo={activePhoto}
                  width={1600}
                  height={1600}
                  alt={labelFor(activePhoto)}
                  className="h-full w-full object-contain"
                />
              </div>
              {activePhoto.contentStatus === "missing" ? (
                <div className="rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-center">
                  <p className="text-sm font-semibold">
                    La imagen original ya no está disponible
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Puedes subirla otra vez sin perder la fecha, la sesión ni la
                    nota.
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 text-xs font-medium text-[color:var(--text-muted)]">
                <span className="rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1">
                  {VIEW_OPTIONS.find(
                    (option) => option.value === activePhoto.view,
                  )?.label || "Otra"}
                </span>
                <span className="rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1">
                  {TYPE_OPTIONS.find(
                    (option) => option.value === activePhoto.type,
                  )?.label || "Entrenamiento"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1">
                  {activePhoto.visibility === "coach" ? (
                    <UsersRound className="h-3.5 w-3.5" />
                  ) : (
                    <LockKeyhole className="h-3.5 w-3.5" />
                  )}
                  {activePhoto.visibility === "coach"
                    ? canManage
                      ? "Compartida con coach"
                      : "Compartida contigo"
                    : "Solo tú"}
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
            hidden
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
