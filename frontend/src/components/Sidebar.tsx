'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/api-base'
import {
  readSidebarCollapsed,
  SIDEBAR_COLLAPSED_KEY,
  syncSidebarCollapsed,
} from '@/components/sidebar-state'

/* ─── SVG Icons ──────────────────────────────────────────────────── */
const IconHome = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8L8.5 2.5 15 8v7a1 1 0 01-1 1H11v-4.5H6V16H3a1 1 0 01-1-1z"/>
  </svg>
)
const IconTasks = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="2.5" width="12" height="12" rx="2.5"/>
    <path d="M5.5 8.5l2.2 2.2 4-4.5"/>
  </svg>
)
const IconHabits = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="6"/>
    <path d="M8.5 5.5v3l2 1.5"/>
  </svg>
)
const IconJournal = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="11" height="13" rx="2"/>
    <path d="M6 6.5h5M6 9.5h3.5"/>
  </svg>
)
const IconCalendar = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3.5" width="13" height="11.5" rx="2"/>
    <path d="M2 7.5h13M5.5 2v3M11.5 2v3"/>
  </svg>
)
const IconFocus = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="2.5"/>
    <circle cx="8.5" cy="8.5" r="6"/>
  </svg>
)
const IconAI = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 2C5.46 2 3 4.46 3 7.5c0 1.86.9 3.5 2.3 4.52v1.98h6.4v-1.98A5.48 5.48 0 0014 7.5C14 4.46 11.54 2 8.5 2z"/>
    <path d="M5.8 14.5h5.4"/>
  </svg>
)
const IconGrowth = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12.5l4-4.5 3.5 3.5 5-7"/>
  </svg>
)
const IconCollapseLeft = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3.5L4.5 8L9 12.5"/>
    <path d="M13.5 3.5L9 8L13.5 12.5"/>
  </svg>
)

/* ─── Nav groups ─────────────────────────────────────────────────── */
const GROUP_1 = [
  { href: '/home',    Icon: IconHome,    label: 'Home'    },
  { href: '/tasks',   Icon: IconTasks,   label: 'Tasks'   },
  { href: '/habits',  Icon: IconHabits,  label: 'Habits'  },
  { href: '/journal', Icon: IconJournal, label: 'Journal' },
]
const GROUP_2 = [
  { href: '/calendar', Icon: IconCalendar, label: 'Calendar'     },
  { href: '/focus',    Icon: IconFocus,    label: 'Focus Mode'   },
  { href: '/ai',       Icon: IconAI,       label: 'AI Coach'     },
  { href: '/score',    Icon: IconGrowth,   label: 'Growth Score' },
]

/* ─── Theme tokens ───────────────────────────────────────────────── */
const THEMES = {
  dark: {
    bg:             '#0D0D0D',
    border:         'rgba(255,255,255,0.06)',
    linkDefault:    'rgba(255,255,255,0.42)',
    linkActive:     'rgba(255,255,255,0.95)',
    linkActiveBg:   'rgba(255,255,255,0.07)',
    linkActiveLine: 'rgba(255,255,255,0.55)',
    linkHoverBg:    'rgba(255,255,255,0.07)',
    profileBg:      'rgba(255,255,255,0.1)',
    profileText:    'rgba(255,255,255,0.8)',
    profileSub:     'rgba(255,255,255,0.3)',
    chevron:        'rgba(255,255,255,0.3)',
    dropdownBg:     '#1a1a1a',
    dropdownBorder: 'rgba(255,255,255,0.1)',
    dropdownText:   'rgba(255,255,255,0.72)',
    dropdownHover:  'rgba(255,255,255,0.06)',
    dropdownSep:    'rgba(255,255,255,0.07)',
    logoutText:     'rgba(255,100,100,0.8)',
    logoutHover:    'rgba(255,60,60,0.08)',
    sep:            'rgba(255,255,255,0.07)',
    collapseColor:  'rgba(255,255,255,0.3)',
    collapseHover:  'rgba(255,255,255,0.08)',
  },
  light: {
    bg:             '#E8E8E8',
    border:         'rgba(0,0,0,0.08)',
    linkDefault:    '#888888',
    linkActive:     '#1C1C1E',
    linkActiveBg:   '#D6E8FF',
    linkActiveLine: '#1a7fe8',
    linkHoverBg:    'rgba(0,0,0,0.06)',
    profileBg:      '#D8D8D8',
    profileText:    '#1C1C1E',
    profileSub:     '#ABABAB',
    chevron:        '#ABABAB',
    dropdownBg:     '#FFFFFF',
    dropdownBorder: 'rgba(0,0,0,0.10)',
    dropdownText:   '#1C1C1E',
    dropdownHover:  'rgba(0,0,0,0.05)',
    dropdownSep:    'rgba(0,0,0,0.07)',
    logoutText:     '#D03030',
    logoutHover:    'rgba(200,40,40,0.07)',
    sep:            'rgba(0,0,0,0.08)',
    collapseColor:  '#ABABAB',
    collapseHover:  'rgba(0,0,0,0.06)',
  },
}

