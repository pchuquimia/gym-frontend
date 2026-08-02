import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Bell,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  MoreVertical,
  Shield,
  Smartphone,
  Sun,
  Tablet,
  Trophy,
  User,
  Users,
  WalletCards,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { useUserProfile } from "../context/UserContext";
import { useThemeMode } from "../hooks/useThemeMode";
import { api } from "../services/api";
import { buildCloudinaryUrl } from "../utils/cloudinary";

const goalLabel = {
  volumen: "Volumen",
  mantenimiento: "Miembro elite",
  definicion: "Definicion",
};

const defaultNotifications = {
  workoutReminders: true,
  achievements: true,
  community: false,
};

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

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function calcStreak(trainings = []) {
  const dates = new Set(
    trainings
      .map((training) =>
        (training.date || training.createdAt || "").slice(0, 10),
      )
      .filter(Boolean),
  );
  if (!dates.size) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getPhotoUrl(photo) {
  if (!photo) return "";
  if (photo.publicId) {
    return buildCloudinaryUrl(photo.publicId, {
      width: 180,
      height: 180,
      crop: "fill",
      gravity: "face",
    });
  }
  return photo.url || "";
}

function formatSessionTime(value) {
  if (!value) return "Sin actividad";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 2) return "Activo ahora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} d`;
}

function ProfileHero({ user, profile, avatarUrl, stats, large = false }) {
  return (
    <section
      className={`rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-center shadow-sm ${
        large ? "px-5 py-6" : "px-4 py-5"
      }`}
    >
      <div className={`relative mx-auto ${large ? "h-24 w-24" : "h-20 w-20"}`}>
        <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-4 border-blue-200 bg-[color:var(--bg)] text-2xl font-black text-blue-700 shadow-sm dark:text-blue-100">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || "Perfil"}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(user?.name)
          )}
        </div>
        <span className="absolute -bottom-1 -right-2 rounded-full bg-emerald-400 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-950 shadow-sm">
          Elite
        </span>
      </div>

      <h2 className="mt-4 text-xl font-black text-[color:var(--text)]">
        {user?.name || "Usuario"}
      </h2>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-emerald-400">
        {goalLabel[profile?.goal] || "Miembro activo"}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatBox value={stats.workouts} label="Entrenamientos" />
        <StatBox value={stats.streak} label="Dias seguidos" />
      </div>
    </section>
  );
}

