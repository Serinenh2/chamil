import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { tokens } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokens.access) { setLoading(false); return }
    api.get('/users/me/')
      .then(({ data }) => setUser(data))
      .catch(() => tokens.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password })
    tokens.set({ access: data.access, refresh: data.refresh })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/users/logout/', { refresh: tokens.refresh }) } catch { /* ignoré */ }
    tokens.clear()
    setUser(null)
  }, [])

  /** Le propriétaire a tous les droits ; les autres rôles sont vérifiés explicitement. */
  const can = useCallback(
    (...roles) => !!user && (user.role === 'owner' || roles.includes(user.role)),
    [user],
  )

  const value = useMemo(
    () => ({ user, setUser, loading, login, logout, can, isOwner: user?.role === 'owner' }),
    [user, loading, login, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
