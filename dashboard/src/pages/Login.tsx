import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { KeyRound, LogIn } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function Login() {
  const { login, authConfig, token, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!loading && token) navigate(from, { replace: true })
  }, [loading, token, from, navigate])

  if (loading && token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setPending(false)
    }
  }

  const startSso = () => {
    const url = authConfig?.oidc_login_url || `${apiBase.replace(/\/$/, '')}/auth/oidc/login`
    window.location.href = url
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">OpenCNAPP</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to the dashboard.</p>
      </div>

      <div className="grid w-full max-w-md gap-4">
        {authConfig?.oidc_enabled ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Single sign-on</CardTitle>
              <CardDescription>Use your organization identity provider.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full" onClick={startSso}>
                Continue with SSO
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {authConfig?.password_login_enabled !== false ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Email & password</CardTitle>
              <CardDescription>
                Accounts are created by an administrator in Settings → Users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  <LogIn className={cn('mr-2 h-4 w-4', pending && 'opacity-50')} />
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
