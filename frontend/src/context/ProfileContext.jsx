import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import * as api from '../lib/api'

const ProfileContext = createContext(null)

// Fetches the viewer's own profile once per session (keyed on AuthContext's
// user, so it doesn't refetch on every route change) and shares it via
// context - mirrors NotificationsContext. Replaces what used to be
// independent fetchProfile() calls in Dashboard, TopNav, and
// useLocationScopeFilter (used across 7+ pages), which together fired the
// same request four times on a single Home page load.
export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return Promise.resolve()
    }
    return api
      .fetchProfile()
      .then((data) => setProfile(data.profile))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>{children}</ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
