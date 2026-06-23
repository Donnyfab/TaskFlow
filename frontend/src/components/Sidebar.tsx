'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'
import { prefetchRoute } from '@/components/Prefetcher'
import {
  readSidebarCollapsed,
  SIDEBAR_COLLAPSED_KEY,
  syncSidebarCollapsed,
} from '@/components/sidebar-state'

const IconCollapseLeft = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3.5L4.5 8L9 12.5"/>
    <path d="M13.5 3.5L9 8L13.5 12.5"/>
  </svg>
)

/* ─── Navigation ─────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { href: '/ai',      label: 'Coach'       },
  { href: '/home',    label: 'Mission'     },
  { href: '/tasks',   label: 'Commitments' },
  { href: '/journal', label: 'Output Log'  },
  { href: '/habits',  label: 'Patterns'    },
]

/* ─── Theme tokens ───────────────────────────────────────────────── */
const THEMES = {
  dark: {
    bg:             '#111111',
    border:         '#1E1E1E',
    linkDefault:    '#888888',
    linkActive:     '#F0F0F0',
    linkActiveLine: '#F0F0F0',
    linkHoverBg:    'rgba(255,255,255,0.035)',
    profileBg:      'linear-gradient(135deg,#5e5b6e 0%,#2a2932 100%)',
    profileText:    '#ececee',
    profileSub:     '#76767c',
    chevron:        '#76767c',
    dropdownBg:     '#16161a',
    dropdownBorder: 'rgba(255,255,255,0.09)',
    dropdownText:   '#b6b6bb',
    dropdownHover:  'rgba(255,255,255,0.05)',
    dropdownSep:    'rgba(255,255,255,0.06)',
    logoutText:     'rgba(255,100,100,0.8)',
    logoutHover:    'rgba(255,60,60,0.07)',
    sep:            'rgba(255,255,255,0.06)',
    collapseColor:  '#76767c',
    collapseHover:  'rgba(255,255,255,0.06)',
  },
  light: {
    bg:             '#F4F4F2',
    border:         '#E4E4E2',
    linkDefault:    '#6B6B6B',
    linkActive:     '#111111',
    linkActiveLine: '#111111',
    linkHoverBg:    'rgba(0,0,0,0.035)',
    profileBg:      'rgba(0,0,0,0.08)',
    profileText:    '#18181b',
    profileSub:     '#8a8a90',
    chevron:        '#8a8a90',
    dropdownBg:     '#FFFFFF',
    dropdownBorder: 'rgba(0,0,0,0.08)',
    dropdownText:   '#18181b',
    dropdownHover:  'rgba(0,0,0,0.04)',
    dropdownSep:    'rgba(0,0,0,0.07)',
    logoutText:     '#D03030',
    logoutHover:    'rgba(200,40,40,0.06)',
    sep:            'rgba(0,0,0,0.07)',
    collapseColor:  '#8a8a90',
    collapseHover:  'rgba(0,0,0,0.05)',
  },
}

