import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Send,
} from "lucide-react";
import AuthField from "../components/auth/AuthField";
import PremiumAuthLayout from "../components/auth/PremiumAuthLayout";
import Button from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  passwordStatus,
  validateEmail,
  validatePassword,
} from "../utils/authValidation";

const roleHome = (role) => {
  if (role === "Admin") return "dashboard";
  if (role === "Entrenador") return "trainer";
  return "perfil";
};

const inputClass =
  "h-12 w-full rounded-lg border border-white/10 bg-slate-950/50 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/20";

const loginErrorMessage = (error) => {
  if (error?.status === 423) return error.message;
  if (error?.status === 403) return error.message;
  if (error?.status === 429)
    return "Demasiados intentos. Espera unos minutos antes de volver a intentar.";
  if (!error?.status)
    return "No pudimos conectar con el servidor. Revisa tu conexión.";
  if (error.status >= 500)
    return "El servicio no está disponible temporalmente.";
  return "El correo o la contraseña no son correctos.";
};

function PasswordToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-blue-100/60 transition hover:bg-white/10 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={visible}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function LoginForm({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const user = await login({ ...form, email: form.email.trim() });
      onNavigate(roleHome(user?.role));
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
      <div className="text-center lg:hidden">
        <h1 className="text-2xl font-black text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm font-semibold text-blue-50/70">
          Accede a tu cuenta de entrenamiento.
        </p>
      </div>
      <AuthField id="login-email" icon={Mail} label="Correo electrónico">
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          value={form.email}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, email: event.target.value }))
          }
          placeholder="nombre@correo.com"
          className={inputClass}
        />
      </AuthField>
      <AuthField id="login-password" icon={Lock} label="Contraseña">
        <input
          id="login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              password: event.target.value,
            }))
          }
          placeholder="Ingresa tu contraseña"
          className={`${inputClass} pr-12`}
        />
        <PasswordToggle
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </AuthField>
      <div className="-mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => onNavigate("recover")}
          className="text-xs font-bold text-blue-200 transition hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="h-12 w-full rounded-lg text-base font-black"
        disabled={submitting}
      >
        {submitting ? "Ingresando..." : "Ingresar"}
        {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </form>
  );
}

function RecoverForm({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextError = validateEmail(email);
    setFieldError(nextError);
    if (nextError || submitting) return;
    setSubmitting(true);
    setRequestError("");
    try {
      await api.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (error) {
      setRequestError(
        error.status === 503
          ? error.message
          : "No pudimos procesar la solicitud. Intenta nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {sent ? (
        <div className="space-y-4 text-center" role="status" aria-live="polite">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
          <div>
            <h2 className="text-lg font-black text-white">Revisa tu correo</h2>
            <p className="mt-1 text-sm leading-6 text-blue-50/75">
              Si existe una cuenta asociada, recibirás un enlace válido durante
              30 minutos.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => onNavigate("login")}
            className="h-12 w-full rounded-lg"
          >
            Volver a iniciar sesión
          </Button>
        </div>
      ) : (
        <>
          <AuthField
            id="recover-email"
            icon={Mail}
            label="Correo electrónico"
            error={fieldError}
          >
            <input
              id="recover-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldError) setFieldError("");
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "recover-email-error" : undefined}
              placeholder="nombre@correo.com"
              className={inputClass}
            />
          </AuthField>
          {requestError ? (
            <p role="alert" className="text-xs font-bold text-red-200">
              {requestError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-lg text-base font-black"
          >
            {submitting ? "Enviando..." : "Enviar enlace"}
            {!submitting ? <Send className="h-4 w-4" /> : null}
          </Button>
        </>
      )}
    </form>
  );
}

function ResetForm({ token, onNavigate }) {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const missing = useMemo(() => passwordStatus(form.password), [form.password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      password: validatePassword(form.password),
      confirmPassword:
        form.confirmPassword === form.password
          ? ""
          : "Las contraseñas no coinciden.",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !token || submitting) return;
    setSubmitting(true);
    setRequestError("");
    try {
      await api.resetPassword({ token, ...form });
      setCompleted(true);
    } catch (error) {
      setRequestError(error.message || "No pudimos restablecer la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p role="alert" className="text-sm text-red-200">
          El enlace de recuperación está incompleto.
        </p>
        <Button type="button" onClick={() => onNavigate("recover")}>
          Solicitar otro enlace
        </Button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-4 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
        <h2 className="text-lg font-black">Contraseña actualizada</h2>
        <p className="text-sm text-blue-50/75">
          Ya puedes ingresar con tu nueva contraseña.
        </p>
        <Button
          type="button"
          onClick={() => onNavigate("login")}
          className="w-full"
        >
          Iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AuthField
        id="reset-password"
        icon={Lock}
        label="Nueva contraseña"
        error={errors.password}
      >
        <input
          id="reset-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          autoFocus
          value={form.password}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              password: event.target.value,
            }))
          }
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "reset-password-error" : "reset-password-hint"
          }
          className={`${inputClass} pr-12`}
        />
        <PasswordToggle
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </AuthField>
      {form.password ? (
        <p
          id="reset-password-hint"
          className={`text-xs font-semibold ${missing.length ? "text-blue-100/65" : "text-emerald-300"}`}
        >
          {missing.length
            ? `Falta: ${missing.join(", ")}.`
            : "La contraseña cumple los requisitos."}
        </p>
      ) : null}
      <AuthField
        id="reset-confirm-password"
        icon={Lock}
        label="Confirmar contraseña"
        error={errors.confirmPassword}
      >
        <input
          id="reset-confirm-password"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              confirmPassword: event.target.value,
            }))
          }
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "reset-confirm-password-error" : undefined
          }
          className={inputClass}
        />
      </AuthField>
      {requestError ? (
        <p role="alert" className="text-xs font-bold text-red-200">
          {requestError}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-lg"
      >
        {submitting ? "Guardando..." : "Guardar contraseña"}
      </Button>
    </form>
  );
}

