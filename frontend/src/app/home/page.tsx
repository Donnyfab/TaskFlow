'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function HomePage() {
  const [data, setData]               = useState<HomeData | null>(null)
  const [showBanner, setShowBanner]   = useState(true)
  const [tasks, setTasks]             = useState<HomeData['tasks']>([])
  const [habits, setHabits]           = useState<HomeData['habits']>([])
  const [taskInput, setTaskInput]     = useState('')
  const [journalText, setJournalText] = useState('')
  const [planOpen, setPlanOpen]       = useState(false)
  const [planText, setPlanText]       = useState('Generating your personalized plan...')
  const [planLoading, setPlanLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/home`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setData(d)
        setTasks(d.tasks || [])
        setHabits(d.habits || [])
        setJournalText(d.today_journal_entry?.content || '')
      })
  }, [])

  async function toggleTask(id: number) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    await fetch(`${API}/tasks/toggle/${id}`, { method: 'POST', credentials: 'include' })
  }

  async function toggleHabit(id: number) {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completed_today: !h.completed_today } : h))
    await fetch(`${API}/habits/${id}/toggle`, { method: 'POST', credentials: 'include' })
  }

  async function addQuickTask() {
    if (!taskInput.trim()) return
    const val = taskInput.trim()
    setTaskInput('')
    const res = await fetch(`${API}/tasks/quick`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: val })
    })
    const created = await res.json()
    if (created.id) setTasks(prev => [...prev, { id: created.id, title: val, completed: false, priority: 'low', category: 'Task' }])
  }

  async function saveJournal() {
    await fetch(`${API}/journal/quick`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: journalText })
    })
  }

  async function planMyDay() {
    setPlanOpen(true)
    setPlanLoading(true)
    setPlanText('Generating your personalized plan...')
    try {
      const res = await fetch(`${API}/ai/plan`, { method: 'POST', credentials: 'include' })
      const d = await res.json()
      setPlanText(d.plan)
    } catch {
      setPlanText('Could not generate plan right now. Try again shortly.')
    }
    setPlanLoading(false)
  }

  const priorityColor = (p: string) =>
    p === 'high' ? 'rgba(220,100,100,0.5)' : p === 'medium' ? 'rgba(255,180,50,0.5)' : 'rgba(100,180,100,0.5)'

  const score = data?.growth_score ?? 0
  const dashOffset = 201 - (201 * score / 100)
  const tasksPct = data && data.tasks_total > 0 ? (data.tasks_done / data.tasks_total * 100) : 0
  const habitsPct = data && data.habits_total > 0 ? (data.habits_done / data.habits_total * 100) : 0

  // Calendar
  const calBlanks = Array(data?.first_day_of_month ?? 0).fill(null)
  const calDays   = Array.from({ length: data?.days_in_month ?? 0 }, (_, i) => i + 1)

  const s: Record<string, React.CSSProperties> = {
    topbar:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 32px', borderBottom:'1px solid rgba(255,255,255,0.05)' },
    topbarTitle: { fontSize:'18px', fontWeight:800, letterSpacing:'-0.5px', color:'rgba(255,255,255,0.9)' },
    topbarSub:   { fontSize:'12px', color:'rgba(255,255,255,0.3)' },
    aiBtnStyle:  { display:'flex', alignItems:'center', gap:'6px', background:'#fff', color:'#0A0A0A', border:'none', borderRadius:'8px', padding:'8px 14px', fontSize:'12px', fontWeight:600, cursor:'pointer' },
    iconBtn:     { width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'13px', color:'rgba(255,255,255,0.5)', textDecoration:'none' },
    content:     { padding:'28px 32px' },
    banner:      { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'24px' },
    statsGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' },
    statCard:    { background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px' },
    statLabel:   { fontSize:'10px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'8px' },
    statValue:   { fontSize:'26px', fontWeight:800, letterSpacing:'-1px', color:'rgba(255,255,255,0.9)', lineHeight:1, marginBottom:'4px' },
    statSub:     { fontSize:'10px', color:'rgba(255,255,255,0.28)' },
    mainGrid:    { display:'grid', gridTemplateColumns:'1fr 320px', gap:'16px', marginBottom:'24px' },
    panel:       { background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' },
    panelHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' },
    panelTitle:  { fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)' },
    panelAction: { fontSize:'11px', color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'4px 10px', textDecoration:'none' },
    bottomGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' },
  }

  if (!data) return (
    <div style={{ padding:'32px', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
  )

  return (
    <div style={{ overflowY:'auto', minHeight:'100vh' }}>

      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
          <div style={s.topbarTitle}>Good {data.greeting}, {data.name}</div>
          <div style={s.topbarSub}>{data.today_date} · {data.streak} day streak · {data.habits_due} habits due today</div>
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
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', flexShrink:0 }}>✦</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:1.6, flex:1 }}>
              <strong style={{ color:'rgba(255,255,255,0.82)', fontWeight:500 }}>AI insight — </strong>{data.ai_insight}
            </div>
            <div onClick={() => setShowBanner(false)} style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', cursor:'pointer', flexShrink:0 }}>✕</div>
          </div>
        )}

        {/* STATS */}
        <div style={s.statsGrid}>
          {[
            { label:'Current streak', value: data.streak, sub:'days in a row' },
            { label:'Tasks today',    value: data.tasks_done,  sub2:`/${data.tasks_total}`, sub:`${data.tasks_total - data.tasks_done} remaining` },
            { label:'Habits done',   value: data.habits_done, sub2:`/${data.habits_total}`, sub:`${data.habits_total - data.habits_done} still pending` },
            { label:'Growth score',  value: data.growth_score, sub:'out of 100' },
          ].map(card => (
            <div key={card.label} style={s.statCard}>
              <div style={s.statLabel}>{card.label}</div>
              <div style={s.statValue}>
                {card.value}
                {card.sub2 && <span style={{ fontSize:'14px', fontWeight:400, color:'rgba(255,255,255,0.3)' }}>{card.sub2}</span>}
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
                ? <div style={{ padding:'24px 20px', fontSize:'12px', color:'rgba(255,255,255,0.25)', textAlign:'center' }}>No tasks yet — add your first one below</div>
                : tasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id)}
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 20px', cursor:'pointer' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: priorityColor(task.priority), flexShrink:0 }}/>
                    <div style={{ width:'15px', height:'15px', borderRadius:'50%', border: task.completed ? 'none' : '1px solid rgba(255,255,255,0.15)', background: task.completed ? 'rgba(255,255,255,0.15)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', flexShrink:0 }}>
                      {task.completed ? '✓' : ''}
                    </div>
                    <div style={{ fontSize:'12px', color: task.completed ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)', flex:1, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                    <div style={{ fontSize:'9px', padding:'2px 7px', borderRadius:'4px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.28)' }}>{task.category || 'Task'}</div>
                  </div>
                ))
              }
            </div>
            <div style={{ display:'flex', gap:'6px', padding:'10px 20px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuickTask()}
                placeholder="Add a new task..."
                style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', padding:'7px 10px', fontSize:'11px', color:'#fff', outline:'none' }}
              />
              <button onClick={addQuickTask} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'7px 12px', fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.6)', cursor:'pointer' }}>Add</button>
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
                ? <div style={{ padding:'24px 20px', fontSize:'12px', color:'rgba(255,255,255,0.25)', textAlign:'center' }}>No habits yet</div>
                : habits.map(habit => (
                  <div key={habit.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', flex:1 }}>{habit.name}</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginRight:'4px' }}>{habit.streak >= 3 ? '🔥' : ''} {habit.streak}d</div>
                    <button onClick={() => toggleHabit(habit.id)} style={{ width:'22px', height:'22px', borderRadius:'6px', border: habit.completed_today ? 'none' : '1px solid rgba(255,255,255,0.12)', background: habit.completed_today ? 'rgba(255,255,255,0.12)' : 'transparent', color: habit.completed_today ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontSize:'9px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
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
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="6"
                    strokeDasharray="201" strokeDashoffset={dashOffset} strokeLinecap="round"/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-1px', color:'rgba(255,255,255,0.9)', lineHeight:1 }}>{score}</div>
                  <div style={{ fontSize:'8px', color:'rgba(255,255,255,0.3)' }}>/100</div>
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
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.35)', minWidth:'52px' }}>{bar.label}</div>
                    <div style={{ flex:1, height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${bar.pct}%`, background:'rgba(255,255,255,0.4)', borderRadius:'2px' }}/>
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
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)', fontStyle:'italic', margin:'16px 20px 8px', paddingLeft:'8px', borderLeft:'2px solid rgba(255,255,255,0.1)', lineHeight:1.5 }}>
              ✦ {data.journal_prompt}
            </div>
            <textarea
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              placeholder="Write your thoughts here..."
              style={{ width:'calc(100% - 40px)', margin:'0 20px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'7px', padding:'9px 11px', fontSize:'11px', color:'rgba(255,255,255,0.7)', resize:'none', outline:'none', lineHeight:1.6, minHeight:'70px', display:'block', fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'8px 20px 16px' }}>
              <button onClick={saveJournal} style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.45)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'5px 12px', fontSize:'10px', cursor:'pointer' }}>Save entry</button>
            </div>
          </div>

          {/* CALENDAR */}
          <div style={s.panel}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 0' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.6)' }}>{data.current_month}</div>
              <div style={{ display:'flex', gap:'4px' }}>
                <button style={{ background:'none', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)', borderRadius:'4px', padding:'2px 7px', fontSize:'10px', cursor:'pointer' }}>‹</button>
                <button style={{ background:'none', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)', borderRadius:'4px', padding:'2px 7px', fontSize:'10px', cursor:'pointer' }}>›</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', padding:'12px 20px 16px' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} style={{ fontSize:'8px', color:'rgba(255,255,255,0.2)', textAlign:'center', padding:'2px 0' }}>{d}</div>
              ))}
              {calBlanks.map((_, i) => <div key={`b${i}`}/>)}
              {calDays.map(day => (
                <div key={day} style={{
                  fontSize:'9px', textAlign:'center', padding:'4px 2px', borderRadius:'4px', cursor:'pointer',
                  background: day === data.today_day ? '#fff' : 'transparent',
                  color: day === data.today_day ? '#0A0A0A' : data.active_days?.includes(day) ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
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
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'28px', maxWidth:'480px', width:'90%', maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <div style={{ fontSize:'15px', fontWeight:700, color:'rgba(255,255,255,0.9)' }}>✦ Your plan for today</div>
              <div onClick={() => setPlanOpen(false)} style={{ cursor:'pointer', color:'rgba(255,255,255,0.35)', fontSize:'16px' }}>✕</div>
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>
              {planText}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}