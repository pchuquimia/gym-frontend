import { useState } from "react";
import PropTypes from "prop-types";
import { ArrowRight, Eye, Lock, Mail, Send } from "lucide-react";
import Button from "../components/ui/button";
import PremiumAuthLayout from "../components/auth/PremiumAuthLayout";
import { useAuth } from "../context/AuthContext";

const roleHome = (role) => {
  if (role === "Admin") return "dashboard";
  if (role === "Entrenador") return "rutinas";
  return "perfil";
};

function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/35 text-xs font-black text-blue-50/90 transition hover:bg-white/10 sm:h-11"
      >
        <span className="text-lg leading-none">G</span>
        Google
      </button>
      <button
        type="button"
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/35 text-xs font-black text-blue-50/90 transition hover:bg-white/10 sm:h-11"
      >
        <span className="text-lg leading-none"></span>
        Apple
      </button>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100/70">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-100/40" />
        {children}
      </div>
    </label>
  );
}

export default function Login({ onNavigate = () => {} }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverSent, setRecoverSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/20 sm:h-12";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login(form);
      onNavigate(roleHome(user?.role));
    } catch (_err) {
      setError("Credenciales inválidas");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecover = (event) => {
    event.preventDefault();
    setRecoverSent(true);
  };

  if (mode === "recover") {
    return (
      <PremiumAuthLayout
        variant="recover"
        title="Recuperar Acceso"
        subtitle="Introduce tu correo y te enviaremos las instrucciones para restablecer tu contraseña."
        eyebrow
        heroCompact
        onBack={() => setMode("login")}
        footer={
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm font-semibold text-blue-100/80"
            >
              ¿Recordaste tu contraseña?{" "}
              <span className="font-black text-blue-200">
                Inicia sesión aquí
              </span>
            </button>
            <p className="mt-10 text-[10px] font-black uppercase tracking-tight text-blue-100/20">
              Apex Performance Systems © 2026
            </p>
          </div>
        }
      >
        <form onSubmit={handleRecover} className="space-y-4">
          <Field icon={Mail} label="Correo electrónico">
            <input
              type="email"
              required
              autoComplete="email"
              value={recoverEmail}
              onChange={(event) => {
                setRecoverSent(false);
                setRecoverEmail(event.target.value);
              }}
              placeholder="atleta@apex.com"
              className={inputClass}
            />
          </Field>
          {recoverSent ? (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
              Si el correo existe, recibirás instrucciones en unos minutos.
            </p>
          ) : null}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-blue-200 text-base font-black text-blue-950 hover:bg-blue-100"
          >
            Enviar instrucciones
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </PremiumAuthLayout>
    );
  }

  return (
    <PremiumAuthLayout
      variant="login"
      title="Push Your Limits"
      subtitle="Inicia sesión para seguir tus métricas y preparar tu próxima sesión."
      hideHeroOnMobile
      footer={
        <div className="border-t border-white/10 pt-5 text-center">
          <p className="text-sm font-semibold text-blue-50/80">
            ¿No tienes cuenta?
          </p>
          <button
            type="button"
            onClick={() => onNavigate("register")}
            className="mt-1 text-base font-black text-emerald-300"
          >
            Regístrate gratis
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="pb-2 text-center lg:hidden">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm font-semibold text-blue-50/70">
            Accede a tu cuenta de entrenamiento.
          </p>
        </div>

        <Field icon={Mail} label="Email address">
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="name@example.com"
            className={inputClass}
          />
        </Field>

        <Field icon={Lock} label="Password">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            placeholder="••••••••"
            className={`${inputClass} pr-12`}
          />
          <Eye className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-100/45" />
        </Field>

        <div className="-mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setMode("recover")}
            className="text-[11px] font-black uppercase tracking-wide text-blue-200"
          >
            ¿Olvidaste?
          </button>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-blue-500 text-base font-black text-blue-950 hover:bg-blue-400 sm:h-12"
          disabled={submitting}
        >
          {submitting ? "Ingresando..." : "Log In"}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3 py-1 sm:py-2">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-black uppercase tracking-wide text-blue-100/55">
            O continúa con
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <SocialButtons />
      </form>
    </PremiumAuthLayout>
  );
}

Field.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
