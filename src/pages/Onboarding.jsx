import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Dumbbell,
  Flame,
  LogOut,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import OperationLoader from "../components/system/OperationLoader";
import { normalizeUsername, validateUsername } from "../utils/authValidation";
import { api } from "../services/api";

const DRAFT_KEY = "rirfit_onboarding_draft";
const LEGACY_DRAFT_KEY = "apex_onboarding_draft";

const goals = [
  {
    id: "volumen",
    title: "Ganar masa",
    detail: "Prioriza hipertrofia y progresion de carga.",
    icon: Dumbbell,
  },
  {
    id: "mantenimiento",
    title: "Mantenerme",
    detail: "Equilibra rendimiento, salud y composicion.",
    icon: ShieldCheck,
  },
  {
    id: "definicion",
    title: "Definicion",
    detail: "Conserva fuerza mientras reduces grasa.",
    icon: Flame,
  },
];

const levels = [
  { id: "beginner", title: "Principiante", detail: "Menos de 1 ano" },
  { id: "intermediate", title: "Intermedio", detail: "1 a 3 anos" },
  { id: "advanced", title: "Avanzado", detail: "Mas de 3 anos" },
];

const accountTypes = [
  {
    id: "athlete",
    title: "Entreno para mí",
    detail: "Organiza tus rutinas y registra tu progreso.",
    icon: UserRound,
  },
  {
    id: "coach",
    title: "Soy entrenador/a",
    detail: "Planifica, acompana y revisa el progreso de tus alumnos.",
    icon: BriefcaseBusiness,
  },
];

const readDraft = (
  profile = {},
  accountName = "",
  accountUsername = "",
  intakeCoachId = "",
) => {
  const initialDraft = {
    name: accountName && accountName !== "Atleta" ? accountName : "",
    username: accountUsername || "",
    goal: profile.goal || "mantenimiento",
    experienceLevel: profile.experienceLevel || "beginner",
    weeklyFrequency: Number(profile.weeklyFrequency || 3),
    weight: profile.weight || "",
    height: profile.height || "",
    healthNotes: profile.healthNotes || "",
    intakeAnswers: {},
    intakeCoachId,
  };
  try {
    const currentDraft = window.localStorage.getItem(DRAFT_KEY);
    const legacyDraft = window.localStorage.getItem(LEGACY_DRAFT_KEY);
    const stored = JSON.parse(currentDraft || legacyDraft || "null");
    if (!currentDraft && legacyDraft) {
      window.localStorage.setItem(DRAFT_KEY, legacyDraft);
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
    }
    if (stored) {
      return {
        ...initialDraft,
        ...stored,
        intakeAnswers:
          String(stored.intakeCoachId || "") === String(intakeCoachId || "")
            ? stored.intakeAnswers || {}
            : {},
        intakeCoachId,
      };
    }
  } catch {
    // Start from the server profile if the local draft is unreadable.
  }
  return initialDraft;
};

