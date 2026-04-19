'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/api-base'

/* ─── SVG Icons — 17×17, larger to match artifact ───────────────── */
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
const IconSun = () => (
  <svg viewBox="0 0 17 17" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="3"/>
    <path d="M8.5 1.5v2M8.5 13.5v2M1.5 8.5h2M13.5 8.5h2M3.57 3.57l1.42 1.42M11 11l1.43 1.43M3.57 13.43l1.42-1.42M11 6l1.43-1.43"/>
  </svg>
)
const IconMoon = () => (
  <svg viewBox="0 0 17 17" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 10.5A6.5 6.5 0 016.5 2.5a6.5 6.5 0 000 12 6.5 6.5 0 008-4z"/>
  </svg>
)

/* ─── Nav — flat order matching artifact, split into two groups ─── */
const GROUP_1 = [
  { href: '/home',   Icon: IconHome,    label: 'Home' },
  { href: '/tasks',  Icon: IconTasks,   label: 'Tasks' },
  { href: '/habits', Icon: IconHabits,  label: 'Habits' },
  { href: '/journal',Icon: IconJournal, label: 'Journal' },
]
const GROUP_2 = [
  { href: '/calendar', Icon: IconCalendar, label: 'Calendar' },
  { href: '/focus',    Icon: IconFocus,    label: 'Focus Mode' },
  { href: '/ai',       Icon: IconAI,       label: 'AI Coach' },
  { href: '/score',    Icon: IconGrowth,   label: 'Growth Score' },
]

/* ─── Theme tokens ───────────────────────────────────────────────── */
const THEMES = {
  dark: {
    bg:               '#0D0D0D',
    border:           'rgba(255,255,255,0.06)',
    linkDefault:      'rgba(255,255,255,0.42)',
    linkActive:       'rgba(255,255,255,0.95)',
    linkActiveBg:     'rgba(255,255,255,0.07)',
    linkActiveLine:   'rgba(255,255,255,0.55)',
    linkHoverBg:      'rgba(255,255,255,0.07)',
    iconActiveBg:     'transparent',
    logoBg:           '#fff',
    logoStroke:       '#0A0A0A',
    logoText:         'rgba(255,255,255,0.9)',
    profileBg:        'rgba(255,255,255,0.1)',
    profileText:      'rgba(255,255,255,0.8)',
    profileSub:       'rgba(255,255,255,0.3)',
    chevron:          'rgba(255,255,255,0.3)',
    profileTopBorder: 'rgba(255,255,255,0.05)',
    dropdownBg:       '#1a1a1a',
    dropdownBorder:   'rgba(255,255,255,0.1)',
    dropdownText:     'rgba(255,255,255,0.72)',
    dropdownHover:    'rgba(255,255,255,0.06)',
    dropdownSep:      'rgba(255,255,255,0.07)',
    logoutText:       'rgba(255,100,100,0.8)',
    logoutHover:      'rgba(255,60,60,0.08)',
    themeBtnColor:    'rgba(255,255,255,0.35)',
    themeBtnHover:    'rgba(255,255,255,0.08)',
    sep:              'rgba(255,255,255,0.07)',
  },
  light: {
    bg:               '#E8E8E8',
    border:           'rgba(0,0,0,0.08)',
    linkDefault:      '#888888',
    linkActive:       '#1C1C1E',
    linkActiveBg:     '#D6E8FF',
    linkActiveLine:   '#1a7fe8',
    linkHoverBg:      'rgba(0,0,0,0.06)',
    iconActiveBg:     'transparent',
    logoBg:           '#1a7fe8',
    logoStroke:       '#ffffff',
    logoText:         '#1C1C1E',
    profileBg:        '#D8D8D8',
    profileText:      '#1C1C1E',
    profileSub:       '#ABABAB',
    chevron:          '#ABABAB',
    profileTopBorder: 'rgba(0,0,0,0.08)',
    dropdownBg:       '#FFFFFF',
    dropdownBorder:   'rgba(0,0,0,0.10)',
    dropdownText:     '#1C1C1E',
    dropdownHover:    'rgba(0,0,0,0.05)',
    dropdownSep:      'rgba(0,0,0,0.07)',
    logoutText:       '#D03030',
    logoutHover:      'rgba(200,40,40,0.07)',
    themeBtnColor:    '#ABABAB',
    themeBtnHover:    'rgba(0,0,0,0.06)',
    sep:              'rgba(0,0,0,0.08)',
  },
}

