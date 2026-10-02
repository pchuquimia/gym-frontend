import { useAuth } from "../context/AuthContext";
import PlanProgressFocus from "../components/progress/PlanProgressFocus";

interface Props {
  dataOwnerId?: string;
  onNavigate: (page: string) => void;
  onBack?: (page: string) => void;
}

export default function PlanProgressPage({ dataOwnerId = "", onNavigate, onBack }: Props) {
  const { user } = useAuth() as { user: { id?: string; _id?: string } | null };
  const owner = dataOwnerId || String(user?.id || user?._id || "");
  const planId = typeof window !== "undefined"
    ? String(window.history.state?.progressPlanId || "")
    : "";

  if (!planId) {
    return (
      <section className="mx-auto max-w-xl px-5 py-10 text-[color:var(--text)]">
        <h1 className="text-2xl font-semibold">Selecciona una planificación</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Abre el progreso desde la tarjeta de tu plan en Inicio.
        </p>
        <button type="button" className="mt-5 underline" onClick={() => onNavigate("dashboard")}>
          Volver al inicio
        </button>
      </section>
    );
  }

  return <PlanProgressFocus owner={owner} planId={planId} onNavigate={onNavigate} onBack={onBack} />;
}
