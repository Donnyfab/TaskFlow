'use client'
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Holidays from 'date-holidays'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'

const THEMES = {
  dark: {
    topbarBorder:   'rgba(255,255,255,0.05)',
    navBtnBg:       'rgba(255,255,255,0.05)',
    navBtnBorder:   'rgba(255,255,255,0.09)',
    navBtnColor:    'rgba(255,255,255,0.5)',
    titleColor:     'rgba(255,255,255,0.9)',
    todayBtnBg:     'rgba(255,255,255,0.06)',
    todayBtnBorder: 'rgba(255,255,255,0.09)',
    todayBtnColor:  'rgba(255,255,255,0.55)',
    viewSelBg:      'rgba(255,255,255,0.12)',
    viewSelBorder:  'rgba(255,255,255,0.2)',
    viewSelColor:   'rgba(255,255,255,0.85)',
    viewDefBg:      'rgba(255,255,255,0.05)',
    viewDefBorder:  'rgba(255,255,255,0.08)',
    viewDefColor:   'rgba(255,255,255,0.4)',
    syncBtnBg:      'rgba(255,255,255,0.05)',
    syncBtnBorder:  'rgba(255,255,255,0.1)',
    syncBtnColor:   'rgba(255,255,255,0.5)',
    addBtnBg:       '#fff',
    addBtnColor:    '#0A0A0A',
    dayHeaderColor: 'rgba(255,255,255,0.28)',
    dayHeaderBorder:'rgba(255,255,255,0.05)',
    cellBorder:     'rgba(255,255,255,0.04)',
    cellTodayBg:    'rgba(255,255,255,0.03)',
    cellSelBg:      'rgba(255,255,255,0.04)',
    dayNumToday:    '#fff',
    dayNumTodayBg:  '#fff',
    dayNumTodayColor:'#0A0A0A',
    dayNumSelBg:    'rgba(255,255,255,0.14)',
    dayNumSelColor: 'rgba(255,255,255,0.9)',
    dayNumDefColor: 'rgba(255,255,255,0.45)',
    moreColor:      'rgba(255,255,255,0.25)',
    weekDayColor:   'rgba(255,255,255,0.3)',
    weekDayBg:      '#fff',
    weekDayNumber:  'rgba(255,255,255,0.55)',
    weekBorder:     'rgba(255,255,255,0.05)',
    weekColBorder:  'rgba(255,255,255,0.04)',
    timeColor:      'rgba(255,255,255,0.2)',
    timeRowBorder:  'rgba(255,255,255,0.03)',
    evTimeColor:    'rgba(255,255,255,0.35)',
    rightBorder:    'rgba(255,255,255,0.05)',
    miniMonthColor: 'rgba(255,255,255,0.6)',
    miniNavColor:   'rgba(255,255,255,0.3)',
    miniDayHeader:  'rgba(255,255,255,0.2)',
    miniPrevColor:  'rgba(255,255,255,0.07)',
    miniTodayBg:    '#fff',
    miniTodayColor: '#0A0A0A',
    miniSelBg:      'rgba(255,255,255,0.14)',
    miniSelColor:   'rgba(255,255,255,0.9)',
    miniHasEv:      'rgba(255,255,255,0.65)',
    miniDefColor:   'rgba(255,255,255,0.35)',
    selDayNum:      'rgba(255,255,255,0.9)',
    selDayLabel:    'rgba(255,255,255,0.3)',
    evSecLabel:     'rgba(255,255,255,0.22)',
    evEmptyTitle:   'rgba(255,255,255,0.3)',
    evEmptyDesc:    'rgba(255,255,255,0.18)',
    evTitle:        'rgba(255,255,255,0.78)',
    evTime:         'rgba(255,255,255,0.3)',
    evTagBg:        'rgba(255,255,255,0.05)',
    evTagColor:     'rgba(255,255,255,0.3)',
    evRowBorder:    'rgba(255,255,255,0.04)',
    evDelColor:     'rgba(255,255,255,0.2)',
    taskStripBg:    'rgba(255,255,255,0.25)',
    taskTitle:      'rgba(255,255,255,0.78)',
    taskTagBg:      'rgba(255,255,255,0.05)',
    taskTagColor:   'rgba(255,255,255,0.3)',
    modalBg:        '#111',
    modalBorder:    'rgba(255,255,255,0.1)',
    modalTitle:     'rgba(255,255,255,0.9)',
    labelColor:     'rgba(255,255,255,0.35)',
    inputBg:        'rgba(255,255,255,0.04)',
    inputBorder:    'rgba(255,255,255,0.09)',
    inputColor:     '#fff',
    cancelBg:       'rgba(255,255,255,0.06)',
    cancelColor:    'rgba(255,255,255,0.55)',
    cancelBorder:   'rgba(255,255,255,0.09)',
    createBg:       '#fff',
    createColor:    '#0A0A0A',
  },
  light: {
    topbarBorder:   'rgba(0,0,0,0.07)',
    navBtnBg:       'rgba(0,0,0,0.04)',
    navBtnBorder:   'rgba(0,0,0,0.09)',
    navBtnColor:    'rgba(0,0,0,0.5)',
    titleColor:     '#1a1a1a',
    todayBtnBg:     'rgba(0,0,0,0.04)',
    todayBtnBorder: 'rgba(0,0,0,0.09)',
    todayBtnColor:  'rgba(0,0,0,0.55)',
    viewSelBg:      'rgba(0,0,0,0.10)',
    viewSelBorder:  'rgba(0,0,0,0.2)',
    viewSelColor:   '#1a1a1a',
    viewDefBg:      'rgba(0,0,0,0.04)',
    viewDefBorder:  'rgba(0,0,0,0.08)',
    viewDefColor:   'rgba(0,0,0,0.45)',
    syncBtnBg:      'rgba(0,0,0,0.04)',
    syncBtnBorder:  'rgba(0,0,0,0.1)',
    syncBtnColor:   'rgba(0,0,0,0.5)',
    addBtnBg:       '#1a1a1a',
    addBtnColor:    '#fff',
    dayHeaderColor: 'rgba(0,0,0,0.35)',
    dayHeaderBorder:'rgba(0,0,0,0.07)',
    cellBorder:     'rgba(0,0,0,0.06)',
    cellTodayBg:    'rgba(0,0,0,0.02)',
    cellSelBg:      'rgba(0,0,0,0.03)',
    dayNumToday:    '#1a1a1a',
    dayNumTodayBg:  '#1a1a1a',
    dayNumTodayColor:'#fff',
    dayNumSelBg:    'rgba(0,0,0,0.1)',
    dayNumSelColor: '#1a1a1a',
    dayNumDefColor: 'rgba(0,0,0,0.5)',
    moreColor:      'rgba(0,0,0,0.3)',
    weekDayColor:   'rgba(0,0,0,0.4)',
    weekDayBg:      '#1a1a1a',
    weekDayNumber:  'rgba(0,0,0,0.6)',
    weekBorder:     'rgba(0,0,0,0.07)',
    weekColBorder:  'rgba(0,0,0,0.06)',
    timeColor:      'rgba(0,0,0,0.3)',
    timeRowBorder:  'rgba(0,0,0,0.04)',
    evTimeColor:    'rgba(0,0,0,0.4)',
    rightBorder:    'rgba(0,0,0,0.07)',
    miniMonthColor: 'rgba(0,0,0,0.6)',
    miniNavColor:   'rgba(0,0,0,0.4)',
    miniDayHeader:  'rgba(0,0,0,0.35)',
    miniPrevColor:  'rgba(0,0,0,0.2)',
    miniTodayBg:    '#1a1a1a',
    miniTodayColor: '#fff',
    miniSelBg:      'rgba(0,0,0,0.1)',
    miniSelColor:   '#1a1a1a',
    miniHasEv:      'rgba(0,0,0,0.65)',
    miniDefColor:   'rgba(0,0,0,0.4)',
    selDayNum:      '#1a1a1a',
    selDayLabel:    'rgba(0,0,0,0.4)',
    evSecLabel:     'rgba(0,0,0,0.3)',
    evEmptyTitle:   'rgba(0,0,0,0.4)',
    evEmptyDesc:    'rgba(0,0,0,0.28)',
    evTitle:        '#1a1a1a',
    evTime:         'rgba(0,0,0,0.4)',
    evTagBg:        'rgba(0,0,0,0.05)',
    evTagColor:     'rgba(0,0,0,0.4)',
    evRowBorder:    'rgba(0,0,0,0.06)',
    evDelColor:     'rgba(0,0,0,0.3)',
    taskStripBg:    'rgba(0,0,0,0.25)',
    taskTitle:      '#1a1a1a',
    taskTagBg:      'rgba(0,0,0,0.05)',
    taskTagColor:   'rgba(0,0,0,0.4)',
    modalBg:        '#FFFFFF',
    modalBorder:    'rgba(0,0,0,0.1)',
    modalTitle:     '#1a1a1a',
    labelColor:     'rgba(0,0,0,0.45)',
    inputBg:        '#F5F5F5',
    inputBorder:    'rgba(0,0,0,0.1)',
    inputColor:     '#1a1a1a',
    cancelBg:       'rgba(0,0,0,0.05)',
    cancelColor:    'rgba(0,0,0,0.55)',
    cancelBorder:   'rgba(0,0,0,0.09)',
    createBg:       '#1a1a1a',
    createColor:    '#fff',
  },
}

