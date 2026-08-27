import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  Lock,
  LogOut,
  Monitor,
  Save,
  Smartphone,
  Tablet,
  Unlink,
  Upload,
  UserRoundCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { useUserProfile } from "../context/UserContext";
import { useThemeMode } from "../hooks/useThemeMode";
import { api } from "../services/api";
import { buildCloudinaryUrl } from "../utils/cloudinary";
import { toast } from "sonner";
import OperationLoader from "../components/system/OperationLoader";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import {
  passwordStatus,
  validateEmail,
  validatePassword,
} from "../utils/authValidation";

const branchOptions = [
  { id: "sopocachi", label: "Sopocachi", detail: "Av. 20 de Octubre" },
  { id: "miraflores", label: "Miraflores", detail: "Av. Busch" },
];

const locationModes = [
  {
    id: "single",
    title: "Un solo gimnasio",
    detail: "Usaremos tu gimnasio habitual sin volver a preguntarte.",
  },
  {
    id: "multiple",
    title: "Varios gimnasios",
    detail: "Elegirás la sede antes de cada entrenamiento.",
  },
  {
    id: "disabled",
    title: "No registrar ubicación",
    detail: "Rutinas, historial y marcas no se separarán por sede.",
  },
];

const inputClass =
  "theme-accent-focus h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-normal text-[color:var(--text)] outline-none transition disabled:opacity-60 dark:rounded-[3px]";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateStreak = (dates = []) => {
  const available = new Set(dates.map((date) => String(date).slice(0, 10)));
  if (!available.size) return 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!available.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (available.has(localDateKey(cursor)) && streak < 3650) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const photoUrl = (photo) => {
  if (!photo) return "";
  if (photo.publicId) {
    return buildCloudinaryUrl(photo.publicId, {
      width: 240,
      height: 240,
      crop: "fill",
      gravity: "face",
    });
  }
  return photo.url || "";
};

const formatSessionTime = (value) => {
  if (!value) return "Sin actividad reciente";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 2) return "Activo ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
};