function StatBox({ value, label }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3 text-center shadow-sm">
      <p className="text-2xl font-black leading-none text-blue-700 dark:text-blue-100">
        {value}
      </p>
      <p className="mt-1.5 text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function Section({ title, children, compact = false, action }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          {title}
        </h2>
        {action}
      </div>
      <div
        className={`rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm ${
          compact ? "overflow-hidden" : "p-3"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ icon: Icon, title, subtitle, value, action, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[56px] w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[color:var(--bg)]/60 active:bg-[color:var(--bg)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-blue-200" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--text)]">
          {title}
        </p>
        {subtitle ? (
          <p className="truncate text-[10px] font-medium text-emerald-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ||
        (value ? (
          <span className="text-sm text-[color:var(--text-muted)]">
            {value}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-[color:var(--text-muted)]" />
        ))}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[9px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function inputClass(readOnly = false) {
  return `h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold text-[color:var(--text)] outline-none transition focus:border-blue-400 ${
    readOnly ? "cursor-default opacity-90" : ""
  }`;
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-blue-300" : "bg-[color:var(--bg)]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NotificationRow({ icon: Icon, label, checked, onChange }) {
  return (
    <div className="flex min-h-[48px] items-center gap-3 border-b border-[color:var(--border)] px-1 py-2 last:border-b-0">
      <Icon className="h-4 w-4 shrink-0 text-blue-200" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--text)]">
        {label}
      </p>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SecurityRow({ icon: Icon, title, subtitle, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[82px] w-full items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4 text-left shadow-sm"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[color:var(--bg)]">
        <Icon className="h-5 w-5 text-blue-200" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-[color:var(--text)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-1 block text-sm font-semibold leading-tight text-[color:var(--text-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {children || (
        <ChevronRight className="h-5 w-5 text-[color:var(--text-muted)]" />
      )}
    </button>
  );
}

function SessionIcon({ device = "" }) {
  const lower = device.toLowerCase();
  if (lower.includes("ipad") || lower.includes("tablet")) return Tablet;
  if (lower.includes("iphone") || lower.includes("android")) return Smartphone;
  return Monitor;
}

function SessionRow({ session }) {
  const Icon = SessionIcon(session.device);
  return (
    <div className="flex min-h-[88px] items-center gap-4 border-b border-[color:var(--border)] px-5 py-4 last:border-b-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[color:var(--bg)]">
        <Icon className="h-5 w-5 text-blue-200" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-black text-[color:var(--text)]">
            {session.device || "Dispositivo"}
          </p>
          {session.current ? (
            <span className="rounded-full bg-blue-300/20 px-2 py-0.5 text-[9px] font-black uppercase text-blue-100">
              Actual
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
          {session.browser || "App"}
          {session.os ? ` en ${session.os}` : ""} ·{" "}
          {session.current
            ? "Activo ahora"
            : formatSessionTime(session.lastSeenAt)}
        </p>
      </div>
      {!session.current ? (
        <MoreVertical className="h-5 w-5 text-[color:var(--text-muted)]" />
      ) : null}
    </div>
  );
}

function ProfileSettings({ onNavigate }) {
  const { user, logout } = useAuth();
  const {
    trainings = [],
    photos = [],
    branch,
    locationMode,
    allowedBranches,
    saveLocationPreferences,
  } = useTrainingData();
  const { profile, security, updateProfile, updateSecurity } = useUserProfile();
  const { isDark, toggleTheme } = useThemeMode();
  const [view, setView] = useState("settings");
  const [sessions, setSessions] = useState([]);
  const [passwordChangedAt, setPasswordChangedAt] = useState(
    user?.passwordChangedAt || "",
  );
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [locationDraft, setLocationDraft] = useState({
    locationMode: locationMode || "single",
    branch: branch || "sopocachi",
    allowedBranches: allowedBranches?.length
      ? allowedBranches
      : [branch || "sopocachi"],
  });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const notifications = {
    ...defaultNotifications,
    ...(profile?.notifications || {}),
  };
  const privacy = profile?.privacy || "público";

  const stats = useMemo(
    () => ({
      workouts: trainings.length,
      streak: calcStreak(trainings),
    }),
    [trainings],
  );

  const avatarUrl = useMemo(() => {
    const latestPhoto = [...photos]
      .filter((photo) => photo?.url || photo?.publicId)
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt || 0).getTime() -
          new Date(a.date || a.createdAt || 0).getTime(),
      )[0];
    return getPhotoUrl(latestPhoto);
  }, [photos]);

  useEffect(() => {
    if (view !== "security") return;
    let alive = true;
    api.getAuthSessions().then((data) => {
      if (alive) setSessions(data.sessions || []);
    });
    return () => {
      alive = false;
    };
  }, [view]);

  const updateDraft = (field, value) => {
    updateProfile({ [field]: value });
  };

  const updateNotification = (key) => {
    updateProfile({
      notifications: {
        ...notifications,
        [key]: !notifications[key],
      },
    });
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    try {
      const data = await api.changePassword(passwordForm);
      setPasswordForm({
        currentPassword: "",
        password: "",
        confirmPassword: "",
      });
      setPasswordChangedAt(data.passwordChangedAt || new Date().toISOString());
      setShowPasswordForm(false);
      setPasswordMessage("Contraseña actualizada correctamente.");
    } catch (err) {
      setPasswordMessage(err.message || "No se pudo actualizar la contraseña.");
    }
  };

  const handleLogoutAll = async () => {
    await api.logoutAllSessions();
    const data = await api.getAuthSessions();
    setSessions(data.sessions || []);
  };

  const handleLogout = async () => {
    await logout();
    onNavigate?.("login");
  };

  const openLocationSettings = () => {
    setLocationDraft({
      locationMode: locationMode || "single",
      branch: branch || "sopocachi",
      allowedBranches:
        locationMode === "multiple"
          ? allowedBranches?.length
            ? allowedBranches
            : branchOptions.map((option) => option.id)
          : [branch || "sopocachi"],
    });
    setLocationMessage("");
    setView("locations");
  };

  const selectLocationMode = (nextMode) => {
    setLocationMessage("");
    setLocationDraft((current) => ({
      ...current,
      locationMode: nextMode,
      allowedBranches:
        nextMode === "multiple"
          ? branchOptions.map((option) => option.id)
          : nextMode === "single"
            ? [current.branch]
            : [],
    }));
  };

  const toggleAllowedBranch = (branchId) => {
    setLocationMessage("");
    setLocationDraft((current) => {
      const exists = current.allowedBranches.includes(branchId);
      if (exists && current.allowedBranches.length <= 2) return current;
      return {
        ...current,
        allowedBranches: exists
          ? current.allowedBranches.filter((item) => item !== branchId)
          : [...current.allowedBranches, branchId],
      };
    });
  };

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    setLocationMessage("");
    try {
      await saveLocationPreferences(locationDraft);
      setLocationMessage("Configuración guardada.");
    } catch (error) {
      setLocationMessage(
        error?.message || "No se pudo guardar la configuración.",
      );
    } finally {
      setSavingLocation(false);
    }
  };

  const locationSummary =
    locationMode === "disabled"
      ? "Ubicación desactivada"
      : locationMode === "multiple"
        ? `${allowedBranches?.length || 2} sedes`
        : `Gimnasio habitual: ${
            branchOptions.find((option) => option.id === branch)?.label ||
            "Sopocachi"
          }`;

  if (view === "locations") {
    return (
      <main className="mx-auto w-full max-w-md space-y-6 pb-28">
        <button
          type="button"
          onClick={() => setView("settings")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Ajustes
        </button>

        <div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">
            Lugares de entrenamiento
          </h1>
          <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
            Decide cuándo debe aparecer la selección de sede.
          </p>
        </div>

        <section className="space-y-2.5">
          <h2 className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Cómo entrenas
          </h2>
          <div className="space-y-2">
            {locationModes.map((mode) => {
              const selected = locationDraft.locationMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => selectLocationMode(mode.id)}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                    selected
                      ? "border-blue-400 bg-blue-500/10"
                      : "border-[color:var(--border)] bg-[color:var(--bg)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      selected
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-[color:var(--border)]"
                    }`}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-[color:var(--text)]">
                      {mode.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-[color:var(--text-muted)]">
                      {mode.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {locationDraft.locationMode !== "disabled" ? (
          <section className="space-y-2.5">
            <h2 className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              {locationDraft.locationMode === "single"
                ? "Gimnasio habitual"
                : "Sedes disponibles"}
            </h2>
            <div className="space-y-2">
              {branchOptions.map((option) => {
                const selected =
                  locationDraft.locationMode === "single"
                    ? locationDraft.branch === option.id
                    : locationDraft.allowedBranches.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      locationDraft.locationMode === "single"
                        ? setLocationDraft((current) => ({
                            ...current,
                            branch: option.id,
                            allowedBranches: [option.id],
                          }))
                        : toggleAllowedBranch(option.id)
                    }
                    aria-pressed={selected}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                      selected
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-[color:var(--border)] bg-[color:var(--bg)]"
                    }`}
                  >
                    <Building2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[color:var(--text)]">
                        {option.label}
                      </span>
                      <span className="block text-xs text-[color:var(--text-muted)]">
                        {option.detail}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={handleSaveLocation}
          disabled={savingLocation}
          className="h-12 w-full rounded-lg bg-blue-600 text-sm font-black text-white disabled:opacity-60"
        >
          {savingLocation ? "Guardando..." : "Guardar configuración"}
        </button>
        {locationMessage ? (
          <p className="text-center text-xs font-semibold text-[color:var(--text-muted)]">
            {locationMessage}
          </p>
        ) : null}
      </main>
    );
  }

  if (view === "security") {
    return (
      <main className="mx-auto w-full max-w-md space-y-6 pb-28">
        <button
          type="button"
          onClick={() => setView("settings")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Ajustes
        </button>

        <Section title="Contraseña">
          <SecurityRow
            icon={Lock}
            title="Cambiar contraseña"
            subtitle={
              passwordChangedAt
                ? `Actualizada ${formatSessionTime(passwordChangedAt)} atrás`
                : "Protege tu cuenta con una clave segura"
            }
            onClick={() => setShowPasswordForm((prev) => !prev)}
          />
          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="mt-3 space-y-3">
              <Field label="Contraseña actual">
                <input
                  type="password"
                  className={inputClass()}
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Nueva contraseña">
                <input
                  type="password"
                  className={inputClass()}
                  value={passwordForm.password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Confirmar contraseña">
                <input
                  type="password"
                  className={inputClass()}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </Field>
              <button
                type="submit"
                className="h-11 w-full rounded-lg bg-blue-600 text-sm font-black text-white"
              >
                Guardar contraseña
              </button>
            </form>
          ) : null}
          {passwordMessage ? (
            <p className="mt-3 text-xs font-semibold text-[color:var(--text-muted)]">
              {passwordMessage}
            </p>
          ) : null}
        </Section>

        <Section title="Seguridad biométrica">
          <SecurityRow icon={KeyRound} title="Face ID / Huella">
            <Toggle
              checked={security?.biometricEnabled}
              onChange={() =>
                updateSecurity({
                  biometricEnabled: !security?.biometricEnabled,
                })
              }
            />
          </SecurityRow>
        </Section>

        <Section title="Autenticación">
          <SecurityRow
            icon={Shield}
            title="Verificación en dos pasos"
            subtitle="Agrega una capa extra de seguridad al iniciar sesión"
          >
            <Toggle
              checked={security?.twoFactorEnabled}
              onChange={() =>
                updateSecurity({
                  twoFactorEnabled: !security?.twoFactorEnabled,
                })
              }
            />
          </SecurityRow>
        </Section>

        <Section
          title="Sesiones activas"
          compact
          action={
            <button
              type="button"
              onClick={handleLogoutAll}
              className="text-[10px] font-black uppercase tracking-wide text-red-300"
            >
              Cerrar todas
            </button>
          }
        >
          {sessions.length ? (
            sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          ) : (
            <p className="px-5 py-6 text-sm font-semibold text-[color:var(--text-muted)]">
              No hay sesiones registradas.
            </p>
          )}
        </Section>
      </main>
    );
  }

  if (view === "personal") {
    return (
      <main className="mx-auto w-full max-w-md space-y-6 pb-28">
        <button
          type="button"
          onClick={() => setView("settings")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Ajustes
        </button>

        <ProfileHero
          user={user}
          profile={profile}
          avatarUrl={avatarUrl}
          stats={stats}
        />

        <Section title="Información personal">
          <div className="space-y-3">
            <Field label="Nombre completo">
              <input
                className={inputClass(true)}
                value={user?.name || ""}
                readOnly
              />
            </Field>

            <Field label="Correo electrónico">
              <input
                className={inputClass(true)}
                value={user?.email || ""}
                readOnly
              />
            </Field>

            <Field label="Fecha de nacimiento">
              <input
                type="date"
                className={inputClass()}
                value={profile?.birthDate || ""}
                onChange={(event) =>
                  updateDraft("birthDate", event.target.value)
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Peso (kg)">
                <input
                  type="number"
                  inputMode="decimal"
                  className={inputClass()}
                  value={profile?.weight ?? ""}
                  onChange={(event) =>
                    updateDraft("weight", Number(event.target.value) || "")
                  }
                />
              </Field>

              <Field label="Altura (cm)">
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass()}
                  value={profile?.height ?? ""}
                  onChange={(event) =>
                    updateDraft("height", Number(event.target.value) || "")
                  }
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Notificaciones">
          <NotificationRow
            icon={AlarmClock}
            label="Recordatorios de entreno"
            checked={notifications.workoutReminders}
            onChange={() => updateNotification("workoutReminders")}
          />
          <NotificationRow
            icon={Trophy}
            label="Logros y medallas"
            checked={notifications.achievements}
            onChange={() => updateNotification("achievements")}
          />
          <NotificationRow
            icon={Users}
            label="Actualizaciones de comunidad"
            checked={notifications.community}
            onChange={() => updateNotification("community")}
          />
        </Section>

        <Section title="Privacidad">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 shrink-0 text-blue-200" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Visibilidad del perfil
              </p>
              <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                Quien puede ver tus estadísticas.
              </p>
            </div>
            <div className="grid grid-cols-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-1">
              {["público", "privado"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateDraft("privacy", option)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-black capitalize transition-colors ${
                    privacy === option
                      ? "bg-blue-300 text-blue-950"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 active:bg-red-500/15"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>

        <p className="pb-4 text-center text-sm text-[color:var(--text-muted)]/70">
          Apex Performance v2.4.1
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-6 pb-28">
      <ProfileHero
        user={user}
        profile={profile}
        avatarUrl={avatarUrl}
        stats={stats}
        large
      />

      <Section title="Cuenta" compact>
        <SettingsRow
          icon={User}
          title="Información personal"
          onClick={() => setView("personal")}
        />
        <SettingsRow
          icon={Lock}
          title="Contraseña y seguridad"
          onClick={() => setView("security")}
        />
        <SettingsRow
          icon={WalletCards}
          title="Suscripción"
          subtitle="Apex Premium activo"
        />
      </Section>

      <Section title="Configuración" compact>
        <SettingsRow
          icon={MapPin}
          title="Lugares de entrenamiento"
          subtitle={locationSummary}
          onClick={openLocationSettings}
        />
        <SettingsRow icon={Bell} title="Notificaciones" />
        <SettingsRow
          icon={Moon}
          title="Tema"
          onClick={toggleTheme}
          action={
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]">
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </span>
          }
        />
        <SettingsRow icon={Shield} title="Privacidad" />
      </Section>

      <Section title="Soporte" compact>
        <SettingsRow icon={HelpCircle} title="Centro de ayuda" />
        <SettingsRow icon={Mail} title="Contáctanos" />
        <SettingsRow icon={Info} title="Acerca de" />
      </Section>

      <button
        type="button"
        onClick={handleLogout}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 active:bg-red-500/15"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>

      <p className="pb-4 text-center text-sm text-[color:var(--text-muted)]/70">
        Apex Performance v2.4.1
      </p>
    </main>
  );
}

export default ProfileSettings;
