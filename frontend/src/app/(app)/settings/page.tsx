'use client'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'
import {
  getForgePushSubscription,
  subscribeToForgePush,
  unsubscribeFromForgePush,
} from '@/lib/push-notifications'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import AvatarUpload from '@/components/AvatarUpload'

const THEMES = {
  dark: {
    pageBg:          '#0A0A0A',
    navBg:           '#0A0A0A',
    contentBg:       '#0A0A0A',
    border:          'rgba(255,255,255,0.05)',
    titleColor:      'rgba(255,255,255,0.92)',
    subColor:        'rgba(255,255,255,0.35)',
    navActive:       'rgba(255,255,255,0.88)',
    navInactive:     'rgba(255,255,255,0.42)',
    navActiveBg:     'rgba(255,255,255,0.04)',
    navActiveLine:   'rgba(255,255,255,0.45)',
    labelColor:      'rgba(255,255,255,0.38)',
    sectionTitle:    'rgba(255,255,255,0.75)',
    bodyText:        'rgba(255,255,255,0.55)',
    mutedText:       'rgba(255,255,255,0.3)',
    tinyText:        'rgba(255,255,255,0.28)',
    divider:         'rgba(255,255,255,0.06)',
    cardBg:          'rgba(255,255,255,0.03)',
    cardBorder:      'rgba(255,255,255,0.08)',
    inputBg:         'rgba(255,255,255,0.04)',
    inputBorder:     'rgba(255,255,255,0.09)',
    inputColor:      '#fff',
    toggleOn:        'rgba(255,255,255,0.65)',
    toggleOff:       'rgba(255,255,255,0.1)',
    toggleBorder:    'rgba(255,255,255,0.1)',
    toggleDotOn:     '#0A0A0A',
    toggleDotOff:    '#fff',
    themeBorder:     'rgba(255,255,255,0.08)',
    themeSelBorder:  'rgba(255,255,255,0.5)',
    themeSelBg:      'rgba(255,255,255,0.04)',
    themeNameColor:  'rgba(255,255,255,0.7)',
    themeDescColor:  'rgba(255,255,255,0.28)',
    radioOuter:      'rgba(255,255,255,0.2)',
    radioInnerActive:'rgba(255,255,255,0.7)',
    radioCheck:      '#0A0A0A',
    accentLabel:     'rgba(255,255,255,0.28)',
    badgeText:       'rgba(255,255,255,0.35)',
    modalBg:         '#111',
    modalBorder:     'rgba(255,255,255,0.1)',
    modalTitle:      'rgba(255,255,255,0.9)',
    modalBody:       'rgba(255,255,255,0.42)',
    cancelBg:        'rgba(255,255,255,0.06)',
    cancelColor:     'rgba(255,255,255,0.6)',
    cancelBorder:    'rgba(255,255,255,0.1)',
    toastBg:         '#1a1a1a',
    toastBorder:     'rgba(255,255,255,0.1)',
    toastColor:      'rgba(255,255,255,0.7)',
    dashLink:        'rgba(255,255,255,0.3)',
    notifName:       'rgba(255,255,255,0.78)',
    notifDesc:       'rgba(255,255,255,0.3)',
    notifSep:        'rgba(255,255,255,0.04)',
    aiSectionTitle:  'rgba(255,255,255,0.75)',
    aiBtnBg:         'rgba(255,255,255,0.06)',
    aiBtnColor:      'rgba(255,255,255,0.6)',
    aiBtnBorder:     'rgba(255,255,255,0.1)',
    intIconBg:       'rgba(255,255,255,0.05)',
    intIconBorder:   'rgba(255,255,255,0.08)',
    intTitle:        'rgba(255,255,255,0.78)',
    intDesc:         'rgba(255,255,255,0.28)',
    intConnected:    'rgba(80,210,130,0.85)',
    intDisconnBg:    'rgba(255,255,255,0.05)',
    intDisconnColor: 'rgba(255,255,255,0.4)',
    intDisconnBorder:'rgba(255,255,255,0.09)',
    intConnectBg:    '#fff',
    intConnectColor: '#0A0A0A',
    soonBg:          'rgba(255,255,255,0.04)',
    soonColor:       'rgba(255,255,255,0.25)',
    soonBorder:      'rgba(255,255,255,0.07)',
    privTitleGray:   'rgba(255,255,255,0.7)',
    privDescColor:   'rgba(255,255,255,0.35)',
    privExportBg:    'rgba(255,255,255,0.06)',
    privExportColor: 'rgba(255,255,255,0.6)',
    privExportBorder:'rgba(255,255,255,0.1)',
    redBg:           'rgba(255,50,50,0.03)',
    redBorder:       'rgba(255,50,50,0.1)',
    redTitle:        'rgba(255,150,150,0.8)',
    redDeepTitle:    'rgba(255,100,100,0.85)',
    redBtnBg:        'rgba(255,50,50,0.07)',
    redBtnColor:     'rgba(255,100,100,0.8)',
    redBtnBorder:    'rgba(255,50,50,0.15)',
    deleteBg:        'rgba(220,50,50,0.12)',
    deleteColor:     'rgba(255,110,110,0.9)',
    deleteBorder:    'rgba(220,50,50,0.2)',
    saveBg:          '#fff',
    saveColor:       '#0A0A0A',
  },
  light: {
    pageBg:          '#F5F5F5',
    navBg:           '#EFEFEF',
    contentBg:       '#F5F5F5',
    border:          'rgba(0,0,0,0.07)',
    titleColor:      '#1a1a1a',
    subColor:        'rgba(0,0,0,0.4)',
    navActive:       '#1a1a1a',
    navInactive:     'rgba(0,0,0,0.45)',
    navActiveBg:     'rgba(0,0,0,0.06)',
    navActiveLine:   'rgba(0,0,0,0.35)',
    labelColor:      'rgba(0,0,0,0.45)',
    sectionTitle:    '#1a1a1a',
    bodyText:        'rgba(0,0,0,0.6)',
    mutedText:       'rgba(0,0,0,0.45)',
    tinyText:        'rgba(0,0,0,0.4)',
    divider:         'rgba(0,0,0,0.08)',
    cardBg:          '#FFFFFF',
    cardBorder:      'rgba(0,0,0,0.08)',
    inputBg:         '#FFFFFF',
    inputBorder:     'rgba(0,0,0,0.12)',
    inputColor:      '#1a1a1a',
    toggleOn:        'rgba(0,0,0,0.55)',
    toggleOff:       'rgba(0,0,0,0.12)',
    toggleBorder:    'rgba(0,0,0,0.1)',
    toggleDotOn:     '#fff',
    toggleDotOff:    '#1a1a1a',
    themeBorder:     'rgba(0,0,0,0.1)',
    themeSelBorder:  'rgba(0,0,0,0.45)',
    themeSelBg:      'rgba(0,0,0,0.04)',
    themeNameColor:  '#1a1a1a',
    themeDescColor:  'rgba(0,0,0,0.4)',
    radioOuter:      'rgba(0,0,0,0.2)',
    radioInnerActive:'rgba(0,0,0,0.7)',
    radioCheck:      '#fff',
    accentLabel:     'rgba(0,0,0,0.4)',
    badgeText:       'rgba(0,0,0,0.45)',
    modalBg:         '#FFFFFF',
    modalBorder:     'rgba(0,0,0,0.1)',
    modalTitle:      '#1a1a1a',
    modalBody:       'rgba(0,0,0,0.5)',
    cancelBg:        'rgba(0,0,0,0.05)',
    cancelColor:     'rgba(0,0,0,0.55)',
    cancelBorder:    'rgba(0,0,0,0.1)',
    toastBg:         '#FFFFFF',
    toastBorder:     'rgba(0,0,0,0.1)',
    toastColor:      'rgba(0,0,0,0.7)',
    dashLink:        'rgba(0,0,0,0.4)',
    notifName:       '#1a1a1a',
    notifDesc:       'rgba(0,0,0,0.45)',
    notifSep:        'rgba(0,0,0,0.06)',
    aiSectionTitle:  '#1a1a1a',
    aiBtnBg:         'rgba(0,0,0,0.05)',
    aiBtnColor:      'rgba(0,0,0,0.55)',
    aiBtnBorder:     'rgba(0,0,0,0.1)',
    intIconBg:       'rgba(0,0,0,0.04)',
    intIconBorder:   'rgba(0,0,0,0.08)',
    intTitle:        '#1a1a1a',
    intDesc:         'rgba(0,0,0,0.45)',
    intConnected:    'rgba(30,150,80,0.9)',
    intDisconnBg:    'rgba(0,0,0,0.04)',
    intDisconnColor: 'rgba(0,0,0,0.5)',
    intDisconnBorder:'rgba(0,0,0,0.1)',
    intConnectBg:    '#1a1a1a',
    intConnectColor: '#fff',
    soonBg:          'rgba(0,0,0,0.04)',
    soonColor:       'rgba(0,0,0,0.3)',
    soonBorder:      'rgba(0,0,0,0.07)',
    privTitleGray:   '#1a1a1a',
    privDescColor:   'rgba(0,0,0,0.45)',
    privExportBg:    'rgba(0,0,0,0.05)',
    privExportColor: 'rgba(0,0,0,0.6)',
    privExportBorder:'rgba(0,0,0,0.1)',
    redBg:           'rgba(220,50,50,0.04)',
    redBorder:       'rgba(220,50,50,0.12)',
    redTitle:        'rgba(180,40,40,0.85)',
    redDeepTitle:    'rgba(180,40,40,0.9)',
    redBtnBg:        'rgba(220,50,50,0.07)',
    redBtnColor:     'rgba(180,40,40,0.85)',
    redBtnBorder:    'rgba(220,50,50,0.2)',
    deleteBg:        'rgba(220,50,50,0.08)',
    deleteColor:     'rgba(200,40,40,0.9)',
    deleteBorder:    'rgba(220,50,50,0.2)',
    saveBg:          '#1a1a1a',
    saveColor:       '#fff',
  },
}

