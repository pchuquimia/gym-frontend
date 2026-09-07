import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  HeartPulse,
  Moon,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import MobilePageHeader from "../components/layout/MobilePageHeader";
import OperationLoader from "../components/system/OperationLoader";
import PremiumGate from "../components/shared/PremiumGate";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { hasPremiumFeature, PREMIUM_FEATURES } from "../utils/premium";
import { upsertDashboardCheckIn } from "../utils/dashboardBootstrapCache";

const todayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const fields = [
  {
    key: "sleep",
    label: "Sueño",
    question: "¿Cómo dormiste?",
    low: "Muy mal",
    high: "Excelente",
    options: ["Muy mal", "Mal", "Regular", "Bien", "Excelente"],
    icon: Moon,
  },
  {
    key: "energy",
    label: "Energía",
    question: "¿Cuánta energía tienes?",
    low: "Muy baja",
    high: "Muy alta",
    options: ["Vacía", "Baja", "Normal", "Alta", "A tope"],
    icon: BatteryCharging,
  },
  {
    key: "stress",
    label: "Estrés",
    question: "¿Qué nivel de estrés sientes?",
    low: "Nada",
    high: "Mucho",
    options: ["Nada", "Bajo", "Medio", "Alto", "Mucho"],
    icon: Brain,
  },
  {
    key: "soreness",
    label: "Carga muscular",
    question: "¿Cuánto dolor muscular tienes?",
    low: "Nada",
    high: "Mucho",
    options: ["Nada", "Leve", "Medio", "Alto", "Mucho"],
    icon: Activity,
  },
  {
    key: "motivation",
    label: "Motivación",
    question: "¿Qué ganas tienes de entrenar?",
    low: "Ninguna",
    high: "A tope",
    options: ["Ninguna", "Baja", "Normal", "Alta", "A tope"],
    icon: HeartPulse,
  },
  {
    key: "jointPain",
    label: "Articulaciones",
    question: "¿Sientes molestias articulares?",
    low: "Nada",
    high: "Mucho",
    options: ["Nada", "Leve", "Medio", "Alto", "Mucho"],
    icon: ShieldAlert,
  },
];

const painOptions = [
  { value: "cuello", label: "Cuello" },
  { value: "hombro", label: "Hombro" },
  { value: "codo", label: "Codo" },
  { value: "muneca", label: "Muñeca" },
  { value: "espalda", label: "Espalda" },
  { value: "cadera", label: "Cadera" },
  { value: "rodilla", label: "Rodilla" },
  { value: "tobillo", label: "Tobillo" },
  { value: "otro", label: "Otra zona" },
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
    eyebrow: "Buena disposición",
  },
  adjust: {
    title: "Entrena con ajustes",
    eyebrow: "Escucha a tu cuerpo",
  },
  recover: {
    title: "Prioriza la recuperación",
    eyebrow: "Hoy conviene bajar el ritmo",
  },
};

const formatToday = () => {
  const formatted = new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

function ScaleField({ field, value, onChange, index, reduceMotion }) {
  const Icon = field.icon;
  const selectedLabel = field.options[value - 1] || field.options[2];

  return (
    <motion.fieldset
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.24, delay: Math.min(index * 0.035, 0.18) }
      }
      className="daily-checkin__field"
    >
      <legend className="sr-only">{field.question}</legend>
      <div className="daily-checkin__field-heading">
        <span className="daily-checkin__field-icon" aria-hidden="true">
          <Icon />
        </span>
        <div>
          <span>{field.label}</span>
          <h2>{field.question}</h2>
        </div>
        <output>{selectedLabel}</output>
      </div>

      <div className="daily-checkin__scale">
        {field.options.map((label, optionIndex) => {
          const score = optionIndex + 1;
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              aria-label={`${field.label}: ${label}, ${score} de 5`}
              aria-pressed={selected}
              className={selected ? "is-selected" : ""}
            >
              {selected ? <Check aria-hidden="true" /> : score}
            </button>
          );
        })}
      </div>
      <div className="daily-checkin__scale-labels" aria-hidden="true">
        <span>{field.low}</span>
        <span>{field.high}</span>
      </div>
    </motion.fieldset>
  );
}

