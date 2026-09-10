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
      className={`flex min-h-[88px] w-full items-center gap-3 rounded-[18px] border p-4 text-left transition ${
        selected
          ? "border-[#181918] bg-[#181918] text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
          : "border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_5px_18px_rgba(0,0,0,0.035)] hover:border-[#181918]/50 dark:hover:border-[#e2ff00]/50"
      }`}
    >
      {Icon ? (
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${
            selected
              ? "bg-white/10 text-current dark:bg-black/10"
              : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={`block text-base font-semibold tracking-[-0.02em] ${
            selected ? "text-current" : "text-[color:var(--text)]"
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-1 block text-sm font-normal leading-5 ${
            selected ? "text-current/80" : "text-[color:var(--text-muted)]"
          }`}
        >
          {detail}
        </span>
      </span>
      {selected ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#181918] dark:bg-black dark:text-[#e2ff00]">
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
      className={`group flex min-h-[104px] w-full items-center gap-4 rounded-[20px] border px-4 py-4 text-left transition duration-300 ${
        selected
          ? "border-[#181918] bg-[#181918] text-white shadow-[0_14px_36px_rgba(0,0,0,0.14)] dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
          : "border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_5px_18px_rgba(0,0,0,0.035)] hover:border-[color:var(--text)]"
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-[14px] transition ${
          selected
            ? "bg-white/10 dark:bg-black/10"
            : "bg-[color:var(--surface-subtle)]"
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
    if (saving) return;
    if (!validateBody()) {
      toast.error("Revisa los datos de tu perfil", {
        description:
          "Completa los campos pendientes antes de enviar la evaluación.",
      });
      setStep(2);
      return;
    }
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
      toast.error("Completa la evaluación", {
        description: `Falta responder: ${missingAnswer.label}`,
      });
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
        isManagedAthlete ? "Formulario enviado" : "Configuración completada",
        {
          description: isManagedAthlete
            ? "Tu coach ya puede revisar tus respuestas y preparar tu plan."
            : "Tu dashboard ya está preparado con tus objetivos.",
          duration: 5000,
        },
      );
      onNavigate("dashboard", { replace: true });
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
    <div className="routines-shell fixed inset-0 z-40 flex h-dvh w-full flex-col overflow-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <header className="shrink-0 border-b border-[color:var(--border)] bg-[color:var(--bg)]">
        <div className="mx-auto grid min-h-16 w-full max-w-lg grid-cols-[72px_minmax(0,1fr)_72px] items-center px-5">
          <p className="text-base font-semibold italic tracking-[-0.04em]">
            RIRFIT
          </p>
          <h1 className="truncate text-center text-lg font-semibold tracking-[-0.03em]">
            Configuración inicial
          </h1>
          <button
            type="button"
            onClick={exit}
            aria-label="Salir de la configuración"
            className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {!showAccountType && accountType === "athlete" ? (
          <div
            className={`mx-auto grid w-full max-w-lg px-5 pb-4 pt-2 ${isManagedAthlete ? "grid-cols-4" : "grid-cols-3"}`}
            aria-label="Progreso de configuración"
          >
            {(isManagedAthlete
              ? ["Objetivo", "Experiencia", "Perfil", "Evaluación"]
              : ["Objetivo", "Experiencia", "Perfil"]
            ).map((label, index) => {
              const complete = index < step;
              const active = index === step;
              return (
                <div
                  key={label}
                  className="relative flex min-w-0 flex-col items-center gap-1.5"
                >
                  {index ? (
                    <span
                      className={`absolute right-1/2 top-3 h-px w-full ${index <= step ? "bg-[#43ad65]" : "bg-[color:var(--border)]"}`}
                    />
                  ) : null}
                  <span
                    className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                      complete
                        ? "bg-[#43ad65] text-white"
                        : active
                          ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black"
                          : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {complete ? (
                      <Check className="h-4 w-4" strokeWidth={2.8} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`relative z-10 max-w-full truncate bg-[color:var(--bg)] px-1 text-[10px] ${active ? "font-semibold" : "text-[color:var(--text-muted)]"}`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-5 py-6">
          <p className="text-xs font-medium text-[color:var(--text-muted)]">
            Hola, {user?.name?.split(" ")[0] || "atleta"}
          </p>

          {showAccountType ? (
            <div className="mt-3">
              <h1 className="text-[32px] font-semibold leading-[1.02] tracking-[-0.05em]">
                ¿Cómo quieres usar RIRFIT?
              </h1>
              <p className="mt-3 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Empezaremos con las herramientas adecuadas para ti. Podrás
                activar un espacio profesional más adelante.
              </p>
              <div
                className="mt-6 grid gap-3"
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
            <div className="mt-3">
              <p className="text-xs font-medium text-[color:var(--text-muted)]">
                Espacio profesional
              </p>
              <h1 className="mt-2 text-[32px] font-semibold leading-[1.02] tracking-[-0.05em]">
                Preséntate ante tus alumnos.
              </h1>
              <p className="mt-3 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Solo necesitamos cómo quieres aparecer en RIRFIT. Al terminar
                recibirás tu código privado de invitación.
              </p>
              <div className="mt-6 space-y-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
                <label className="block">
                  <span className="text-xs font-medium text-[color:var(--text-muted)]">
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
                    className="mt-2 h-12 w-full rounded-[13px] bg-[color:var(--surface-subtle)] px-3 text-base font-medium outline-none placeholder:text-[color:var(--text-muted)]"
                    aria-label="Nombre público del entrenador"
                  />
                  {errors.name ? (
                    <span className="mt-1 block text-xs font-semibold text-red-500">
                      {errors.name}
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[color:var(--text-muted)]">
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
                    className="mt-2 h-12 w-full rounded-[13px] bg-[color:var(--surface-subtle)] px-3 text-base font-medium outline-none placeholder:text-[color:var(--text-muted)]"
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
                <p className="mb-2 inline-flex rounded-full bg-[#e6f6e9] px-3 py-1.5 text-xs font-semibold text-[#27743d]">
                  Evaluación inicial para tu coach
                </p>
              ) : null}
              <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.05em]">
                ¿Cuál es tu objetivo principal?
              </h1>
              <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Usaremos esta elección para orientar tus métricas y
                recomendaciones.
              </p>
              <div className="mt-5 grid gap-3">
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
              <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.05em]">
                Ajustemos el punto de partida
              </h1>
              <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Esto calibra la complejidad y frecuencia sugerida, no limita tus
                rutinas.
              </p>
              <div className="mt-5 grid gap-3">
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
              <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">Días por semana</p>
                    <p className="mt-1 text-xs font-normal text-[color:var(--text-muted)]">
                      Una meta realista ayuda a medir adherencia.
                    </p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#181918] text-xl font-semibold text-white dark:bg-[#e2ff00] dark:text-black">
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
                      className={`h-11 rounded-[12px] border text-sm font-semibold ${
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
              <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.05em]">
                Completa tu perfil base
              </h1>
              <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
                Evitamos valores genéricos: tus cálculos comenzarán con datos
                reales.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="col-span-2 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_5px_18px_rgba(0,0,0,0.035)]">
                  <span className="text-sm font-semibold">
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
                    className="mt-2 h-12 w-full rounded-[13px] bg-[color:var(--surface-subtle)] px-3 text-base font-medium outline-none placeholder:text-[color:var(--text-muted)]"
                    aria-label="Nombre de usuario"
                  />
                  {errors.username ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.username}
                    </span>
                  ) : null}
                </label>
                <label className="col-span-2 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_5px_18px_rgba(0,0,0,0.035)]">
                  <span className="text-sm font-semibold">
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
                    className="mt-2 h-12 w-full rounded-[13px] bg-[color:var(--surface-subtle)] px-3 text-base font-medium outline-none placeholder:text-[color:var(--text-muted)]"
                    aria-label="Nombre para tu perfil"
                  />
                  {errors.name ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.name}
                    </span>
                  ) : null}
                </label>
                <label className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_5px_18px_rgba(0,0,0,0.035)]">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Scale className="h-4 w-4 text-[#181918] dark:text-[#e2ff00]" />
                    Peso actual
                  </span>
                  <span className="mt-2 flex items-center gap-2 rounded-[13px] bg-[color:var(--surface-subtle)] px-3">
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
                      className="h-12 min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
                      aria-label="Peso actual en kilogramos"
                    />
                    <span className="text-xs font-medium text-[color:var(--text-muted)]">
                      kg
                    </span>
                  </span>
                  {errors.weight ? (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {errors.weight}
                    </span>
                  ) : null}
                </label>
                <label className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_5px_18px_rgba(0,0,0,0.035)]">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Target className="h-4 w-4 text-[#181918] dark:text-[#e2ff00]" />
                    Altura
                  </span>
                  <span className="mt-2 flex items-center gap-2 rounded-[13px] bg-[color:var(--surface-subtle)] px-3">
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
                      className="h-12 min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
                      aria-label="Altura en centimetros"
                    />
                    <span className="text-xs font-medium text-[color:var(--text-muted)]">
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
                  <label className="col-span-2 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_5px_18px_rgba(0,0,0,0.035)]">
                    <span className="text-sm font-semibold">
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
                      className="mt-2 w-full resize-none rounded-[13px] bg-[color:var(--surface-subtle)] p-3 text-sm font-normal leading-6 outline-none placeholder:text-[color:var(--text-muted)]"
                    />
                    <span className="mt-2 block text-[11px] leading-5 text-[color:var(--text-muted)]">
                      Esta información se compartirá únicamente con tu coach
                      para adaptar la planificación.
                    </span>
                  </label>
                ) : null}
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-[16px] bg-[#e9f7ec] p-4 text-[#276f3c] dark:bg-emerald-950/30 dark:text-emerald-200">
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
              <p className="mb-2 inline-flex rounded-full bg-[#e6f6e9] px-3 py-1.5 text-xs font-semibold text-[#27743d]">
                Preguntas de tu coach
              </p>
              <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.05em]">
                Últimos detalles
              </h1>
              <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--text-muted)]">
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
                <div className="mt-5 grid gap-3">
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
                        className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_5px_18px_rgba(0,0,0,0.035)]"
                      >
                        <legend className="sr-only">{question.label}</legend>
                        <p className="text-sm font-semibold">
                          {index + 1}. {question.label}
                          {!question.required ? (
                            <span className="ml-2 rounded-full bg-[color:var(--surface-subtle)] px-2 py-1 text-[10px] font-medium text-[color:var(--text-muted)]">
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
                            className="mt-3 w-full resize-none rounded-[13px] bg-[color:var(--surface-subtle)] p-3 text-sm font-normal leading-6 outline-none"
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
                                className={`min-h-11 rounded-[12px] border px-3 text-left text-sm font-medium ${value === option ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black" : "border-[color:var(--border)] bg-[color:var(--bg)]"}`}
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
                                  className={`min-h-11 rounded-[12px] border px-3 text-left text-sm font-medium ${selected ? "border-[#181918] bg-[#181918] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black" : "border-[color:var(--border)] bg-[color:var(--bg)]"}`}
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
                            className="mt-3 h-12 w-full rounded-[13px] bg-[color:var(--surface-subtle)] px-3 text-sm font-normal outline-none"
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

      <footer className="shrink-0 border-t border-[color:var(--border)] bg-[color:var(--bg)] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2">
          {showAccountType ? (
            <>
              <button
                type="button"
                onClick={() => persistAccountType("athlete")}
                disabled={saving}
                className="h-12 px-2 text-sm font-medium text-[color:var(--text-muted)] disabled:opacity-50"
              >
                Decidir después
              </button>
              <button
                type="button"
                onClick={() => persistAccountType(accountType)}
                disabled={saving || !accountType}
                className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#181918] px-6 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#e2ff00] dark:text-black"
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
                className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-[color:var(--border)] px-4 text-sm font-medium text-[color:var(--text-muted)] disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" /> Cambiar elección
              </button>
              <button
                type="button"
                onClick={finishCoach}
                disabled={saving}
                className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#181918] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#e2ff00] dark:text-black"
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
                className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--card)] px-4 text-sm font-semibold disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </button>
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
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#181918] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#e2ff00] dark:text-black"
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
        </div>
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
