'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'

const THEMES = {
  dark: {
    bg:            'transparent',
    topbarBorder:  'rgba(255,255,255,0.05)',
    titleColor:    'rgba(255,255,255,0.9)',
    subColor:      'rgba(255,255,255,0.3)',
    aiBtnBg:       '#fff',
    aiBtnColor:    '#0A0A0A',
    iconBtnBg:     'rgba(255,255,255,0.05)',
    iconBtnBorder: 'rgba(255,255,255,0.08)',
    iconBtnColor:  'rgba(255,255,255,0.5)',
    bannerBg:      'rgba(255,255,255,0.03)',
    bannerBorder:  'rgba(255,255,255,0.08)',
    bannerIconBg:  'rgba(255,255,255,0.08)',
    bannerText:    'rgba(255,255,255,0.5)',
    bannerStrong:  'rgba(255,255,255,0.82)',
    bannerClose:   'rgba(255,255,255,0.25)',
    statCardBg:    '#111',
    statCardBorder:'rgba(255,255,255,0.07)',
    statLabel:     'rgba(255,255,255,0.3)',
    statValue:     'rgba(255,255,255,0.9)',
    statSub2:      'rgba(255,255,255,0.3)',
    statSub:       'rgba(255,255,255,0.28)',
    panelBg:       '#111',
    panelBorder:   'rgba(255,255,255,0.07)',
    panelTitle:    'rgba(255,255,255,0.8)',
    panelAction:   'rgba(255,255,255,0.35)',
    panelActionBg: 'rgba(255,255,255,0.05)',
    panelActionBorder:'rgba(255,255,255,0.08)',
    emptyText:     'rgba(255,255,255,0.25)',
    taskText:      'rgba(255,255,255,0.65)',
    taskDone:      'rgba(255,255,255,0.22)',
    taskCheckBorder:'rgba(255,255,255,0.15)',
    taskCheckBg:   'rgba(255,255,255,0.15)',
    taskTagBg:     'rgba(255,255,255,0.05)',
    taskTagColor:  'rgba(255,255,255,0.28)',
    taskInputBg:   'rgba(255,255,255,0.04)',
    taskInputBorder:'rgba(255,255,255,0.08)',
    taskInputColor: '#fff',
    taskAddBtnBg:  'rgba(255,255,255,0.08)',
    taskAddBtnBorder:'rgba(255,255,255,0.1)',
    taskAddBtnColor:'rgba(255,255,255,0.6)',
    taskFooterBorder:'rgba(255,255,255,0.04)',
    habitText:     'rgba(255,255,255,0.65)',
    habitStreak:   'rgba(255,255,255,0.3)',
    habitBorder:   'rgba(255,255,255,0.04)',
    habitCheckBg:  'rgba(255,255,255,0.12)',
    habitCheckColor:'rgba(255,255,255,0.7)',
    habitCheckBorder:'rgba(255,255,255,0.12)',
    habitCheckEmpty:'rgba(255,255,255,0.3)',
    scoreTrack:    'rgba(255,255,255,0.06)',
    scoreStroke:   'rgba(255,255,255,0.55)',
    scoreValue:    'rgba(255,255,255,0.9)',
    scoreSub:      'rgba(255,255,255,0.3)',
    barLabel:      'rgba(255,255,255,0.35)',
    barTrack:      'rgba(255,255,255,0.06)',
    barFill:       'rgba(255,255,255,0.4)',
    journalPromptBorder:'rgba(255,255,255,0.1)',
    journalPromptColor:'rgba(255,255,255,0.28)',
    journalAreaBg: 'rgba(255,255,255,0.03)',
    journalAreaBorder:'rgba(255,255,255,0.07)',
    journalAreaColor:'rgba(255,255,255,0.7)',
    journalSaveBg: 'rgba(255,255,255,0.06)',
    journalSaveColor:'rgba(255,255,255,0.45)',
    journalSaveBorder:'rgba(255,255,255,0.08)',
    calMonthColor: 'rgba(255,255,255,0.6)',
    calNavBg:      'none',
    calNavBorder:  'rgba(255,255,255,0.08)',
    calNavColor:   'rgba(255,255,255,0.3)',
    calDayHeader:  'rgba(255,255,255,0.2)',
    calDayColor:   'rgba(255,255,255,0.35)',
    calDayActive:  'rgba(255,255,255,0.6)',
    calTodayBg:    '#fff',
    calTodayColor: '#0A0A0A',
    modalBg:       '#111',
    modalBorder:   'rgba(255,255,255,0.1)',
    modalTitle:    'rgba(255,255,255,0.9)',
    modalText:     'rgba(255,255,255,0.55)',
    modalClose:    'rgba(255,255,255,0.35)',
  },
  light: {
    bg:            'transparent',
    topbarBorder:  'rgba(0,0,0,0.07)',
    titleColor:    '#1a1a1a',
    subColor:      'rgba(0,0,0,0.45)',
    aiBtnBg:       '#1a1a1a',
    aiBtnColor:    '#fff',
    iconBtnBg:     'rgba(0,0,0,0.04)',
    iconBtnBorder: 'rgba(0,0,0,0.08)',
    iconBtnColor:  'rgba(0,0,0,0.5)',
    bannerBg:      '#FFFFFF',
    bannerBorder:  'rgba(0,0,0,0.08)',
    bannerIconBg:  'rgba(0,0,0,0.06)',
    bannerText:    'rgba(0,0,0,0.5)',
    bannerStrong:  '#1a1a1a',
    bannerClose:   'rgba(0,0,0,0.3)',
    statCardBg:    '#FFFFFF',
    statCardBorder:'rgba(0,0,0,0.07)',
    statLabel:     'rgba(0,0,0,0.4)',
    statValue:     '#1a1a1a',
    statSub2:      'rgba(0,0,0,0.35)',
    statSub:       'rgba(0,0,0,0.38)',
    panelBg:       '#FFFFFF',
    panelBorder:   'rgba(0,0,0,0.07)',
    panelTitle:    '#1a1a1a',
    panelAction:   'rgba(0,0,0,0.4)',
    panelActionBg: 'rgba(0,0,0,0.04)',
    panelActionBorder:'rgba(0,0,0,0.08)',
    emptyText:     'rgba(0,0,0,0.3)',
    taskText:      'rgba(0,0,0,0.7)',
    taskDone:      'rgba(0,0,0,0.28)',
    taskCheckBorder:'rgba(0,0,0,0.2)',
    taskCheckBg:   'rgba(0,0,0,0.12)',
    taskTagBg:     'rgba(0,0,0,0.05)',
    taskTagColor:  'rgba(0,0,0,0.38)',
    taskInputBg:   '#F5F5F5',
    taskInputBorder:'rgba(0,0,0,0.1)',
    taskInputColor: '#1a1a1a',
    taskAddBtnBg:  'rgba(0,0,0,0.05)',
    taskAddBtnBorder:'rgba(0,0,0,0.08)',
    taskAddBtnColor:'rgba(0,0,0,0.5)',
    taskFooterBorder:'rgba(0,0,0,0.06)',
    habitText:     'rgba(0,0,0,0.7)',
    habitStreak:   'rgba(0,0,0,0.4)',
    habitBorder:   'rgba(0,0,0,0.06)',
    habitCheckBg:  'rgba(0,0,0,0.1)',
    habitCheckColor:'rgba(0,0,0,0.7)',
    habitCheckBorder:'rgba(0,0,0,0.12)',
    habitCheckEmpty:'rgba(0,0,0,0.3)',
    scoreTrack:    'rgba(0,0,0,0.08)',
    scoreStroke:   'rgba(0,0,0,0.5)',
    scoreValue:    '#1a1a1a',
    scoreSub:      'rgba(0,0,0,0.4)',
    barLabel:      'rgba(0,0,0,0.4)',
    barTrack:      'rgba(0,0,0,0.08)',
    barFill:       'rgba(0,0,0,0.35)',
    journalPromptBorder:'rgba(0,0,0,0.12)',
    journalPromptColor:'rgba(0,0,0,0.38)',
    journalAreaBg: '#F8F8F8',
    journalAreaBorder:'rgba(0,0,0,0.08)',
    journalAreaColor:'rgba(0,0,0,0.7)',
    journalSaveBg: 'rgba(0,0,0,0.05)',
    journalSaveColor:'rgba(0,0,0,0.5)',
    journalSaveBorder:'rgba(0,0,0,0.08)',
    calMonthColor: 'rgba(0,0,0,0.6)',
    calNavBg:      'none',
    calNavBorder:  'rgba(0,0,0,0.1)',
    calNavColor:   'rgba(0,0,0,0.4)',
    calDayHeader:  'rgba(0,0,0,0.3)',
    calDayColor:   'rgba(0,0,0,0.4)',
    calDayActive:  'rgba(0,0,0,0.65)',
    calTodayBg:    '#1a1a1a',
    calTodayColor: '#fff',
    modalBg:       '#FFFFFF',
    modalBorder:   'rgba(0,0,0,0.1)',
    modalTitle:    '#1a1a1a',
    modalText:     'rgba(0,0,0,0.55)',
    modalClose:    'rgba(0,0,0,0.4)',
  },
}

