'use client'
import { useEffect, useState, useRef } from 'react'
import { apiUrl } from '@/lib/api-base'
const C = 552.9

interface Task { id: number; title: string }

type Screen = 'setup' | 'focus' | 'complete'

const TIPS = [
  'Close everything except what you need. The work deserves your full attention.',
  'Break the task into the smallest possible action first.',
  'The first 5 minutes are the hardest. After that, you\'ll be in flow.',
  'What single thing would make this session a success?',
  'You\'ve been consistent — this session continues that momentum.',
]

export default function FocusPage() {
  const [screen, setScreen]         = useState<Screen>('setup')
  const [tasks, setTasks]           = useState<Task[]>([])
  const [selTaskId, setSelTaskId]   = useState<number | null>(null)
  const [selTaskTitle, setSelTaskTitle] = useState('')
  const [selDur, setSelDur]         = useState(25)
  const [customDur, setCustomDur]   = useState<number | null>(null)
  const [timeLeft, setTimeLeft]     = useState(25 * 60)
  const [totalSec, setTotalSec]     = useState(25 * 60)
  const [running, setRunning]       = useState(false)
  const [paused, setPaused]         = useState(false)
  const [nudge, setNudge]           = useState(TIPS[0])
  const [showQuit, setShowQuit]     = useState(false)
  const [taskDone, setTaskDone]     = useState<boolean | null>(null)
  const [reflection, setReflection] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeLeftRef = useRef(timeLeft)
  const runningRef  = useRef(running)
  const totalRef    = useRef(totalSec)
  timeLeftRef.current = timeLeft
  runningRef.current  = running
  totalRef.current    = totalSec

  useEffect(() => {
    fetch(apiUrl('/api/tasks/data'), { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const incomplete = (d.tasks || []).filter((t: any) => !t.completed)
        setTasks(incomplete)
        if (incomplete.length > 0) { setSelTaskId(incomplete[0].id); setSelTaskTitle(incomplete[0].title) }
      }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (running || (timeLeft > 0 && timeLeft < totalSec)) {
        e.preventDefault(); e.returnValue = 'You have an active focus session.'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [running, timeLeft, totalSec])

  function startFocus() {
    if (!selTaskId) { alert('Please select a task first.'); return }
    const dur = (customDur || selDur) * 60
    setTotalSec(dur); setTimeLeft(dur); setPaused(false)
    setNudge(TIPS[Math.floor(Math.random() * TIPS.length)])
    setScreen('focus')
    setRunning(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (!runningRef.current) return
      const next = Math.max(0, timeLeftRef.current - 1)
      setTimeLeft(next)
      if (next <= 0) {
        clearInterval(intervalRef.current!)
        setRunning(false)
        showComplete(totalRef.current, totalRef.current)
      }
    }, 1000)
  }

  function togglePause() {
    const next = !runningRef.current
    setRunning(next); setPaused(!next)
  }

  function tryExit() {
    if (timeLeft < totalSec - 30) { setRunning(false); setPaused(true); setShowQuit(true) }
    else endSession()
  }

  function endSession() {
    setShowQuit(false)
    clearInterval(intervalRef.current!)
    setRunning(false)
    showComplete(totalSec, totalSec - timeLeft)
  }

  function showComplete(total: number, spent: number) {
    fetch(apiUrl('/focus/sessions/save'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: selTaskId, session_duration: total, actual_time_spent: spent, completed: false })
    }).catch(() => {})
    setScreen('complete')
  }

  function markDone(done: boolean) {
    setTaskDone(done)
    fetch(apiUrl('/focus/sessions/complete'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: selTaskId, completed: done, reflection })
    }).catch(() => {})
  }

  function restartSetup() {
    setScreen('setup'); setTaskDone(null); setReflection(''); setRunning(false); setPaused(false)
  }

  const spent   = totalSec - timeLeft
  const pct     = totalSec > 0 ? spent / totalSec : 0
  const dashOffset = (C * (1 - pct)).toFixed(1)
  const mm      = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const ss      = (timeLeft % 60).toString().padStart(2, '0')
  const elMin   = Math.floor(spent / 60)
  const elSec   = spent % 60
  const reMin   = Math.floor(timeLeft / 60)
  const reSec   = timeLeft % 60

  const activeDur = customDur || selDur

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', position: 'relative' }}>

      {/* SETUP SCREEN */}
      {screen === 'setup' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '36px', maxWidth: '480px', width: '100%' }}>
            <a href="/home" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.28)', textDecoration: 'none', marginBottom: '24px' }}>← Back to dashboard</a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <div style={{ width: '26px', height: '26px', background: '#fff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M3 8L6.5 11.5L13 4.5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>TaskFlow</span>
            </div>

            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Focus Mode</div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '6px', color: 'rgba(255,255,255,0.9)' }}>What are you working on?</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px', lineHeight: 1.6 }}>Choose a task and set your session duration. Then lock in.</div>

            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Task</div>
            <select value={selTaskId ?? ''} onChange={e => { setSelTaskId(Number(e.target.value)); setSelTaskTitle(e.target.options[e.target.selectedIndex].text) }}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#fff', fontFamily: 'inherit', outline: 'none', marginBottom: '22px', cursor: 'pointer', boxSizing: 'border-box' }}>
              {tasks.length === 0
                ? <option value="">No tasks — add one first</option>
                : tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)
              }
            </select>

            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Session duration</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '22px' }}>
              {[25, 45, 60].map(d => (
                <div key={d} onClick={() => { setSelDur(d); setCustomDur(null) }}
                  style={{ background: activeDur === d && !customDur ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)', border: `1px solid ${activeDur === d && !customDur ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '12px 6px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.8px', color: 'rgba(255,255,255,0.88)', lineHeight: 1 }}>{d}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>min</div>
                </div>
              ))}
              <div onClick={() => { const v = prompt('Session duration (1–120 minutes):', '30'); if (v && !isNaN(Number(v))) setCustomDur(Math.min(120, Math.max(1, parseInt(v)))) }}
                style={{ background: customDur ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)', border: `1px solid ${customDur ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '12px 6px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.8px', color: 'rgba(255,255,255,0.88)', lineHeight: 1 }}>{customDur || '—'}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>custom</div>
              </div>
            </div>

            <button onClick={startFocus} style={{ width: '100%', background: '#fff', color: '#0A0A0A', border: 'none', borderRadius: '11px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.2px', fontFamily: 'inherit' }}>
              Start Focus Session →
            </button>
          </div>
        </div>
      )}

      {/* FOCUS SCREEN */}
      {screen === 'focus' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>Focus · {activeDur} min</div>
            <button onClick={tryExit} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>✕ End session</button>
          </div>

          <div style={{ textAlign: 'center', maxWidth: '560px', width: '100%' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Now focused on</div>
            <div style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: 'rgba(255,255,255,0.9)', marginBottom: '36px' }}>{selTaskTitle}</div>

            {/* Progress bar */}
            <div style={{ maxWidth: '400px', margin: '0 auto 32px' }}>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'rgba(255,255,255,0.5)', borderRadius: '2px', width: `${(pct * 100).toFixed(1)}%`, transition: 'width 1s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>
                <span>{elMin}:{elSec.toString().padStart(2,'0')} elapsed</span>
                <span>{reMin}:{reSec.toString().padStart(2,'0')} left</span>
              </div>
            </div>

            {/* Timer ring */}
            <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 36px' }}>
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.55)"
                  strokeWidth="8" strokeDasharray="552.9" strokeDashoffset={dashOffset}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-2px', color: 'rgba(255,255,255,0.92)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{mm}:{ss}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>{paused ? 'Paused' : 'Focus'}</div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '36px' }}>
              <button onClick={tryExit} style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', fontSize: '14px', cursor: 'pointer' }}>■</button>
              <button onClick={togglePause} style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fff', color: '#0A0A0A', border: 'none', fontSize: '18px', cursor: 'pointer' }}>
                {paused ? '▶' : '⏸'}
              </button>
              <button onClick={() => { clearInterval(intervalRef.current!); setRunning(false); showComplete(totalSec, totalSec - timeLeft) }} style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', fontSize: '14px', cursor: 'pointer' }}>↪</button>
            </div>

            {/* AI nudge */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '3px 7px', flexShrink: 0, marginTop: '1px' }}>✦</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, fontStyle: 'italic' }}>"{nudge}"</div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE SCREEN */}
      {screen === 'complete' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '36px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 18px' }}>✦</div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>Session complete.</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px', lineHeight: 1.65 }}>
              You spent {Math.floor(spent/60) > 0 ? `${Math.floor(spent/60)}m ` : ''}{spent % 60}s on "{selTaskTitle}". Every session compounds.
            </div>

            <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '14px' }}>Did you complete this task?</div>

            {taskDone === null ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <button onClick={() => markDone(true)} style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#0A0A0A', border: 'none', fontFamily: 'inherit' }}>Yes, done ✓</button>
                <button onClick={() => markDone(false)} style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}>Not yet</button>
              </div>
            ) : (
              <div style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px', textAlign: 'center', background: taskDone ? 'rgba(80,210,130,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${taskDone ? 'rgba(80,210,130,0.18)' : 'rgba(255,255,255,0.08)'}`, color: taskDone ? 'rgba(100,220,140,0.8)' : 'rgba(255,255,255,0.38)' }}>
                {taskDone ? '✓ Task marked complete' : 'Kept as in progress'}
              </div>
            )}

            <input value={reflection} onChange={e => setReflection(e.target.value)} placeholder="How did it go? What distracted you?"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={restartSetup} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.52)', cursor: 'pointer', fontFamily: 'inherit' }}>↺ Start another session</button>
              <a href="/home" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.52)', textDecoration: 'none', display: 'block' }}>⌂ Back to dashboard</a>
              <a href="/ai" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.52)', textDecoration: 'none', display: 'block' }}>✦ Talk to AI coach</a>
            </div>
          </div>
        </div>
      )}

      {/* QUIT MODAL */}
      {showQuit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>Still have time left</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '22px', lineHeight: 1.65 }}>
              You still have {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')} left. Leaving breaks your focus momentum.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowQuit(false); setRunning(true); setPaused(false) }} style={{ flex: 1, background: '#fff', color: '#0A0A0A', border: 'none', borderRadius: '9px', padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Keep going</button>
              <button onClick={endSession} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '11px', fontSize: '13px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'inherit' }}>End session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