interface UserData {
  name: string; username: string; email: string
  profile_image: string | null; google_calendar_connected: boolean
  current_user_email: string
}

type Section = 'account' | 'notifications' | 'ai' | 'appearance' | 'integrations' | 'privacy'
type ThemeSetting = 'dark' | 'light' | 'system'

const NAV = [
  { id: 'account' as Section,       icon: '◉', label: 'Account',        sub: 'Profile and password' },
  { id: 'notifications' as Section, icon: '◎', label: 'Notifications',   sub: 'Reminders and alerts' },
  { id: 'ai' as Section,            icon: '✦', label: 'AI Preferences',  sub: 'Coaching and data access' },
  { id: 'appearance' as Section,    icon: '◐', label: 'Appearance',      sub: 'Theme and system preference' },
  { id: 'integrations' as Section,  icon: '⟳', label: 'Integrations',    sub: 'Connected apps and sync' },
  { id: 'privacy' as Section,       icon: '⊘', label: 'Privacy & Data',  sub: 'Export and deletion tools' },
]

const ACCENT_COLORS = [
  { key: 'white',  bg: '#fff' },
  { key: 'blue',   bg: '#60a5fa' },
  { key: 'purple', bg: '#a78bfa' },
  { key: 'green',  bg: '#34d399' },
  { key: 'amber',  bg: '#f59e0b' },
  { key: 'red',    bg: '#f87171' },
  { key: 'orange', bg: '#fb923c' },
]

