import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const defaultProfile = {
  weight: 82.5,
  height: 181,
  goal: 'mantenimiento',
  calories: 2500,
  units: 'metric',
  notifications: { push: true, email: true },
}

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('user_profile') : null
    return stored ? JSON.parse(stored) : defaultProfile
  })

  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(profile))
  }, [profile])

  const updateProfile = (payload) => {
    setProfile((prev) => ({ ...prev, ...payload }))
  }

  const value = useMemo(() => ({ profile, updateProfile }), [profile])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserProfile() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserProfile must be used within UserProvider')
  return ctx
}
