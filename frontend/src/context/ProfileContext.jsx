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
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return Promise.resolve()
    }
    setLoading(true)
    return api
      .fetchProfile()
      .then((data) => setProfile(data.profile))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  // AuthContext's own `user` is null both while it's still checking (initial
  // fetchMe() in flight) and once it's confirmed logged-out - indistinguishable
  // from here. Without waiting on authLoading, that first null render would
  // hit the `!user` branch above and set loading=false with no fetch ever
  // attempted; when the real user then arrived a moment later, loading was
  // never reset back to true before the real fetch started, so `profile`
  // read as null but `loading` read as false for that whole window -
  // exactly the state consumers like Dashboard's incomplete-profile banner
  // can't tell apart from "loaded, no profile."
  useEffect(() => {
    if (authLoading) return
    refreshProfile()
  }, [authLoading, refreshProfile])

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>{children}</ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
