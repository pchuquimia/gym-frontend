import axios from "axios";
import { getAuthToken } from "./tokenStorage";

const FALLBACK_API_URL = "https://gym-backend-1fod.onrender.com";

const resolveApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL;

  // Si no hay window, usar configuración segura
  if (typeof window === "undefined") {
    if (
      configured &&
      !configured.includes("localhost") &&
      !configured.includes("127.0.0.1")
    ) {
      return configured;
    }

    return FALLBACK_API_URL;
  }

  const host = window.location.hostname;

  const isBrowserOnLocalhost = host === "localhost" || host === "127.0.0.1";

  const isConfiguredLocalhost =
    configured?.includes("localhost") || configured?.includes("127.0.0.1");

  // En desarrollo local, priorizar el backend local aunque .env apunte a Render.
  if (isBrowserOnLocalhost && import.meta.env.DEV && !isConfiguredLocalhost) {
    return "http://localhost:4000";
  }

  if (configured && isBrowserOnLocalhost) {
    return configured;
  }

  // Si VITE_API_URL existe y NO es localhost, usarlo
  if (configured && !isConfiguredLocalhost) {
    return configured;
  }

  // Si entro desde un celular usando IP local: 192.168.x.x, 10.x.x.x, etc.
  const isPrivateLan =
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

  if (isPrivateLan) {
    return `${window.location.protocol}//${host}:4000`;
  }

  // Nunca devolver localhost si no estoy realmente en localhost
  return FALLBACK_API_URL;
};

export const API_URL = resolveApiUrl();

export const axiosClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  config.metadata = {
    ...(config.metadata || {}),
    startedAt:
      typeof performance !== "undefined" ? performance.now() : Date.now(),
  };
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const reportRequestTiming = (response, error = null) => {
  const startedAt = response?.config?.metadata?.startedAt;
  if (!startedAt) return;
  const clock =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const durationMs = Math.round(clock - startedAt);
  response.config.metadata.durationMs = durationMs;

  if (import.meta.env.DEV && durationMs >= 1200) {
    const method = String(response.config.method || "get").toUpperCase();
    const serverTiming = response.headers?.["server-timing"] || "sin desglose";
    console.warn(
      `[api-lenta] ${method} ${response.config.url} ${durationMs}ms (${serverTiming})`,
      error || "",
    );
  }
};

axiosClient.interceptors.response.use(
  (response) => {
    reportRequestTiming(response);
    return response;
  },
  (error) => {
    if (error.response) reportRequestTiming(error.response, error);
    const responseData = error.response?.data;
    const message =
      responseData?.error ||
      responseData?.message ||
      (typeof responseData === "string" ? responseData : "") ||
      (error.response?.status === 429
        ? "Demasiadas solicitudes. Espera un momento e intenta nuevamente."
        : error.message || "API error");

    const normalized = new Error(message);

    normalized.status = error.response?.status;
    normalized.details = error.response?.data?.details;

    throw normalized;
  },
);
