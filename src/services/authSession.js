export const AUTH_SESSION_EXPIRED_EVENT = "rirfit:auth-session-expired";

const SESSION_NOTICE_KEY = "rirfit_auth_session_notice";
const SESSION_EXPIRED_NOTICE =
  "Tu sesión venció. Inicia sesión nuevamente para continuar.";
const SESSION_NOTICES = {
  AUTH_SESSION_EXPIRED: SESSION_EXPIRED_NOTICE,
  AUTH_SESSION_MISSING: "No encontramos tu sesión. Inicia sesión nuevamente para continuar.",
  AUTH_SESSION_INVALID: "Tu sesión ya no es válida. Inicia sesión nuevamente para continuar.",
  AUTH_SESSION_REVOKED: "Esta sesión se cerró o fue invalidada desde otro acceso. Inicia sesión nuevamente.",
  AUTH_ACCOUNT_UNAVAILABLE: "Tu cuenta no está disponible. Contacta con soporte para revisar el acceso.",
  AUTH_DEMO_EXPIRED: "Tu acceso de demostración terminó. Inicia sesión con tu cuenta para continuar.",
};

// Ignore responses belonging to an access that has since ended or changed.
let sessionVersion = 0;
export const getAuthSessionVersion = () => sessionVersion;
export const advanceAuthSessionVersion = () => ++sessionVersion;

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const isExpiredSessionResponse = ({ status, url, data } = {}) => {
  if (Number(status) !== 401) return false;
  const path = String(url || "").split("?")[0];
  const message = normalizeText(data?.error || data?.message || data);
  return (
    Object.hasOwn(SESSION_NOTICES, data?.code) ||
    path === "/api/auth/me" ||
    message === "no autenticado" ||
    message === "unauthorized" ||
    message === "la sesion demo ha vencido"
  );
};

export const notifyExpiredSession = (code) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
    detail: { code },
  }));
};

export const storeExpiredSessionNotice = (code) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      SESSION_NOTICE_KEY,
      Object.hasOwn(SESSION_NOTICES, code) ? SESSION_NOTICES[code] : SESSION_EXPIRED_NOTICE,
    );
  } catch {
    // El redireccionamiento sigue funcionando sin almacenamiento disponible.
  }
};

export const consumeExpiredSessionNotice = () => {
  if (typeof window === "undefined") return "";
  try {
    const notice = window.sessionStorage.getItem(SESSION_NOTICE_KEY) || "";
    window.sessionStorage.removeItem(SESSION_NOTICE_KEY);
    return notice;
  } catch {
    return "";
  }
};
