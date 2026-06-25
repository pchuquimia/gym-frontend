import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "https://gym-backend-1fod.onrender.com";

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
