'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiUrl } from '@/lib/api-base'

interface UserData {
  name: string; username: string; email: string
  profile_image: string | null; google_calendar_connected: boolean
  current_user_email: string
}

type Section = 'account' | 'notifications' | 'ai' | 'appearance' | 'integrations' | 'privacy'

const NAV = [
  { id: 'account' as Section,       icon: '◉', label: 'Account',        sub: 'Profile and password' },
  { id: 'notifications' as Section, icon: '◎', label: 'Notifications',   sub: 'Reminders and alerts' },
  { id: 'ai' as Section,            icon: '✦', label: 'AI Preferences',  sub: 'Coaching and data access' },
  { id: 'appearance' as Section,    icon: '◐', label: 'Appearance',      sub: 'Theme and accent color' },
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

export default function SettingsPage() {
  const [section, setSection]     = useState<Section>('account')
  const [data, setData]           = useState<UserData | null>(null)
  const [fullName, setFullName]   = useState('')
  const [toast, setToast]         = useState('')
  const [showToast, setShowToast] = useState(false)
  const [theme, setTheme]         = useState('dark')
  const [accent, setAccent]       = useState('white')
  const [modal, setModal]         = useState<'none'|'data'|'account'|'memory'>('none')
  const [modalInput, setModalInput] = useState('')
  const [modalError, setModalError] = useState(false)
  const [saving, setSaving]         = useState(false)

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
    window.location.href = apiUrl('/logout')
  }

  const initials = data?.username ? data.username.slice(0, 2).toUpperCase() : 'TF'

  const inp = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', padding:'10px 14px', fontSize:'13px', color:'#fff', fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }
  const togStyle = (on: boolean) => ({ width:'38px', height:'21px', borderRadius:'100px', background: on ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.1)', border: on ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor:'pointer', position:'relative' as const, flexShrink:0, transition:'all 0.2s' })

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px minmax(0,1fr)', minHeight:'100vh', minWidth:0 }}>

      {/* SETTINGS NAV */}
      <div style={{ borderRight:'1px solid rgba(255,255,255,0.05)', padding:'32px 0 0', position:'sticky', top:0, height:'100vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'0 20px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:'16px' }}>
          <div style={{ fontSize:'17px', fontWeight:800, letterSpacing:'-0.4px', color:'rgba(255,255,255,0.9)' }}>Settings</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>Manage your preferences</div>
        </div>
        {NAV.map(n => (
          <div key={n.id} onClick={() => setSection(n.id)} style={{
            display:'flex', alignItems:'center', gap:'9px', padding:'8px 20px', fontSize:'13px', cursor:'pointer', transition:'all 0.15s',
            color: section === n.id ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.42)',
            background: section === n.id ? 'rgba(255,255,255,0.04)' : 'transparent',
            borderLeft: section === n.id ? '2px solid rgba(255,255,255,0.45)' : '2px solid transparent',
          }}>
            <span style={{ fontSize:'13px', width:'16px', textAlign:'center', flexShrink:0 }}>{n.icon}</span>{n.label}
          </div>
        ))}
        <div style={{ marginTop:'auto', padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <a href="/home" style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>← Dashboard</a>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:'40px 48px', overflowY:'auto', maxHeight:'100vh' }}>
        <div style={{ width:'min(100%, 600px)' }}>

          {/* ACCOUNT */}
          {section === 'account' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)', marginBottom:'4px' }}>Account</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px', lineHeight:1.6 }}>Manage your profile information and login credentials.</div>

              {/* Avatar row */}
              <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'28px', padding:'18px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', flexWrap:'wrap' }}>
                <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, color:'rgba(255,255,255,0.6)', flexShrink:0, overflow:'hidden' }}>
                  {data?.profile_image
                    ? <img src={apiUrl(data.profile_image)} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : initials}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:'2px' }}>{data?.name || data?.username}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.32)' }}>{data?.email}</div>
                </div>
                <a href={apiUrl('/upload_profile')} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'6px 12px', fontSize:'11px', color:'rgba(255,255,255,0.5)', cursor:'pointer', textDecoration:'none' }}>Change photo</a>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Full name</div>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Username</div>
                  <input value={data?.username || ''} disabled style={{ ...inp, opacity:0.45, cursor:'not-allowed' }}/>
                </div>
              </div>
              <button onClick={saveName} disabled={saving} style={{ background:'#fff', color:'#0A0A0A', border:'none', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'28px 0' }}/>

              <div style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:'4px' }}>Change password</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'18px', lineHeight:1.5 }}>Leave blank to keep your current password.</div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Current password</div>
                <input type="password" placeholder="••••••••" style={inp}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>New password</div>
                  <input type="password" placeholder="••••••••" style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Confirm new password</div>
                  <input type="password" placeholder="••••••••" style={inp}/>
                </div>
              </div>
              <button style={{ background:'#fff', color:'#0A0A0A', border:'none', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Update password</button>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {section === 'notifications' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)', marginBottom:'4px' }}>Notifications</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px', lineHeight:1.6 }}>Control when and how TaskFlow reaches out to keep you on track.</div>
              {([
                { key:'daily_briefing',   name:'Daily AI briefing',        desc:'A personalized morning summary of your tasks, habits, and focus area.' },
                { key:'habit_reminders',  name:'Habit reminders',          desc:'Nudges when habits are due or when your streak is at risk.' },
                { key:'streak_alerts',    name:'Streak alerts',            desc:"Get notified before midnight if you haven't checked in today." },
                { key:'journal_nudges',   name:'Journal check-in nudges',  desc:'A gentle evening reminder to write your daily journal entry.' },
                { key:'weekly_summary',   name:'Weekly AI summary',        desc:'Every Sunday, a full breakdown of your week and what to focus on.' },
              ] as { key: keyof typeof notifs; name: string; desc: string }[]).map(n => (
                <div key={n.key} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'20px', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,0.78)', marginBottom:'3px' }}>{n.name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', lineHeight:1.55 }}>{n.desc}</div>
                  </div>
                  <div onClick={() => { setNotifs(p => ({ ...p, [n.key]: !p[n.key] })); fireToast('Saved') }} style={togStyle(notifs[n.key])}>
                    <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background: notifs[n.key] ? '#0A0A0A' : '#fff', top:'2px', left: notifs[n.key] ? '20px' : '2px', transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI PREFERENCES */}
          {section === 'ai' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)', marginBottom:'4px' }}>AI Preferences</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px', lineHeight:1.6 }}>Control what data the AI can see and how actively it coaches you.</div>
              <div style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:'4px' }}>Data access</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'18px', lineHeight:1.5 }}>The AI only uses what you allow. Disabling a source reduces coaching accuracy.</div>
              {([
                { key:'ai_tasks',   name:'Tasks',          desc:'Allow the AI to read your tasks and completion rates to optimize your daily plan.' },
                { key:'ai_habits',  name:'Habits',         desc:'Allow the AI to analyze habit streaks and suggest adjustments when you slip.' },
                { key:'ai_journal', name:'Journal entries', desc:'Allow the AI to read your journal to detect patterns in mood and productivity.' },
              ] as { key: keyof typeof aiToggles; name: string; desc: string }[]).map(n => (
                <div key={n.key} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'20px', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,0.78)', marginBottom:'3px' }}>{n.name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', lineHeight:1.55 }}>{n.desc}</div>
                  </div>
                  <div onClick={() => { setAiToggles(p => ({ ...p, [n.key]: !p[n.key] })); fireToast('Saved') }} style={togStyle(aiToggles[n.key])}>
                    <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background: aiToggles[n.key] ? '#0A0A0A' : '#fff', top:'2px', left: aiToggles[n.key] ? '20px' : '2px', transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
                  </div>
                </div>
              ))}
              <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'28px 0' }}/>
              <div style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:'4px' }}>AI Memory</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'18px', lineHeight:1.5 }}>The AI learns your patterns over time. Clearing memory removes everything it has learned.</div>
              <button onClick={() => { setModal('memory'); setModalInput(''); setModalError(false) }} style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', cursor:'pointer' }}>Clear AI memory</button>
            </div>
          )}

          {/* APPEARANCE */}
          {section === 'appearance' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)', marginBottom:'4px' }}>Appearance</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px', lineHeight:1.6 }}>Choose how TaskFlow looks and feels for you.</div>
              <div style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'12px' }}>Theme</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'28px' }}>
                {[
                  { key:'light',  name:'Light',  desc:'Clean white interface',      previewBg:'#f4f4f4', bars:['#ddd','#eee'] },
                  { key:'dark',   name:'Dark',   desc:'Pure black, easy on the eyes', previewBg:'#111',   bars:['#333','#222'] },
                  { key:'system', name:'System', desc:'Follows your OS setting',    previewBg:'linear-gradient(135deg,#111 50%,#f0f0f0 50%)', bars:[] },
                ].map(t => (
                  <div key={t.key} onClick={() => { setTheme(t.key); fireToast('Saved') }} style={{ border:`1px solid ${theme===t.key?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.08)'}`, borderRadius:'12px', padding:'14px', cursor:'pointer', background: theme===t.key?'rgba(255,255,255,0.04)':'transparent' }}>
                    <div style={{ height:'50px', borderRadius:'7px', marginBottom:'10px', display:'flex', gap:'3px', padding:'6px', background: t.previewBg }}>
                      {t.bars.map((b, i) => <div key={i} style={{ flex:1, borderRadius:'3px', background:b }}/>)}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:500, color:'rgba(255,255,255,0.7)' }}>{t.name}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)', marginTop:'2px' }}>{t.desc}</div>
                      </div>
                      <div style={{ width:'14px', height:'14px', borderRadius:'50%', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px', background: theme===t.key?'rgba(255,255,255,0.7)':'transparent', color: theme===t.key?'#0A0A0A':'transparent' }}>✓</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'12px' }}>Accent color</div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                {ACCENT_COLORS.map(a => (
                  <div key={a.key} onClick={() => { setAccent(a.key); fireToast('Saved') }} style={{ width:'26px', height:'26px', borderRadius:'50%', cursor:'pointer', background:a.bg, border: accent===a.key?'2px solid #fff':'2px solid transparent', transform: accent===a.key?'scale(1.15)':'scale(1)', transition:'all 0.15s' }}/>
                ))}
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {section === 'integrations' && (
            <div style={{ width:'min(100%, 720px)' }}>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)', marginBottom:'4px' }}>Integrations</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px', lineHeight:1.6 }}>Connect external services to supercharge TaskFlow. More coming soon.</div>
              <div style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'10px' }}>Available now</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'13px', padding:'14px 18px', marginBottom:'8px', gap:'16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1, minWidth:0 }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>▦</div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.78)', marginBottom:'3px' }}>Google Calendar</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.28)', lineHeight:1.5 }}>
                      {data?.google_calendar_connected ? `Syncing with ${data.current_user_email}` : 'Sync TaskFlow events with your Google Calendar'}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
                  {data?.google_calendar_connected ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:500, color:'rgba(80,210,130,0.85)' }}>
                        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(80,210,130,0.85)' }}/>Connected
                      </div>
                      <a href={`${API}/calendar/disconnect-google`} style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'8px', padding:'7px 16px', fontSize:'12px', textDecoration:'none', display:'inline-block' }}>Disconnect</a>
                    </>
                  ) : (
                    <a href={`${API}/calendar/connect-google`} style={{ background:'#fff', color:'#0A0A0A', border:'none', borderRadius:'8px', padding:'7px 16px', fontSize:'12px', fontWeight:600, textDecoration:'none', display:'inline-block' }}>Connect</a>
                  )}
                </div>
              </div>
              <div style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'10px', marginTop:'24px' }}>Coming soon</div>
              {['Google Tasks','Notion','Apple Health','Spotify'].map(name => (
                <div key={name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'13px', padding:'14px 18px', marginBottom:'8px', opacity:0.6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'rgba(255,255,255,0.3)' }}>⟳</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.45)', marginBottom:'3px' }}>{name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.28)' }}>Integration coming soon</div>
                    </div>
                  </div>
                  <span style={{ fontSize:'10px', fontWeight:500, padding:'3px 9px', borderRadius:'5px', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.25)', border:'1px solid rgba(255,255,255,0.07)' }}>Soon</span>
                </div>
              ))}
            </div>
          )}

          {/* PRIVACY */}
          {section === 'privacy' && (
            <div>
              <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)', marginBottom:'4px' }}>Privacy & Data</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px', lineHeight:1.6 }}>Your data belongs to you. Export it, manage it, or delete it whenever you want.</div>
              {[
                { title:'Export my data', titleColor:'rgba(255,255,255,0.7)', desc:'Download everything TaskFlow has stored — tasks, habits, journal entries, and AI insights — as a JSON file.', borderColor:'rgba(255,255,255,0.08)', bg:'rgba(255,255,255,0.02)', action: <a href={`${API}/settings/export`} style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', textDecoration:'none', display:'inline-block' }}>Export data (JSON)</a> },
                { title:'Delete all data', titleColor:'rgba(255,150,150,0.8)', desc:'Permanently removes all your tasks, habits, journal entries, and AI memory. Your account stays active but completely empty.', borderColor:'rgba(255,50,50,0.1)', bg:'rgba(255,50,50,0.03)', action: <button onClick={() => { setModal('data'); setModalInput(''); setModalError(false) }} style={{ background:'rgba(255,50,50,0.07)', color:'rgba(255,100,100,0.8)', border:'1px solid rgba(255,50,50,0.15)', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', cursor:'pointer' }}>Delete all data</button> },
                { title:'Delete account', titleColor:'rgba(255,100,100,0.85)', desc:'Permanently deletes your TaskFlow account and all associated data. You will be immediately logged out and cannot recover your account.', borderColor:'rgba(255,50,50,0.1)', bg:'rgba(255,50,50,0.03)', action: <button onClick={() => { setModal('account'); setModalInput(''); setModalError(false) }} style={{ background:'rgba(255,50,50,0.07)', color:'rgba(255,100,100,0.8)', border:'1px solid rgba(255,50,50,0.15)', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', cursor:'pointer' }}>Delete account</button> },
              ].map((card, i) => (
                <div key={i} style={{ background:card.bg, border:`1px solid ${card.borderColor}`, borderRadius:'12px', padding:'18px 20px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:card.titleColor, marginBottom:'5px' }}>{card.title}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'14px', lineHeight:1.55 }}>{card.desc}</div>
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
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'28px', maxWidth:'400px', width:'90%' }}>
            <div style={{ fontSize:'16px', fontWeight:800, letterSpacing:'-0.4px', color:'rgba(255,255,255,0.9)', marginBottom:'8px' }}>
              {modal === 'memory' ? 'Clear AI memory?' : modal === 'account' ? 'Delete your account?' : 'Delete all data?'}
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.42)', lineHeight:1.65, marginBottom:'20px' }}>
              {modal === 'memory'
                ? <>The AI will forget all learned patterns and start fresh. Type <strong>CLEAR</strong> to confirm.</>
                : modal === 'account'
                ? <>This permanently deletes your account and all data. Type <strong>DELETE</strong> to confirm.</>
                : <>This permanently removes all tasks, habits, journal entries, and AI memory. Type <strong>DELETE</strong> to confirm.</>}
            </div>
            <input value={modalInput} onChange={e => { setModalInput(e.target.value); setModalError(false) }}
              placeholder={modal === 'memory' ? 'Type CLEAR to confirm' : 'Type DELETE to confirm'}
              style={{ ...inp, marginBottom:'16px', border: modalError ? '1px solid rgba(255,80,80,0.5)' : '1px solid rgba(255,255,255,0.09)' }}
            />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setModal('none')} style={{ flex:1, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', padding:'10px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={() => modal === 'memory' ? clearMemory() : modal === 'account' ? deleteAccount() : deleteData()}
                style={{ flex:1, background:'rgba(220,50,50,0.12)', color:'rgba(255,110,110,0.9)', border:'1px solid rgba(220,50,50,0.2)', borderRadius:'9px', padding:'10px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                {modal === 'memory' ? 'Clear memory' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{ position:'fixed', bottom:'24px', right:'24px', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 16px', fontSize:'12px', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:'8px', transform: showToast ? 'translateY(0)' : 'translateY(80px)', opacity: showToast ? 1 : 0, transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents:'none', zIndex:999 }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(100,220,130,0.9)', flexShrink:0 }}/>
        {toast}
      </div>
    </div>
  )
}
