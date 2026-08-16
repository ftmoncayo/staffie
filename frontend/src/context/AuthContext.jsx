import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = api.getToken()
    if (!token) {
      setLoading(false)
      return
    }

    api
      .fetchMe(token)
      .then(setUser)
      .catch(() => api.clearToken())
      .finally(() => setLoading(false))
  }, [])

  async function signup(email, password, inviteToken) {
    const data = await api.signup(email, password, inviteToken)
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
