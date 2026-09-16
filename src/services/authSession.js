export const AUTH_SESSION_EXPIRED_EVENT = "rirfit:auth-session-expired";

const SESSION_NOTICE_KEY = "rirfit_auth_session_notice";
const SESSION_EXPIRED_NOTICE =
  "Tu sesión venció. Inicia sesión nuevamente para continuar.";

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
    path === "/api/auth/me" ||
    message === "no autenticado" ||
    message === "unauthorized" ||
    message === "la sesion demo ha vencido"
  );
};

export const notifyExpiredSession = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
};

export const storeExpiredSessionNotice = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_NOTICE_KEY, SESSION_EXPIRED_NOTICE);
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
