'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push('/home')
      } else {
        setError(data.error || 'Invalid username or password.')
      }
    } catch {
      setError('Could not reach the server. Make sure Flask is running.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', background: '#0A0A0A', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif", color: '#fff' }}>

      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 56px', borderRight: '1px solid rgba(255,255,255,0.07)', background: '#0A0A0A' }}>
        
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          TaskFlow
        </a>

        {/* Middle content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          <h2 style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.08, color: 'rgba(255,255,255,0.9)' }}>
            Welcome back.<br/>
            <span style={{ color: 'rgba(255,255,255,0.28)' }}>Your streak is waiting.</span>
          </h2>

          {/* Quote card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '14px', fontStyle: 'italic' }}>
              "I've tried every productivity app out there. TaskFlow is the first one that actually feels like it's on my side. The AI knows when I'm slipping before I do."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>JM</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Jordan Mitchell</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>CS student, content creator</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>★★★★★</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { num: '2,000+', label: 'People signed up' },
              { num: '$0',     label: 'Cost forever' },
              { num: '6-in-1', label: 'Apps replaced' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.8px', color: 'rgba(255,255,255,0.85)', marginBottom: '2px' }}>{s.num}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>© 2026 TaskFlow. Built by Donny Fabuluje.</div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 56px', background: '#0D0D0D' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '6px', color: 'rgba(255,255,255,0.9)' }}>Welcome back</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>Sign in to continue your growth journey.</div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>Username or email</div>
              <input
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="jane@example.com or janedoe"
                autoComplete="username"
                required
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '12px 14px', fontSize: '13px', color: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>Password</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '12px 14px', fontSize: '13px', color: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <a href={`${API}/accountreset`} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', textDecoration: 'none', marginTop: '-4px' }}>
              Forgot password?
            </a>

            {error && (
              <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'rgba(255,120,120,0.8)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ background: '#fff', color: '#0A0A0A', fontSize: '14px', fontWeight: 600, border: 'none', borderRadius: '9px', padding: '13px', width: '100%', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '6px' }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }}/>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>or continue with</div>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }}/>
          </div>

          {/* Google */}
          <a href={`${API}/login/google`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '11px', width: '100%', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', boxSizing: 'border-box' }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '20px' }}>
            Don't have an account?{' '}
            <a href={`${API}/register`} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 500 }}>
              Sign up free
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}