const API = apiUrl('')

function readThemeSetting(): ThemeSetting {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem('tf-theme')
  return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system'
}

function readSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function readInitialPushStatus(): 'checking' | 'unsupported' {
  if (typeof window === 'undefined') return 'checking'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  return 'checking'
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [section, setSection]     = useState<Section>('account')
  const [data, setData]           = useState<UserData | null>(null)
  const [fullName, setFullName]   = useState('')
  const [toast, setToast]         = useState('')
  const [showToast, setShowToast] = useState(false)
  const [theme, setTheme]         = useState<ThemeSetting>(() => readThemeSetting())
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => readSystemTheme())
  const [accent, setAccent]       = useState('white')
  const [modal, setModal]         = useState<'none'|'data'|'account'|'memory'>('none')
  const [modalInput, setModalInput] = useState('')
  const [modalError, setModalError] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [pushStatus, setPushStatus] = useState<'checking'|'unsupported'|'off'|'on'|'busy'>(() => readInitialPushStatus())

  // Notification toggles
  const [notifs, setNotifs] = useState({
    daily_briefing: true, habit_reminders: true, streak_alerts: true,
    journal_nudges: false, weekly_summary: true,
  })
  // AI toggles
  const [aiToggles, setAiToggles] = useState({
    ai_tasks: true, ai_habits: true, ai_journal: false,
  })

  const fireToast = (msg: string) => {
    setToast(msg); setShowToast(true)
    setTimeout(() => setShowToast(false), 2200)
  }

  // ── Sync theme from localStorage on mount ──────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme')
    if (saved !== 'dark' && saved !== 'light' && saved !== 'system') {
      localStorage.setItem('tf-theme', 'system')
    }
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const updateSystemTheme = () => setSystemTheme(media.matches ? 'light' : 'dark')
    media.addEventListener('change', updateSystemTheme)
    return () => media.removeEventListener('change', updateSystemTheme)
  }, [])

  // ── Listen for theme changes from Sidebar (same tab via custom event) ──
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme' && (e.newValue === 'dark' || e.newValue === 'light' || e.newValue === 'system')) {
        setTheme(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ── Apply theme + broadcast to Sidebar ────────────────────────────
  const applyTheme = (next: ThemeSetting) => {
    setTheme(next)
    localStorage.setItem('tf-theme', next)
    // StorageEvent doesn't fire for same-tab changes, so dispatch manually
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'tf-theme', newValue: next })
    )
    fireToast('Theme saved')
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return
    }
    getForgePushSubscription()
      .then(subscription => setPushStatus(subscription ? 'on' : 'off'))
      .catch(() => setPushStatus('off'))
  }, [])

  useEffect(() => {
    fetch(apiUrl('/api/settings/data'), { credentials: 'include' })
      .then(r => r.json()).then(d => {
        setData(d); setFullName(d.name || '')
      }).catch(() => {})
  }, [])

  async function saveName() {
    if (!fullName.trim()) return
    setSaving(true)
    await fetch(apiUrl('/api/settings/update-name'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName })
    })
    setSaving(false)
    fireToast('Name updated')
  }

  async function enablePushNotifications() {
    if (pushStatus === 'busy') return
    setPushStatus('busy')
    try {
      await subscribeToForgePush()
      setPushStatus('on')
      fireToast('Daily commitment reminders enabled')
    } catch (error) {
      setPushStatus('off')
      fireToast(error instanceof Error ? error.message : 'Could not enable notifications')
    }
  }

  async function disablePushNotifications() {
    if (pushStatus === 'busy') return
    setPushStatus('busy')
    try {
      await unsubscribeFromForgePush()
      setPushStatus('off')
      fireToast('Daily commitment reminders disabled')
    } catch {
      setPushStatus('off')
      fireToast('Could not disable notifications')
    }
  }

  async function clearMemory() {
    if (modalInput.trim() !== 'CLEAR') { setModalError(true); return }
    await fetch(apiUrl('/api/settings/clear-ai-memory'), { method: 'POST', credentials: 'include' })
    setModal('none'); setModalInput(''); fireToast('AI memory cleared')
  }

  async function deleteData() {
    if (modalInput.trim() !== 'DELETE') { setModalError(true); return }
    await fetch(apiUrl('/api/settings/delete-data'), { method: 'POST', credentials: 'include' })
    setModal('none'); setModalInput(''); fireToast('All data deleted')
  }

  async function deleteAccount() {
    if (modalInput.trim() !== 'DELETE') { setModalError(true); return }
    await fetch(apiUrl('/api/settings/delete-account'), { method: 'POST', credentials: 'include' })
    window.location.href = '/logout'
  }

  const initials = data?.name
    ? data.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : data?.username ? data.username.slice(0, 2).toUpperCase() : 'TF'

  function handleAvatarUpload(url: string) {
    setData(prev => prev ? { ...prev, profile_image: url } : prev)
    queryClient.invalidateQueries({ queryKey: ['me'] })
    fireToast('Profile photo updated!')
  }

  function handleAvatarRemove() {
    setData(prev => prev ? { ...prev, profile_image: null } : prev)
    queryClient.invalidateQueries({ queryKey: ['me'] })
    fireToast('Profile photo removed.')
  }

  const resolvedTheme = theme === 'system' ? systemTheme : theme
  const t = THEMES[resolvedTheme] ?? THEMES.dark
  const inp = { width:'100%', background: t.inputBg, border:`1px solid ${t.inputBorder}`, borderRadius:'9px', padding:'10px 14px', fontSize:'13px', color: t.inputColor, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }
  const togStyle = (on: boolean) => ({ width:'38px', height:'21px', borderRadius:'100px', background: on ? t.toggleOn : t.toggleOff, border: on ? 'none' : `1px solid ${t.toggleBorder}`, cursor:'pointer', position:'relative' as const, flexShrink:0, transition:'all 0.2s' })

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px minmax(0,1fr)', minHeight:'100vh', minWidth:0, background: t.pageBg }}>

      {/* SETTINGS NAV */}
      <div style={{ background: t.navBg, borderRight:`1px solid ${t.border}`, padding:'32px 0 0', position:'sticky', top:0, height:'100vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'0 20px 20px', borderBottom:`1px solid ${t.border}`, marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
            <SidebarReopenButton />
            <div style={{ fontSize:'17px', fontWeight:800, letterSpacing:'-0.4px', color: t.titleColor }}>Settings</div>
          </div>
          <div style={{ fontSize:'11px', color: t.mutedText, marginTop:'3px' }}>Manage your preferences</div>
        </div>
        {NAV.map(n => (
          <div key={n.id} onClick={() => setSection(n.id)} style={{
            display:'flex', alignItems:'center', gap:'9px', padding:'8px 20px', fontSize:'13px', cursor:'pointer', transition:'all 0.15s',
            color: section === n.id ? t.navActive : t.navInactive,
            background: section === n.id ? t.navActiveBg : 'transparent',
            borderLeft: section === n.id ? `2px solid ${t.navActiveLine}` : '2px solid transparent',
          }}>
            <span style={{ fontSize:'13px', width:'16px', textAlign:'center', flexShrink:0 }}>{n.icon}</span>{n.label}
          </div>
        ))}
        <div style={{ marginTop:'auto', padding:'14px 20px', borderTop:`1px solid ${t.border}` }}>
          <a href="/home" style={{ fontSize:'12px', color: t.dashLink, textDecoration:'none' }}>← Dashboard</a>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:'40px 48px', overflowY:'auto', maxHeight:'100vh', background: t.contentBg }}>
        <div style={{ width:'min(100%, 600px)' }}>

          {/* ACCOUNT */}
          {section === 'account' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color: t.titleColor, marginBottom:'4px' }}>Account</div>
              <div style={{ fontSize:'13px', color: t.subColor, marginBottom:'32px', lineHeight:1.6 }}>Manage your profile information and login credentials.</div>

              {/* Avatar upload */}
              <AvatarUpload
                profileImage={data?.profile_image ?? null}
                name={data?.name || data?.username || ''}
                email={data?.email || ''}
                initials={initials}
                theme={theme as 'dark' | 'light'}
                onUpload={handleAvatarUpload}
                onRemove={handleAvatarRemove}
              />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color: t.labelColor, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Full name</div>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color: t.labelColor, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Username</div>
                  <input value={data?.username || ''} disabled style={{ ...inp, opacity:0.45, cursor:'not-allowed' }}/>
                </div>
              </div>
              <button onClick={saveName} disabled={saving} style={{ background: t.saveBg, color: t.saveColor, border:'none', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              <div style={{ height:'1px', background: t.divider, margin:'28px 0' }}/>

              <div style={{ fontSize:'14px', fontWeight:600, color: t.sectionTitle, marginBottom:'4px' }}>Change password</div>
              <div style={{ fontSize:'12px', color: t.mutedText, marginBottom:'18px', lineHeight:1.5 }}>Leave blank to keep your current password.</div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', fontWeight:500, color: t.labelColor, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Current password</div>
                <input type="password" placeholder="••••••••" style={inp}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color: t.labelColor, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>New password</div>
                  <input type="password" placeholder="••••••••" style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color: t.labelColor, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Confirm new password</div>
                  <input type="password" placeholder="••••••••" style={inp}/>
                </div>
              </div>
              <button style={{ background: t.saveBg, color: t.saveColor, border:'none', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Update password</button>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {section === 'notifications' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color: t.titleColor, marginBottom:'4px' }}>Notifications</div>
              <div style={{ fontSize:'13px', color: t.subColor, marginBottom:'28px', lineHeight:1.6 }}>Control when and how Forge follows up on your commitments.</div>

              <div style={{
                border:`1px solid ${t.cardBorder}`,
                background: t.cardBg,
                borderRadius:'16px',
                padding:'18px',
                marginBottom:'22px',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'20px' }}>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:650, color: t.notifName, letterSpacing:'-0.2px', marginBottom:'5px' }}>Daily commitment reminder</div>
                    <div style={{ fontSize:'12px', color: t.notifDesc, lineHeight:1.6, maxWidth:'520px' }}>
                      One browser notification per day at 8 AM with your active Forge commitment. This only works after browser permission is granted.
                    </div>
                    <div style={{ fontSize:'10px', color: t.tinyText, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:'12px' }}>
                      {pushStatus === 'checking' ? 'Checking browser support'
                      : pushStatus === 'unsupported' ? 'Not supported by this browser'
                      : pushStatus === 'on' ? 'Enabled'
                      : pushStatus === 'busy' ? 'Updating'
                      : 'Disabled'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={pushStatus === 'checking' || pushStatus === 'unsupported' || pushStatus === 'busy'}
                    onClick={() => pushStatus === 'on' ? void disablePushNotifications() : void enablePushNotifications()}
                    style={{
                      border:`1px solid ${pushStatus === 'on' ? t.inputBorder : 'transparent'}`,
                      borderRadius:'999px',
                      background: pushStatus === 'on' ? 'transparent' : t.saveBg,
                      color: pushStatus === 'on' ? t.bodyText : t.saveColor,
                      padding:'9px 14px',
                      fontSize:'12px',
                      fontWeight:650,
                      fontFamily:'inherit',
                      cursor: pushStatus === 'checking' || pushStatus === 'unsupported' || pushStatus === 'busy' ? 'default' : 'pointer',
                      opacity: pushStatus === 'checking' || pushStatus === 'unsupported' ? 0.45 : 1,
                      whiteSpace:'nowrap',
                    }}
                  >
                    {pushStatus === 'on' ? 'Turn off'
                    : pushStatus === 'busy' ? 'Saving…'
                    : 'Turn on'}
                  </button>
                </div>
              </div>

              {([
                { key:'daily_briefing',   name:'Daily coach briefing',      desc:'A short morning commitment check-in when there is something concrete to do.' },
                { key:'habit_reminders',  name:'Commitment reminders',      desc:'Follow-ups when a deadline is near or a commitment keeps getting carried.' },
                { key:'streak_alerts',    name:'Avoidance alerts',          desc:"Direct reminders when your behavior starts drifting from the mission." },
                { key:'journal_nudges',   name:'Reflection prompts',        desc:'A quiet prompt to explain what happened instead of ignoring the pattern.' },
                { key:'weekly_summary',   name:'Weekly pattern summary',    desc:'A concise review of commitments made, kept, missed, and what changed.' },
              ] as { key: keyof typeof notifs; name: string; desc: string }[]).map(n => (
                <div key={n.key} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'20px', padding:'14px 0', borderBottom:`1px solid ${t.notifSep}` }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color: t.notifName, marginBottom:'3px' }}>{n.name}</div>
                    <div style={{ fontSize:'11px', color: t.notifDesc, lineHeight:1.55 }}>{n.desc}</div>
                  </div>
                  <div onClick={() => { setNotifs(p => ({ ...p, [n.key]: !p[n.key] })); fireToast('Saved') }} style={togStyle(notifs[n.key])}>
                    <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background: notifs[n.key] ? t.toggleDotOn : t.toggleDotOff, top:'2px', left: notifs[n.key] ? '20px' : '2px', transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI PREFERENCES */}
          {section === 'ai' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color: t.titleColor, marginBottom:'4px' }}>AI Preferences</div>
              <div style={{ fontSize:'13px', color: t.subColor, marginBottom:'32px', lineHeight:1.6 }}>Control what data the AI can see and how actively it coaches you.</div>
              <div style={{ fontSize:'14px', fontWeight:600, color: t.aiSectionTitle, marginBottom:'4px' }}>Data access</div>
              <div style={{ fontSize:'12px', color: t.mutedText, marginBottom:'18px', lineHeight:1.5 }}>The AI only uses what you allow. Disabling a source reduces coaching accuracy.</div>
              {([
                { key:'ai_tasks',   name:'Tasks',          desc:'Allow the AI to read your tasks and completion rates to optimize your daily plan.' },
                { key:'ai_habits',  name:'Habits',         desc:'Allow the AI to analyze habit streaks and suggest adjustments when you slip.' },
                { key:'ai_journal', name:'Journal entries', desc:'Allow the AI to read your journal to detect patterns in mood and productivity.' },
              ] as { key: keyof typeof aiToggles; name: string; desc: string }[]).map(n => (
                <div key={n.key} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'20px', padding:'14px 0', borderBottom:`1px solid ${t.notifSep}` }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color: t.notifName, marginBottom:'3px' }}>{n.name}</div>
                    <div style={{ fontSize:'11px', color: t.notifDesc, lineHeight:1.55 }}>{n.desc}</div>
                  </div>
                  <div onClick={() => { setAiToggles(p => ({ ...p, [n.key]: !p[n.key] })); fireToast('Saved') }} style={togStyle(aiToggles[n.key])}>
                    <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background: aiToggles[n.key] ? t.toggleDotOn : t.toggleDotOff, top:'2px', left: aiToggles[n.key] ? '20px' : '2px', transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
                  </div>
                </div>
              ))}
              <div style={{ height:'1px', background: t.divider, margin:'28px 0' }}/>
              <div style={{ fontSize:'14px', fontWeight:600, color: t.aiSectionTitle, marginBottom:'4px' }}>AI Memory</div>
              <div style={{ fontSize:'12px', color: t.mutedText, marginBottom:'18px', lineHeight:1.5 }}>The AI learns your patterns over time. Clearing memory removes everything it has learned.</div>
              <button onClick={() => { setModal('memory'); setModalInput(''); setModalError(false) }} style={{ background: t.aiBtnBg, color: t.aiBtnColor, border:`1px solid ${t.aiBtnBorder}`, borderRadius:'9px', padding:'10px 22px', fontSize:'13px', cursor:'pointer' }}>Clear AI memory</button>
            </div>
          )}

          {/* ── APPEARANCE ─────────────────────────────────────────────── */}
          {section === 'appearance' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color: t.titleColor, marginBottom:'4px' }}>Appearance</div>
              <div style={{ fontSize:'13px', color: t.subColor, marginBottom:'32px', lineHeight:1.6 }}>Choose how Forge follows your browser and system preference.</div>
              <div style={{ fontSize:'10px', fontWeight:600, color: t.accentLabel, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'12px' }}>Theme</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'28px' }}>
                {([
                  { key:'light',  name:'Light',  desc:'Clean white interface',        previewBg:'#f4f4f4', bars:['#ddd','#eee'] },
                  { key:'dark',   name:'Dark',   desc:'Pure black, easy on the eyes', previewBg:'#111',   bars:['#333','#222'] },
                  { key:'system', name:'System', desc:'Follows your OS setting',      previewBg:'linear-gradient(135deg,#111 50%,#f0f0f0 50%)', bars:[] },
                ] as { key: ThemeSetting; name: string; desc: string; previewBg: string; bars: string[] }[]).map(opt => (
                  <div
                    key={opt.key}
                    onClick={() => applyTheme(opt.key)}
                    style={{
                      border:`1px solid ${theme===opt.key ? t.themeSelBorder : t.themeBorder}`,
                      borderRadius:'12px', padding:'14px', cursor:'pointer',
                      background: theme===opt.key ? t.themeSelBg : 'transparent',
                      transition:'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ height:'50px', borderRadius:'7px', marginBottom:'10px', display:'flex', gap:'3px', padding:'6px', background: opt.previewBg }}>
                      {opt.bars.map((b, i) => <div key={i} style={{ flex:1, borderRadius:'3px', background:b }}/>)}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:500, color: t.themeNameColor }}>{opt.name}</div>
                        <div style={{ fontSize:'10px', color: t.themeDescColor, marginTop:'2px' }}>{opt.desc}</div>
                      </div>
                      <div style={{
                        width:'14px', height:'14px', borderRadius:'50%',
                        border:`1px solid ${t.radioOuter}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'7px',
                        background: theme===opt.key ? t.radioInnerActive : 'transparent',
                        color:       theme===opt.key ? t.radioCheck       : 'transparent',
                        transition:'background 0.15s',
                      }}>✓</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active theme badge */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'28px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(100,220,130,0.9)', flexShrink:0 }}/>
                <span style={{ fontSize:'11px', color: t.badgeText }}>
                  {theme === 'dark'   ? 'Dark mode is active across the app'
                  : theme === 'light' ? 'Light mode is active across the app'
                  :                    'Following your system setting'}
                </span>
              </div>

              <div style={{ fontSize:'10px', fontWeight:600, color: t.accentLabel, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'12px' }}>Accent color</div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                {ACCENT_COLORS.map(a => (
                  <div key={a.key} onClick={() => { setAccent(a.key); fireToast('Saved') }} style={{ width:'26px', height:'26px', borderRadius:'50%', cursor:'pointer', background:a.bg, border: accent===a.key ? `2px solid ${t.titleColor}` : '2px solid transparent', transform: accent===a.key?'scale(1.15)':'scale(1)', transition:'all 0.15s' }}/>
                ))}
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {section === 'integrations' && (
            <div style={{ width:'min(100%, 720px)' }}>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color: t.titleColor, marginBottom:'4px' }}>Integrations</div>
              <div style={{ fontSize:'13px', color: t.subColor, marginBottom:'32px', lineHeight:1.6 }}>Connect external services to extend Forge. More coming soon.</div>
              <div style={{ fontSize:'10px', fontWeight:600, color: t.accentLabel, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'10px' }}>Available now</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:'13px', padding:'14px 18px', marginBottom:'8px', gap:'16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1, minWidth:0 }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'10px', background: t.intIconBg, border:`1px solid ${t.intIconBorder}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>▦</div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:600, color: t.intTitle, marginBottom:'3px' }}>Google Calendar</div>
                    <div style={{ fontSize:'11px', color: t.intDesc, lineHeight:1.5 }}>
                      {data?.google_calendar_connected ? `Syncing with ${data.current_user_email}` : 'Sync Forge events with your Google Calendar'}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
                  {data?.google_calendar_connected ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:500, color: t.intConnected }}>
                        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: t.intConnected }}/>Connected
                      </div>
                      <a href={`${API}/calendar/disconnect-google`} style={{ background: t.intDisconnBg, color: t.intDisconnColor, border:`1px solid ${t.intDisconnBorder}`, borderRadius:'8px', padding:'7px 16px', fontSize:'12px', textDecoration:'none', display:'inline-block' }}>Disconnect</a>
                    </>
                  ) : (
                    <a href={`${API}/calendar/connect-google`} style={{ background: t.intConnectBg, color: t.intConnectColor, border:'none', borderRadius:'8px', padding:'7px 16px', fontSize:'12px', fontWeight:600, textDecoration:'none', display:'inline-block' }}>Connect</a>
                  )}
                </div>
              </div>
              <div style={{ fontSize:'10px', fontWeight:600, color: t.accentLabel, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'10px', marginTop:'24px' }}>Coming soon</div>
              {['Google Tasks','Notion','Apple Health','Spotify'].map(name => (
                <div key={name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:'13px', padding:'14px 18px', marginBottom:'8px', opacity:0.6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'10px', background: t.intIconBg, border:`1px solid ${t.intIconBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color: t.mutedText }}>⟳</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color: t.bodyText, marginBottom:'3px' }}>{name}</div>
                      <div style={{ fontSize:'11px', color: t.intDesc }}>Integration coming soon</div>
                    </div>
                  </div>
                  <span style={{ fontSize:'10px', fontWeight:500, padding:'3px 9px', borderRadius:'5px', background: t.soonBg, color: t.soonColor, border:`1px solid ${t.soonBorder}` }}>Soon</span>
                </div>
              ))}
            </div>
          )}

          {/* PRIVACY */}
          {section === 'privacy' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color: t.titleColor, marginBottom:'4px' }}>Privacy & Data</div>
              <div style={{ fontSize:'13px', color: t.subColor, marginBottom:'32px', lineHeight:1.6 }}>Your data belongs to you. Export it, manage it, or delete it whenever you want.</div>
              {[
                {
                  title:'Export my data', titleColor: t.privTitleGray,
                  desc:'Download everything Forge has stored — missions, commitments, outputs, patterns, and retained legacy data — as a JSON file.',
                  borderColor: t.cardBorder, bg: t.cardBg,
                  action: <a href={`${API}/settings/export`} style={{ background: t.privExportBg, color: t.privExportColor, border:`1px solid ${t.privExportBorder}`, borderRadius:'9px', padding:'10px 22px', fontSize:'13px', textDecoration:'none', display:'inline-block' }}>Export data (JSON)</a>
                },
                {
                  title:'Delete all data', titleColor: t.redTitle,
                  desc:'Permanently removes all your tasks, habits, journal entries, and AI memory. Your account stays active but completely empty.',
                  borderColor: t.redBorder, bg: t.redBg,
                  action: <button onClick={() => { setModal('data'); setModalInput(''); setModalError(false) }} style={{ background: t.redBtnBg, color: t.redBtnColor, border:`1px solid ${t.redBtnBorder}`, borderRadius:'9px', padding:'10px 22px', fontSize:'13px', cursor:'pointer' }}>Delete all data</button>
                },
                {
                  title:'Delete account', titleColor: t.redDeepTitle,
                  desc:'Permanently deletes your Forge account and all associated data. You will be immediately logged out and cannot recover your account.',
                  borderColor: t.redBorder, bg: t.redBg,
                  action: <button onClick={() => { setModal('account'); setModalInput(''); setModalError(false) }} style={{ background: t.redBtnBg, color: t.redBtnColor, border:`1px solid ${t.redBtnBorder}`, borderRadius:'9px', padding:'10px 22px', fontSize:'13px', cursor:'pointer' }}>Delete account</button>
                },
              ].map((card, i) => (
                <div key={i} style={{ background:card.bg, border:`1px solid ${card.borderColor}`, borderRadius:'12px', padding:'18px 20px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:card.titleColor, marginBottom:'5px' }}>{card.title}</div>
                  <div style={{ fontSize:'12px', color: t.privDescColor, marginBottom:'14px', lineHeight:1.55 }}>{card.desc}</div>
                  {card.action}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal !== 'none' && (
        <div onClick={e => e.target === e.currentTarget && setModal('none')} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background: t.modalBg, border:`1px solid ${t.modalBorder}`, borderRadius:'18px', padding:'28px', maxWidth:'400px', width:'90%' }}>
            <div style={{ fontSize:'16px', fontWeight:800, letterSpacing:'-0.4px', color: t.modalTitle, marginBottom:'8px' }}>
              {modal === 'memory' ? 'Clear AI memory?' : modal === 'account' ? 'Delete your account?' : 'Delete all data?'}
            </div>
            <div style={{ fontSize:'13px', color: t.modalBody, lineHeight:1.65, marginBottom:'20px' }}>
              {modal === 'memory'
                ? <>The AI will forget all learned patterns and start fresh. Type <strong>CLEAR</strong> to confirm.</>
                : modal === 'account'
                ? <>This permanently deletes your account and all data. Type <strong>DELETE</strong> to confirm.</>
                : <>This permanently removes all tasks, habits, journal entries, and AI memory. Type <strong>DELETE</strong> to confirm.</>}
            </div>
            <input value={modalInput} onChange={e => { setModalInput(e.target.value); setModalError(false) }}
              placeholder={modal === 'memory' ? 'Type CLEAR to confirm' : 'Type DELETE to confirm'}
              style={{ ...inp, marginBottom:'16px', border: modalError ? '1px solid rgba(255,80,80,0.5)' : `1px solid ${t.inputBorder}` }}
            />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setModal('none')} style={{ flex:1, background: t.cancelBg, color: t.cancelColor, border:`1px solid ${t.cancelBorder}`, borderRadius:'9px', padding:'10px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={() => modal === 'memory' ? clearMemory() : modal === 'account' ? deleteAccount() : deleteData()}
                style={{ flex:1, background: t.deleteBg, color: t.deleteColor, border:`1px solid ${t.deleteBorder}`, borderRadius:'9px', padding:'10px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                {modal === 'memory' ? 'Clear memory' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{ position:'fixed', bottom:'24px', right:'24px', background: t.toastBg, border:`1px solid ${t.toastBorder}`, borderRadius:'10px', padding:'10px 16px', fontSize:'12px', color: t.toastColor, display:'flex', alignItems:'center', gap:'8px', transform: showToast ? 'translateY(0)' : 'translateY(80px)', opacity: showToast ? 1 : 0, transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents:'none', zIndex:999 }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(100,220,130,0.9)', flexShrink:0 }}/>
        {toast}
      </div>
    </div>
  )
}
