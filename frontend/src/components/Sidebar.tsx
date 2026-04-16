'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/api-base'

const sections = [
  {
    label: 'Main',
    links: [
      { href: '/home',    icon: '⌂', label: 'Home' },
      { href: '/tasks',   icon: '✓', label: 'Tasks' },
      { href: '/habits',  icon: '↺', label: 'Habits' },
      { href: '/ai',      icon: '✦', label: 'AI Coach' },
    ]
  },
  {
    label: 'Tools',
    links: [
      { href: '/journal',  icon: '✎', label: 'Journal' },
      { href: '/calendar', icon: '▦', label: 'Calendar' },
      { href: '/focus',    icon: '◎', label: 'Focus Mode' },
    ]
  },
  {
    label: 'Insights',
    links: [
      { href: '/score', icon: '↑', label: 'Growth Score' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const marketingUrl = (process.env.NEXT_PUBLIC_MARKETING_URL || 'https://tflow.live').replace(/\/$/, '')
  const [user, setUser]           = useState<{ name: string; username: string; profile_image?: string } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/me'), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUser(d) })
      .catch(() => {})
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TF'

  if (pathname.startsWith('/auth')) return null

  return (
    <aside style={{
      background: '#0D0D0D',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 0',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '220px',
      flexShrink: 0,
    }}>

      {/* Logo */}
      <Link href="/home" style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '0 18px 24px', fontSize: '15px', fontWeight: 700,
        color: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: '16px', textDecoration: 'none',
      }}>
        <div style={{
          width: '26px', height: '26px', background: '#fff',
          borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M3 8L6.5 11.5L13 4.5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        TaskFlow
      </Link>

      {/* Nav sections */}
      {sections.map(section => (
        <div key={section.label}>
          <div style={{
            fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.22)',
            textTransform: 'uppercase', letterSpacing: '0.8px',
            padding: '0 18px', marginBottom: '6px', marginTop: '16px',
          }}>
            {section.label}
          </div>
          {section.links.map(({ href, icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 18px', fontSize: '13px',
                color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: active ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px',
                  background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', flexShrink: 0,
                }}>
                  {icon}
                </div>
                {label}
              </Link>
            )
          })}
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Profile dropdown */}
      <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setProfileOpen(p => !p)} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', flexShrink: 0, overflow: 'hidden',
          }}>
            {user?.profile_image
              ? <img src={apiUrl(user.profile_image)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'Guest'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Free plan</div>
          </div>
          <svg viewBox="0 0 10 6" fill="none" width="10" height="6" style={{ flexShrink: 0, color: 'rgba(255,255,255,0.3)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {profileOpen && (
          <>
            <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }}/>
            <div style={{
              position: 'absolute', bottom: '100%', left: '12px', right: '12px',
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '6px', zIndex: 10,
              boxShadow: '0 18px 40px rgba(0,0,0,0.38)',
            }}>
              {[
                { label: 'Account',  href: '/account' },
                { label: 'Settings', href: '/settings' },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} style={{
                  display: 'block', padding: '9px 12px', fontSize: '13px',
                  color: 'rgba(255,255,255,0.72)', textDecoration: 'none', borderRadius: '8px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {item.label}
                </Link>
              ))}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' }}/>
              <button onClick={async () => {
                await fetch(apiUrl('/api/logout'), { method: 'POST', credentials: 'include' })
                window.location.href = marketingUrl
              }} style={{
                display: 'block', width: '100%', padding: '9px 12px', fontSize: '13px',
                color: 'rgba(255,100,100,0.8)', background: 'transparent', border: 'none',
                textAlign: 'left', cursor: 'pointer', borderRadius: '8px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,60,60,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Log out
              </button>
            </div>
          </>
        )}
      </div>

    </aside>
  )
}