function VerifyEmail({ token, onNavigate }) {
  const { verifyEmail } = useAuth();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    verifyEmail(token)
      .then((user) => onNavigate(roleHome(user?.role)))
      .catch((requestError) =>
        setError(
          requestError.message || "No pudimos verificar tu correo electrónico.",
        ),
      );
  }, [onNavigate, token, verifyEmail]);

  if (!token || error) {
    return (
      <div className="space-y-4 text-center">
        <p role="alert" className="text-sm leading-6 text-red-200">
          {error || "El enlace de verificación está incompleto."}
        </p>
        <Button type="button" onClick={() => onNavigate("login")}>
          Volver a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="py-3 text-center" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-blue-50/80">
        Verificando tu correo...
      </p>
    </div>
  );
}

export default function Login({
  initialMode = "login",
  onNavigate = () => {},
}) {
  const mode = initialMode;
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const navigate = (nextMode) => {
    onNavigate(nextMode);
  };

  const isLogin = mode === "login";
  const title =
    mode === "reset"
      ? "Nueva contraseña"
      : mode === "verify"
        ? "Verificar cuenta"
        : mode === "recover"
          ? "Recuperar acceso"
          : "Entrena con control";
  const subtitle =
    mode === "reset"
      ? "Crea una contraseña segura para volver a tu cuenta."
      : mode === "verify"
        ? "Estamos confirmando que este correo te pertenece."
        : mode === "recover"
          ? "Te enviaremos un enlace seguro para restablecer tu contraseña."
          : "Accede a tus rutinas, métricas y sesiones desde un solo lugar.";

  return (
    <PremiumAuthLayout
      variant={isLogin ? "login" : "recover"}
      title={title}
      subtitle={subtitle}
      heroCompact={!isLogin}
      hideHeroOnMobile={isLogin}
      onBack={!isLogin ? () => navigate("login") : undefined}
      footer={
        isLogin ? (
          <div className="border-t border-white/10 pt-5 text-center">
            <p className="text-sm font-semibold text-blue-50/80">
              ¿No tienes cuenta?
            </p>
            <button
              type="button"
              onClick={() => onNavigate("register")}
              className="mt-1 text-base font-black text-emerald-300 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
            >
              Regístrate gratis
            </button>
          </div>
        ) : null
      }
    >
      {mode === "recover" ? (
        <RecoverForm onNavigate={navigate} />
      ) : mode === "verify" ? (
        <VerifyEmail token={token} onNavigate={navigate} />
      ) : mode === "reset" ? (
        <ResetForm token={token} onNavigate={navigate} />
      ) : (
        <LoginForm onNavigate={onNavigate} />
      )}
    </PremiumAuthLayout>
  );
}

Login.propTypes = {
  initialMode: PropTypes.oneOf(["login", "recover", "reset", "verify"]),
  onNavigate: PropTypes.func,
};

LoginForm.propTypes = { onNavigate: PropTypes.func.isRequired };
RecoverForm.propTypes = { onNavigate: PropTypes.func.isRequired };
ResetForm.propTypes = {
  token: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
};
PasswordToggle.propTypes = {
  visible: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
VerifyEmail.propTypes = {
  token: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
};