/* ─── Component ──────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname     = usePathname()
  const marketingUrl = (process.env.NEXT_PUBLIC_MARKETING_URL || 'https://tflow.live').replace(/\/$/, '')

  const [user, setUser]               = useState<{ name: string; username: string; profile_image?: string } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme]             = useState<'dark' | 'light'>('dark')
  const [collapsed, setCollapsed]     = useState(true)   // icon-only by default, matching artifact
  const [hovered, setHovered]         = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'dark' | 'light' | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue)
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

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('tf-theme', next)
    window.dispatchEvent(new StorageEvent('storage', { key: 'tf-theme', newValue: next }))
  }

  const t = THEMES[theme]
  const W = collapsed ? '62px' : '220px'

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TF'

  if (pathname.startsWith('/auth')) return null

  /* Shared nav button style */
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
          title={label}                              // always show tooltip on hover
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
            color:          active
              ? t.linkActiveLine
              : (hovered === href ? t.linkActive : t.linkDefault),
            transition:     'color 0.12s',
          }}>
            <Icon />
          </div>
          <span style={{
            whiteSpace:  'nowrap',
            overflow:    'hidden',
            opacity:      collapsed ? 0 : 1,
            maxWidth:     collapsed ? '0px' : '160px',
            transition:  'opacity 0.1s, max-width 0.22s',
          }}>
            {label}
          </span>
        </Link>
      )
    })

  return (
    <aside style={{
      background:    t.bg,
      borderRight:   `1px solid ${t.border}`,
      paddingTop:    '14px',
      paddingBottom: '0',
      display:       'flex',
      flexDirection: 'column',
      minHeight:     '100vh',
      width:          W,
      flexShrink:     0,
      overflow:      'hidden',
      transition:    'width 0.22s cubic-bezier(0.4,0,0.2,1), background 0.2s',
    }}>

      {/* ── Logo row — no bottom border ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding:        collapsed ? '0 0 10px' : '0 16px 10px',
        marginBottom:   '6px',
        // no borderBottom — removed per request
      }}>
        {/* Logo — click to collapse/expand */}
        <button
          onClick={() => { setCollapsed(c => !c); setProfileOpen(false) }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
            background: 'transparent',
            border:     'none',
            cursor:     'pointer',
            padding:     0,
            flexShrink:  0,
          }}
        >
          <div style={{
            width:          '32px',
            height:         '32px',
            background:      t.logoBg,
            borderRadius:   '8px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:      0,
            transition:     'background 0.2s',
          }}>
            <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
              <path d="M3 8L6.5 11.5L13 4.5" stroke={t.logoStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{
            fontSize:   '15px',
            fontWeight:  700,
            color:       t.logoText,
            whiteSpace: 'nowrap',
            opacity:     collapsed ? 0 : 1,
            maxWidth:    collapsed ? '0px' : '120px',
            overflow:   'hidden',
            transition: 'opacity 0.12s, max-width 0.22s',
          }}>
          </span>
        </button>

        {/* Theme toggle — visible only when expanded */}
        {!collapsed && (
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
              color:           t.themeBtnColor,
              flexShrink:      0,
              transition:     'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = t.themeBtnHover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        )}
      </div>

      {/* ── Group 1: Home, Tasks, Habits, Journal ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {renderGroup(GROUP_1)}
      </div>

      {/* ── Separator ── */}
      <div style={{
        height:     '1px',
        background:  t.sep,
        margin:     collapsed ? '8px 14px' : '8px 16px',
        transition: 'margin 0.22s',
      }} />

      {/* ── Group 2: Calendar, Focus, AI, Growth ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {renderGroup(GROUP_2)}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Theme toggle when collapsed (bottom of icon rail) ── */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          '38px',
              height:         '34px',
              borderRadius:   '9px',
              border:         'none',
              cursor:         'pointer',
              background:     'transparent',
              color:           t.themeBtnColor,
              transition:     'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = t.themeBtnHover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      )}

      {/* ── Profile ── */}
      <div style={{ paddingTop: '4px' }}>
        <button
          onClick={() => !collapsed && setProfileOpen(p => !p)}
          onMouseEnter={e => {
            e.currentTarget.style.background = t.linkHoverBg
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
          }}
          title={collapsed ? (user?.username || 'Profile') : undefined}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap:            '10px',
            padding:        collapsed ? '6px 0' : '8px 16px',
            width:          '100%',
            background:     'transparent',
            border:         'none',
            cursor:         collapsed ? 'default' : 'pointer',
            borderRadius:   '10px',
            transition:     'background 0.12s ease',
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
          <div style={{
            flex:       1,
            minWidth:   0,
            textAlign: 'left',
            opacity:    collapsed ? 0 : 1,
            maxWidth:   collapsed ? '0px' : '120px',
            overflow:  'hidden',
            transition: 'opacity 0.1s, max-width 0.22s',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: t.profileText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'Guest'}
            </div>
            <div style={{ fontSize: '10px', color: t.profileSub }}>Free plan</div>
          </div>
          {!collapsed && (
            <svg viewBox="0 0 10 6" fill="none" width="10" height="6" style={{ flexShrink: 0, color: t.chevron, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {profileOpen && !collapsed && (
          <>
            <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }}/>
            <div style={{
              position:     'absolute',
              bottom:       '100%',
              left:         '12px',
              right:        '12px',
              background:    t.dropdownBg,
              border:       `1px solid ${t.dropdownBorder}`,
              borderRadius: '12px',
              padding:      '6px',
              zIndex:        10,
              boxShadow:    '0 18px 40px rgba(0,0,0,0.18)',
            }}>
              {[
                { label: 'Account',  href: '/account' },
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
              <button onClick={async () => {
                await fetch(apiUrl('/api/logout'), { method: 'POST', credentials: 'include' })
                window.location.href = marketingUrl
              }} style={{
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

    </aside>
  )
}
