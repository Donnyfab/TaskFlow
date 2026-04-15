'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { apiUrl } from '@/lib/api-base'

interface CalEvent { id: number; title: string; date: string; time: string; category: string; color: string }
interface Task { id: number; title: string }
interface Data { events: CalEvent[]; upcoming_tasks: Task[]; google_connected: boolean }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const COLORS = [
  'rgba(255,255,255,0.7)', 'rgba(100,160,255,0.75)', 'rgba(160,100,255,0.75)',
  'rgba(80,210,120,0.75)', 'rgba(255,180,50,0.75)', 'rgba(255,90,90,0.75)'
]
const COLOR_DISPLAY = [
  'rgba(255,255,255,0.65)', 'rgba(100,160,255,0.75)', 'rgba(160,100,255,0.75)',
  'rgba(80,210,120,0.75)', 'rgba(255,180,50,0.75)', 'rgba(255,90,90,0.75)'
]

function getKey(y: number, m: number, d: number) { return `${y}-${m+1}-${d}` }

function buildEventsMap(events: CalEvent[]) {
  const map: Record<string, CalEvent[]> = {}
  events.forEach(ev => {
    if (!ev.date) return
    const d = new Date(ev.date + 'T00:00:00')
    const key = getKey(d.getFullYear(), d.getMonth(), d.getDate())
    if (!map[key]) map[key] = []
    map[key].push(ev)
  })
  return map
}

function alphaReplace(color: string, alpha: string) {
  return color.replace(/[\d.]+\)$/, alpha + ')')
}

