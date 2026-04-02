import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '@/api/client'

const TOKEN_KEY = 'opencnapp_token'

export type AuthUser = {
  id: string
  email: string
  role: string
  auth_provider: string
}

type AuthConfig = {
  oidc_enabled: boolean
  oidc_login_url: string | null
  password_login_enabled: boolean
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  loading: boolean
  authConfig: AuthConfig | null
  login: (email: string, password: string) => Promise<void>
  completeOidcLogin: (accessToken: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)

  useEffect(() => {
    api
      .get<AuthConfig>('/auth/config')
      .then((r) => setAuthConfig(r.data))
      .catch(() =>
        setAuthConfig({
          oidc_enabled: false,
          oidc_login_url: null,
          password_login_enabled: true,
        })
      )
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      return
    }
    const r = await api.get<AuthUser>('/auth/me')
    setUser(r.data)
  }, [token])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    refreshUser()
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token, refreshUser])

  const setTokenPersist = useCallback((t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
    setToken(t)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api.post<{ access_token: string }>('/auth/login', { email, password })
      setTokenPersist(r.data.access_token)
    },
    [setTokenPersist]
  )

  const completeOidcLogin = useCallback(
    (accessToken: string) => {
      setTokenPersist(accessToken)
    },
    [setTokenPersist]
  )

  const logout = useCallback(() => {
    setTokenPersist(null)
    setUser(null)
  }, [setTokenPersist])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      authConfig,
      login,
      completeOidcLogin,
      logout,
      refreshUser,
    }),
    [token, user, loading, authConfig, login, completeOidcLogin, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