/* ─── Component ──────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname     = usePathname()

  const [user, setUser]               = useState<{ name: string; username: string; profile_image?: string } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme]             = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('tf-theme') === 'light' ? 'light' : 'dark'
  })
  const [collapsed, setCollapsed]     = useState(() => {
    if (typeof window === 'undefined') return false
    return readSidebarCollapsed()
  })
  const [hovered, setHovered]         = useState<string | null>(null)
  const [sidebarHovered, setSidebarHovered] = useState(false)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue)
      }
      if (e.key === SIDEBAR_COLLAPSED_KEY && e.newValue !== null) {
        setCollapsed(e.newValue === 'true')
        if (e.newValue === 'true') setProfileOpen(false)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    fetch(apiUrl('/api/me'), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUser(d) })
      .catch(() => {})
  }, [])

  const collapse = () => {
    setCollapsed(true)
    setProfileOpen(false)
    syncSidebarCollapsed(true)
  }

  const t = THEMES[theme]
  const W = collapsed ? '0px' : '220px'

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TF'

  if (pathname.startsWith('/auth')) return null

  const navBtn = (href: string, active: boolean) => ({
    display:        'flex' as const,
    alignItems:     'center' as const,
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap:            '11px',
    width:          collapsed ? '40px' : 'calc(100% - 16px)',
    height:         '36px',
    margin:         collapsed ? '1px 0' : '1px 8px',
    borderRadius:   '9px',
    padding:        collapsed ? '0' : '0 12px',
    fontSize:       '13px',
    fontWeight:     active ? 500 : 400,
    color:          active ? t.linkActive : (hovered === href ? t.linkActive : t.linkDefault),
    background:     active ? t.linkActiveBg : (hovered === href ? t.linkHoverBg : 'transparent'),
    border:         'none',
    textDecoration: 'none',
    cursor:         'pointer',
    transition:     'background 0.12s, color 0.12s, width 0.22s, padding 0.22s',
    flexShrink:     0 as const,
  })

  const renderGroup = (links: typeof GROUP_1) =>
    links.map(({ href, Icon, label }) => {
      const active = pathname === href || pathname.startsWith(href + '/')
      return (
        <Link
          key={href}
          href={href}
          title={label}
          style={navBtn(href, active)}
          onMouseEnter={() => setHovered(href)}
          onMouseLeave={() => setHovered(null)}
        >
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          '20px',
            height:         '20px',
            flexShrink:      0,
            color:          active ? t.linkActiveLine : (hovered === href ? t.linkActive : t.linkDefault),
            transition:     'color 0.12s',
          }}>
            <Icon />
          </div>
          <span style={{
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            opacity:     collapsed ? 0 : 1,
            maxWidth:    collapsed ? '0px' : '160px',
            transition: 'opacity 0.1s, max-width 0.22s',
          }}>
            {label}
          </span>
        </Link>
      )
    })

  return (
    <aside
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
      style={{
        background:    t.bg,
        borderRight:   collapsed ? 'none' : `1px solid ${t.border}`,
        paddingTop:    '10px',
        paddingBottom: '10px',
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
                flex:           1,
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
                width:          '30px',
                height:         '30px',
                borderRadius:   '50%',
                background:      t.profileBg,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '10px',
                fontWeight:      700,
                color:           t.profileText,
                flexShrink:      0,
                overflow:       'hidden',
              }}>
                {user?.profile_image
                  ? <img src={apiUrl(user.profile_image)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : initials}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: t.profileText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.username || 'Guest'}
                </div>
                <div style={{ fontSize: '10px', color: t.profileSub }}>Free plan</div>
              </div>
              <svg viewBox="0 0 10 6" fill="none" width="10" height="6" style={{ flexShrink: 0, color: t.chevron, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

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
                  { label: 'Account',  href: '/account'  },
                  { label: 'Settings', href: '/settings' },
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

      {/* ── Separator ── */}
      <div style={{ height: '1px', background: t.sep, margin: collapsed ? '0 14px 8px' : '0 16px 8px', transition: 'margin 0.22s' }} />

      {/* ── Group 1 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {renderGroup(GROUP_1)}
      </div>

      <div style={{ height: '1px', background: t.sep, margin: collapsed ? '8px 14px' : '8px 16px', transition: 'margin 0.22s' }} />

      {/* ── Group 2 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {renderGroup(GROUP_2)}
      </div>

      <div style={{ flex: 1 }} />

    </aside>
  )
}
