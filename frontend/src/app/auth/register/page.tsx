'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl } from '@/lib/api-base'

export default function RegisterPage() {
  const router = useRouter()
  const landingPageUrl = apiUrl('/')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/register'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          first_name: firstName,
          last_name: lastName,
          email,
          username,
          password,
        }).toString(),
        redirect: 'manual',
      })
      if (res.ok || res.status === 0 || res.type === 'opaqueredirect') {
        router.push('/auth/login?verify=sent')
      } else {
        const text = await res.text()
        if (text.includes('already exists')) setError('Username or email already exists.')
        else if (text.includes('fill out')) setError('Please fill out all required fields.')
        else setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Could not reach the server.')
    }
    setLoading(false)
  }

  const inp = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '9px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#fff',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  }

  const label = {
    fontSize: '10px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    marginBottom: '5px',
    display: 'block',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', background: '#0A0A0A', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", color: '#fff' }}>

      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 56px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <a href={landingPageUrl} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8L6.5 11.5L13 4.5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          TaskFlow
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.08, color: 'rgba(255,255,255,0.9)' }}>
            Your entire life,<br/><span style={{ color: 'rgba(255,255,255,0.28)' }}>in one place.</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Tasks, habits, journal and calendar — all free',
              'AI that studies your patterns and coaches you daily',
              'Replaces 5 paid apps — saves you $600/year',
              'No credit card. Free forever.',
            ].map(feat => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>✓</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{feat}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex' }}>
              {['JM','AT','KR','DS'].map((av, i) => (
                <div key={av} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid #0A0A0A', marginLeft: i === 0 ? 0 : '-7px', fontSize: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>{av}</div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Joined by 2,000+ people building better lives</div>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>© 2026 TaskFlow. Built by Donny Fabuluje.</div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 56px', background: '#0D0D0D' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '6px', color: 'rgba(255,255,255,0.9)' }}>Create your account</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>Start becoming who you're supposed to be.</div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={label}>First name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" required style={inp}/>
              </div>
              <div>
                <label style={label}>Last name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required style={inp}/>
              </div>
            </div>
            <div>
              <label style={label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required style={inp}/>
            </div>
            <div>
              <label style={label}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="janedoe" required style={inp}/>
            </div>
            <div>
              <label style={label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp}/>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>At least 8 characters</div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'rgba(255,120,120,0.8)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ background: '#fff', color: '#0A0A0A', fontSize: '14px', fontWeight: 600, border: 'none', borderRadius: '9px', padding: '13px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '6px' }}>
              {loading ? 'Creating account…' : 'Create my account →'}
            </button>
          </form>

          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: '12px', lineHeight: 1.6 }}>
            By signing up you agree to our{' '}
            <a href={apiUrl('/terms')} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>Terms</a>{' '}and{' '}
            <a href={apiUrl('/privacy')} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>Privacy Policy</a>.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }}/>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>or continue with</div>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }}/>
          </div>

          <a href={apiUrl('/login/google')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '11px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '20px' }}>
            Already have an account?{' '}
            <a href="/auth/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
          </div>
        </div>
      </div>
    </div>
  )
}
