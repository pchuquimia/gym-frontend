import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  LogOut,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import OperationLoader from "../components/system/OperationLoader";

const DRAFT_KEY = "apex_onboarding_draft";

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

const readDraft = (profile = {}) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
    if (stored) return stored;
  } catch {
    // Start from the server profile if the local draft is unreadable.
  }
  return {
    goal: profile.goal || "mantenimiento",
    experienceLevel: profile.experienceLevel || "beginner",
    weeklyFrequency: Number(profile.weeklyFrequency || 3),
    weight: profile.weight || "",
    height: profile.height || "",
  };
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
          : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[#ff5722]/50 dark:hover:border-[#e2ff00]/50"
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

export default function Onboarding({ onNavigate = () => {} }) {
  const { user, completeOnboarding, logout } = useAuth();
  const [step, setStep] = useState(() =>
    Math.max(0, Math.min(2, Number(readDraft(user?.profile).step || 0))),
  );
  const [form, setForm] = useState(() => readDraft(user?.profile));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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

  const finish = async () => {
    if (!validateBody() || saving) return;
    try {
      setSaving(true);
      await completeOnboarding({
        goal: form.goal,
        experienceLevel: form.experienceLevel,
        weeklyFrequency: Number(form.weeklyFrequency),
        weight: Number(form.weight),
        height: Number(form.height),
      });
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success("Configuracion completada", {
        description: "Tu dashboard ya esta preparado con tus objetivos.",
      });
      onNavigate("dashboard");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  const exit = async () => {
    await logout();
    window.localStorage.removeItem(DRAFT_KEY);
    onNavigate("login");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col text-[color:var(--text)]">
      <header className="flex items-center justify-between border-b border-[color:var(--border)] pb-4">
        <div>
          <p className="text-xl font-black italic leading-none">
            APEX{" "}
            <span className="text-[#ff5722] dark:text-[#e2ff00]">
              PERFORMANCE
            </span>
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

      <div
        className="mt-5 grid grid-cols-3 gap-2"
        aria-label="Progreso de configuracion"
      >
        {["Objetivo", "Experiencia", "Tu perfil"].map((label, index) => (
          <div key={label}>
            <div
              className={`h-1.5 ${index <= step ? "bg-[#ff5722] dark:bg-[#e2ff00]" : "bg-[color:var(--border)]"}`}
            />
            <p
              className={`mt-2 text-[9px] font-black uppercase ${index <= step ? "text-[color:var(--text)]" : "text-[color:var(--text-muted)]"}`}
            >
              {index + 1}. {label}
            </p>
          </div>
        ))}
      </div>

      <section className="my-auto py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff5722] dark:text-[#e2ff00]">
            Hola, {user?.name?.split(" ")[0] || "atleta"}
          </p>

          {step === 0 ? (
            <div className="mt-2">
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

          {step === 1 ? (
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
                  <span className="text-3xl font-black text-[#ff5722] dark:text-[#e2ff00]">
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
                          ? "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black"
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

          {step === 2 ? (
            <div className="mt-2">
              <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">
                Completa tu perfil base
              </h1>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">
                Evitamos valores genericos: tus calculos comenzaran con datos
                reales.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <span className="flex items-center gap-2 text-xs font-black uppercase">
                    <Scale className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
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
                      className="h-12 min-w-0 flex-1 border-b border-[color:var(--border)] bg-transparent text-2xl font-black outline-none focus:border-[#ff5722] dark:focus:border-[#e2ff00]"
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
                    <Target className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
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
                      className="h-12 min-w-0 flex-1 border-b border-[color:var(--border)] bg-transparent text-2xl font-black outline-none focus:border-[#ff5722] dark:focus:border-[#e2ff00]"
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
        </div>
      </section>

      <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4">
        <button
          type="button"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={step === 0 || saving}
          className="inline-flex h-11 items-center gap-2 border border-[color:var(--border)] px-4 text-xs font-black uppercase disabled:invisible"
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>
        <p className="hidden text-[10px] font-black uppercase text-[color:var(--text-muted)] sm:block">
          Paso {step + 1} de 3
        </p>
        <button
          type="button"
          onClick={
            step === 2
              ? finish
              : () => setStep((value) => Math.min(2, value + 1))
          }
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 bg-[#ff5722] px-5 text-xs font-black uppercase text-white disabled:opacity-60 dark:bg-[#e2ff00] dark:text-black"
        >
          {step === 2 ? "Preparar dashboard" : "Continuar"}
          {step === 2 ? (
            <Check className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </footer>

      <OperationLoader
        active={saving}
        delayMs={200}
        title="Preparando tu cuenta"
        description="Guardando objetivos y configurando el dashboard."
      />
    </div>
  );
}
