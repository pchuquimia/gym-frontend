import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Dumbbell,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import AuthField from "../components/auth/AuthField";
import PremiumAuthLayout from "../components/auth/PremiumAuthLayout";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  passwordStatus,
  validateEmail,
  validatePassword,
} from "../utils/authValidation";
import { getUserHome } from "../utils/userFlow";

const isDedicatedDemoFrontend = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  try {
    const mainHostname = new URL(mainApplicationUrl).hostname.toLowerCase();
    if (hostname === mainHostname) return false;
  } catch {
    // An invalid optional URL must not enable the demo on its own.
  }
  if (hostname.startsWith("demo.")) return true;
  if (import.meta.env.VITE_PUBLIC_DEMO === "true") return true;
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("demo") === "1"
  );
};

const mainApplicationUrl =
  import.meta.env.VITE_MAIN_APP_URL || "https://gym-frontend-t65c.onrender.com";

const inputClass =
  "h-12 w-full rounded-control border border-[color:var(--auth-border)] bg-[color:var(--auth-surface)] pl-11 pr-4 font-sans text-base font-medium text-[color:var(--auth-text)] outline-none transition placeholder:text-[color:var(--auth-muted)] hover:border-white/25 focus:border-[color:var(--auth-accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)] sm:text-sm";

const keepFieldVisible = (event) => {
  const field = event.currentTarget;
  window.setTimeout(() => {
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 250);
};

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
      onPointerDown={(event) => event.preventDefault()}
      className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-control text-[color:var(--auth-muted)] transition hover:bg-[color:var(--auth-surface-hover)] hover:text-[color:var(--auth-text)] focus-visible:ring-[color:var(--auth-accent)]"
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
      onNavigate(getUserHome(user));
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={submitting}>
      <AuthField id="login-email" icon={Mail} label="Correo electrónico">
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={form.email}
          onFocus={keepFieldVisible}
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
          onFocus={keepFieldVisible}
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
          className="font-sans text-xs font-semibold text-[color:var(--auth-muted)] transition hover:text-[color:var(--auth-accent)] focus-visible:ring-[color:var(--auth-accent)]"
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
        className="h-12 w-full rounded-control bg-[color:var(--auth-accent)] text-base font-bold text-[color:var(--auth-accent-contrast)] hover:bg-[color:var(--auth-accent-hover)] focus-visible:ring-[color:var(--auth-accent)]"
        disabled={submitting}
      >
        {submitting ? "Ingresando..." : "Ingresar"}
        {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
      <OperationLoader
        active={submitting}
        delayMs={500}
        title="Iniciando sesion"
        description="Verificando tus credenciales con el servidor."
      />
    </form>
  );
}

const demoRoles = [
  {
    id: "athlete",
    label: "Atleta",
    description: "Entrena y revisa tu progreso",
    icon: Dumbbell,
  },
  {
    id: "coach",
    label: "Coach",
    description: "Gestiona un atleta y su plan",
    icon: UsersRound,
  },
  {
    id: "admin",
    label: "Admin",
    description: "Explora la gestion protegida",
    icon: ShieldCheck,
  },
];