/* ─── Component ──────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname     = usePathname()
  const queryClient  = useQueryClient()

  const { data: user }                = useQuery<{ name: string; username: string; profile_image?: string }>({
    queryKey: ['me'],
    queryFn:  () => fetch(apiUrl('/api/me'), { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    staleTime: Infinity,
    retry: false,
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme]             = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem('tf-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  const [collapsed, setCollapsed]     = useState(() => {
    if (typeof window === 'undefined') return false
    return readSidebarCollapsed()
  })
  const [sidebarHovered, setSidebarHovered] = useState(false)

  useEffect(() => {
    const readTheme = () => {
      const stored = localStorage.getItem('tf-theme')
      if (stored === 'light' || stored === 'dark') return stored
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme') {
        setTheme(readTheme())
      }
      if (e.key === SIDEBAR_COLLAPSED_KEY && e.newValue !== null) {
        setCollapsed(e.newValue === 'true')
        if (e.newValue === 'true') setProfileOpen(false)
      }
    }
    const onSystemChange = () => {
      if (localStorage.getItem('tf-theme') === 'system') setTheme(readTheme())
    }
    window.addEventListener('storage', onStorage)
    media.addEventListener('change', onSystemChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      media.removeEventListener('change', onSystemChange)
    }
  }, [])

  const collapse = () => {
    setCollapsed(true)
    setProfileOpen(false)
    syncSidebarCollapsed(true)
  }

  const t = THEMES[theme]
  const W = collapsed ? '0px' : '200px'

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TF'
  const firstName = user?.name?.trim().split(/\s+/)[0]

  if (pathname.startsWith('/auth')) return null

  const navBtn = (active: boolean) => ({
    display:        'flex' as const,
    alignItems:     'center' as const,
    width:          '100%',
    padding:        '8px 18px',
    fontSize:       '14px',
    fontWeight:     active ? 600 : 400,
    letterSpacing:  active ? '-0.01em' : 'normal',
    color:          active ? t.linkActive : t.linkDefault,
    background:     'transparent',
    border:         'none',
    borderLeft:     `2px solid ${active ? t.linkActiveLine : 'transparent'}`,
    textDecoration: 'none',
    cursor:         'pointer',
    transition:     'color 120ms ease, border-color 120ms ease',
    flexShrink:     0 as const,
  })

  const renderNavigation = () =>
    NAV_ITEMS.map(({ href, label }) => {
      const active = pathname === href || pathname.startsWith(href + '/')
      return (
        <Link
          key={href}
          href={href}
          title={label}
          style={navBtn(active)}
          onMouseEnter={() => prefetchRoute(queryClient, href)}
        >
          <span style={{
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            textAlign:   'left',
          }}>
            {label}
          </span>
        </Link>
      )
    })

  return (
    <aside
      className="tf-app-sidebar"
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
      style={{
        background:    t.bg,
        borderRight:   collapsed ? 'none' : `1px solid ${t.border}`,
        paddingTop:    '10px',
        paddingBottom: '10px',
        fontFamily:    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
        display:       'flex',
        flexDirection: 'column',
        minHeight:     '100vh',
        width:          W,
        flexShrink:     0,
        overflow:      'hidden',
        transition:    'width 0.22s cubic-bezier(0.4,0,0.2,1), background 0.2s',
        position:      'relative',
      }}
    >

      {/* ── Top row: profile + collapse button (expanded only) ── */}
      {!collapsed && (
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          {/* Profile + collapse in one row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px 0 0' }}>
            <button
              onClick={() => setProfileOpen(p => !p)}
              onMouseEnter={e => { e.currentTarget.style.background = t.linkHoverBg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              style={{
                flex:           '0 1 auto',
                display:        'flex',
                alignItems:     'center',
                gap:            '10px',
                padding:        '8px 8px 8px 16px',
                background:     'transparent',
                border:         'none',
                cursor:         'pointer',
                borderRadius:   '10px',
                transition:     'background 0.12s ease',
                minWidth:       0,
              }}
            >
              <div style={{
                width:          '26px',
                height:         '26px',
                borderRadius:   '50%',
                background:      t.profileBg,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '11px',
                fontWeight:      600,
                color:           t.profileText,
                flexShrink:      0,
                overflow:       'hidden',
                boxShadow:      '0 0 0 1px rgba(255,255,255,0.06) inset',
              }}>
                {user?.profile_image
                  ? <Image src={user.profile_image.startsWith('data:') ? user.profile_image : apiUrl(user.profile_image)} alt="Profile" width={26} height={26} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : initials}
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: t.profileText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.005em' }}>
                  {firstName || 'Guest'}
                </div>
              </div>
              <svg viewBox="0 0 10 6" fill="none" width="10" height="6" style={{ flexShrink: 0, color: t.chevron, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div style={{ flex: 1 }} />

            {/* Collapse «» button — fades in on sidebar hover */}
            <button
              onClick={collapse}
              title="Collapse sidebar"
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '30px',
                height:         '30px',
                borderRadius:   '8px',
                border:         'none',
                cursor:         'pointer',
                background:     'transparent',
                color:           t.collapseColor,
                flexShrink:      0,
                opacity:         sidebarHovered ? 1 : 0,
                transition:     'opacity 0.18s, background 0.12s',
                pointerEvents:   sidebarHovered ? 'auto' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = t.collapseHover }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconCollapseLeft />
            </button>
          </div>

          {/* Dropdown opens downward */}
          {profileOpen && (
            <>
              <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }}/>
              <div style={{
                position:     'absolute',
                top:          'calc(100% + 4px)',
                left:         '12px',
                right:        '12px',
                background:    t.dropdownBg,
                border:       `1px solid ${t.dropdownBorder}`,
                borderRadius: '12px',
                padding:      '6px',
                zIndex:        10,
                boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
              }}>
                {[
                  { label: 'Account', href: '/settings' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} style={{
                    display: 'block', padding: '9px 12px', fontSize: '13px',
                    color: t.dropdownText, textDecoration: 'none', borderRadius: '8px',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.dropdownHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {item.label}
                  </Link>
                ))}
                <div style={{ height: '1px', background: t.dropdownSep, margin: '4px 0' }}/>
                <button onClick={() => { window.location.href = '/logout' }} style={{
                  display: 'block', width: '100%', padding: '9px 12px', fontSize: '13px',
                  color: t.logoutText, background: 'transparent', border: 'none',
                  textAlign: 'left', cursor: 'pointer', borderRadius: '8px',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = t.logoutHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Top padding when collapsed (no profile shown) */}
      {collapsed && <div style={{ height: '12px' }} />}

      {/* ── Navigation ── */}
      <nav style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        {renderNavigation()}
      </nav>

    </aside>
  )
}
