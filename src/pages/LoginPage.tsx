import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, provider } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { Button, Spinner } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [pending,  setPending]  = useState<'google' | 'password' | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const { employee, loading, authError } = useAuth()
  const spotlightRef = useRef<HTMLDivElement>(null)

  // Navigate once AuthContext resolves a valid employee
  useEffect(() => {
    if (!loading && employee) navigate('/dashboard', { replace: true })
  }, [employee, loading, navigate])

  // Don't flash the form if already authenticated
  if (!loading && employee) return null

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spotlightRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    spotlightRef.current.style.left = `${e.clientX - rect.left}px`
    spotlightRef.current.style.top  = `${e.clientY - rect.top}px`
  }

  const handleGoogle = async () => {
    setError(null)
    setPending('google')
    try {
      await signInWithPopup(auth, provider)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'unknown'
      console.error('[Google sign-in error]', code, err)

      const messages: Record<string, string> = {
        'auth/popup-closed-by-user':      'Inloggningsfönstret stängdes innan det slutfördes.',
        'auth/popup-blocked':             'Popup blockerades av din webbläsare. Tillåt popups för den här sidan och försök igen.',
        'auth/unauthorized-domain':       'Den här domänen är inte godkänd i Firebase. Lägg till den under Authentication → Settings → Authorized domains.',
        'auth/operation-not-allowed':     'Google-inloggning är inte aktiverad. Aktivera den i Firebase-konsolen under Authentication → Sign-in methods.',
        'auth/cancelled-popup-request':   'Inloggningen avbröts.',
        'auth/network-request-failed':    'Nätverksfel. Kontrollera din anslutning och försök igen.',
      }

      setError(messages[code] ?? `Google-inloggning misslyckades (${code}).`)
      setPending(null)
    }
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending('password')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setError('Ogiltig e-post eller lösenord.')
      setPending(null)
    }
  }

  return (
    <div
      className="min-h-screen bg-bg flex items-center justify-center px-4 relative"
      onMouseMove={handleMouseMove}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />
        <div className="bg-orb bg-orb-5" />
        <div className="bg-orb bg-orb-6" />

        {/* Mouse-following cyan spotlight */}
        <div
          ref={spotlightRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(34,211,238,0.45) 0%, rgba(6,182,212,0.18) 45%, transparent 70%)',
            filter: 'blur(18px)',
            left: '-600px',
            top: '-600px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-4">
          <p className="text-6xl font-bold text-white tracking-tight leading-none">NETLER</p>
          <h1 className="text-3xl font-semibold text-text-1 mt-2">
            intra<span className="text-purple-light">net</span>
          </h1>
          <p className="text-sm text-text-3 mt-2">Logga in på din arbetsyta</p>
        </div>

        {authError && (
          <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mb-4 text-center">
            {authError}
          </p>
        )}

        <div className="bg-bg-card border border-subtle rounded-xl p-6 shadow-modal">
          {/* Email + password */}
          <form onSubmit={handlePassword} className="space-y-3">
            <div>
              <label className="field-label">E-post</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="du@foretaget.se"
                className="field-input"
                required
              />
            </div>
            <div>
              <label className="field-label">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={pending === 'password'}
              className="w-full justify-center mt-1"
            >
              Logga in
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-subtle" />
            <span className="text-xs text-text-3">eller</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={!!pending}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-mild bg-bg-hover hover:bg-bg-hover/80 text-sm text-text-1 transition-colors disabled:opacity-50"
          >
            {pending === 'google' ? <Spinner size="sm" /> : (
              <svg width="16" height="16" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
                <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6z"/>
                <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
              </svg>
            )}
            Fortsätt med Google
          </button>
        </div>
      </div>
    </div>
  )
}