function ChoiceCard({ selected, icon: Icon, title, detail, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-24 w-full items-center gap-3 border p-4 text-left transition ${
        selected
          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
          : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[#181918]/50 dark:hover:border-[#e2ff00]/50"
      }`}
    >
      {Icon ? (
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center ${
            selected
              ? "border border-current bg-transparent text-current"
              : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-black uppercase ${
            selected ? "text-current" : "text-[color:var(--text)]"
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-1 block text-xs font-semibold ${
            selected ? "text-current/80" : "text-[color:var(--text-muted)]"
          }`}
        >
          {detail}
        </span>
      </span>
      {selected ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current bg-transparent text-current">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </button>
  );
}

function AccountTypeChoice({ selected, icon: Icon, title, detail, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`group flex min-h-[92px] w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left transition duration-300 sm:px-5 ${
        selected
          ? "border-[color:var(--text)] bg-[color:var(--text)] text-[color:var(--bg)] shadow-[0_18px_44px_rgba(0,0,0,0.12)]"
          : "border-[color:var(--border)] bg-[color:var(--card)] hover:-translate-y-0.5 hover:border-[color:var(--text)]"
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition ${
          selected
            ? "border-current/30 bg-current/10"
            : "border-[color:var(--border)] bg-[color:var(--bg)]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold tracking-[-0.02em]">
          {title}
        </span>
        <span
          className={`mt-1 block text-sm font-normal leading-5 ${
            selected ? "text-current/70" : "text-[color:var(--text-muted)]"
          }`}
        >
          {detail}
        </span>
      </span>
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
          selected
            ? "border-current/30 bg-[color:var(--bg)] text-[color:var(--text)]"
            : "border-[color:var(--border)]"
        }`}
      >
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

export default function Onboarding({ onNavigate = () => {} }) {
  const {
    user,
    completeOnboarding,
    completeCoachOnboarding,
    selectOnboardingAccountType,
    logout,
  } = useAuth();
  const isManagedAthlete =
    user?.role === "Cliente" && user?.trainingMode === "coach_managed";
  const initialAccountType =
    user?.onboarding?.accountType || (isManagedAthlete ? "athlete" : "");
  const [accountType, setAccountType] = useState(initialAccountType);
  const [showAccountType, setShowAccountType] = useState(!initialAccountType);
  const [step, setStep] = useState(() =>
    Math.max(
      0,
      Math.min(
        isManagedAthlete ? 3 : 2,
        Number(
          readDraft(
            user?.profile,
            user?.name,
            user?.username,
            user?.assignedTrainerId,
          ).step || 0,
        ),
      ),
    ),
  );
  const [form, setForm] = useState(() =>
    readDraft(
      user?.profile,
      user?.name,
      user?.username,
      user?.assignedTrainerId,
    ),
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [intakeQuestions, setIntakeQuestions] = useState([]);
  const [intakeLoading, setIntakeLoading] = useState(isManagedAthlete);

  useEffect(() => {
    if (!isManagedAthlete) return undefined;
    let active = true;
    api
      .getCoachIntakeForm()
      .then((data) => {
        if (active) setIntakeQuestions(data.questions || []);
      })
      .catch((error) => {
        if (active)
          toast.error(error.message || "No se pudo cargar la evaluación");
      })
      .finally(() => {
        if (active) setIntakeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isManagedAthlete]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, step }));
    } catch {
      // The server submission remains available without local persistence.
    }
  }, [form, step]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === form.goal),
    [form.goal],
  );
  const selectedLevel = useMemo(
    () => levels.find((level) => level.id === form.experienceLevel),
    [form.experienceLevel],
  );

  const validateBody = () => {
    const weight = Number(form.weight);
    const height = Number(form.height);
    const nextErrors = {
      username: validateUsername(form.username),
      name:
        form.name.trim().length < 2 || form.name.trim().length > 80
          ? "Ingresa un nombre de 2 a 80 caracteres."
          : "",
      weight:
        !Number.isFinite(weight) || weight < 20 || weight > 500
          ? "Ingresa un peso entre 20 y 500 kg."
          : "",
      height:
        !Number.isFinite(height) || height < 80 || height > 250
          ? "Ingresa una altura entre 80 y 250 cm."
          : "",
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const persistAccountType = async (nextAccountType) => {
    if (saving || !nextAccountType) return;
    try {
      setSaving(true);
      await selectOnboardingAccountType(nextAccountType);
      setAccountType(nextAccountType);
      setShowAccountType(false);
      setErrors({});
      setStep(0);
    } catch (error) {
      toast.error(
        error.message || "No pudimos guardar como quieres usar RIRFIT",
      );
    } finally {
      setSaving(false);
    }
  };

  const finishCoach = async () => {
    if (saving) return;
    const nextErrors = {
      username: validateUsername(form.username),
      name:
        form.name.trim().length < 2 || form.name.trim().length > 80
          ? "Ingresa un nombre de 2 a 80 caracteres."
          : "",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setSaving(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("rirfit_coach_welcome", "1");
      }
      await completeCoachOnboarding({
        name: form.name.trim(),
        username: normalizeUsername(form.username),
      });
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
      onNavigate("trainer");
    } catch (error) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("rirfit_coach_welcome");
      }
      if (error.code === "USERNAME_TAKEN" || /usuario/i.test(error.message)) {
        setErrors((value) => ({
          ...value,
          username: "Este nombre de usuario ya esta en uso.",
        }));
      } else {
        toast.error(
          error.message || "No se pudo preparar tu espacio profesional",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!validateBody() || saving) return;
    const missingAnswer = intakeQuestions.find((question) => {
      if (!question.required) return false;
      const value = form.intakeAnswers?.[question.key];
      return Array.isArray(value)
        ? value.length === 0
        : String(value ?? "").trim() === "";
    });
    if (missingAnswer) {
      setErrors((value) => ({
        ...value,
        [`intake_${missingAnswer.key}`]: "Esta respuesta es obligatoria.",
      }));
      setStep(3);
      return;
    }
    try {
      setSaving(true);
      await completeOnboarding({
        name: form.name.trim(),
        username: normalizeUsername(form.username),
        goal: form.goal,
        experienceLevel: form.experienceLevel,
        weeklyFrequency: Number(form.weeklyFrequency),
        weight: Number(form.weight),
        height: Number(form.height),
        healthNotes: form.healthNotes.trim(),
        intakeAnswers: intakeQuestions.map((question) => ({
          key: question.key,
          value: form.intakeAnswers?.[question.key] ?? "",
        })),
      });
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
      toast.success(
        isManagedAthlete ? "Evaluación enviada" : "Configuración completada",
        {
          description: isManagedAthlete
            ? "Tu coach ya puede revisar tus respuestas y preparar tu plan."
            : "Tu dashboard ya está preparado con tus objetivos.",
        },
      );
      onNavigate("dashboard");
    } catch (error) {
      if (error.code === "USERNAME_TAKEN" || /usuario/i.test(error.message)) {
        setErrors((value) => ({
          ...value,
          username: "Este nombre de usuario ya está en uso.",
        }));
      } else {
        toast.error(error.message || "No se pudo guardar la configuracion");
      }
    } finally {
      setSaving(false);
    }
  };

  const exit = async () => {
    await logout();
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(LEGACY_DRAFT_KEY);
    onNavigate("login");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col text-[color:var(--text)]">
      <header className="flex items-center justify-between border-b border-[color:var(--border)] pb-4">
        <div>
          <p className="text-xl font-black italic leading-none">
            RIR <span className="text-[#181918] dark:text-[#e2ff00]">FIT</span>
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Configuracion inicial
          </p>
        </div>
        <button
          type="button"
          onClick={exit}
          className="inline-flex h-10 items-center gap-2 border border-[color:var(--border)] px-3 text-[10px] font-black uppercase text-[color:var(--text-muted)]"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </header>

      {!showAccountType && accountType === "athlete" ? (
        <div
          className="mt-5 grid grid-cols-3 gap-2"
          aria-label="Progreso de configuracion"
        >
          {["Objetivo", "Experiencia", "Tu perfil"].map((label, index) => (
            <div key={label}>
              <div
                className={`h-1.5 ${index <= step ? "bg-[#181918] dark:bg-[#e2ff00]" : "bg-[color:var(--border)]"}`}
              />
              <p
                className={`mt-2 text-[9px] font-black uppercase ${index <= step ? "text-[color:var(--text)]" : "text-[color:var(--text-muted)]"}`}
              >
                {index + 1}. {label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="my-auto py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#181918] dark:text-[#e2ff00]">
            Hola, {user?.name?.split(" ")[0] || "atleta"}
          </p>

          {showAccountType ? (
            <div className="mt-3 max-w-2xl">
              <h1 className="max-w-xl text-[34px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                ¿Cómo quieres usar RIRFIT?
              </h1>
              <p className="mt-4 max-w-lg text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Empezaremos con las herramientas adecuadas para ti. Podrás
                activar un espacio profesional más adelante.
              </p>
              <div
                className="mt-7 grid gap-3"
                role="radiogroup"
                aria-label="Tipo de cuenta"
              >
                {accountTypes.map((option) => (
                  <AccountTypeChoice
                    key={option.id}
                    {...option}
                    selected={accountType === option.id}
                    onClick={() => setAccountType(option.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {!showAccountType && accountType === "coach" ? (
            <div className="mt-3 max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Espacio profesional
              </p>
              <h1 className="mt-2 max-w-xl text-[34px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                Preséntate ante tus alumnos.
              </h1>
              <p className="mt-4 max-w-lg text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Solo necesitamos cómo quieres aparecer en RIRFIT. Al terminar
                recibirás tu código privado de invitación.
              </p>
              <div className="mt-7 overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[color:var(--card)] px-5 sm:px-6">
                <label className="block border-b border-[color:var(--border)] py-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Nombre público
                  </span>
                  <input
                    type="text"
                    maxLength="80"
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => {
                      setForm((value) => ({
                        ...value,
                        name: event.target.value,
                      }));
                      setErrors((value) => ({ ...value, name: "" }));
                    }}
                    placeholder="Tu nombre"
                    className="mt-2 h-11 w-full bg-transparent text-lg font-semibold tracking-[-0.02em] outline-none placeholder:text-[color:var(--text-muted)]"
                    aria-label="Nombre público del entrenador"
                  />
                  {errors.name ? (
                    <span className="mt-1 block text-xs font-semibold text-red-500">
                      {errors.name}
                    </span>
                  ) : null}
                </label>
                <label className="block py-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Nombre de usuario
                  </span>
                  <input
                    type="text"
                    maxLength={20}
                    autoComplete="username"
                    value={form.username}
                    onChange={(event) => {
                      setForm((value) => ({
                        ...value,
                        username: event.target.value.toLowerCase(),
                      }));
                      setErrors((value) => ({ ...value, username: "" }));
                    }}
                    placeholder="coach_rirfit"
                    className="mt-2 h-11 w-full bg-transparent text-lg font-semibold tracking-[-0.02em] outline-none placeholder:text-[color:var(--text-muted)]"
                    aria-label="Nombre de usuario profesional"
                  />
                  {errors.username ? (
                    <span className="mt-1 block text-xs font-semibold text-red-500">
                      {errors.username}
                    </span>
                  ) : null}
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3 px-1 text-xs font-normal leading-5 text-[color:var(--text-muted)]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[color:var(--text)]" />
                Ningún alumno será vinculado sin aceptar tu invitación.
              </div>
            </div>
          ) : null}

          {!showAccountType && accountType === "athlete" && step === 0 ? (
            <div className="mt-2">
              {isManagedAthlete ? (
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#181918] dark:text-[#e2ff00]">
                  Evaluación inicial para tu coach
                </p>
              ) : null}
              <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">
                ¿Cual es tu objetivo principal?
              </h1>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">
                Usaremos esta eleccion para orientar tus metricas y
                recomendaciones.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {goals.map((goal) => (
                  <ChoiceCard
                    key={goal.id}
                    {...goal}
                    selected={form.goal === goal.id}
                    onClick={() =>
                      setForm((value) => ({ ...value, goal: goal.id }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {!showAccountType && accountType === "athlete" && step === 1 ? (
            <div className="mt-2">
              <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">
                Ajustemos el punto de partida
              </h1>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">
                Esto calibra la complejidad y frecuencia sugerida, no limita tus
                rutinas.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {levels.map((level) => (
                  <ChoiceCard
                    key={level.id}
                    {...level}
                    selected={form.experienceLevel === level.id}
                    onClick={() =>
                      setForm((value) => ({
                        ...value,
                        experienceLevel: level.id,
                      }))
                    }
                  />
                ))}
              </div>
              <div className="mt-7 border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase">
                      Dias por semana
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                      Una meta realista ayuda a medir adherencia.
                    </p>
                  </div>
                  <span className="text-3xl font-black text-[#181918] dark:text-[#e2ff00]">
                    {form.weeklyFrequency}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {[2, 3, 4, 5, 6, 7].map((frequency) => (
                    <button
                      key={frequency}
                      type="button"
                      aria-label={`${frequency} dias por semana`}
                      aria-pressed={form.weeklyFrequency === frequency}
                      onClick={() =>
                        setForm((value) => ({
                          ...value,
                          weeklyFrequency: frequency,
                        }))
                      }
                      className={`h-11 border text-sm font-black ${
                        form.weeklyFrequency === frequency
                          ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
                          : "border-[color:var(--border)] bg-[color:var(--bg)]"
                      }`}
                    >
                      {frequency}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {!showAccountType && accountType === "athlete" && step === 2 ? (
            <div className="mt-2">
              <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">
                Completa tu perfil base
              </h1>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">
                Evitamos valores genericos: tus calculos comenzaran con datos
                reales.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:col-span-2">
                  <span className="text-xs font-black uppercase">
                    Nombre de usuario
                  </span>
                  <input
                    type="text"
                    maxLength={20}
                    autoComplete="username"
                    value={form.username}
                    onChange={(event) => {
                      setForm((value) => ({
                        ...value,
                        username: event.target.value.toLowerCase(),
                      }));
                      setErrors((value) => ({ ...value, username: "" }));
                    }}
                    placeholder="usuario"
                    className="mt-3 h-12 w-full border-b border-[color:var(--border)] bg-transparent text-lg font-bold outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#181918] dark:focus:border-[#e2ff00]"
                    aria-label="Nombre de usuario"
                  />
                  {errors.username ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.username}
                    </span>
                  ) : null}
                </label>
                <label className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:col-span-2">
                  <span className="text-xs font-black uppercase">
                    ¿Cómo quieres que te llamemos?
                  </span>
                  <input
                    type="text"
                    maxLength="80"
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => {
                      setForm((value) => ({
                        ...value,
                        name: event.target.value,
                      }));
                      setErrors((value) => ({ ...value, name: "" }));
                    }}
                    placeholder="Tu nombre"
                    className="mt-3 h-12 w-full border-b border-[color:var(--border)] bg-transparent text-lg font-bold outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#181918] dark:focus:border-[#e2ff00]"
                    aria-label="Nombre para tu perfil"
                  />
                  {errors.name ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.name}
                    </span>
                  ) : null}
                </label>
                <label className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <span className="flex items-center gap-2 text-xs font-black uppercase">
                    <Scale className="h-4 w-4 text-[#181918] dark:text-[#e2ff00]" />
                    Peso actual
                  </span>
                  <span className="mt-3 flex items-end gap-2">
                    <input
                      type="number"
                      min="20"
                      max="500"
                      step="0.1"
                      inputMode="decimal"
                      value={form.weight}
                      onChange={(event) => {
                        setForm((value) => ({
                          ...value,
                          weight: event.target.value,
                        }));
                        setErrors((value) => ({ ...value, weight: "" }));
                      }}
                      className="h-12 min-w-0 flex-1 border-b border-[color:var(--border)] bg-transparent text-2xl font-black outline-none focus:border-[#181918] dark:focus:border-[#e2ff00]"
                      aria-label="Peso actual en kilogramos"
                    />
                    <span className="pb-3 text-xs font-black text-[color:var(--text-muted)]">
                      kg
                    </span>
                  </span>
                  {errors.weight ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.weight}
                    </span>
                  ) : null}
                </label>
                <label className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <span className="flex items-center gap-2 text-xs font-black uppercase">
                    <Target className="h-4 w-4 text-[#181918] dark:text-[#e2ff00]" />
                    Altura
                  </span>
                  <span className="mt-3 flex items-end gap-2">
                    <input
                      type="number"
                      min="80"
                      max="250"
                      step="1"
                      inputMode="numeric"
                      value={form.height}
                      onChange={(event) => {
                        setForm((value) => ({
                          ...value,
                          height: event.target.value,
                        }));
                        setErrors((value) => ({ ...value, height: "" }));
                      }}
                      className="h-12 min-w-0 flex-1 border-b border-[color:var(--border)] bg-transparent text-2xl font-black outline-none focus:border-[#181918] dark:focus:border-[#e2ff00]"
                      aria-label="Altura en centimetros"
                    />
                    <span className="pb-3 text-xs font-black text-[color:var(--text-muted)]">
                      cm
                    </span>
                  </span>
                  {errors.height ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.height}
                    </span>
                  ) : null}
                </label>
                {isManagedAthlete ? (
                  <label className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:col-span-2">
                    <span className="text-xs font-black uppercase">
                      Lesiones o condiciones a considerar
                    </span>
                    <textarea
                      maxLength={500}
                      rows={4}
                      value={form.healthNotes}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          healthNotes: event.target.value,
                        }))
                      }
                      placeholder="Opcional. Describe molestias, lesiones, restricciones o indicaciones médicas relevantes."
                      className="mt-3 w-full resize-none border-b border-[color:var(--border)] bg-transparent py-2 text-sm font-semibold leading-6 outline-none placeholder:text-[color:var(--text-muted)] focus:border-[#181918] dark:focus:border-[#e2ff00]"
                    />
                    <span className="mt-2 block text-[11px] leading-5 text-[color:var(--text-muted)]">
                      Esta información se compartirá únicamente con tu coach
                      para adaptar la planificación.
                    </span>
                  </label>
                ) : null}
              </div>
              <div className="mt-4 flex items-start gap-3 border border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-[color:var(--accent-contrast)]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-current" />
                <p className="text-xs font-semibold text-current/80">
                  Configuraremos{" "}
                  <strong className="text-current">
                    {selectedGoal?.title}
                  </strong>
                  , nivel{" "}
                  <strong className="text-current">
                    {selectedLevel?.title.toLowerCase()}
                  </strong>{" "}
                  y una meta de{" "}
                  <strong className="text-current">
                    {form.weeklyFrequency} dias
                  </strong>{" "}
                  por semana.
                </p>
              </div>
            </div>
          ) : null}

          {!showAccountType &&
          accountType === "athlete" &&
          isManagedAthlete &&
          step === 3 ? (
            <div className="mt-2">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#181918] dark:text-[#e2ff00]">
                Preguntas de tu coach
              </p>
              <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">
                Últimos detalles
              </h1>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">
                Estas respuestas se compartirán únicamente con tu coach para
                personalizar tu planificación.
              </p>
              {intakeLoading ? (
                <OperationLoader
                  active
                  delayMs={0}
                  mode="inline"
                  title="Cargando preguntas"
                />
              ) : (
                <div className="mt-6 grid gap-4">
                  {intakeQuestions.map((question, index) => {
                    const value =
                      form.intakeAnswers?.[question.key] ??
                      (question.type === "multiple_choice" ? [] : "");
                    const error = errors[`intake_${question.key}`];
                    const updateAnswer = (nextValue) => {
                      setForm((current) => ({
                        ...current,
                        intakeAnswers: {
                          ...current.intakeAnswers,
                          [question.key]: nextValue,
                        },
                      }));
                      setErrors((current) => ({
                        ...current,
                        [`intake_${question.key}`]: "",
                      }));
                    };
                    return (
                      <fieldset
                        key={question.key}
                        className="border border-[color:var(--border)] bg-[color:var(--card)] p-4"
                      >
                        <legend className="sr-only">{question.label}</legend>
                        <p className="text-sm font-black">
                          {index + 1}. {question.label}
                          {!question.required ? (
                            <span className="ml-2 text-[10px] font-semibold uppercase text-[color:var(--text-muted)]">
                              Opcional
                            </span>
                          ) : null}
                        </p>
                        {question.type === "long_text" ? (
                          <textarea
                            rows={3}
                            maxLength={1000}
                            value={value}
                            onChange={(event) =>
                              updateAnswer(event.target.value)
                            }
                            className="mt-3 w-full resize-none border-b border-[color:var(--border)] bg-transparent py-2 text-sm font-semibold outline-none focus:border-[#181918] dark:focus:border-[#e2ff00]"
                          />
                        ) : question.type === "single_choice" ||
                          question.type === "yes_no" ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {(question.type === "yes_no"
                              ? ["Sí", "No"]
                              : question.options || []
                            ).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateAnswer(option)}
                                className={`min-h-11 border px-3 text-left text-sm font-bold ${value === option ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black" : "border-[color:var(--border)]"}`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : question.type === "multiple_choice" ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {(question.options || []).map((option) => {
                              const selected =
                                Array.isArray(value) && value.includes(option);
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    updateAnswer(
                                      selected
                                        ? value.filter(
                                            (item) => item !== option,
                                          )
                                        : [...value, option],
                                    )
                                  }
                                  className={`min-h-11 border px-3 text-left text-sm font-bold ${selected ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black" : "border-[color:var(--border)]"}`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            type={
                              question.type === "number" ? "number" : "text"
                            }
                            maxLength={1000}
                            value={value}
                            onChange={(event) =>
                              updateAnswer(event.target.value)
                            }
                            className="mt-3 h-12 w-full border-b border-[color:var(--border)] bg-transparent text-sm font-semibold outline-none focus:border-[#181918] dark:focus:border-[#e2ff00]"
                          />
                        )}
                        {error ? (
                          <span className="mt-2 block text-xs font-bold text-red-500">
                            {error}
                          </span>
                        ) : null}
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4">
        {showAccountType ? (
          <>
            <button
              type="button"
              onClick={() => persistAccountType("athlete")}
              disabled={saving}
              className="h-11 px-1 text-xs font-semibold text-[color:var(--text-muted)] underline decoration-[color:var(--border)] underline-offset-4 disabled:opacity-50"
            >
              Decidir después
            </button>
            <button
              type="button"
              onClick={() => persistAccountType(accountType)}
              disabled={saving || !accountType}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#181918] px-5 text-xs font-bold text-white disabled:opacity-40 dark:bg-[#e2ff00] dark:text-black"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : accountType === "coach" ? (
          <>
            <button
              type="button"
              onClick={() => setShowAccountType(true)}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 px-1 text-xs font-semibold text-[color:var(--text-muted)] disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Cambiar elección
            </button>
            <button
              type="button"
              onClick={finishCoach}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#181918] px-5 text-xs font-bold text-white disabled:opacity-60 dark:bg-[#e2ff00] dark:text-black"
            >
              Crear mi espacio <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                step === 0
                  ? setShowAccountType(true)
                  : setStep((value) => Math.max(0, value - 1))
              }
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 border border-[color:var(--border)] px-4 text-xs font-black uppercase disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            <p className="hidden text-[10px] font-black uppercase text-[color:var(--text-muted)] sm:block">
              Paso {step + 1} de {isManagedAthlete ? 4 : 3}
            </p>
            <button
              type="button"
              onClick={
                step === (isManagedAthlete ? 3 : 2)
                  ? finish
                  : () =>
                      setStep((value) =>
                        Math.min(isManagedAthlete ? 3 : 2, value + 1),
                      )
              }
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 bg-[#181918] px-5 text-xs font-black uppercase text-white disabled:opacity-60 dark:bg-[#e2ff00] dark:text-black"
            >
              {step === (isManagedAthlete ? 3 : 2)
                ? "Enviar evaluación"
                : "Continuar"}
              {step === (isManagedAthlete ? 3 : 2) ? (
                <Check className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </>
        )}
      </footer>

      <OperationLoader
        active={saving}
        delayMs={200}
        title="Preparando tu cuenta"
        description={
          showAccountType
            ? "Preparando el espacio adecuado para ti."
            : accountType === "coach"
              ? "Creando tu perfil profesional y codigo de invitacion."
              : "Guardando objetivos y configurando el dashboard."
        }
      />
    </div>
  );
}