function DemoAccess({ onNavigate }) {
  const { loginDemo } = useAuth();
  const [enabled, setEnabled] = useState(null);
  const [loadingRole, setLoadingRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getDemoStatus()
      .then((data) => {
        if (active) setEnabled(Boolean(data?.enabled));
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (enabled === null) {
    return (
      <div className="border border-white/10 bg-white/[0.035] px-4 py-5 text-sm font-bold text-white/55">
        Preparando el acceso demo...
      </div>
    );
  }

  if (!enabled) {
    return (
      <div
        role="alert"
        className="border border-amber-300/20 bg-amber-300/[0.06] px-4 py-5"
      >
        <p className="text-sm font-black text-amber-100">
          La demo no esta disponible temporalmente
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-white/45">
          El sitio demo no esta autorizado o el servidor se encuentra iniciando.
        </p>
      </div>
    );
  }

  const handleDemoLogin = async (role) => {
    if (loadingRole) return;
    setLoadingRole(role);
    setError("");
    try {
      const user = await loginDemo(role);
      onNavigate(user?.role === "Entrenador" ? "trainer" : "dashboard");
    } catch (requestError) {
      setError(
        requestError?.status === 429
          ? "Hay demasiados accesos demo. Intenta nuevamente en unos minutos."
          : "No pudimos preparar la demo en este momento.",
      );
    } finally {
      setLoadingRole("");
    }
  };

  return (
    <section
      className="mt-7 border-t border-white/10 pt-6"
      aria-label="Acceso de demostracion"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--auth-accent)]">
            Probar la demo
          </p>
          <p className="mt-1 text-xs font-semibold text-white/45">
            Datos ficticios y temporales
          </p>
        </div>
        <span className="rounded-control border border-[color:var(--auth-accent)] px-2 py-1 font-sans text-[10px] font-bold uppercase text-[color:var(--auth-accent)]">
          Sin registro
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {demoRoles.map((role) => {
          const Icon = role.icon;
          const isLoading = loadingRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              aria-label={`Abrir demo como ${role.label}`}
              disabled={Boolean(loadingRole)}
              onClick={() => handleDemoLogin(role.id)}
              className="group flex min-h-20 items-center gap-3 rounded-card border border-[color:var(--auth-border)] bg-[color:var(--auth-surface)] px-3 py-3 text-left transition hover:border-[color:var(--auth-accent)] hover:bg-[color:var(--auth-surface-hover)] disabled:cursor-wait disabled:opacity-55 sm:flex-col sm:items-start sm:gap-2"
            >
              <Icon className="h-5 w-5 shrink-0 text-[color:var(--auth-accent)]" />
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">
                  {isLoading ? "Preparando..." : role.label}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold leading-4 text-white/42">
                  {role.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs font-bold text-red-300">
          {error}
        </p>
      ) : null}
      <OperationLoader
        active={Boolean(loadingRole)}
        delayMs={250}
        title="Preparando tu demo"
        description="Creando un espacio aislado con datos de ejemplo."
      />
    </section>
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
              value={email}
              onFocus={keepFieldVisible}
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
      <OperationLoader
        active={submitting}
        delayMs={500}
        title="Enviando enlace"
        description="Estamos procesando la solicitud de recuperacion."
      />
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
          value={form.password}
          onFocus={keepFieldVisible}
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
          onFocus={keepFieldVisible}
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
      <OperationLoader
        active={submitting}
        delayMs={500}
        title="Actualizando contrasena"
        description="Guardando tus nuevas credenciales de acceso."
      />
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
      .then((user) => onNavigate(getUserHome(user)))
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
    <OperationLoader
      active
      delayMs={250}
      title="Verificando tu correo"
      description="Validando el enlace y activando tu cuenta."
    />
  );
}

export default function Login({
  initialMode = "login",
  onNavigate = () => {},
}) {
  const mode = initialMode;
  const dedicatedDemo = isDedicatedDemoFrontend();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const navigate = (nextMode) => {
    onNavigate(nextMode);
  };

  const isLogin = mode === "login";
  const accountTitle =
    mode === "reset"
      ? "Nueva contraseña"
      : mode === "verify"
        ? "Verificar cuenta"
        : mode === "recover"
          ? "Recuperar acceso"
          : "Iniciar sesión";
  const accountSubtitle =
    mode === "reset"
      ? "Crea una contraseña segura para volver a tu cuenta."
      : mode === "verify"
        ? "Estamos confirmando que este correo te pertenece."
        : mode === "recover"
          ? "Te enviaremos un enlace seguro para restablecer tu contraseña."
          : "Continúa con tus rutinas y registra tu próxima sesión.";

  const title = dedicatedDemo ? "Explora Apex Performance" : accountTitle;
  const subtitle = dedicatedDemo
    ? "Elige un perfil y recorre la aplicacion con datos ficticios y aislados."
    : accountSubtitle;

  return (
    <PremiumAuthLayout
      variant={isLogin ? "login" : "recover"}
      title={title}
      subtitle={subtitle}
      onBack={!dedicatedDemo && !isLogin ? () => navigate("login") : undefined}
      footer={
        dedicatedDemo ? (
          <div className="text-center">
            <p className="text-xs font-semibold text-white/45">
              Â¿Ya utilizas Apex Performance?
            </p>
            <a
              href={mainApplicationUrl}
              className="mt-2 inline-flex font-sans text-sm font-bold text-[color:var(--auth-accent)] transition hover:text-[color:var(--auth-accent-hover)] focus-visible:ring-[color:var(--auth-accent)]"
            >
              Ir a la aplicacion
            </a>
          </div>
        ) : isLogin ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-white/55">
              ¿No tienes cuenta?
            </p>
            <button
              type="button"
              onClick={() => onNavigate("register")}
              className="mt-1 font-sans text-base font-bold text-[color:var(--auth-accent)] transition hover:text-[color:var(--auth-accent-hover)] focus-visible:ring-[color:var(--auth-accent)]"
            >
              Regístrate gratis
            </button>
          </div>
        ) : null
      }
    >
      {dedicatedDemo ? (
        <DemoAccess onNavigate={onNavigate} />
      ) : mode === "recover" ? (
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
DemoAccess.propTypes = { onNavigate: PropTypes.func.isRequired };
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