const formatProfileDate = (value) => {
  if (!value) return "Completar";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Completar";
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const viewFromUrl = () => {
  if (typeof window === "undefined") return "settings";
  const requested = new URLSearchParams(window.location.search).get("perfil");
  return ["personal", "security", "locations"].includes(requested)
    ? requested
    : "settings";
};

function Field({ id, label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium uppercase tracking-[0.02em] text-[color:var(--text-muted)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-semibold text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, action, children, className = "" }) {
  return (
    <section className={`space-y-2.5 ${className}`}>
      <div className="flex min-h-6 items-end justify-between gap-3 px-1.5">
        <h2 className="font-sans text-[14px] font-medium uppercase tracking-[0.01em] text-[color:var(--text)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="profile-reference-card overflow-hidden rounded-[1.5rem] border border-[color:var(--detail-module-border)] bg-[color:var(--card)] shadow-xs dark:shadow-none">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ icon: Icon, title, subtitle, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[60px] w-full items-center gap-3 px-5 py-2.5 text-left transition-colors after:absolute after:bottom-0 after:left-5 after:right-0 after:h-px after:bg-[color:var(--detail-row-divider)] last:after:hidden hover:bg-[color:var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)] md:min-h-[68px] md:py-3"
    >
      {Icon ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text)]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[17px] font-normal leading-tight text-[color:var(--text)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-1 block text-xs leading-4 text-[color:var(--text-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {value !== undefined && value !== null ? (
        <span className="max-w-[48%] truncate text-right font-sans text-[17px] font-normal text-[color:var(--text-muted)]">
          {value}
        </span>
      ) : null}
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[color:var(--text-subtle)] transition-transform group-hover:translate-x-0.5"
        strokeWidth={2}
      />
    </button>
  );
}

function SettingsSelectRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onChange,
  disabled,
}) {
  return (
    <div className="relative flex min-h-[60px] w-full items-center gap-3 px-5 py-2.5 after:absolute after:bottom-0 after:left-5 after:right-0 after:h-px after:bg-[color:var(--detail-row-divider)] last:after:hidden md:min-h-[68px] md:py-3">
      {Icon ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text)]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <label
          htmlFor="profile-exercise-language"
          className="block font-sans text-[17px] font-normal leading-tight text-[color:var(--text)]"
        >
          {title}
        </label>
        {subtitle ? (
          <span className="mt-1 block text-xs leading-4 text-[color:var(--text-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <select
          id="profile-exercise-language"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="max-w-28 appearance-none bg-transparent text-right font-sans text-[17px] font-normal text-[color:var(--text-muted)] outline-none sm:max-w-36"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
        <ChevronRight
          className="h-5 w-5 text-[color:var(--text-subtle)]"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}

function ProfileHero({ user, avatarUrl, stats, onChangePhoto }) {
  return (
    <section className="profile-reference-hero-wrap lg:sticky lg:top-6">
      <div className="profile-reference-hero rounded-[1.75rem] border border-[color:var(--detail-module-border)] bg-[color:var(--card)] px-5 py-7 text-center shadow-xs dark:shadow-none lg:px-6 lg:py-8">
        <button
          type="button"
          onClick={onChangePhoto}
          aria-label="Cambiar foto de perfil"
          title="Cambiar foto de perfil"
          className="group relative mx-auto grid h-24 w-24 shrink-0 place-items-center overflow-visible rounded-full bg-[#e7d5da] font-sans text-3xl font-semibold text-[#4a2630] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--card)] lg:h-28 lg:w-28"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Foto de ${user?.name || "perfil"}`}
              className="absolute inset-0 h-full w-full rounded-full object-cover"
            />
          ) : (
            getInitials(user?.name)
          )}
          <span className="absolute bottom-0 right-0 z-10 grid h-8 w-8 place-items-center rounded-full border-2 border-[color:var(--detail-module-border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] shadow-xs transition group-hover:scale-105">
            <Camera className="h-4 w-4" strokeWidth={2} />
          </span>
        </button>
        <div className="mt-4 min-w-0">
          <h1 className="truncate font-sans text-[18px] font-medium text-[color:var(--text)]">
            {user?.name || "Usuario"}
          </h1>
          <p className="mt-1 truncate font-sans text-sm text-[color:var(--text-muted)]">
            {user?.email || "Cuenta Apex"}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 border-t border-[color:var(--detail-row-divider)] pt-5">
          <Stat value={stats.workouts} label="Entrenamientos" />
          <Stat value={stats.streak} label="Racha actual" bordered />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, bordered = false }) {
  return (
    <div
      className={`px-3 text-center ${bordered ? "border-l border-[color:var(--detail-row-divider)]" : ""}`}
    >
      <p className="font-sans text-2xl font-semibold leading-none text-[color:var(--text)]">
        {value ?? "--"}
      </p>
      <p className="mt-1.5 text-[12px] font-medium uppercase tracking-[0.025em] text-[color:var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function ProfilePageHeader({ title, onBack, variant = "detail" }) {
  return (
    <MobilePageHeader
      title={title}
      variant={variant}
      onBack={onBack}
      className={
        variant === "detail"
          ? "sticky top-0 z-30 -mx-3 border-b border-[color:var(--detail-row-divider)] bg-[color:var(--card)] px-1"
          : "px-[6px]"
      }
    />
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--card)] md:inline-flex"
    >
      <ChevronLeft className="h-4 w-4" />
      Perfil
    </button>
  );
}

function SessionIcon({ device = "" }) {
  const normalized = device.toLowerCase();
  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return Tablet;
  }
  if (normalized.includes("iphone") || normalized.includes("android")) {
    return Smartphone;
  }
  return Monitor;
}

function SessionRow({ session }) {
  const Icon = SessionIcon(session.device);
  return (
    <div className="flex min-h-20 items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 last:border-b-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--bg)]">
        <Icon className="h-5 w-5 text-[#352018] dark:text-[#e2ff00]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-[color:var(--text)]">
            {session.device || "Dispositivo"}
          </p>
          {session.current ? (
            <span className="theme-accent-soft rounded border px-1.5 py-0.5 text-[10px] font-black uppercase">
              Actual
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          {session.browser || "Aplicación"}
          {session.os ? ` en ${session.os}` : ""} ·{" "}
          {session.current
            ? "Activo ahora"
            : formatSessionTime(session.lastSeenAt)}
        </p>
      </div>
    </div>
  );
}

export default function ProfileSettings({ onNavigate }) {
  const { user, logout, updateAccount, refreshUser } = useAuth();
  const {
    photos = [],
    branch,
    locationMode,
    allowedBranches,
    addPhoto,
    saveLocationPreferences,
  } = useTrainingData();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    capabilities,
    updateProfile,
    refreshProfile,
  } = useUserProfile();
  const { isDark, toggleTheme } = useThemeMode();
  const [view, setView] = useState(viewFromUrl);
  const [summary, setSummary] = useState({
    workouts: null,
    trainingDates: [],
  });
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [personalDraft, setPersonalDraft] = useState(null);
  const [personalErrors, setPersonalErrors] = useState({});
  const [personalState, setPersonalState] = useState({
    saving: false,
    message: "",
    tone: "",
  });
  const [photoUploadState, setPhotoUploadState] = useState({
    uploading: false,
    message: "",
    tone: "",
  });
  const [locationDraft, setLocationDraft] = useState(null);
  const [locationState, setLocationState] = useState({
    saving: false,
    message: "",
    tone: "",
  });
  const [sessions, setSessions] = useState([]);
  const [sessionsState, setSessionsState] = useState({
    loading: false,
    error: "",
    closing: false,
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordState, setPasswordState] = useState({
    saving: false,
    message: "",
    tone: "",
  });
  const [languageSaving, setLanguageSaving] = useState(false);
  const [coachRelationship, setCoachRelationship] = useState({
    loading: user?.role === "Cliente",
    connected: false,
    coach: null,
  });
  const [coachCode, setCoachCode] = useState("");
  const [coachSaving, setCoachSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await api.getProfileSummary();
      setSummary({
        workouts: Number(data.workouts) || 0,
        trainingDates: data.trainingDates || [],
      });
    } catch (error) {
      setSummaryError(error.message || "No se pudo cargar el resumen.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (user?.role !== "Cliente") return undefined;
    let active = true;
    api
      .getCoachRelationship()
      .then((data) => {
        if (active) setCoachRelationship({ loading: false, ...data });
      })
      .catch((error) => {
        if (!active) return;
        setCoachRelationship({ loading: false, connected: false, coach: null });
        toast.error(error.message || "No se pudo consultar tu coach");
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    const handlePopState = () => setView(viewFromUrl());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const ownPhotos = useMemo(
    () =>
      photos.filter(
        (photo) => String(photo.ownerId || "") === String(user?.id || ""),
      ),
    [photos, user?.id],
  );
  const selectedAvatar = useMemo(
    () =>
      ownPhotos.find(
        (photo) => String(photo.id || photo._id) === profile?.avatarPhotoId,
      ),
    [ownPhotos, profile?.avatarPhotoId],
  );
  const avatarUrl = photoUrl(selectedAvatar);
  const draftAvatar = personalDraft
    ? ownPhotos.find(
        (photo) =>
          String(photo.id || photo._id) === personalDraft.avatarPhotoId,
      )
    : null;
  const draftAvatarUrl = photoUrl(draftAvatar);
  const stats = {
    workouts: summaryLoading ? null : summary.workouts,
    streak: summaryLoading ? null : calculateStreak(summary.trainingDates),
  };

  const navigateView = (nextView, { replace = false } = {}) => {
    const url = new URL(window.location.href);
    if (nextView === "settings") url.searchParams.delete("perfil");
    else url.searchParams.set("perfil", nextView);
    window.history[replace ? "replaceState" : "pushState"](
      { ...window.history.state, profileView: nextView },
      "",
      `${url.pathname}${url.search}`,
    );
    setView(nextView);
  };

  const openPersonal = () => {
    setPersonalDraft({
      name: user?.name || "",
      email: user?.email || "",
      birthDate: profile?.birthDate || "",
      weight: profile?.weight ?? "",
      height: profile?.height ?? "",
      avatarPhotoId: profile?.avatarPhotoId || "",
    });
    setPersonalErrors({});
    setPersonalState({ saving: false, message: "", tone: "" });
    setPhotoUploadState({ uploading: false, message: "", tone: "" });
    navigateView("personal");
  };

  const openPersonalPhoto = () => {
    openPersonal();
    window.setTimeout(() => {
      document.getElementById("profile-photo-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const openLocations = () => {
    setLocationDraft({
      locationMode: locationMode || "single",
      branch: branch || "sopocachi",
      allowedBranches:
        locationMode === "multiple"
          ? branchOptions.map((option) => option.id)
          : locationMode === "disabled"
            ? []
            : [branch || "sopocachi"],
    });
    setLocationState({ saving: false, message: "", tone: "" });
    navigateView("locations");
  };

  const hasPersonalChanges =
    personalDraft &&
    (personalDraft.name !== (user?.name || "") ||
      (capabilities.emailChange &&
        personalDraft.email !== (user?.email || "")) ||
      personalDraft.birthDate !== (profile?.birthDate || "") ||
      String(personalDraft.weight) !== String(profile?.weight ?? "") ||
      String(personalDraft.height) !== String(profile?.height ?? "") ||
      personalDraft.avatarPhotoId !== (profile?.avatarPhotoId || ""));

  const hasLocationChanges =
    locationDraft &&
    (locationDraft.locationMode !== locationMode ||
      locationDraft.branch !== branch ||
      JSON.stringify(locationDraft.allowedBranches) !==
        JSON.stringify(allowedBranches || []));

  const updatePersonalField = (field, value) => {
    setPersonalDraft((current) => ({ ...current, [field]: value }));
    if (personalErrors[field]) {
      setPersonalErrors((current) => ({ ...current, [field]: "" }));
    }
    if (personalState.message) {
      setPersonalState({ saving: false, message: "", tone: "" });
    }
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((current) => ({ ...current, [field]: "" }));
    }
    if (passwordState.message) {
      setPasswordState({ saving: false, message: "", tone: "" });
    }
  };

  const goBack = () => {
    if (
      ((view === "personal" && hasPersonalChanges) ||
        (view === "locations" && hasLocationChanges)) &&
      !window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?")
    ) {
      return;
    }
    if (new URLSearchParams(window.location.search).has("perfil")) {
      window.history.back();
    } else {
      navigateView("settings", { replace: true });
    }
  };

  const savePersonal = async (event) => {
    event.preventDefault();
    const errors = {
      name:
        personalDraft.name.trim().length < 2
          ? "Ingresa al menos 2 caracteres."
          : "",
      email: validateEmail(personalDraft.email),
      weight:
        personalDraft.weight !== "" &&
        (Number(personalDraft.weight) < 20 ||
          Number(personalDraft.weight) > 500)
          ? "Usa un valor entre 20 y 500 kg."
          : "",
      height:
        personalDraft.height !== "" &&
        (Number(personalDraft.height) < 80 ||
          Number(personalDraft.height) > 250)
          ? "Usa un valor entre 80 y 250 cm."
          : "",
    };
    setPersonalErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setPersonalState({ saving: true, message: "", tone: "" });
    try {
      const accountPayload = {
        name: personalDraft.name.trim(),
        birthDate: personalDraft.birthDate,
        weight:
          personalDraft.weight === "" ? null : Number(personalDraft.weight),
        height:
          personalDraft.height === "" ? null : Number(personalDraft.height),
        avatarPhotoId: personalDraft.avatarPhotoId,
      };
      if (capabilities.emailChange) {
        accountPayload.email = personalDraft.email.trim();
      }
      const accountData = await updateAccount(accountPayload);
      await refreshProfile();
      setPersonalState({
        saving: false,
        message: accountData.emailVerificationRequired
          ? "Cambios guardados. Revisa tu correo para confirmar la nueva dirección."
          : "Cambios guardados.",
        tone: "success",
      });
      toast.success("Perfil actualizado");
    } catch (error) {
      setPersonalState({
        saving: false,
        message: error.message || "No se pudieron guardar los cambios.",
        tone: "error",
      });
      toast.error(error.message || "No se pudieron guardar los cambios");
    }
  };

  const uploadProfilePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoUploadState({
        uploading: false,
        message: "Selecciona una imagen JPG, PNG o WebP.",
        tone: "error",
      });
      toast.error("Selecciona una imagen JPG, PNG o WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadState({
        uploading: false,
        message: "La imagen no puede superar 5 MB.",
        tone: "error",
      });
      toast.error("La imagen no puede superar 5 MB");
      return;
    }

    setPhotoUploadState({ uploading: true, message: "", tone: "" });
    try {
      const photo = await addPhoto({
        file,
        type: "profile",
        label: "Foto de perfil",
      });
      const avatarPhotoId = String(photo.id || photo._id || "");
      if (!avatarPhotoId) {
        throw new Error("La imagen no devolvio un identificador");
      }
      await updateAccount({ avatarPhotoId });
      setPersonalDraft((current) => ({ ...current, avatarPhotoId }));
      await refreshProfile();
      setPhotoUploadState({
        uploading: false,
        message: "Foto de perfil actualizada.",
        tone: "success",
      });
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      setPhotoUploadState({
        uploading: false,
        message: error.message || "No se pudo subir la imagen.",
        tone: "error",
      });
      toast.error(error.message || "No se pudo subir la imagen");
    }
  };

  const loadSessions = useCallback(async () => {
    setSessionsState({ loading: true, error: "", closing: false });
    try {
      const data = await api.getAuthSessions();
      setSessions(data.sessions || []);
      setSessionsState({ loading: false, error: "", closing: false });
    } catch (error) {
      setSessions([]);
      setSessionsState({
        loading: false,
        error: error.message || "No se pudieron cargar las sesiones.",
        closing: false,
      });
    }
  }, []);

  useEffect(() => {
    if (view === "security") loadSessions();
  }, [loadSessions, view]);

  const closeOtherSessions = async () => {
    setSessionsState((current) => ({ ...current, closing: true, error: "" }));
    try {
      await api.logoutAllSessions();
      await loadSessions();
      toast.success("Otras sesiones cerradas");
    } catch (error) {
      setSessionsState({
        loading: false,
        closing: false,
        error: error.message || "No se pudieron cerrar las otras sesiones.",
      });
      toast.error(error.message || "No se pudieron cerrar las otras sesiones");
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const errors = {
      currentPassword: passwordForm.currentPassword
        ? ""
        : "Ingresa tu contraseña actual.",
      password: validatePassword(passwordForm.password),
      confirmPassword:
        passwordForm.confirmPassword === passwordForm.password
          ? ""
          : "Las contraseñas no coinciden.",
    };
    setPasswordErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setPasswordState({ saving: true, message: "", tone: "" });
    try {
      await api.changePassword(passwordForm);
      setPasswordForm({
        currentPassword: "",
        password: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
      setPasswordState({
        saving: false,
        message: "Contraseña actualizada.",
        tone: "success",
      });
      toast.success("Contraseña actualizada");
      await loadSessions();
    } catch (error) {
      setPasswordState({
        saving: false,
        message: error.message || "No se pudo actualizar la contraseña.",
        tone: "error",
      });
      toast.error(error.message || "No se pudo actualizar la contraseña");
    }
  };

  const saveLocations = async () => {
    setLocationState({ saving: true, message: "", tone: "" });
    try {
      await saveLocationPreferences(locationDraft);
      setLocationState({
        saving: false,
        message: "Configuración guardada.",
        tone: "success",
      });
      toast.success("Configuración de sedes guardada");
    } catch (error) {
      setLocationState({
        saving: false,
        message: error.message || "No se pudo guardar la configuración.",
        tone: "error",
      });
      toast.error(error.message || "No se pudo guardar la configuración");
    }
  };

  const locationSummary =
    locationMode === "disabled"
      ? "Ubicación desactivada"
      : locationMode === "multiple"
        ? `${allowedBranches?.length || branchOptions.length} sedes`
        : branchOptions.find((option) => option.id === branch)?.label ||
          "Sopocachi";

  const handleLogout = async () => {
    const didLogout = await logout();
    if (didLogout) onNavigate?.("login");
  };

  const handleLanguageChange = async (event) => {
    const language = event.target.value === "en" ? "en" : "es";
    if (language === profile.language || languageSaving) return;
    setLanguageSaving(true);
    try {
      await updateProfile({ language });
      toast.success(
        language === "es"
          ? "Los ejercicios se mostrarán en español"
          : "Exercise names will be shown in English",
      );
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      toast.error(error.message || "No se pudo cambiar el idioma");
      setLanguageSaving(false);
    }
  };

  const connectToCoach = async (event) => {
    event.preventDefault();
    const normalizedCode = coachCode.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error("Ingresa el codigo que te compartio tu coach");
      return;
    }
    const changingCoach =
      coachRelationship.connected && coachRelationship.coach;
    if (
      changingCoach &&
      !window.confirm(
        `Actualmente entrenas con ${coachRelationship.coach.name}. Al cambiar, sus planes activos se pausaran. Quieres continuar?`,
      )
    ) {
      return;
    }
    try {
      setCoachSaving(true);
      const data = await api.connectCoach(
        normalizedCode,
        Boolean(changingCoach),
      );
      setCoachRelationship({ loading: false, ...data });
      setCoachCode("");
      await refreshUser({ force: true, silent: true });
      toast.success(`Ahora entrenas con ${data.coach.name}`);
    } catch (error) {
      toast.error(error.message || "No se pudo vincular el coach");
    } finally {
      setCoachSaving(false);
    }
  };

  const disconnectFromCoach = async () => {
    if (
      !window.confirm(
        "Dejaras la cartera de tu coach. Sus planes se pausaran y tus rutinas quedaran disponibles como personales. Quieres continuar?",
      )
    ) {
      return;
    }
    try {
      setCoachSaving(true);
      const data = await api.disconnectCoach();
      setCoachRelationship({ loading: false, ...data });
      await refreshUser({ force: true, silent: true });
      toast.success("Ahora entrenas de forma independiente");
    } catch (error) {
      toast.error(error.message || "No se pudo quitar el coach");
    } finally {
      setCoachSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <main className="settings-shell profile-reference-shell mx-auto min-h-[50vh] w-full max-w-5xl">
        <ProfilePageHeader
          title="Perfil"
          variant="main"
        />
        <OperationLoader
          active
          delayMs={0}
          mode="inline"
          title="Cargando perfil"
          description="Sincronizando tus preferencias y datos de cuenta."
        />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="settings-shell profile-reference-shell mx-auto max-w-lg py-12 text-center">
        <ProfilePageHeader
          title="Perfil"
          variant="main"
        />
        <p role="alert" className="text-sm font-semibold text-red-500">
          {profileError || "No se pudo cargar el perfil."}
        </p>
        <button
          type="button"
          onClick={refreshProfile}
          className="theme-accent-solid mt-4 h-10 rounded-lg px-4 text-sm font-bold dark:rounded-[3px]"
        >
          Reintentar
        </button>
      </main>
    );
  }

  if (view === "personal" && personalDraft) {
    return (
      <main className="settings-shell profile-reference-shell mx-auto w-full max-w-4xl space-y-5 pb-28">
        <ProfilePageHeader title="Información personal" onBack={goBack} />
        <BackButton onClick={goBack} />
        <div className="hidden md:block">
          <h1 className="text-3xl font-black uppercase leading-none text-[color:var(--text)]">
            Información personal
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Revisa los cambios antes de guardarlos.
          </p>
        </div>
        <form onSubmit={savePersonal} className="grid gap-5 lg:grid-cols-2">
          <Section title="Cuenta">
            <div className="space-y-4 p-4">
              <Field
                id="profile-name"
                label="Nombre completo"
                error={personalErrors.name}
              >
                <input
                  id="profile-name"
                  name="name"
                  autoComplete="name"
                  className={inputClass}
                  value={personalDraft.name}
                  onChange={(event) =>
                    updatePersonalField("name", event.target.value)
                  }
                  aria-invalid={Boolean(personalErrors.name)}
                  aria-describedby={
                    personalErrors.name ? "profile-name-error" : undefined
                  }
                />
              </Field>
              <Field
                id="profile-email"
                label="Correo electrónico"
                error={personalErrors.email}
              >
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={inputClass}
                  value={personalDraft.email}
                  disabled={!capabilities.emailChange}
                  onChange={(event) =>
                    updatePersonalField("email", event.target.value)
                  }
                  aria-invalid={Boolean(personalErrors.email)}
                  aria-describedby={
                    personalErrors.email ? "profile-email-error" : undefined
                  }
                />
                {!capabilities.emailChange ? (
                  <p className="text-xs text-[color:var(--text-muted)]">
                    El cambio de correo estará disponible al configurar el
                    servicio de verificación.
                  </p>
                ) : null}
              </Field>
              <Field id="profile-birthDate" label="Fecha de nacimiento">
                <input
                  id="profile-birthDate"
                  name="birthDate"
                  type="date"
                  className={inputClass}
                  value={personalDraft.birthDate}
                  onChange={(event) =>
                    updatePersonalField("birthDate", event.target.value)
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="profile-weight"
                  label="Peso (kg)"
                  error={personalErrors.weight}
                >
                  <input
                    id="profile-weight"
                    name="weight"
                    type="number"
                    inputMode="decimal"
                    min="20"
                    max="500"
                    step="0.1"
                    className={inputClass}
                    value={personalDraft.weight}
                    onChange={(event) =>
                      updatePersonalField("weight", event.target.value)
                    }
                    aria-invalid={Boolean(personalErrors.weight)}
                    aria-describedby={
                      personalErrors.weight ? "profile-weight-error" : undefined
                    }
                  />
                </Field>
                <Field
                  id="profile-height"
                  label="Altura (cm)"
                  error={personalErrors.height}
                >
                  <input
                    id="profile-height"
                    name="height"
                    type="number"
                    inputMode="numeric"
                    min="80"
                    max="250"
                    step="1"
                    className={inputClass}
                    value={personalDraft.height}
                    onChange={(event) =>
                      updatePersonalField("height", event.target.value)
                    }
                    aria-invalid={Boolean(personalErrors.height)}
                    aria-describedby={
                      personalErrors.height ? "profile-height-error" : undefined
                    }
                  />
                </Field>
              </div>
            </div>
          </Section>
          <div id="profile-photo-section" className="scroll-mt-4">
            <Section title="Foto de perfil">
              <div className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] text-lg font-black">
                      {draftAvatarUrl ? (
                        <img
                          src={draftAvatarUrl}
                          alt="Foto de perfil actual"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(personalDraft.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[color:var(--text)]">
                        Tu foto
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        JPG, PNG o WebP. Maximo 5 MB.
                      </p>
                    </div>
                  </div>
                  <label
                    htmlFor="profile-photo-upload"
                    className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color:var(--border)] px-4 text-sm font-bold text-[color:var(--text)] transition hover:bg-[color:var(--bg)] ${photoUploadState.uploading ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <Upload className="h-4 w-4" />
                    {photoUploadState.uploading ? "Subiendo..." : "Subir foto"}
                  </label>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={photoUploadState.uploading}
                    onChange={uploadProfilePhoto}
                  />
                </div>
                {photoUploadState.message ? (
                  <p
                    role="status"
                    className={`text-xs font-semibold ${photoUploadState.tone === "error" ? "text-red-500" : "text-emerald-600"}`}
                  >
                    {photoUploadState.message}
                  </p>
                ) : null}
                <div className="grid grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => updatePersonalField("avatarPhotoId", "")}
                    aria-pressed={!personalDraft.avatarPhotoId}
                    className={`grid aspect-square place-items-center rounded-lg border text-lg font-black dark:rounded-[3px] ${!personalDraft.avatarPhotoId ? "theme-accent-soft" : "border-[color:var(--border)] bg-[color:var(--bg)]"}`}
                  >
                    {getInitials(personalDraft.name)}
                  </button>
                  {ownPhotos.slice(0, 7).map((photo) => {
                    const id = String(photo.id || photo._id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updatePersonalField("avatarPhotoId", id)}
                        aria-label="Seleccionar como foto de perfil"
                        aria-pressed={personalDraft.avatarPhotoId === id}
                        className={`aspect-square overflow-hidden rounded-lg border dark:rounded-[3px] ${personalDraft.avatarPhotoId === id ? "border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/20" : "border-[color:var(--border)]"}`}
                      >
                        <img
                          src={photoUrl(photo)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>
          </div>
          <div className="flex flex-col-reverse gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-end">
            {personalState.message ? (
              <p
                role="status"
                className={`text-sm font-semibold ${personalState.tone === "error" ? "text-red-500" : "text-emerald-600"}`}
              >
                {personalState.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!hasPersonalChanges || personalState.saving}
              className="theme-accent-solid inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold disabled:opacity-50 dark:rounded-[3px]"
            >
              <Save className="h-4 w-4" />
              {personalState.saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    );
  }

  if (view === "security") {
    const missingRules = passwordStatus(passwordForm.password);
    const otherSessions = sessions.filter((session) => !session.current).length;
    return (
      <main className="settings-shell profile-reference-shell mx-auto w-full max-w-3xl space-y-5 pb-28">
        <ProfilePageHeader title="Seguridad" onBack={goBack} />
        <BackButton onClick={goBack} />
        <div className="hidden md:block">
          <h1 className="text-3xl font-black uppercase leading-none text-[color:var(--text)]">
            Contraseña y sesiones
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Administra el acceso real a tu cuenta.
          </p>
        </div>
        <Section title="Contraseña">
          <button
            type="button"
            onClick={() => setShowPasswordForm((current) => !current)}
            aria-expanded={showPasswordForm}
            className="flex min-h-16 w-full items-center gap-3 p-4 text-left"
          >
            <span className="theme-accent-soft grid h-10 w-10 place-items-center rounded-lg border dark:rounded-[3px]">
              <Lock className="h-5 w-5" />
            </span>
            <span className="flex-1 text-sm font-bold text-[color:var(--text)]">
              Cambiar contraseña
            </span>
            <ChevronRight
              className={`h-4 w-4 text-[color:var(--text-muted)] transition ${showPasswordForm ? "rotate-90" : ""}`}
            />
          </button>
          {showPasswordForm ? (
            <form
              onSubmit={savePassword}
              className="space-y-4 border-t border-[color:var(--border)] p-4"
              noValidate
            >
              <Field
                id="current-password"
                label="Contraseña actual"
                error={passwordErrors.currentPassword}
              >
                <input
                  id="current-password"
                  name="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="current-password"
                  className={inputClass}
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    updatePasswordField("currentPassword", event.target.value)
                  }
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                />
              </Field>
              <Field
                id="new-password"
                label="Nueva contraseña"
                error={passwordErrors.password}
              >
                <div className="relative">
                  <input
                    id="new-password"
                    name="password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                    value={passwordForm.password}
                    onChange={(event) =>
                      updatePasswordField("password", event.target.value)
                    }
                    aria-invalid={Boolean(passwordErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((current) => !current)}
                    aria-label={
                      showPasswords
                        ? "Ocultar contraseñas"
                        : "Mostrar contraseñas"
                    }
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
              {passwordForm.password ? (
                <p
                  className={`text-xs font-semibold ${missingRules.length ? "text-[color:var(--text-muted)]" : "text-emerald-600"}`}
                >
                  {missingRules.length
                    ? `Falta: ${missingRules.join(", ")}.`
                    : "La contraseña cumple los requisitos."}
                </p>
              ) : null}
              <Field
                id="confirm-password"
                label="Confirmar contraseña"
                error={passwordErrors.confirmPassword}
              >
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  className={inputClass}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    updatePasswordField("confirmPassword", event.target.value)
                  }
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                />
              </Field>
              <button
                type="submit"
                disabled={passwordState.saving}
                className="theme-accent-solid h-11 w-full rounded-lg text-sm font-bold disabled:opacity-50 dark:rounded-[3px]"
              >
                {passwordState.saving ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          ) : null}
          {passwordState.message ? (
            <p
              role="status"
              className={`border-t border-[color:var(--border)] px-4 py-3 text-xs font-semibold ${passwordState.tone === "error" ? "text-red-500" : "text-emerald-600"}`}
            >
              {passwordState.message}
            </p>
          ) : null}
        </Section>
        <Section
          title="Sesiones activas"
          action={
            otherSessions ? (
              <button
                type="button"
                onClick={closeOtherSessions}
                disabled={sessionsState.closing}
                className="text-[10px] font-black uppercase text-red-500 disabled:opacity-50"
              >
                {sessionsState.closing ? "Cerrando..." : "Cerrar otras"}
              </button>
            ) : null
          }
        >
          {sessionsState.loading ? (
            <OperationLoader
              active
              delayMs={0}
              mode="inline"
              title="Cargando sesiones"
              description="Consultando los dispositivos con acceso activo."
            />
          ) : sessionsState.error ? (
            <div className="p-4">
              <p role="alert" className="text-sm font-semibold text-red-500">
                {sessionsState.error}
              </p>
              <button
                type="button"
                onClick={loadSessions}
                className="mt-3 text-sm font-bold text-[#352018] dark:text-[#e2ff00]"
              >
                Reintentar
              </button>
            </div>
          ) : sessions.length ? (
            sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-[color:var(--text-muted)]">
              No hay sesiones activas.
            </p>
          )}
        </Section>
      </main>
    );
  }

  if (view === "locations" && locationDraft) {
    return (
      <main className="settings-shell profile-reference-shell mx-auto w-full max-w-2xl space-y-5 pb-28">
        <ProfilePageHeader title="Lugares de entrenamiento" onBack={goBack} />
        <BackButton onClick={goBack} />
        <div className="hidden md:block">
          <h1 className="text-3xl font-black uppercase leading-none text-[color:var(--text)]">
            Lugares de entrenamiento
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Decide cuándo debe aparecer la selección de sede.
          </p>
        </div>
        <Section title="Cómo entrenas">
          {locationModes.map((mode) => {
            const selected = locationDraft.locationMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() =>
                  setLocationDraft((current) => ({
                    ...current,
                    locationMode: mode.id,
                    allowedBranches:
                      mode.id === "multiple"
                        ? branchOptions.map((option) => option.id)
                        : mode.id === "single"
                          ? [current.branch]
                          : [],
                  }))
                }
                aria-pressed={selected}
                className={`flex w-full items-start gap-3 border-b border-[color:var(--border)] p-4 text-left last:border-b-0 ${selected ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : ""}`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-current bg-transparent text-current" : "border-[color:var(--border)]"}`}
                >
                  {selected ? <Check className="h-3 w-3" /> : null}
                </span>
                <span>
                  <span
                    className={`block text-sm font-bold ${selected ? "text-current" : "text-[color:var(--text)]"}`}
                  >
                    {mode.title}
                  </span>
                  <span
                    className={`mt-1 block text-xs leading-5 ${selected ? "text-current/80" : "text-[color:var(--text-muted)]"}`}
                  >
                    {mode.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </Section>
        {locationDraft.locationMode !== "disabled" ? (
          <Section
            title={
              locationDraft.locationMode === "single"
                ? "Gimnasio habitual"
                : "Sedes incluidas"
            }
          >
            {branchOptions.map((option) => {
              const selected =
                locationDraft.locationMode === "multiple" ||
                locationDraft.branch === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={locationDraft.locationMode === "multiple"}
                  onClick={() =>
                    setLocationDraft((current) => ({
                      ...current,
                      branch: option.id,
                      allowedBranches: [option.id],
                    }))
                  }
                  aria-pressed={selected}
                  className={`flex min-h-16 w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 text-left last:border-b-0 ${selected ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]" : ""} disabled:cursor-default`}
                >
                  <Building2
                    className={`h-5 w-5 ${selected ? "text-current" : "text-[#352018] dark:text-[#e2ff00]"}`}
                  />
                  <span className="flex-1">
                    <span
                      className={`block text-sm font-bold ${selected ? "text-current" : "text-[color:var(--text)]"}`}
                    >
                      {option.label}
                    </span>
                    <span
                      className={`text-xs ${selected ? "text-current/80" : "text-[color:var(--text-muted)]"}`}
                    >
                      {option.detail}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 text-current" /> : null}
                </button>
              );
            })}
          </Section>
        ) : null}
        <div className="sticky bottom-20 rounded-lg bg-[color:var(--bg)]/95 py-2 backdrop-blur md:bottom-4">
          <button
            type="button"
            onClick={saveLocations}
            disabled={!hasLocationChanges || locationState.saving}
            className="theme-accent-solid h-12 w-full rounded-lg text-sm font-bold disabled:opacity-50 dark:rounded-[3px]"
          >
            {locationState.saving ? "Guardando..." : "Guardar configuración"}
          </button>
          {locationState.message ? (
            <p
              role="status"
              className={`mt-2 text-center text-xs font-semibold ${locationState.tone === "error" ? "text-red-500" : "text-emerald-600"}`}
            >
              {locationState.message}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="settings-shell profile-reference-shell mx-auto w-full max-w-md pb-28 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl 2xl:max-w-[1280px]">
      <ProfilePageHeader
        title="Perfil"
        variant="main"
      />
      <div className="mb-7 hidden md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
          Cuenta
        </p>
        <h1 className="mt-1 font-sans text-3xl font-semibold text-[color:var(--text)]">
          Perfil y ajustes
        </h1>
      </div>
      <div className="grid gap-5 px-[6px] md:px-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-7">
      <div className="min-w-0">
        <ProfileHero
          user={user}
          avatarUrl={avatarUrl}
          stats={stats}
          onChangePhoto={openPersonalPhoto}
        />
        {summaryError ? (
          <div className="mt-3 text-center">
            <p className="text-xs font-semibold text-red-500">{summaryError}</p>
            <button
              type="button"
              onClick={loadSummary}
              className="mt-1 text-xs font-bold text-[#352018] dark:text-[#e2ff00]"
            >
              Reintentar resumen
            </button>
          </div>
        ) : null}
      </div>
      <div className="min-w-0 space-y-5">
        <Section title="General">
          <SettingsRow
            title="Tema"
            value={isDark ? "Oscuro" : "Claro"}
            onClick={toggleTheme}
          />
          <SettingsSelectRow
            title="Idioma de ejercicios"
            value={profile.language || "es"}
            onChange={handleLanguageChange}
            disabled={languageSaving}
          />
        </Section>
        <Section title="Datos personales">
          <SettingsRow
            title="Nombre"
            value={user?.name || "Completar"}
            onClick={openPersonal}
          />
          <SettingsRow
            title="Correo electrónico"
            value={user?.email || "Completar"}
            onClick={openPersonal}
          />
          <SettingsRow
            title="Fecha de nacimiento"
            value={formatProfileDate(profile.birthDate)}
            onClick={openPersonal}
          />
          <SettingsRow
            title="Altura"
            value={profile.height ? `${profile.height} cm` : "Completar"}
            onClick={openPersonal}
          />
          <SettingsRow
            title="Peso actual"
            value={profile.weight ? `${profile.weight} kg` : "Completar"}
            onClick={openPersonal}
          />
        </Section>
        <p className="px-5 font-sans text-sm leading-5 text-[color:var(--text-subtle)]">
          Estos datos nos ayudan a personalizar tus métricas y estimaciones de
          entrenamiento.
        </p>
        {user?.role === "Cliente" ? (
          <Section title="Acompañamiento">
            {coachRelationship.loading ? (
              <p className="px-4 py-5 text-sm font-semibold text-[color:var(--text-muted)]">
                Consultando tu modalidad de entrenamiento...
              </p>
            ) : (
              <div>
                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text)]">
                    {coachRelationship.connected ? (
                      <UserRoundCheck className="h-5 w-5" />
                    ) : (
                      <Link2 className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[15px] font-semibold text-[color:var(--text)]">
                      {coachRelationship.connected
                        ? coachRelationship.coach?.name
                        : "Entrenamiento independiente"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                      {coachRelationship.connected
                        ? `${coachRelationship.coach?.email} · Tu coach puede asignarte planes y supervisar tus sesiones.`
                        : "Tu cuenta beta inicia con permisos basicos y control de tus propias rutinas. Vincula un coach solo si decides trabajar con uno."}
                    </p>
                  </div>
                  {coachRelationship.connected ? (
                    <span className="shrink-0 rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1 text-[9px] font-semibold uppercase text-[color:var(--text-muted)]">
                      Con coach
                    </span>
                  ) : null}
                </div>
                <form
                  onSubmit={connectToCoach}
                  className="grid gap-2 border-t border-[color:var(--detail-row-divider)] p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <label className="min-w-0">
                    <span className="sr-only">Codigo de coach</span>
                    <input
                      value={coachCode}
                      onChange={(event) =>
                        setCoachCode(event.target.value.toUpperCase())
                      }
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={13}
                      placeholder={
                        coachRelationship.connected
                          ? "Codigo de otro coach"
                          : "Codigo del coach · APEX-XXXXXXXX"
                      }
                      className={`${inputClass} font-mono uppercase`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={coachSaving || !coachCode.trim()}
                    className="theme-accent-solid h-11 px-4 text-xs font-black uppercase disabled:opacity-50"
                  >
                    {coachSaving
                      ? "Vinculando..."
                      : coachRelationship.connected
                        ? "Cambiar coach"
                        : "Vincular coach"}
                  </button>
                </form>
                {coachRelationship.connected ? (
                  <button
                    type="button"
                    onClick={disconnectFromCoach}
                    disabled={coachSaving}
                    className="flex h-12 w-full items-center justify-center gap-2 border-t border-[color:var(--detail-row-divider)] text-xs font-semibold uppercase text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] disabled:opacity-50"
                  >
                    <Unlink className="h-4 w-4" />
                    Entrenar sin coach
                  </button>
                ) : null}
              </div>
            )}
          </Section>
        ) : null}
        <Section title="Entrenamiento">
          <SettingsRow
            title="Lugares de entrenamiento"
            value={locationSummary}
            onClick={openLocations}
          />
        </Section>
        <Section title="Cuenta y seguridad">
          <SettingsRow
            title="Contraseña y sesiones"
            onClick={() => navigateView("security")}
          />
          <SettingsRow
            title="Plan y suscripción"
            onClick={() => onNavigate?.("planes")}
          />
        </Section>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] border border-[color:var(--detail-module-border)] bg-[color:var(--card)] font-sans text-sm font-semibold text-[color:var(--danger)] shadow-xs transition-colors hover:bg-[color:var(--danger-soft)]"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
        <p className="text-center text-xs text-[color:var(--text-muted)]">
          Apex Performance
        </p>
      </div>
      </div>
    </main>
  );
}
