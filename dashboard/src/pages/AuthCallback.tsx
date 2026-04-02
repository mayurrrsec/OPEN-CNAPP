import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/** Handles redirect from OIDC with #token=... in the URL fragment. */
export default function AuthCallback() {
  const navigate = useNavigate()
  const { completeOidcLogin } = useAuth()
  const [err, setErr] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const hash = window.location.hash.replace(/^#/, '')
    const m = hash.match(/^token=(.+)$/)
    if (!m) {
      setErr('Missing token in redirect.')
      return
    }
    const raw = decodeURIComponent(m[1])
    try {
      completeOidcLogin(raw)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      navigate('/', { replace: true })
    } catch {
      setErr('Could not complete sign-in.')
    }
  }, [navigate, completeOidcLogin])

  if (err) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
        <p className="text-sm text-destructive">{err}</p>
        <button type="button" className="text-sm underline" onClick={() => navigate('/login')}>
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Completing sign-in…
    </div>
  )
}
