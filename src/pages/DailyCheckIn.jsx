import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BatteryCharging,
  Brain,
  CheckCircle2,
  HeartPulse,
  Moon,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import PremiumGate from "../components/shared/PremiumGate";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { hasPremiumFeature, PREMIUM_FEATURES } from "../utils/premium";

const todayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const fields = [
  {
    key: "sleep",
    label: "Sueno",
    low: "Muy malo",
    high: "Excelente",
    icon: Moon,
  },
  {
    key: "energy",
    label: "Energia",
    low: "Muy baja",
    high: "Muy alta",
    icon: BatteryCharging,
  },
  {
    key: "stress",
    label: "Estres",
    low: "Muy bajo",
    high: "Muy alto",
    icon: Brain,
  },
  {
    key: "soreness",
    label: "Dolor muscular",
    low: "Nada",
    high: "Muy alto",
    icon: Activity,
  },
  {
    key: "motivation",
    label: "Motivacion",
    low: "Muy baja",
    high: "Muy alta",
    icon: HeartPulse,
  },
  {
    key: "jointPain",
    label: "Molestia articular",
    low: "Nada",
    high: "Muy alta",
    icon: ShieldAlert,
  },
];

const painOptions = [
  "cuello",
  "hombro",
  "codo",
  "muneca",
  "espalda",
  "cadera",
  "rodilla",
  "tobillo",
  "otro",
];

const emptyForm = {
  sleep: 3,
  energy: 3,
  stress: 3,
  soreness: 3,
  motivation: 3,
  jointPain: 1,
  painAreas: [],
  notes: "",
};

const stateCopy = {
  ready: {
    title: "Listo para entrenar",
    tone: "text-emerald-600 dark:text-[#e2ff00]",
  },
  adjust: {
    title: "Conviene ajustar",
    tone: "text-amber-600 dark:text-amber-300",
  },
  recover: {
    title: "Prioriza recuperacion",
    tone: "text-red-600 dark:text-red-300",
  },
};

function ScaleField({ field, value, onChange }) {
  const Icon = field.icon;
  return (
    <fieldset className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <legend className="sr-only">{field.label}</legend>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#352018] dark:text-[#e2ff00]" />
        <p className="text-sm font-black uppercase">{field.label}</p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-pressed={value === score}
            className={`h-11 border text-sm font-black transition ${
              value === score
                ? "theme-accent-solid border-transparent"
                : "border-[color:var(--border)] bg-[color:var(--bg)] hover:border-[#352018] dark:hover:border-[#e2ff00]"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
        <span>{field.low}</span>
        <span>{field.high}</span>
      </div>
    </fieldset>
  );
}

export default function DailyCheckIn({ onNavigate }) {
  const { user } = useAuth();
  const canUseCheckIn = hasPremiumFeature(user, PREMIUM_FEATURES.DAILY_CHECKIN);
  const [form, setForm] = useState(emptyForm);
  const [latest, setLatest] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isToday = latest?.dateKey === todayKey();

  useEffect(() => {
    if (!canUseCheckIn) {
      setLoading(false);
      return undefined;
    }
    api
      .getLatestCheckIn()
      .then(({ checkIn }) => {
        setLatest(checkIn);
        if (checkIn?.dateKey === todayKey()) {
          setForm({
            ...emptyForm,
            ...checkIn,
            painAreas: checkIn.painAreas || [],
          });
        }
      })
      .catch((error) =>
        toast.error(error.message || "No se pudo cargar el check-in"),
      )
      .finally(() => setLoading(false));
    return undefined;
  }, [canUseCheckIn]);

  const status = useMemo(
    () => stateCopy[latest?.readinessState] || null,
    [latest],
  );

  const togglePainArea = (area) => {
    setForm((current) => ({
      ...current,
      painAreas: current.painAreas.includes(area)
        ? current.painAreas.filter((item) => item !== area)
        : [...current.painAreas, area],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const result = await api.saveCheckIn({ ...form, dateKey: todayKey() });
      setLatest(result.checkIn);
      setRecommendation(result.recommendation || "");
      toast.success(isToday ? "Check-in actualizado" : "Check-in guardado");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el check-in");
    } finally {
      setSaving(false);
    }
  };

  if (!canUseCheckIn) {
    return (
      <main className="mx-auto w-full max-w-4xl pb-24">
        <PremiumGate
          plan="Athlete Pro"
          title="Recuperacion inteligente"
          description="Registra tu estado diario y recibe una recomendacion de carga basada en sueno, energia y molestias."
          onNavigate={onNavigate}
        />
      </main>
    );
  }

  if (loading) {
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Preparando check-in"
        description="Consultando tu ultimo estado de recuperacion."
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 pb-24 text-[color:var(--text)]">
      <header className="border-b border-[color:var(--border)] pb-4">
        <p className="text-[10px] font-black uppercase text-[#352018] dark:text-[#e2ff00]">
          Recuperacion inteligente
        </p>
        <h1 className="mt-1 text-[30px] font-black uppercase leading-none">
          Estado diario
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] font-semibold text-[color:var(--text-muted)]">
          Registra como te sientes antes de entrenar. Tu coach vera el resultado
          y podra ajustar la carga.
        </p>
      </header>

      {isToday && status ? (
        <section className="grid gap-3 border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="grid h-20 w-20 place-items-center border border-[color:var(--border)] bg-[color:var(--bg)] text-2xl font-black">
            {latest.readinessScore}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${status.tone}`} />
              <h2 className={`text-lg font-black uppercase ${status.tone}`}>
                {status.title}
              </h2>
            </div>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
              {recommendation ||
                "Puedes actualizar tus respuestas si tu estado cambia durante el dia."}
            </p>
          </div>
        </section>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <section className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <ScaleField
              key={field.key}
              field={field}
              value={form[field.key]}
              onChange={(value) =>
                setForm((current) => ({ ...current, [field.key]: value }))
              }
            />
          ))}
        </section>

        <section className="border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <h2 className="text-sm font-black uppercase">Zonas con molestias</h2>
          <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Selecciona solo las zonas que requieren atencion hoy.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {painOptions.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => togglePainArea(area)}
                aria-pressed={form.painAreas.includes(area)}
                className={`min-h-10 border px-3 text-xs font-black uppercase ${form.painAreas.includes(area) ? "theme-accent-solid border-transparent" : "border-[color:var(--border)] bg-[color:var(--bg)]"}`}
              >
                {area}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Nota opcional
            </span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              maxLength={500}
              rows={3}
              className="theme-accent-focus mt-2 w-full border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm font-semibold outline-none"
              placeholder="Ej.: molestia al elevar el brazo, dormi menos de lo habitual..."
            />
          </label>
        </section>

        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full text-xs font-black uppercase sm:w-auto"
        >
          {saving
            ? "Calculando estado..."
            : isToday
              ? "Actualizar estado de hoy"
              : "Guardar estado de hoy"}
        </Button>
      </form>
    </main>
  );
}
