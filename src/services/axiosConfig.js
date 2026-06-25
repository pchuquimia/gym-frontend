import axios from "axios";

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

  // Si estoy trabajando en localhost, puedo usar localhost
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

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "API error";

    const normalized = new Error(message);

    normalized.status = error.response?.status;
    normalized.details = error.response?.data?.details;

    throw normalized;
  },
);
