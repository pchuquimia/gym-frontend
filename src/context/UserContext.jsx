import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";

/* eslint-disable react-refresh/only-export-components */

const defaultProfile = {
  weight: 82.5,
  height: 181,
  goal: "mantenimiento",
  calories: 2500,
  units: "metric",
  language: "es",
  birthDate: "",
  privacy: "público",
  notifications: {
    workoutReminders: true,
    achievements: true,
    community: false,
  },
  avatarPhotoId: "",
};

const defaultSecurity = {
  biometricEnabled: true,
  twoFactorEnabled: false,
};

const UserContext = createContext(null);

const mergeProfile = (profile = {}) => ({
  ...defaultProfile,
  ...profile,
  notifications: {
    ...defaultProfile.notifications,
    ...(profile?.notifications || {}),
  },
});

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [security, setSecurity] = useState(defaultSecurity);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState({ emailChange: false });

  const refreshProfile = useCallback(async () => {
    try {
      setError("");
      const data = await api.getProfile();
      setProfile(mergeProfile(data.profile));
      setSecurity({ ...defaultSecurity, ...(data.security || {}) });
      setCapabilities({ emailChange: Boolean(data.capabilities?.emailChange) });
    } catch (requestError) {
      setError(requestError.message || "No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (payload) => {
      const previousProfile = profile;
      try {
        setError("");
        const data = await api.updateProfile(payload);
        setProfile(mergeProfile(data.profile));
        setSecurity({ ...defaultSecurity, ...(data.security || {}) });
        return data.profile;
      } catch (requestError) {
        setProfile(previousProfile);
        setError(requestError.message || "No se pudo guardar el perfil.");
        throw requestError;
      }
    },
    [profile],
  );

  const updateSecurity = useCallback(
    async (payload) => {
      const previousSecurity = security;
      try {
        const data = await api.updateSecurity(payload);
        setProfile(mergeProfile(data.profile));
        setSecurity({ ...defaultSecurity, ...(data.security || {}) });
        return data.security;
      } catch (requestError) {
        setSecurity(previousSecurity);
        throw requestError;
      }
    },
    [security],
  );

  const value = useMemo(
    () => ({
      profile,
      security,
      loading,
      error,
      capabilities,
      updateProfile,
      updateSecurity,
      refreshProfile,
    }),
    [
      profile,
      security,
      loading,
      error,
      capabilities,
      updateProfile,
      updateSecurity,
      refreshProfile,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProvider");
  return ctx;
}
