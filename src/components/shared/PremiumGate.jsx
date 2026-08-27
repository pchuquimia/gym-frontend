import { Crown, LockKeyhole, Sparkles } from "lucide-react";
import Button from "../ui/button";

export default function PremiumGate({
  title = "Funcion premium",
  description,
  plan = "Pro",
  onNavigate,
  compact = false,
}) {
  return (
    <section
      className={`relative overflow-hidden border border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] ${compact ? "p-4" : "grid min-h-72 place-items-center p-6 text-center"}`}
      data-premium-gate
    >
      <Sparkles className="absolute -right-5 -top-5 h-28 w-28 text-current opacity-10" />
      <div className={compact ? "relative" : "relative max-w-md"}>
        <span className="mx-auto grid h-12 w-12 place-items-center border border-[#352018]/30 bg-white text-[#352018] dark:border-[#e2ff00]/30 dark:bg-black/20 dark:text-[#e2ff00]">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-current">
          <Crown className="h-3.5 w-3.5" /> {plan}
        </p>
        <h2 className="mt-1 text-xl font-black uppercase">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-5 text-current/80">
          {description ||
            "Activa una prueba premium para acceder a esta herramienta."}
        </p>
        {onNavigate ? (
          <Button
            type="button"
            className="mt-5 gap-2 !bg-[color:var(--accent-contrast)] text-xs font-black uppercase !text-[color:var(--accent)]"
            onClick={() => onNavigate("planes")}
          >
            <Crown className="h-4 w-4" /> Ver mi cuenta
          </Button>
        ) : (
          <p className="mt-4 text-[11px] font-black uppercase text-current/80">
            Solicita una prueba al administrador
          </p>
        )}
      </div>
    </section>
  );
}