export default function CalendarPage() {
  const now = new Date()
  const [data, setData]           = useState<Data | null>(null)
  const [eventsMap, setEventsMap] = useState<Record<string, CalEvent[]>>({})
  const [curYear, setCurYear]     = useState(now.getFullYear())
  const [curMonth, setCurMonth]   = useState(now.getMonth())
  const [selDay, setSelDay]       = useState(now.getDate())
  const [selMonth, setSelMonth]   = useState(now.getMonth())
  const [selYear, setSelYear]     = useState(now.getFullYear())
  const [view, setView]           = useState<'month'|'week'>('month')
  const [modal, setModal]         = useState(false)
  const [evTitle, setEvTitle]     = useState('')
  const [evDate, setEvDate]       = useState('')
  const [evTime, setEvTime]       = useState('09:00')
  const [evCat, setEvCat]         = useState('personal')
  const [evColor, setEvColor]     = useState(COLORS[0])
  const [saving, setSaving]       = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch(apiUrl('/api/calendar/data'), { credentials: 'include' })
    if (!res.ok) return
    const d: Data = await res.json()
    setData(d)
    setEventsMap(buildEventsMap(d.events))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openModal(date?: string, time?: string) {
    const y = selYear, m = String(selMonth+1).padStart(2,'0'), d = String(selDay).padStart(2,'0')
    setEvDate(date || `${y}-${m}-${d}`)
    setEvTime(time || '09:00')
    setEvTitle('')
    setEvCat('personal')
    setEvColor(COLORS[0])
    setModal(true)
  }

  async function createEvent() {
    if (!evTitle.trim() || !evDate) return
    setSaving(true)
    const res = await fetch(apiUrl('/api/calendar/events/create'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: evTitle, date: evDate, time: evTime, category: evCat, color: evColor })
    })
    const result = await res.json()
    if (result.ok) {
      const newEv: CalEvent = result
      setEventsMap(prev => {
        const d = new Date(evDate + 'T00:00:00')
        const key = getKey(d.getFullYear(), d.getMonth(), d.getDate())
        return { ...prev, [key]: [...(prev[key] || []), newEv] }
      })
      setModal(false)
    }
    setSaving(false)
  }

  async function deleteEvent(key: string, idx: number) {
    const ev = eventsMap[key]?.[idx]
    if (!ev) return
    setEventsMap(prev => {
      const arr = [...(prev[key] || [])]
      arr.splice(idx, 1)
      return { ...prev, [key]: arr }
    })
    await fetch(apiUrl(`/api/calendar/events/${ev.id}/delete`), { method: 'POST', credentials: 'include' })
  }

  async function syncGoogle() {
    setSyncing(true)
    setSyncMsg('Syncing...')
    try {
      const res = await fetch(apiUrl('/calendar/sync-google'), { method: 'POST', credentials: 'include' })
      const d = await res.json()
      if (d.ok) {
        setSyncMsg(`✓ ${d.imported} imported`)
        fetchData()
        setTimeout(() => setSyncMsg(''), 3000)
      } else {
        setSyncMsg('Sync failed')
        setTimeout(() => setSyncMsg(''), 2000)
      }
    } catch {
      setSyncMsg('Sync failed')
      setTimeout(() => setSyncMsg(''), 2000)
    }
    setSyncing(false)
  }

  function changeMonth(dir: number) {
    let m = curMonth + dir, y = curYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCurMonth(m)
    setCurYear(y)
  }

  function goToday() {
    const t = new Date()
    setCurYear(t.getFullYear()); setCurMonth(t.getMonth())
    setSelYear(t.getFullYear()); setSelMonth(t.getMonth()); setSelDay(t.getDate())
  }

  const selKey = getKey(selYear, selMonth, selDay)
  const selEvents = eventsMap[selKey] || []
  const selDateLabel = `${DAYS_FULL[new Date(selYear, selMonth, selDay).getDay()]}, ${MONTHS[selMonth]} ${selYear}`

  // Build month cells
  const firstDay = new Date(curYear, curMonth, 1).getDay()
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate()
  const daysInPrev = new Date(curYear, curMonth, 0).getDate()
  const cells: { d: number; m: number; y: number; other: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ d: daysInPrev - i, m: curMonth - 1, y: curYear, other: true })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, m: curMonth, y: curYear, other: false })
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push({ d: cells.length - daysInMonth - firstDay + 1, m: curMonth + 1, y: curYear, other: true })

  // Build week days
  const startOfWeek = new Date(selYear, selMonth, selDay)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d
  })

  // Mini cal
  const miniFirstDay = new Date(curYear, curMonth, 1).getDay()
  const miniDays = new Date(curYear, curMonth + 1, 0).getDate()
  const miniPrev = new Date(curYear, curMonth, 0).getDate()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', minHeight: '100vh', minWidth: 0 }}>

      {/* CALENDAR AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div onClick={() => changeMonth(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>‹</div>
            <div onClick={() => changeMonth(1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>›</div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.5px', color: 'rgba(255,255,255,0.9)', minWidth: '170px' }}>{MONTHS[curMonth]} {curYear}</div>
            <button onClick={goToday} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Today</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {(['month', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)', border: view === v ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '5px 11px', fontSize: '11px', color: view === v ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            {data?.google_connected && (
              <button onClick={syncGoogle} disabled={syncing} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', opacity: syncing ? 0.6 : 1 }}>
                {syncMsg || '↻ Sync Google'}
              </button>
            )}
            <button onClick={() => openModal()} style={{ background: '#fff', color: '#0A0A0A', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add event</button>
          </div>
        </div>

        {/* MONTH VIEW */}
        {view === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              {DAYS_SHORT.map(d => <div key={d} style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.28)', textAlign: 'center', padding: '7px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', flex: 1 }}>
              {cells.map((c, i) => {
                const adjM = c.m < 0 ? 11 : c.m > 11 ? 0 : c.m
                const adjY = c.m < 0 ? c.y - 1 : c.m > 11 ? c.y + 1 : c.y
                const isToday = !c.other && c.d === now.getDate() && adjM === now.getMonth() && adjY === now.getFullYear()
                const isSel = !c.other && c.d === selDay && adjM === selMonth && adjY === selYear
                const key = getKey(adjY, adjM, c.d)
                const evs = eventsMap[key] || []
                return (
                  <div key={i} onClick={() => { setSelDay(c.d); setSelMonth(adjM); setSelYear(adjY) }}
                    style={{ borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '6px 7px', minHeight: '90px', cursor: 'pointer', opacity: c.other ? 0.35 : 1, background: isToday ? 'rgba(255,255,255,0.03)' : isSel ? 'rgba(255,255,255,0.04)' : 'transparent', position: 'relative' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '3px', background: isToday ? '#fff' : isSel && !isToday ? 'rgba(255,255,255,0.14)' : 'transparent', color: isToday ? '#0A0A0A' : isSel && !isToday ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)' }}>
                      {c.d}
                    </div>
                    {evs.slice(0, 3).map((ev, ei) => (
                      <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', background: alphaReplace(ev.color, '0.1') }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: ev.color }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: ev.color }}>{ev.title}</span>
                      </div>
                    ))}
                    {evs.length > 3 && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', padding: '1px 3px' }}>+{evs.length - 3} more</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div />
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === now.toDateString()
                return (
                  <div key={i} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{DAYS_SHORT[d.getDay()]}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', color: isToday ? '#fff' : 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{d.getDate()}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', flex: 1, overflowY: 'auto' }}>
              {/* Time column */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ height: '48px', padding: '2px 6px 0 0', textAlign: 'right', fontSize: '9px', color: 'rgba(255,255,255,0.2)', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {h === 0 ? '' : `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`}
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {weekDays.map((d, di) => {
                const key = getKey(d.getFullYear(), d.getMonth(), d.getDate())
                const evs = eventsMap[key] || []
                return (
                  <div key={di} style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} onClick={() => { setSelDay(d.getDate()); setSelMonth(d.getMonth()); setSelYear(d.getFullYear()); openModal(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, `${String(h).padStart(2,'0')}:00`) }}
                        style={{ height: '48px', borderBottom: '1px solid rgba(255,255,255,0.03)', flexShrink: 0, cursor: 'pointer' }} />
                    ))}
                    {evs.map((ev, ei) => {
                      const [hh, mm] = (ev.time || '09:00').split(':').map(Number)
                      const top = (hh + mm / 60) * 48
                      return (
                        <div key={ei} style={{ position: 'absolute', left: '3px', right: '3px', top: `${top}px`, height: '44px', borderRadius: '5px', padding: '3px 6px', fontSize: '10px', fontWeight: 500, cursor: 'pointer', zIndex: 2, overflow: 'hidden', background: alphaReplace(ev.color, '0.15'), borderLeft: `3px solid ${ev.color}` }}>
                          <div style={{ color: ev.color, fontWeight: 600 }}>{ev.title}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>{ev.time}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Mini Calendar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{MONTHS[curMonth].slice(0, 3)} {curYear}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px' }}>‹</button>
              <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px' }}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
            {['S','M','T','W','T','F','S'].map((n, i) => <div key={i} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '2px 0' }}>{n}</div>)}
            {Array.from({ length: miniFirstDay }, (_, i) => <div key={`p${i}`} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.07)', textAlign: 'center', padding: '3px 1px' }}>{miniPrev - miniFirstDay + 1 + i}</div>)}
            {Array.from({ length: miniDays }, (_, i) => {
              const d = i + 1
              const isToday = d === now.getDate() && curMonth === now.getMonth() && curYear === now.getFullYear()
              const isSel = d === selDay && curMonth === selMonth && curYear === selYear
              const key = getKey(curYear, curMonth, d)
              const hasEv = (eventsMap[key] || []).length > 0
              return (
                <div key={d} onClick={() => { setSelDay(d); setSelMonth(curMonth); setSelYear(curYear) }}
                  style={{ fontSize: '10px', textAlign: 'center', padding: '3px 1px', borderRadius: '4px', cursor: 'pointer', background: isToday ? '#fff' : isSel && !isToday ? 'rgba(255,255,255,0.14)' : 'transparent', color: isToday ? '#0A0A0A' : isSel && !isToday ? 'rgba(255,255,255,0.9)' : hasEv ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)', fontWeight: isToday ? 700 : 400 }}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', color: 'rgba(255,255,255,0.9)', lineHeight: 1, marginBottom: '3px' }}>{selDay}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{selDateLabel}</div>
        </div>

        {/* Events for selected day */}
        <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 20px 6px' }}>Events</div>
        {selEvents.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>No events today</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>Click + Add event to schedule something.</div>
          </div>
        ) : (
          selEvents.map((ev, idx) => (
            <div key={ev.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <div style={{ width: '3px', borderRadius: '2px', flexShrink: 0, alignSelf: 'stretch', minHeight: '36px', background: ev.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.78)', marginBottom: '3px' }}>{ev.title}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{ev.time || 'All day'}</div>
                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>{ev.category}</span>
              </div>
              <div onClick={() => deleteEvent(selKey, idx)} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', flexShrink: 0 }}>✕</div>
            </div>
          ))
        )}

        {/* Upcoming tasks */}
        <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 20px 6px', marginTop: '8px' }}>Upcoming tasks</div>
        {data?.upcoming_tasks.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>No upcoming tasks</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>Add tasks from the tasks page.</div>
          </div>
        ) : (
          data?.upcoming_tasks.map(task => (
            <div key={task.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '3px', borderRadius: '2px', flexShrink: 0, alignSelf: 'stretch', minHeight: '36px', background: 'rgba(255,255,255,0.25)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.78)', marginBottom: '3px' }}>{task.title}</div>
                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>Task</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD EVENT MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '28px', maxWidth: '420px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', color: 'rgba(255,255,255,0.9)', marginBottom: '20px' }}>New event</div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Title</div>
              <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="e.g. Morning workout, Study session..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Date</div>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Time</div>
                <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Category</div>
              <select value={evCat} onChange={e => setEvCat(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                {['task','habit','focus','personal','music','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Color</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map((c, i) => (
                  <div key={i} onClick={() => setEvColor(c)} style={{ width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', background: COLOR_DISPLAY[i], border: evColor === c ? '2px solid #fff' : '2px solid transparent', transform: evColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', padding: '10px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createEvent} disabled={saving} style={{ flex: 1, background: '#fff', color: '#0A0A0A', border: 'none', borderRadius: '9px', padding: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding...' : 'Add event →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
