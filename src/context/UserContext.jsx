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
  birthDate: "",
  privacy: "público",
  notifications: {
    workoutReminders: true,
    achievements: true,
    community: false,
  },
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
  const [profile, setProfile] = useState(defaultProfile);
  const [security, setSecurity] = useState(defaultSecurity);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.getProfile();
      setProfile(mergeProfile(data.profile));
      setSecurity({ ...defaultSecurity, ...(data.security || {}) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(async (payload) => {
    setProfile((prev) => mergeProfile({ ...prev, ...payload }));
    const data = await api.updateProfile(payload);
    setProfile(mergeProfile(data.profile));
    setSecurity({ ...defaultSecurity, ...(data.security || {}) });
    return data.profile;
  }, []);

  const updateSecurity = useCallback(async (payload) => {
    setSecurity((prev) => ({ ...prev, ...payload }));
    const data = await api.updateSecurity(payload);
    setProfile(mergeProfile(data.profile));
    setSecurity({ ...defaultSecurity, ...(data.security || {}) });
    return data.security;
  }, []);

  const value = useMemo(
    () => ({
      profile,
      security,
      loading,
      updateProfile,
      updateSecurity,
      refreshProfile,
    }),
    [profile, security, loading, updateProfile, updateSecurity, refreshProfile],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProvider");
  return ctx;
}
