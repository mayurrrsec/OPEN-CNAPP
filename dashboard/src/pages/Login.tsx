import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { KeyRound, Loader2, LogIn } from 'lucide-react'
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    )
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const showSso = authConfig?.oidc_enabled === true
  const showPassword = authConfig?.password_login_enabled !== false

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/40 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.1),transparent)]" aria-hidden />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20">
            <KeyRound className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">OpenCNAPP</h1>
          <p className="mt-2 text-sm text-muted-foreground">Cloud-native security posture &amp; findings</p>
        </div>

        <div className="flex flex-col gap-4">
          {showSso ? (
            <Card className="border-border/80 shadow-md">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-lg">Single sign-on</CardTitle>
                <CardDescription className="text-sm">Use your organization credentials.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" className="h-11 w-full text-base" size="lg" onClick={startSso}>
                  Continue with SSO
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {showSso && showPassword ? (
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
          ) : null}

          {showPassword ? (
            <Card className="border-border/80 shadow-md">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-lg">{showSso ? 'Email & password' : 'Sign in'}</CardTitle>
                {!showSso ? (
                  <CardDescription className="text-sm">Enter your work email and password.</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium leading-none">
                      Email
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-medium leading-none">
                      Password
                    </label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  {error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <Button type="submit" className="h-11 w-full text-base" size="lg" disabled={pending}>
                    {pending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <LogIn className={cn('mr-2 h-4 w-4', pending && 'opacity-50')} aria-hidden />
                    )}
                    Sign in
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} OpenCNAPP
        </p>
      </div>
    </div>
  )
}
