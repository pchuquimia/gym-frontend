import { useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import AuthField from "../components/auth/AuthField";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { isGoogleSignInConfigured } from "../config/googleAuth";
import PremiumAuthLayout from "../components/auth/PremiumAuthLayout";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "../utils/authValidation";
import { getUserHome } from "../utils/userFlow";

const inputClass =
  "h-14 w-full border-0 border-b border-[color:var(--auth-border)] bg-transparent pl-4 pr-4 font-sans text-sm font-normal tracking-normal text-[#50524d] outline-none transition placeholder:font-normal placeholder:text-[#d0d2cc] placeholder:opacity-100 hover:border-[#b9bbb4] focus:border-[color:var(--auth-text)] focus:ring-0";

const validateForm = (form) => ({
  username: validateUsername(form.username),
  email: validateEmail(form.email),
  password: validatePassword(form.password),
  confirmPassword:
    form.confirmPassword === form.password
      ? ""
      : "Las contraseñas no coinciden.",
});

export default function Register({ onNavigate = () => {} }) {
  const { register, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    emailMarketingConsent: false,
  });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);
  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
    if (requestError) setRequestError("");
  };

  const handleBlur = (field) => () => {
    if (!String(form[field] || "").trim()) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
      return;
    }
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
        username: normalizeUsername(form.username),
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
      onNavigate("onboarding");
    } catch (error) {
      if (error.status === 409) {
        const usernameTaken =
          error.code === "USERNAME_TAKEN" || /usuario/i.test(error.message);
        setErrors((previous) =>
          usernameTaken
            ? {
                ...previous,
                username: "Este nombre de usuario ya está en uso.",
              }
            : {
                ...previous,
                email: "Ya existe una cuenta con este correo.",
              },
        );
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

  const handleResendVerification = async () => {
    if (!verificationEmail || resendingVerification) return;
    setResendingVerification(true);
    try {
      await api.resendVerification({ email: verificationEmail });
      toast.success("Enlace enviado", {
        description: "Revisa también tu carpeta de correo no deseado.",
      });
    } catch (error) {
      toast.error("No pudimos reenviar el enlace", {
        description: error.message || "Inténtalo nuevamente en unos minutos.",
      });
    } finally {
      setResendingVerification(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (submitting || googleSubmitting) return;
    setGoogleSubmitting(true);
    setRequestError("");
    try {
      const user = await loginWithGoogle(
        credential,
        form.emailMarketingConsent ? { emailMarketingConsent: true } : {},
      );
      toast.success("Cuenta lista", {
        description: "Ingresaste de forma segura con Google.",
      });
      onNavigate(getUserHome(user));
    } catch (error) {
      setRequestError(
        error?.status === 503
          ? "El acceso con Google no está configurado temporalmente."
          : error?.message || "No pudimos continuar con Google.",
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  if (verificationEmail) {
    return (
      <PremiumAuthLayout
        variant="register"
        title="Revisa tu correo"
        subtitle="Confirma tu dirección para activar la cuenta."
        footer={
          <div className="text-center">
            <button
              type="button"
              onClick={() => onNavigate("login")}
              className="text-sm font-bold text-[color:var(--auth-accent)]"
            >
              Volver a iniciar sesión
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-center" role="status" aria-live="polite">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <div>
            <h1 className="text-xl font-black text-[color:var(--auth-text)]">
              Cuenta creada
            </h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--auth-muted)]">
              Enviamos un enlace a {verificationEmail}. Estará disponible
              durante 24 horas.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={resendingVerification}
            onClick={handleResendVerification}
            className="h-11 w-full rounded-lg"
          >
            {resendingVerification ? "Reenviando..." : "Reenviar enlace"}
          </Button>
        </div>
      </PremiumAuthLayout>
    );
  }

  return (
    <PremiumAuthLayout
      variant="register"
      title="Regístrate con tu correo"
      subtitle=""
      heroTitle="Empieza hoy."
      heroSubtitle="Una cuenta para registrar cada serie y hacer visible tu progreso."
      footer={
        <p className="text-sm font-medium text-[color:var(--auth-hero-muted)]">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="border-b border-[color:var(--auth-hero-text)] font-bold text-[color:var(--auth-hero-text)] transition hover:border-transparent focus-visible:ring-[color:var(--auth-accent)]"
          >
            Inicia sesión
          </button>
        </p>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-busy={submitting || googleSubmitting}
      >
        <AuthField
          id="register-username"
          label="Nombre de usuario"
          error={errors.username}
        >
          <input
            id="register-username"
            name="username"
            type="text"
            autoComplete="username"
            inputMode="text"
            maxLength={20}
            value={form.username}
            onChange={(event) => {
              const value = event.target.value.toLowerCase();
              setForm((previous) => ({ ...previous, username: value }));
              if (errors.username) {
                setErrors((previous) => ({ ...previous, username: "" }));
              }
              if (requestError) setRequestError("");
            }}
            onBlur={handleBlur("username")}
            placeholder="usuario"
            className={inputClass}
            {...fieldProps("username")}
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
          />
          <button
            type="button"
            onClick={() => setShowPasswords((value) => !value)}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-control text-[color:var(--auth-muted)] hover:bg-[color:var(--auth-surface-hover)] hover:text-[color:var(--auth-text)] focus-visible:ring-[color:var(--auth-accent)]"
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
        <label className="flex cursor-pointer items-start gap-3 py-2 text-sm font-normal leading-5 text-[color:var(--auth-hero-muted)]">
          <input
            type="checkbox"
            name="emailMarketingConsent"
            checked={form.emailMarketingConsent}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                emailMarketingConsent: event.target.checked,
              }))
            }
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[color:var(--auth-border)] accent-[#dcf900] focus-visible:ring-[#202120]"
          />
          <span>Pueden contactarme por correo electrónico.</span>
        </label>
        {requestError ? (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
          >
            {requestError}
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-12 w-full rounded-lg !bg-[#202120] text-sm font-medium !text-white hover:!bg-black focus-visible:ring-[#202120]"
          disabled={submitting || googleSubmitting}
        >
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
        <div className="space-y-4 pt-3">
          <p className="font-sans text-sm font-normal text-[#50524d]">
            O regístrate con
          </p>
          <div className="space-y-3">
            {isGoogleSignInConfigured ? (
              <GoogleSignInButton
                text="signup_with"
                disabled={submitting || googleSubmitting}
                onCredential={handleGoogleCredential}
                onError={() =>
                  setRequestError("No pudimos cargar el acceso con Google.")
                }
              />
            ) : null}
          </div>
        </div>
        <OperationLoader
          active={submitting || googleSubmitting}
          delayMs={500}
          title={
            googleSubmitting ? "Conectando con Google" : "Creando tu cuenta"
          }
          description={
            googleSubmitting
              ? "Validando tu cuenta de forma segura."
              : "Guardando tus datos y preparando el acceso inicial."
          }
        />
      </form>
    </PremiumAuthLayout>
  );
}

Register.propTypes = { onNavigate: PropTypes.func };
