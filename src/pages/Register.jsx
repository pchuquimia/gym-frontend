import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import AuthField from "../components/auth/AuthField";
import PremiumAuthLayout from "../components/auth/PremiumAuthLayout";
import Button from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  passwordStatus,
  validateEmail,
  validatePassword,
} from "../utils/authValidation";

const inputClass =
  "h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/20 sm:h-12";

const validateForm = (form) => ({
  name:
    form.name.trim().length < 2
      ? "Ingresa un nombre de al menos 2 caracteres."
      : "",
  email: validateEmail(form.email),
  password: validatePassword(form.password),
  confirmPassword:
    form.confirmPassword === form.password
      ? ""
      : "Las contraseñas no coinciden.",
});

export default function Register({ onNavigate = () => {} }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const missingPasswordRules = useMemo(
    () => passwordStatus(form.password),
    [form.password],
  );

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
    if (requestError) setRequestError("");
  };

  const handleBlur = (field) => () => {
    setErrors((previous) => ({
      ...previous,
      [field]: validateForm(form)[field],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSubmitting(true);
    setRequestError("");
    try {
      const result = await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      if (result?.verificationRequired) {
        setVerificationEmail(result.email || form.email.trim());
        toast.success("Usuario creado", {
          description: "Revisa tu correo para activar la cuenta.",
        });
        return;
      }
      toast.success("Usuario creado", {
        description: "La cuenta está lista para configurar.",
      });
      onNavigate("perfil");
    } catch (error) {
      if (error.status === 409) {
        setErrors((previous) => ({
          ...previous,
          email: "Ya existe una cuenta con este correo.",
        }));
      } else if (!error.status) {
        setRequestError(
          "No pudimos conectar con el servidor. Revisa tu conexión.",
        );
      } else if (error.status === 429) {
        setRequestError(
          "Demasiados intentos. Espera unos minutos e inténtalo nuevamente.",
        );
      } else {
        setRequestError(error.message || "No se pudo crear la cuenta.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (field) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `register-${field}-error` : undefined,
  });

  if (verificationEmail) {
    return (
      <PremiumAuthLayout
        variant="register"
        title="Revisa tu correo"
        subtitle="Confirma tu dirección para activar la cuenta."
        heroCompact
        hideHeroOnMobile
        footer={
          <div className="text-center">
            <button
              type="button"
              onClick={() => onNavigate("login")}
              className="text-sm font-black text-blue-200"
            >
              Volver a iniciar sesión
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-center" role="status" aria-live="polite">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
          <div>
            <h1 className="text-xl font-black text-white">Cuenta creada</h1>
            <p className="mt-2 text-sm leading-6 text-blue-50/75">
              Enviamos un enlace a {verificationEmail}. Estará disponible
              durante 24 horas.
            </p>
          </div>
        </div>
      </PremiumAuthLayout>
    );
  }

  return (
    <PremiumAuthLayout
      variant="register"
      title="Empieza tu progreso"
      subtitle="Crea tu cuenta y configura tu entrenamiento en pocos pasos."
      heroCompact
      hideHeroOnMobile
      footer={
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="text-sm font-semibold text-blue-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
          >
            ¿Ya tienes cuenta?{" "}
            <span className="font-black text-blue-200">Inicia sesión</span>
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-3"
        noValidate
        aria-busy={submitting}
      >
        <div className="pb-1 text-center lg:hidden">
          <h1 className="text-2xl font-black text-white">Crear cuenta</h1>
          <p className="mt-1 text-xs font-semibold leading-5 text-blue-50/70">
            Registra tus datos para comenzar.
          </p>
        </div>
        <AuthField
          id="register-name"
          icon={User}
          label="Nombre completo"
          error={errors.name}
        >
          <input
            id="register-name"
            name="name"
            autoComplete="name"
            autoFocus
            maxLength={80}
            value={form.name}
            onChange={handleChange("name")}
            onBlur={handleBlur("name")}
            placeholder="Nombre y apellido"
            className={inputClass}
            {...fieldProps("name")}
          />
        </AuthField>
        <AuthField
          id="register-email"
          icon={Mail}
          label="Correo electrónico"
          error={errors.email}
        >
          <input
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            onBlur={handleBlur("email")}
            placeholder="nombre@correo.com"
            className={inputClass}
            {...fieldProps("email")}
          />
        </AuthField>
        <AuthField
          id="register-password"
          icon={Lock}
          label="Contraseña"
          error={errors.password}
        >
          <input
            id="register-password"
            name="password"
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
            placeholder="Crea una contraseña"
            className={`${inputClass} pr-12`}
            {...fieldProps("password")}
            aria-describedby={
              errors.password
                ? "register-password-error"
                : "register-password-hint"
            }
          />
          <button
            type="button"
            onClick={() => setShowPasswords((value) => !value)}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-blue-100/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
            aria-label={
              showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"
            }
            aria-pressed={showPasswords}
          >
            {showPasswords ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </AuthField>
        <p
          id="register-password-hint"
          className={`text-[11px] font-semibold ${form.password && !missingPasswordRules.length ? "text-emerald-300" : "text-blue-100/65"}`}
        >
          {form.password
            ? missingPasswordRules.length
              ? `Falta: ${missingPasswordRules.join(", ")}.`
              : "La contraseña cumple los requisitos."
            : "Usa 8 caracteres, mayúscula, minúscula, número y símbolo."}
        </p>
        <AuthField
          id="register-confirmPassword"
          icon={Lock}
          label="Confirmar contraseña"
          error={errors.confirmPassword}
        >
          <input
            id="register-confirmPassword"
            name="confirmPassword"
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            onBlur={handleBlur("confirmPassword")}
            placeholder="Repite tu contraseña"
            className={inputClass}
            {...fieldProps("confirmPassword")}
          />
        </AuthField>
        {requestError ? (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"
          >
            {requestError}
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-12 w-full rounded-lg text-base font-black"
          disabled={submitting}
        >
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </PremiumAuthLayout>
  );
}

Register.propTypes = { onNavigate: PropTypes.func };
