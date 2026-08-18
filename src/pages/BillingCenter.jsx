import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { planLabel } from "../utils/premium";

const formatDate = (value) => {
  if (!value) return "Sin vencimiento";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin vencimiento";
  return date.toLocaleDateString("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const statusLabel = (subscription = {}) => {
  if (subscription.status === "trialing") return "Prueba activa";
  if (subscription.status === "expired") return "Vencido";
  if (subscription.status === "canceled") return "Cancelado";
  return subscription.isPremium ? "Premium activo" : "Plan activo";
};

export default function BillingCenter() {
  const { user, refreshUser } = useAuth();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getBillingSummary()
      .then((data) => active && setBilling(data))
      .catch(
        (error) =>
          active &&
          toast.error(error.message || "No se pudieron cargar los planes"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const subscription = billing?.subscription || user?.subscription || {};
  const currentPlan = subscription.effectivePlan || "free";
  const expiration = subscription.trialEndsAt || subscription.currentPeriodEnd;
  const recommendedPlan = billing?.recommendedPlan || "free";
  const plans = billing?.plans || [];
  const recommended = plans.find((plan) => plan.id === recommendedPlan);
  const hasIncludedAccess = user?.role === "Admin" || user?.isDemo;

  const startTrial = async () => {
    try {
      setAction("trial");
      const result = await api.startBillingTrial();
      setBilling(result.billing);
      await refreshUser({ force: true });
      toast.success("Tu prueba Premium ya esta activa", {
        description: `Tienes ${result.billing.trialDays} dias para explorar todas las funciones.`,
      });
    } catch (error) {
      toast.error(error.message || "No se pudo iniciar la prueba");
    } finally {
      setAction("");
    }
  };

  const cancelPremium = async () => {
    if (
      !window.confirm(
        "El acceso Premium se desactivara inmediatamente. ¿Deseas continuar?",
      )
    )
      return;
    try {
      setAction("cancel");
      const result = await api.cancelBilling();
      setBilling(result.billing);
      await refreshUser({ force: true });
      toast.success("La cuenta volvio al plan Free");
    } catch (error) {
      toast.error(error.message || "No se pudo cancelar Premium");
    } finally {
      setAction("");
    }
  };

  if (loading) {
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Cargando planes"
        description="Consultando tu suscripcion y funciones disponibles."
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-24 text-[color:var(--text)]">
      <header className="border-b border-[color:var(--border)] pb-5">
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          Cuenta y suscripcion
        </p>
        <h1 className="mt-1 text-[30px] font-black uppercase leading-none sm:text-[36px]">
          Planes y Premium
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-5 text-[color:var(--text-muted)]">
          Revisa tu acceso actual y activa las herramientas avanzadas que
          corresponden a tu tipo de cuenta.
        </p>
      </header>

      <section className="grid gap-4 border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <span className="theme-accent-soft grid h-14 w-14 place-items-center border">
          <Crown className="h-6 w-6" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
            Tu plan actual
          </p>
          <h2 className="mt-1 text-xl font-black uppercase">
            {hasIncludedAccess ? "Acceso completo" : planLabel(currentPlan)}
          </h2>
          <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
            {hasIncludedAccess
              ? "Incluido por el tipo de cuenta"
              : `${statusLabel(subscription)} · ${formatDate(expiration)}`}
          </p>
        </div>
        {subscription.isPremium && !hasIncludedAccess ? (
          <Button
            variant="outline"
            disabled={Boolean(action)}
            onClick={cancelPremium}
            className="text-red-600 dark:text-red-300"
          >
            {action === "cancel" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancelar Premium
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-emerald-600 dark:text-[#e2ff00]">
            <ShieldCheck className="h-4 w-4" /> Acceso verificado
          </span>
        )}
      </section>

      <section>
        <div className="mb-3">
          <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
            Comparar acceso
          </p>
          <h2 className="mt-1 text-xl font-black uppercase">
            Planes disponibles
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isRecommended =
              plan.id === recommendedPlan && plan.id !== "free";
            return (
              <article
                key={plan.id}
                className={`relative overflow-hidden border bg-[color:var(--card)] p-5 ${isCurrent ? "border-[#ff5722] dark:border-[#e2ff00]" : "border-[color:var(--border)]"}`}
              >
                {isRecommended ? (
                  <span className="absolute right-0 top-0 bg-[#ff5722] px-3 py-1.5 text-[9px] font-black uppercase text-white dark:bg-[#e2ff00] dark:text-black">
                    Recomendado
                  </span>
                ) : null}
                <Sparkles className="h-5 w-5 text-[#ff5722] dark:text-[#e2ff00]" />
                <h3 className="mt-4 text-xl font-black uppercase">
                  {plan.name}
                </h3>
                <p className="mt-2 min-h-10 text-sm font-semibold leading-5 text-[color:var(--text-muted)]">
                  {plan.description}
                </p>
                <div className="mt-5 space-y-3 border-t border-[color:var(--border)] pt-4">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex gap-2 text-xs font-bold">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </p>
                  ))}
                </div>
                {isCurrent ? (
                  <p className="mt-5 text-center text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                    Plan actual
                  </p>
                ) : isRecommended && billing?.canStartTrial ? (
                  <Button
                    className="mt-5 h-12 w-full gap-2 text-xs font-black uppercase"
                    disabled={Boolean(action)}
                    onClick={startTrial}
                  >
                    {action === "trial" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarDays className="h-4 w-4" />
                    )}
                    Probar gratis {billing.trialDays} dias
                  </Button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {!subscription.isPremium && recommended && !billing?.canStartTrial ? (
        <section className="border-l-2 border-[#ff5722] bg-[#fff5f1] p-4 dark:border-[#e2ff00] dark:bg-[#171900]">
          <p className="text-xs font-black uppercase">
            Prueba gratuita utilizada
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-muted)]">
            Solicita al administrador la activacion de {recommended.name}. La
            integracion de cobros online se conectara a este mismo centro de
            planes.
          </p>
        </section>
      ) : null}
    </main>
  );
}
