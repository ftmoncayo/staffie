import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Registered once for the app's lifetime: whenever ANY authenticated
    // request comes back 401 (token expired, revoked, account blocked...),
    // this clears the session immediately so every consumer of useAuth()
    // (TopNav, ProtectedRoute, etc.) reflects logged-out on the very next
    // render — not just whichever page happened to make the failing call.
    api.setUnauthorizedHandler(() => {
      api.clearToken()
      setUser(null)
    })

    const token = api.getToken()
    if (!token) {
      setLoading(false)
      return
    }

    api
      .fetchMe(token)
      .then(setUser)
      .catch(() => {
        api.clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function signup(email, password, inviteToken, code) {
    const data = await api.signup(email, password, inviteToken, code)
    api.setToken(data.token)
    setUser(data.user)
    if (data.inviteVenue) {
      localStorage.setItem('staffie_invite_venue', JSON.stringify(data.inviteVenue))
    }
  }

  async function login(email, password) {
    const data = await api.login(email, password)
    api.setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    api.clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
