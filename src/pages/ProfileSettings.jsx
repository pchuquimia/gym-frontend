import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MapPin,
  Monitor,
  Palette,
  Save,
  Smartphone,
  Tablet,
  Upload,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { useUserProfile } from "../context/UserContext";
import { useThemeMode } from "../hooks/useThemeMode";
import { api } from "../services/api";
import { buildCloudinaryUrl } from "../utils/cloudinary";
import { toast } from "sonner";
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

const roleLabels = {
  Admin: "Administrador",
  Entrenador: "Entrenador",
  Cliente: "Atleta",
};

const goalLabels = {
  volumen: "Volumen",
  mantenimiento: "Mantenimiento",
  definicion: "Definición",
};

const inputClass =
  "h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold text-[color:var(--text)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15 disabled:opacity-60";

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
        className="block text-[10px] font-bold uppercase text-[color:var(--text-muted)]"
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
      <div className="flex min-h-6 items-center justify-between gap-3 px-1">
        <h2 className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm">
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
      className="flex min-h-16 w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 text-left transition last:border-b-0 hover:bg-[color:var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10">
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-200" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[color:var(--text)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="text-xs font-semibold text-[color:var(--text-muted)]">
          {value}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
    </button>
  );
}

function ProfileHero({ user, profile, avatarUrl, stats }) {
  return (
    <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-6 text-center shadow-sm lg:sticky lg:top-6">
      <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-blue-200 bg-[color:var(--bg)] text-2xl font-black text-blue-700 dark:text-blue-100">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Foto de ${user?.name || "perfil"}`}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(user?.name)
        )}
      </div>
      <h1 className="mt-4 text-xl font-black text-[color:var(--text)]">
        {user?.name || "Usuario"}
      </h1>
      <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">
        {roleLabels[user?.role] || user?.role || "Cuenta"}
        {profile?.goal ? ` · ${goalLabels[profile.goal] || profile.goal}` : ""}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat value={stats.workouts} label="Entrenamientos" />
        <Stat value={stats.streak} label="Racha actual" />
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3 text-center">
      <p className="text-2xl font-black leading-none text-blue-700 dark:text-blue-100">
        {value ?? "--"}
      </p>
      <p className="mt-1.5 text-[9px] font-black uppercase text-[color:var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--card)]"
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
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-200" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-[color:var(--text)]">
            {session.device || "Dispositivo"}
          </p>
          {session.current ? (
            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-600 dark:text-blue-200">
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
  const { user, logout, updateAccount, developmentAdminMode } = useAuth();
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
      { profileView: nextView },
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

  if (profileLoading) {
    return (
      <main className="mx-auto grid min-h-[50vh] max-w-5xl place-items-center">
        <p role="status" className="text-sm text-[color:var(--text-muted)]">
          Cargando perfil...
        </p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-lg py-12 text-center">
        <p role="alert" className="text-sm font-semibold text-red-500">
          {profileError || "No se pudo cargar el perfil."}
        </p>
        <button
          type="button"
          onClick={refreshProfile}
          className="mt-4 h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
        >
          Reintentar
        </button>
      </main>
    );
  }

  if (view === "personal" && personalDraft) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-5 pb-28">
        <BackButton onClick={goBack} />
        <div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">
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
                  className={`grid aspect-square place-items-center rounded-lg border text-lg font-black ${!personalDraft.avatarPhotoId ? "border-blue-500 bg-blue-500/10" : "border-[color:var(--border)] bg-[color:var(--bg)]"}`}
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
                      className={`aspect-square overflow-hidden rounded-lg border ${personalDraft.avatarPhotoId === id ? "border-blue-500 ring-2 ring-blue-500/20" : "border-[color:var(--border)]"}`}
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"
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
      <main className="mx-auto w-full max-w-3xl space-y-5 pb-28">
        <BackButton onClick={goBack} />
        <div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">
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
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-200" />
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
                className="h-11 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-50"
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
            <p
              role="status"
              className="px-4 py-6 text-sm text-[color:var(--text-muted)]"
            >
              Cargando sesiones...
            </p>
          ) : sessionsState.error ? (
            <div className="p-4">
              <p role="alert" className="text-sm font-semibold text-red-500">
                {sessionsState.error}
              </p>
              <button
                type="button"
                onClick={loadSessions}
                className="mt-3 text-sm font-bold text-blue-600"
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
      <main className="mx-auto w-full max-w-2xl space-y-5 pb-28">
        <BackButton onClick={goBack} />
        <div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">
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
                className={`flex w-full items-start gap-3 border-b border-[color:var(--border)] p-4 text-left last:border-b-0 ${selected ? "bg-blue-500/10" : ""}`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-blue-500 bg-blue-500 text-white" : "border-[color:var(--border)]"}`}
                >
                  {selected ? <Check className="h-3 w-3" /> : null}
                </span>
                <span>
                  <span className="block text-sm font-bold text-[color:var(--text)]">
                    {mode.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[color:var(--text-muted)]">
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
                  className={`flex min-h-16 w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 text-left last:border-b-0 ${selected ? "bg-emerald-500/10" : ""} disabled:cursor-default`}
                >
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[color:var(--text)]">
                      {option.label}
                    </span>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {option.detail}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : null}
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
            className="h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-50"
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
    <main className="mx-auto grid w-full max-w-7xl gap-6 pb-28 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div>
        <ProfileHero
          user={user}
          profile={profile}
          avatarUrl={avatarUrl}
          stats={stats}
        />
        {summaryError ? (
          <div className="mt-3 text-center">
            <p className="text-xs font-semibold text-red-500">{summaryError}</p>
            <button
              type="button"
              onClick={loadSummary}
              className="mt-1 text-xs font-bold text-blue-600"
            >
              Reintentar resumen
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-6">
        <Section title="Cuenta">
          <SettingsRow
            icon={User}
            title="Información personal"
            subtitle="Identidad, medidas y foto de perfil"
            onClick={openPersonal}
          />
          <SettingsRow
            icon={Lock}
            title="Contraseña y sesiones"
            subtitle="Acceso y dispositivos conectados"
            onClick={() => navigateView("security")}
          />
        </Section>
        <Section title="Entrenamiento">
          <SettingsRow
            icon={MapPin}
            title="Lugares de entrenamiento"
            subtitle="Cómo utilizar sedes en rutinas y sesiones"
            value={locationSummary}
            onClick={openLocations}
          />
        </Section>
        <Section title="Apariencia">
          <SettingsRow
            icon={Palette}
            title="Tema"
            subtitle="Cambia la apariencia de la aplicación"
            value={isDark ? "Oscuro" : "Claro"}
            onClick={toggleTheme}
          />
        </Section>
        <button
          type="button"
          onClick={handleLogout}
          disabled={developmentAdminMode}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg border text-sm font-bold ${
            developmentAdminMode
              ? "cursor-not-allowed border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"
              : "border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10"
          }`}
        >
          <LogOut className="h-4 w-4" />
          {developmentAdminMode ? "Admin de desarrollo" : "Cerrar sesión"}
        </button>
        <p className="text-center text-xs text-[color:var(--text-muted)]">
          Apex Performance
        </p>
      </div>
    </main>
  );
}
