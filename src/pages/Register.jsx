import { useState } from "react";
import PropTypes from "prop-types";
import { Apple, ArrowRight, Lock, Mail, User } from "lucide-react";
import Button from "../components/ui/button";
import PremiumAuthLayout from "../components/auth/PremiumAuthLayout";
import { useAuth } from "../context/AuthContext";

const passwordHint =
  "Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.";

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block space-y-1.5 sm:space-y-2">
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
        <Apple className="h-4 w-4" />
        Apple
      </button>
    </div>
  );
}

export default function Register({ onNavigate = () => {} }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "h-10 w-full rounded-xl border border-white/10 bg-slate-950/45 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/20 sm:h-12";

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(form);
      onNavigate("perfil");
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PremiumAuthLayout
      variant="register"
      title="Únete a la Élite"
      subtitle="Crea tu cuenta para transformar tu rendimiento desde hoy."
      heroCompact
      hideHeroOnMobile
      footer={
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="text-sm font-semibold text-blue-50/90"
          >
            ¿Ya tienes cuenta?{" "}
            <span className="font-black text-blue-200">
              Inicia sesión aquí
            </span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
        <div className="pb-1 text-center lg:hidden">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Crear cuenta
          </h1>
          <p className="mt-1 text-xs font-semibold leading-5 text-blue-50/70">
            Registra tus datos para iniciar tu progreso.
          </p>
        </div>

        <Field icon={User} label="Nombre completo">
          <input
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={form.name}
            onChange={handleChange("name")}
            placeholder="John Doe"
            className={inputClass}
          />
        </Field>

        <Field icon={Mail} label="Correo electrónico">
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="atleta@apex.com"
            className={inputClass}
          />
        </Field>

        <Field icon={Lock} label="Contraseña">
          <input
            required
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange("password")}
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>

        <Field icon={Lock} label="Confirmar contraseña">
          <input
            required
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>

        <p className="text-[10px] font-semibold leading-4 text-blue-100/60 sm:text-[11px] sm:leading-5">
          {passwordHint}
        </p>

        {error ? (
          <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-blue-500 text-base font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 sm:h-12"
          disabled={submitting}
        >
          {submitting ? "Creando..." : "Crear cuenta"}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3 py-0.5 sm:py-1">
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
