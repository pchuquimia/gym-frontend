import axios from "axios";

const resolveApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (typeof window === "undefined") {
    return configured || "https://gym-backend-1fod.onrender.com";
  }

  const host = window.location.hostname;
  const isLocalhostConfig =
    configured?.includes("localhost") || configured?.includes("127.0.0.1");
  const isBrowserOnLocalhost = host === "localhost" || host === "127.0.0.1";

  if (configured && (!isLocalhostConfig || isBrowserOnLocalhost)) {
    return configured;
  }

  const isPrivateLan =
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

  if (isPrivateLan) {
    return `${window.location.protocol}//${host}:4000`;
  }

  return configured || "https://gym-backend-1fod.onrender.com";
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