const HOLIDAY_COLOR = 'rgba(255, 200, 80, 0.85)'

function buildHolidayEvents(year: number): CalEvent[] {
  const hd = new Holidays('US')
  return hd.getHolidays(year)
    .map(h => {
      const dateStr = h.date.slice(0, 10)
      const slug = h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return {
        id: `holiday-${slug}-${year}` as unknown as number,
        title: h.name,
        date: dateStr,
        time: '',
        category: 'holiday',
        color: HOLIDAY_COLOR,
      }
    })
}

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
  const queryClient = useQueryClient()
  const theme = useTheme()
  const th = THEMES[theme]
  const now = new Date()
  const currentYear = now.getFullYear()
  const holidayColor = theme === 'light' ? 'rgba(160, 100, 0, 0.9)' : 'rgba(255, 200, 80, 0.85)'

  const { data, isLoading: loading } = useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/calendar/data'), { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch calendar data')
      return res.json() as Promise<Data>
    },
  })

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
  const [evAllDay, setEvAllDay]   = useState(false)
  const [evCat, setEvCat]         = useState('personal')
  const [evColor, setEvColor]     = useState(COLORS[0])
  const [saving, setSaving]       = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState('')
  const [showHolidays, setShowHolidays] = useState(true)

  const holidayEvents = useMemo(() => {
    return [...buildHolidayEvents(currentYear), ...buildHolidayEvents(currentYear + 1)]
      .map(ev => ({ ...ev, color: holidayColor }))
  }, [currentYear, holidayColor])

  // eventsMap merges DB events with client-side holiday events
  const eventsMap = useMemo(() => {
    const base = data ? buildEventsMap(data.events) : {}
    if (!showHolidays) return base
    const merged: Record<string, CalEvent[]> = { ...base }
    for (const ev of holidayEvents) {
      const d = new Date(ev.date + 'T00:00:00')
      const key = getKey(d.getFullYear(), d.getMonth(), d.getDate())
      if (!merged[key]) merged[key] = []
      merged[key] = [...merged[key], ev]
    }
    return merged
  }, [data, holidayEvents, showHolidays])

  function openModal(date?: string, time?: string) {
    const y = selYear, m = String(selMonth+1).padStart(2,'0'), d = String(selDay).padStart(2,'0')
    setEvDate(date || `${y}-${m}-${d}`)
    setEvTime(time || '09:00')
    setEvTitle('')
    setEvCat('personal')
    setEvColor(COLORS[0])
    setEvAllDay(false)
    setModal(true)
  }

  async function createEvent() {
    if (!evTitle.trim() || !evDate) return
    setSaving(true)
    const tempId = -Date.now()
    const resolvedTime = evAllDay ? '' : evTime
    const tempEv: CalEvent = { id: tempId, title: evTitle.trim(), date: evDate, time: resolvedTime, category: evCat, color: evColor }
    const previous = queryClient.getQueryData<Data>(['calendar'])
    queryClient.setQueryData<Data>(['calendar'], old => old ? { ...old, events: [...old.events, tempEv] } : old)
    setModal(false)
    try {
      const res = await fetch(apiUrl('/api/calendar/events/create'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: evTitle, date: evDate, time: resolvedTime, category: evCat, color: evColor })
      })
      const result = await res.json()
      if (result.ok && result.id) {
        queryClient.setQueryData<Data>(['calendar'], old => old ? {
          ...old,
          events: old.events.map(e => e.id === tempId ? { ...tempEv, id: result.id } : e)
        } : old)
      } else {
        queryClient.setQueryData(['calendar'], previous)
      }
    } catch {
      queryClient.setQueryData(['calendar'], previous)
    } finally {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    }
  }

  async function deleteEvent(key: string, idx: number) {
    const ev = eventsMap[key]?.[idx]
    if (!ev) return
    const previous = queryClient.getQueryData<Data>(['calendar'])
    queryClient.setQueryData<Data>(['calendar'], old => old ? {
      ...old,
      events: old.events.filter(e => e.id !== ev.id)
    } : old)
    try {
      await fetch(apiUrl(`/api/calendar/events/${ev.id}/delete`), { method: 'POST', credentials: 'include' })
    } catch {
      queryClient.setQueryData(['calendar'], previous)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    }
  }

  async function syncGoogle() {
    setSyncing(true)
    setSyncMsg('Syncing...')
    try {
      const res = await fetch(apiUrl('/calendar/sync-google'), { method: 'POST', credentials: 'include' })
      const d = await res.json()
      if (d.ok) {
        setSyncMsg(`✓ ${d.imported} imported`)
        queryClient.invalidateQueries({ queryKey: ['calendar'] })
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

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', height: '100vh', overflow: 'hidden' }}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '40px', background: 'rgba(128,128,128,0.07)', borderRadius: '8px', width: '200px' }} />
        <div style={{ flex: 1, background: 'rgba(128,128,128,0.04)', borderRadius: '12px', marginTop: '8px' }} />
      </div>
      <div style={{ borderLeft: `1px solid ${th.rightBorder}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1,2,3].map(i => <div key={i} style={{ height: '60px', background: 'rgba(128,128,128,0.06)', borderRadius: '8px' }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', height: '100vh', overflow: 'hidden', minWidth: 0 }}>

      {/* CALENDAR AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${th.topbarBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SidebarReopenButton />
            <div onClick={() => changeMonth(-1)} style={{ background: th.navBtnBg, border: `1px solid ${th.navBtnBorder}`, borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', color: th.navBtnColor }}>‹</div>
            <div onClick={() => changeMonth(1)} style={{ background: th.navBtnBg, border: `1px solid ${th.navBtnBorder}`, borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', color: th.navBtnColor }}>›</div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.5px', color: th.titleColor, minWidth: '170px' }}>{MONTHS[curMonth]} {curYear}</div>
            <button onClick={goToday} style={{ background: th.todayBtnBg, border: `1px solid ${th.todayBtnBorder}`, borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: th.todayBtnColor, cursor: 'pointer' }}>Today</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {(['month', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? th.viewSelBg : th.viewDefBg, border: view === v ? `1px solid ${th.viewSelBorder}` : `1px solid ${th.viewDefBorder}`, borderRadius: '7px', padding: '5px 11px', fontSize: '11px', color: view === v ? th.viewSelColor : th.viewDefColor, cursor: 'pointer' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            {data?.google_connected && (
              <button onClick={syncGoogle} disabled={syncing} style={{ background: th.syncBtnBg, border: `1px solid ${th.syncBtnBorder}`, borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: th.syncBtnColor, cursor: 'pointer', opacity: syncing ? 0.6 : 1 }}>
                {syncMsg || '↻ Sync Google'}
              </button>
            )}
            <button onClick={() => setShowHolidays(v => !v)} style={{ background: showHolidays ? (theme === 'light' ? 'rgba(160,100,0,0.08)' : 'rgba(255,200,80,0.15)') : th.viewDefBg, border: showHolidays ? `1px solid ${theme === 'light' ? 'rgba(160,100,0,0.3)' : 'rgba(255,200,80,0.4)'}` : `1px solid ${th.viewDefBorder}`, borderRadius: '7px', padding: '5px 11px', fontSize: '11px', color: showHolidays ? holidayColor : th.viewDefColor, cursor: 'pointer' }}>Holidays</button>
            <button onClick={() => openModal()} style={{ background: th.addBtnBg, color: th.addBtnColor, border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add event</button>
          </div>
        </div>

        {/* MONTH VIEW */}
        {view === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${th.dayHeaderBorder}`, flexShrink: 0 }}>
              {DAYS_SHORT.map(d => <div key={d} style={{ fontSize: '10px', fontWeight: 500, color: th.dayHeaderColor, textAlign: 'center', padding: '7px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{d}</div>)}
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
                    style={{ borderRight: `1px solid ${th.cellBorder}`, borderBottom: `1px solid ${th.cellBorder}`, padding: '6px 7px', minHeight: '90px', cursor: 'pointer', opacity: c.other ? 0.35 : 1, background: isToday ? th.cellTodayBg : isSel ? th.cellSelBg : 'transparent', position: 'relative' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '3px', background: isToday ? th.dayNumTodayBg : isSel && !isToday ? th.dayNumSelBg : 'transparent', color: isToday ? th.dayNumTodayColor : isSel && !isToday ? th.dayNumSelColor : th.dayNumDefColor }}>
                      {c.d}
                    </div>
                    {evs.slice(0, 3).map((ev, ei) => (
                      <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', background: alphaReplace(ev.color, '0.1') }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: ev.color }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: ev.color }}>{ev.title}</span>
                      </div>
                    ))}
                    {evs.length > 3 && <div style={{ fontSize: '9px', color: th.moreColor, padding: '1px 3px' }}>+{evs.length - 3} more</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

            {/* Day header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', borderBottom: `1px solid ${th.weekBorder}`, flexShrink: 0 }}>
              <div />
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === now.toDateString()
                return (
                  <div key={i} style={{ padding: '8px', textAlign: 'center', borderBottom: `1px solid ${th.weekBorder}`, borderLeft: `1px solid ${th.weekColBorder}` }}>
                    <div style={{ fontSize: '10px', color: th.weekDayColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{DAYS_SHORT[d.getDay()]}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', color: isToday ? th.weekDayBg : th.weekDayNumber, marginTop: '2px' }}>{d.getDate()}</div>
                  </div>
                )
              })}
            </div>

            {/* All-day strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', borderBottom: `1px solid ${th.weekBorder}`, flexShrink: 0 }}>
              <div style={{ padding: '5px 6px 5px 0', textAlign: 'right', fontSize: '9px', color: th.timeColor, alignSelf: 'flex-start', paddingTop: '7px' }}>all-day</div>
              {weekDays.map((d, di) => {
                const key = getKey(d.getFullYear(), d.getMonth(), d.getDate())
                const allDayEvs = (eventsMap[key] || []).filter(ev => !ev.time)
                return (
                  <div key={di} style={{ borderLeft: `1px solid ${th.weekColBorder}`, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '2px', minHeight: '28px' }}>
                    {allDayEvs.map((ev, ei) => (
                      <div key={ei} onClick={() => { setSelDay(d.getDate()); setSelMonth(d.getMonth()); setSelYear(d.getFullYear()) }}
                        style={{ borderRadius: '4px', padding: '2px 6px', fontSize: '9px', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer', background: alphaReplace(ev.color, '0.15'), borderLeft: `3px solid ${ev.color}`, color: ev.color }}>
                        {ev.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Scrollable time grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', flex: 1, overflowY: 'auto' }}>
              {/* Time column */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ height: '48px', padding: '2px 6px 0 0', textAlign: 'right', fontSize: '9px', color: th.timeColor, flexShrink: 0, borderBottom: `1px solid ${th.timeRowBorder}` }}>
                    {h === 0 ? '' : `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`}
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {weekDays.map((d, di) => {
                const key = getKey(d.getFullYear(), d.getMonth(), d.getDate())
                const timedEvs = (eventsMap[key] || []).filter(ev => ev.time)
                return (
                  <div key={di} style={{ borderLeft: `1px solid ${th.weekColBorder}`, position: 'relative' }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} onClick={() => { setSelDay(d.getDate()); setSelMonth(d.getMonth()); setSelYear(d.getFullYear()); openModal(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, `${String(h).padStart(2,'0')}:00`) }}
                        style={{ height: '48px', borderBottom: `1px solid ${th.timeRowBorder}`, flexShrink: 0, cursor: 'pointer' }} />
                    ))}
                    {timedEvs.map((ev, ei) => {
                      const [hh, mm] = ev.time.split(':').map(Number)
                      const top = (hh + mm / 60) * 48
                      return (
                        <div key={ei} style={{ position: 'absolute', left: '3px', right: '3px', top: `${top}px`, height: '44px', borderRadius: '5px', padding: '3px 6px', fontSize: '10px', fontWeight: 500, cursor: 'pointer', zIndex: 2, overflow: 'hidden', background: alphaReplace(ev.color, '0.15'), borderLeft: `3px solid ${ev.color}` }}>
                          <div style={{ color: ev.color, fontWeight: 600 }}>{ev.title}</div>
                          <div style={{ fontSize: '9px', color: th.evTimeColor }}>{ev.time}</div>
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
      <div style={{ borderLeft: `1px solid ${th.rightBorder}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Mini Calendar */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${th.rightBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: th.miniMonthColor }}>{MONTHS[curMonth].slice(0, 3)} {curYear}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: th.miniNavColor, cursor: 'pointer', fontSize: '12px' }}>‹</button>
              <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: th.miniNavColor, cursor: 'pointer', fontSize: '12px' }}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
            {['S','M','T','W','T','F','S'].map((n, i) => <div key={i} style={{ fontSize: '8px', color: th.miniDayHeader, textAlign: 'center', padding: '2px 0' }}>{n}</div>)}
            {Array.from({ length: miniFirstDay }, (_, i) => <div key={`p${i}`} style={{ fontSize: '10px', color: th.miniPrevColor, textAlign: 'center', padding: '3px 1px' }}>{miniPrev - miniFirstDay + 1 + i}</div>)}
            {Array.from({ length: miniDays }, (_, i) => {
              const d = i + 1
              const isToday = d === now.getDate() && curMonth === now.getMonth() && curYear === now.getFullYear()
              const isSel = d === selDay && curMonth === selMonth && curYear === selYear
              const key = getKey(curYear, curMonth, d)
              const hasEv = (eventsMap[key] || []).length > 0
              return (
                <div key={d} onClick={() => { setSelDay(d); setSelMonth(curMonth); setSelYear(curYear) }}
                  style={{ fontSize: '10px', textAlign: 'center', padding: '3px 1px', borderRadius: '4px', cursor: 'pointer', background: isToday ? th.miniTodayBg : isSel && !isToday ? th.miniSelBg : 'transparent', color: isToday ? th.miniTodayColor : isSel && !isToday ? th.miniSelColor : hasEv ? th.miniHasEv : th.miniDefColor, fontWeight: isToday ? 700 : 400 }}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${th.rightBorder}`, flexShrink: 0 }}>
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', color: th.selDayNum, lineHeight: 1, marginBottom: '3px' }}>{selDay}</div>
          <div style={{ fontSize: '12px', color: th.selDayLabel }}>{selDateLabel}</div>
        </div>

        {/* Events for selected day */}
        <div style={{ fontSize: '9px', fontWeight: 600, color: th.evSecLabel, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 20px 6px' }}>Events</div>
        {selEvents.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: th.evEmptyTitle, marginBottom: '5px' }}>No events today</div>
            <div style={{ fontSize: '11px', color: th.evEmptyDesc, lineHeight: 1.6 }}>Click + Add event to schedule something.</div>
          </div>
        ) : (
          selEvents.map((ev, idx) => (
            <div key={ev.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderBottom: `1px solid ${th.evRowBorder}`, cursor: 'pointer' }}>
              <div style={{ width: '3px', borderRadius: '2px', flexShrink: 0, alignSelf: 'stretch', minHeight: '36px', background: ev.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: th.evTitle, marginBottom: '3px' }}>{ev.title}</div>
                <div style={{ fontSize: '10px', color: th.evTime, marginBottom: '4px' }}>{ev.time || 'All day'}</div>
                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: th.evTagBg, color: th.evTagColor }}>{ev.category}</span>
              </div>
              {typeof ev.id === 'number' && (
                <div onClick={() => deleteEvent(selKey, idx)} style={{ fontSize: '10px', color: th.evDelColor, cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', flexShrink: 0 }}>✕</div>
              )}
            </div>
          ))
        )}

        {/* Upcoming tasks */}
        <div style={{ fontSize: '9px', fontWeight: 600, color: th.evSecLabel, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 20px 6px', marginTop: '8px' }}>Upcoming tasks</div>
        {data?.upcoming_tasks.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: th.evEmptyTitle, marginBottom: '5px' }}>No upcoming tasks</div>
            <div style={{ fontSize: '11px', color: th.evEmptyDesc, lineHeight: 1.6 }}>Add tasks from the tasks page.</div>
          </div>
        ) : (
          data?.upcoming_tasks.map(task => (
            <div key={task.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderBottom: `1px solid ${th.evRowBorder}` }}>
              <div style={{ width: '3px', borderRadius: '2px', flexShrink: 0, alignSelf: 'stretch', minHeight: '36px', background: th.taskStripBg }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: th.taskTitle, marginBottom: '3px' }}>{task.title}</div>
                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: th.taskTagBg, color: th.taskTagColor }}>Task</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD EVENT MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}`, borderRadius: '18px', padding: '28px', maxWidth: '420px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', color: th.modalTitle, marginBottom: '20px' }}>New event</div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: th.labelColor, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Title</div>
              <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="e.g. Morning workout, Study session..."
                style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: th.inputColor, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 500, color: th.labelColor, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Date</div>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                  style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: th.inputColor, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, color: th.labelColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Time</div>
                  <button onClick={() => setEvAllDay(v => !v)} style={{ fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', border: `1px solid ${evAllDay ? th.createBg : th.inputBorder}`, background: evAllDay ? th.createBg : 'transparent', color: evAllDay ? th.createColor : th.labelColor, cursor: 'pointer', letterSpacing: '0.2px', transition: 'all 0.15s' }}>All day</button>
                </div>
                {evAllDay ? (
                  <div style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: th.labelColor, boxSizing: 'border-box' }}>All day</div>
                ) : (
                  <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
                    style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: th.inputColor, outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: th.labelColor, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Category</div>
              <select value={evCat} onChange={e => setEvCat(e.target.value)}
                style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: '9px', padding: '10px 13px', fontSize: '13px', color: th.inputColor, outline: 'none', boxSizing: 'border-box' }}>
                {['task','habit','focus','personal','music','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: th.labelColor, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Color</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map((c, i) => (
                  <div key={i} onClick={() => setEvColor(c)} style={{ width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', background: COLOR_DISPLAY[i], border: evColor === c ? `2px solid ${th.modalTitle}` : '2px solid transparent', transform: evColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: th.cancelBg, color: th.cancelColor, border: `1px solid ${th.cancelBorder}`, borderRadius: '9px', padding: '10px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createEvent} disabled={saving} style={{ flex: 1, background: th.createBg, color: th.createColor, border: 'none', borderRadius: '9px', padding: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding...' : 'Add event →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