interface HomeData {
  greeting: string
  name: string
  today_date: string
  streak: number
  habits_due: number
  ai_insight: string
  tasks_done: number
  tasks_total: number
  habits_done: number
  habits_total: number
  growth_score: number
  tasks: { id: number; title: string; completed: boolean; priority: string; category: string }[]
  habits: { id: number; name: string; streak: number; completed_today: boolean }[]
  journal_prompt: string
  today_journal_entry: { content: string } | null
  journaled_today: boolean
  current_month: string
  first_day_of_month: number
  days_in_month: number
  today_day: number
  active_days: number[]
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const theme = useTheme()
  const th = THEMES[theme]

  const { data, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/home'), { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch home data')
      return res.json() as Promise<HomeData>
    },
  })

  const tasks  = data?.tasks  ?? []
  const habits = data?.habits ?? []

  const [showBanner, setShowBanner] = useState(true)
  const [taskInput, setTaskInput]   = useState('')
  const [journalText, setJournalText] = useState('')
  const [planOpen, setPlanOpen]       = useState(false)
  const [planText, setPlanText]       = useState('Generating your personalized plan...')
  const [planLoading, setPlanLoading] = useState(false)

  // Initialize journal textarea from cache on first load
  if (data && journalText === '' && data.today_journal_entry?.content) {
    setJournalText(data.today_journal_entry.content)
  }

  async function toggleTask(id: number) {
    const previous = queryClient.getQueryData<HomeData>(['home'])
    queryClient.setQueryData<HomeData>(['home'], old => old ? {
      ...old,
      tasks: old.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    } : old)
    try {
      await fetch(apiUrl(`/tasks/toggle/${id}`), { method: 'POST', credentials: 'include' })
    } catch {
      queryClient.setQueryData(['home'], previous)
    }
  }

  async function toggleHabit(id: number) {
    const previous = queryClient.getQueryData<HomeData>(['home'])
    queryClient.setQueryData<HomeData>(['home'], old => old ? {
      ...old,
      habits: old.habits.map(h => h.id === id ? { ...h, completed_today: !h.completed_today } : h)
    } : old)
    try {
      await fetch(apiUrl(`/habits/${id}/toggle`), { method: 'POST', credentials: 'include' })
    } catch {
      queryClient.setQueryData(['home'], previous)
    }
  }

  async function addQuickTask() {
    if (!taskInput.trim()) return
    const val = taskInput.trim()
    setTaskInput('')
    const temp = { id: -Date.now(), title: val, completed: false, priority: 'low', category: 'Task' }
    const previous = queryClient.getQueryData<HomeData>(['home'])
    queryClient.setQueryData<HomeData>(['home'], old => old ? { ...old, tasks: [...old.tasks, temp] } : old)
    try {
      const res = await fetch(apiUrl('/tasks/quick'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: val })
      })
      const created = await res.json()
      if (created.id) {
        queryClient.setQueryData<HomeData>(['home'], old => old ? {
          ...old,
          tasks: old.tasks.map(t => t.id === temp.id ? { ...temp, id: created.id } : t)
        } : old)
      } else {
        queryClient.setQueryData(['home'], previous)
      }
    } catch {
      queryClient.setQueryData(['home'], previous)
    }
  }

  async function saveJournal() {
    const previous = queryClient.getQueryData<HomeData>(['home'])
    queryClient.setQueryData<HomeData>(['home'], old => old ? {
      ...old,
      today_journal_entry: { content: journalText },
      journaled_today: true,
    } : old)
    try {
      await fetch(apiUrl('/journal/quick'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: journalText })
      })
    } catch {
      queryClient.setQueryData(['home'], previous)
    }
  }

  async function planMyDay() {
    setPlanOpen(true)
    setPlanLoading(true)
    setPlanText('Generating your personalized plan...')
    try {
      const res = await fetch(apiUrl('/ai/plan'), { method: 'POST', credentials: 'include' })
      const d = await res.json()
      setPlanText(d.plan)
    } catch {
      setPlanText('Could not generate plan right now. Try again shortly.')
    }
    setPlanLoading(false)
  }

  const priorityColor = (p: string) =>
    p === 'high' ? 'rgba(220,100,100,0.5)' : p === 'medium' ? 'rgba(255,180,50,0.5)' : 'rgba(100,180,100,0.5)'

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const todayDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const score = data?.growth_score ?? 0
  const dashOffset = 201 - (201 * score / 100)
  const tasksPct  = data && data.tasks_total  > 0 ? (data.tasks_done  / data.tasks_total  * 100) : 0
  const habitsPct = data && data.habits_total > 0 ? (data.habits_done / data.habits_total * 100) : 0

  const calBlanks = Array(data?.first_day_of_month ?? 0).fill(null)
  const calDays   = Array.from({ length: data?.days_in_month ?? 0 }, (_, i) => i + 1)

  const s: Record<string, React.CSSProperties> = {
    topbar:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 32px', borderBottom:`1px solid ${th.topbarBorder}` },
    topbarTitle: { fontSize:'18px', fontWeight:800, letterSpacing:'-0.5px', color: th.titleColor },
    topbarSub:   { fontSize:'12px', color: th.subColor },
    aiBtnStyle:  { display:'flex', alignItems:'center', gap:'6px', background: th.aiBtnBg, color: th.aiBtnColor, border:'none', borderRadius:'8px', padding:'8px 14px', fontSize:'12px', fontWeight:600, cursor:'pointer' },
    iconBtn:     { width:'32px', height:'32px', borderRadius:'8px', background: th.iconBtnBg, border:`1px solid ${th.iconBtnBorder}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'13px', color: th.iconBtnColor, textDecoration:'none' },
    content:     { padding:'28px 32px' },
    banner:      { background: th.bannerBg, border:`1px solid ${th.bannerBorder}`, borderRadius:'14px', padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'24px' },
    statsGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' },
    statCard:    { background: th.statCardBg, border:`1px solid ${th.statCardBorder}`, borderRadius:'12px', padding:'16px' },
    statLabel:   { fontSize:'10px', color: th.statLabel, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'8px' },
    statValue:   { fontSize:'26px', fontWeight:800, letterSpacing:'-1px', color: th.statValue, lineHeight:1, marginBottom:'4px' },
    statSub:     { fontSize:'10px', color: th.statSub },
    mainGrid:    { display:'grid', gridTemplateColumns:'1fr 320px', gap:'16px', marginBottom:'24px' },
    panel:       { background: th.panelBg, border:`1px solid ${th.panelBorder}`, borderRadius:'14px', overflow:'hidden' },
    panelHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${th.topbarBorder}` },
    panelTitle:  { fontSize:'13px', fontWeight:600, color: th.panelTitle },
    panelAction: { fontSize:'11px', color: th.panelAction, background: th.panelActionBg, border:`1px solid ${th.panelActionBorder}`, borderRadius:'6px', padding:'4px 10px', textDecoration:'none' },
    bottomGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' },
  }

  if (isLoading) return (
    <div style={{ padding:'32px', color: th.emptyText, fontSize:'13px' }}>Loading...</div>
  )

  if (!data) return null

  return (
    <div style={{ overflowY:'auto', minHeight:'100vh' }}>

      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
          <SidebarReopenButton />
          <div style={{ display:'flex', flexDirection:'column', gap:'2px', minWidth:0 }}>
            <div style={s.topbarTitle}>Good {greeting}, {data.name}</div>
            <div style={s.topbarSub}>{todayDate} · {data.streak} day streak · {data.habits_due} habits due today</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button style={s.aiBtnStyle} onClick={planMyDay}>✦ Plan my day</button>
          <Link href="/tasks" style={s.iconBtn}>+</Link>
          <Link href="/settings" style={s.iconBtn}>⚙</Link>
        </div>
      </div>

      <div style={s.content}>

        {/* AI BANNER */}
        {data.ai_insight && showBanner && (
          <div style={s.banner}>
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background: th.bannerIconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', flexShrink:0 }}>✦</div>
            <div style={{ fontSize:'13px', color: th.bannerText, lineHeight:1.6, flex:1 }}>
              <strong style={{ color: th.bannerStrong, fontWeight:500 }}>AI insight — </strong>{data.ai_insight}
            </div>
            <div onClick={() => setShowBanner(false)} style={{ fontSize:'10px', color: th.bannerClose, cursor:'pointer', flexShrink:0 }}>✕</div>
          </div>
        )}

        {/* STATS */}
        <div style={s.statsGrid}>
          {[
            { label:'Current streak', value: data.streak,      sub:'days in a row' },
            { label:'Tasks today',    value: data.tasks_done,  sub2:`/${data.tasks_total}`,  sub:`${data.tasks_total  - data.tasks_done}  remaining` },
            { label:'Habits done',   value: data.habits_done, sub2:`/${data.habits_total}`, sub:`${data.habits_total - data.habits_done} still pending` },
            { label:'Growth score',  value: data.growth_score, sub:'out of 100' },
          ].map(card => (
            <div key={card.label} style={s.statCard}>
              <div style={s.statLabel}>{card.label}</div>
              <div style={s.statValue}>
                {card.value}
                {card.sub2 && <span style={{ fontSize:'14px', fontWeight:400, color: th.statSub2 }}>{card.sub2}</span>}
              </div>
              <div style={s.statSub}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={s.mainGrid}>

          {/* TASKS PANEL */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTitle}>Today's priorities</div>
              <Link href="/tasks" style={s.panelAction}>View all →</Link>
            </div>
            <div>
              {tasks.length === 0
                ? <div style={{ padding:'24px 20px', fontSize:'12px', color: th.emptyText, textAlign:'center' }}>No tasks yet — add your first one below</div>
                : tasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id)}
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 20px', cursor:'pointer' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: priorityColor(task.priority), flexShrink:0 }}/>
                    <div style={{ width:'15px', height:'15px', borderRadius:'50%', border: task.completed ? 'none' : `1px solid ${th.taskCheckBorder}`, background: task.completed ? th.taskCheckBg : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', flexShrink:0 }}>
                      {task.completed ? '✓' : ''}
                    </div>
                    <div style={{ fontSize:'12px', color: task.completed ? th.taskDone : th.taskText, flex:1, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                    <div style={{ fontSize:'9px', padding:'2px 7px', borderRadius:'4px', background: th.taskTagBg, color: th.taskTagColor }}>{task.category || 'Task'}</div>
                  </div>
                ))
              }
            </div>
            <div style={{ display:'flex', gap:'6px', padding:'10px 20px', borderTop:`1px solid ${th.taskFooterBorder}` }}>
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuickTask()}
                placeholder="Add a new task..."
                style={{ flex:1, background: th.taskInputBg, border:`1px solid ${th.taskInputBorder}`, borderRadius:'7px', padding:'7px 10px', fontSize:'11px', color: th.taskInputColor, outline:'none' }}
              />
              <button onClick={addQuickTask} style={{ background: th.taskAddBtnBg, border:`1px solid ${th.taskAddBtnBorder}`, borderRadius:'7px', padding:'7px 12px', fontSize:'10px', fontWeight:600, color: th.taskAddBtnColor, cursor:'pointer' }}>Add</button>
            </div>
          </div>

          {/* HABITS PANEL */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTitle}>Today's habits</div>
              <Link href="/habits" style={s.panelAction}>View all →</Link>
            </div>
            <div>
              {habits.length === 0
                ? <div style={{ padding:'24px 20px', fontSize:'12px', color: th.emptyText, textAlign:'center' }}>No habits yet</div>
                : habits.map(habit => (
                  <div key={habit.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 20px', borderBottom:`1px solid ${th.habitBorder}` }}>
                    <div style={{ fontSize:'12px', color: th.habitText, flex:1 }}>{habit.name}</div>
                    <div style={{ fontSize:'10px', color: th.habitStreak, marginRight:'4px' }}>{habit.streak >= 3 ? '🔥' : ''} {habit.streak}d</div>
                    <button onClick={() => toggleHabit(habit.id)} style={{ width:'22px', height:'22px', borderRadius:'6px', border: habit.completed_today ? 'none' : `1px solid ${th.habitCheckBorder}`, background: habit.completed_today ? th.habitCheckBg : 'transparent', color: habit.completed_today ? th.habitCheckColor : th.habitCheckEmpty, fontSize:'9px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {habit.completed_today ? '✓' : ''}
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* BOTTOM GRID */}
        <div style={s.bottomGrid}>

          {/* GROWTH SCORE */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTitle}>Growth score</div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>Today</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'20px' }}>
              <div style={{ position:'relative', width:'80px', height:'80px', flexShrink:0 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform:'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke={th.scoreTrack} strokeWidth="6"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke={th.scoreStroke} strokeWidth="6"
                    strokeDasharray="201" strokeDashoffset={dashOffset} strokeLinecap="round"/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-1px', color: th.scoreValue, lineHeight:1 }}>{score}</div>
                  <div style={{ fontSize:'8px', color: th.scoreSub }}>/100</div>
                </div>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'6px' }}>
                {[
                  { label:'Tasks',   pct: tasksPct },
                  { label:'Habits',  pct: habitsPct },
                  { label:'Journal', pct: data.journaled_today ? 100 : 0 },
                  { label:'Streak',  pct: Math.min(data.streak * 5, 100) },
                ].map(bar => (
                  <div key={bar.label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <div style={{ fontSize:'9px', color: th.barLabel, minWidth:'52px' }}>{bar.label}</div>
                    <div style={{ flex:1, height:'3px', background: th.barTrack, borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${bar.pct}%`, background: th.barFill, borderRadius:'2px' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* JOURNAL */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTitle}>Journal</div>
              <Link href="/journal" style={s.panelAction}>Open →</Link>
            </div>
            <div style={{ fontSize:'10px', color: th.journalPromptColor, fontStyle:'italic', margin:'16px 20px 8px', paddingLeft:'8px', borderLeft:`2px solid ${th.journalPromptBorder}`, lineHeight:1.5 }}>
              ✦ {data.journal_prompt}
            </div>
            <textarea
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              placeholder="Write your thoughts here..."
              style={{ width:'calc(100% - 40px)', margin:'0 20px', background: th.journalAreaBg, border:`1px solid ${th.journalAreaBorder}`, borderRadius:'7px', padding:'9px 11px', fontSize:'11px', color: th.journalAreaColor, resize:'none', outline:'none', lineHeight:1.6, minHeight:'70px', display:'block', fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'8px 20px 16px' }}>
              <button onClick={saveJournal} style={{ background: th.journalSaveBg, color: th.journalSaveColor, border:`1px solid ${th.journalSaveBorder}`, borderRadius:'6px', padding:'5px 12px', fontSize:'10px', cursor:'pointer' }}>Save entry</button>
            </div>
          </div>

          {/* CALENDAR */}
          <div style={s.panel}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 0' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color: th.calMonthColor }}>{data.current_month}</div>
              <div style={{ display:'flex', gap:'4px' }}>
                <button style={{ background: th.calNavBg, border:`1px solid ${th.calNavBorder}`, color: th.calNavColor, borderRadius:'4px', padding:'2px 7px', fontSize:'10px', cursor:'pointer' }}>‹</button>
                <button style={{ background: th.calNavBg, border:`1px solid ${th.calNavBorder}`, color: th.calNavColor, borderRadius:'4px', padding:'2px 7px', fontSize:'10px', cursor:'pointer' }}>›</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', padding:'12px 20px 16px' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} style={{ fontSize:'8px', color: th.calDayHeader, textAlign:'center', padding:'2px 0' }}>{d}</div>
              ))}
              {calBlanks.map((_, i) => <div key={`b${i}`}/>)}
              {calDays.map(day => (
                <div key={day} style={{
                  fontSize:'9px', textAlign:'center', padding:'4px 2px', borderRadius:'4px', cursor:'pointer',
                  background: day === data.today_day ? th.calTodayBg : 'transparent',
                  color: day === data.today_day ? th.calTodayColor : data.active_days?.includes(day) ? th.calDayActive : th.calDayColor,
                  fontWeight: day === data.today_day ? 700 : 400,
                }}>
                  {day}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* PLAN MODAL */}
      {planOpen && (
        <div onClick={e => e.target === e.currentTarget && setPlanOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background: th.modalBg, border:`1px solid ${th.modalBorder}`, borderRadius:'18px', padding:'28px', maxWidth:'480px', width:'90%', maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <div style={{ fontSize:'15px', fontWeight:700, color: th.modalTitle }}>✦ Your plan for today</div>
              <div onClick={() => setPlanOpen(false)} style={{ cursor:'pointer', color: th.modalClose, fontSize:'16px' }}>✕</div>
            </div>
            <div style={{ fontSize:'13px', color: th.modalText, lineHeight:1.75, whiteSpace:'pre-wrap' }}>
              {planText}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