export default function DailyCheckIn({ onNavigate, onBack }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const canUseCheckIn = hasPremiumFeature(user, PREMIUM_FEATURES.DAILY_CHECKIN);
  const [form, setForm] = useState(emptyForm);
  const [latest, setLatest] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
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
          const painAreas = checkIn.painAreas || [];
          setForm({ ...emptyForm, ...checkIn, painAreas });
          setDetailsOpen(Boolean(painAreas.length || checkIn.notes));
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

  const updateScore = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (
      (key === "jointPain" && value > 1) ||
      (key === "soreness" && value > 3)
    ) {
      setDetailsOpen(true);
    }
  };

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
    const wasSavedToday = isToday;
    try {
      setSaving(true);
      const result = await api.saveCheckIn({ ...form, dateKey: todayKey() });
      setLatest(result.checkIn);
      setRecommendation(result.recommendation || "");
      queryClient.setQueriesData(
        { queryKey: ["dashboard-bootstrap"] },
        (current) => upsertDashboardCheckIn(current, result.checkIn),
      );
      toast.success(
        wasSavedToday ? "Estado de hoy actualizado" : "Estado de hoy guardado",
      );
      onNavigate?.("dashboard");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el check-in");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    onNavigate?.("dashboard");
  };

  if (!canUseCheckIn) {
    return (
      <main className="daily-checkin-page text-[color:var(--text)]">
        <MobilePageHeader
          title="Check-in diario"
          variant="detail"
          onBack={handleBack}
          className="daily-checkin__mobile-header"
        />
        <div className="daily-checkin__gate">
          <PremiumGate
            plan="Athlete Pro"
            title="Recuperación inteligente"
            description="Registra tu estado diario y recibe una recomendación de carga basada en sueño, energía y molestias."
            onNavigate={onNavigate}
          />
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="daily-checkin-page text-[color:var(--text)]">
        <MobilePageHeader
          title="Check-in diario"
          variant="detail"
          onBack={handleBack}
          className="daily-checkin__mobile-header"
        />
        <div className="daily-checkin__loading">
          <OperationLoader
            active
            delayMs={0}
            mode="inline"
            title="Preparando tu check-in"
            description="Consultando tu último estado de recuperación."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="daily-checkin-page text-[color:var(--text)]">
      <MobilePageHeader
        title="Check-in diario"
        variant="detail"
        onBack={handleBack}
        className="daily-checkin__mobile-header"
      />

      <section className="daily-checkin__hero">
        <img src="/images/daily-checkin-wellness.webp" alt="" />
        <div className="daily-checkin__hero-shade" aria-hidden="true" />
        <div className="daily-checkin__hero-copy">
          <span>
            <Sparkles aria-hidden="true" /> Check-in diario · 1 min
          </span>
          <h1>¿Cómo te sientes hoy?</h1>
          <p>{formatToday()}</p>
        </div>
      </section>

      <div className="daily-checkin__content">
        <AnimatePresence initial={false}>
          {isToday && status ? (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="daily-checkin__result"
              aria-live="polite"
            >
              <div className="daily-checkin__score">
                <strong>{latest.readinessScore}</strong>
                <span>/100</span>
              </div>
              <div className="daily-checkin__result-copy">
                <span>{status.eyebrow}</span>
                <h2>{status.title}</h2>
                <p>
                  {recommendation ||
                    "Puedes actualizarlo si tu estado cambia durante el día."}
                </p>
              </div>
              <CheckCircle2 aria-hidden="true" />
            </motion.section>
          ) : null}
        </AnimatePresence>

        <form onSubmit={submit} className="daily-checkin__form">
          <div className="daily-checkin__intro">
            <div>
              <span>Tu estado ahora</span>
              <h2>Responde según cómo te sientes</h2>
            </div>
            <span>6 preguntas</span>
          </div>

          <section className="daily-checkin__fields">
            {fields.map((field, index) => (
              <ScaleField
                key={field.key}
                field={field}
                value={form[field.key]}
                index={index}
                reduceMotion={reduceMotion}
                onChange={(value) => updateScore(field.key, value)}
              />
            ))}
          </section>

          <section className="daily-checkin__details">
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              aria-expanded={detailsOpen}
              className="daily-checkin__details-toggle"
            >
              <span>
                <strong>¿Tienes una molestia concreta?</strong>
                <small>
                  {form.painAreas.length
                    ? `${form.painAreas.length} ${form.painAreas.length === 1 ? "zona seleccionada" : "zonas seleccionadas"}`
                    : "Opcional"}
                </small>
              </span>
              <ChevronDown
                className={detailsOpen ? "is-open" : ""}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {detailsOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  className="daily-checkin__details-body"
                >
                  <p>Marca únicamente las zonas que requieren atención hoy.</p>
                  <div className="daily-checkin__pain-options">
                    {painOptions.map((area) => {
                      const selected = form.painAreas.includes(area.value);
                      return (
                        <button
                          key={area.value}
                          type="button"
                          onClick={() => togglePainArea(area.value)}
                          aria-pressed={selected}
                          className={selected ? "is-selected" : ""}
                        >
                          {selected ? <Check aria-hidden="true" /> : null}
                          {area.label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="daily-checkin__notes">
                    <span>¿Quieres añadir un detalle?</span>
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
                      placeholder="Ej.: dormí poco o siento tensión en el hombro..."
                    />
                  </label>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          <div className="daily-checkin__submit-wrap">
            <button
              type="submit"
              disabled={saving}
              className="daily-checkin__submit"
            >
              <span>
                {saving
                  ? "Calculando tu estado..."
                  : isToday
                    ? "Actualizar estado de hoy"
                    : "Guardar estado de hoy"}
              </span>
              {saving ? (
                <span
                  className="daily-checkin__submit-spinner"
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
            </button>
            <p>Usaremos tus respuestas para orientar la carga de hoy.</p>
          </div>
        </form>
      </div>
    </main>
  );
}
