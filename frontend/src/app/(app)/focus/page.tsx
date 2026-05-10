'use client'
import { useEffect, useState, useRef } from 'react'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'
const C = 552.9

const THEMES = {
  dark: {
    pageBg:         '#0A0A0A',
    cardBg:         '#111',
    cardBorder:     'rgba(255,255,255,0.09)',
    backColor:      'rgba(255,255,255,0.28)',
    logoIconBg:     '#fff',
    logoIconColor:  '#0A0A0A',
    logoText:       'rgba(255,255,255,0.9)',
    sectionLabel:   'rgba(255,255,255,0.28)',
    titleColor:     'rgba(255,255,255,0.9)',
    bodyText:       'rgba(255,255,255,0.35)',
    inputBg:        'rgba(255,255,255,0.04)',
    inputBorder:    'rgba(255,255,255,0.09)',
    inputColor:     '#fff',
    durSelBg:       'rgba(255,255,255,0.09)',
    durSelBorder:   'rgba(255,255,255,0.5)',
    durDefBg:       'rgba(255,255,255,0.04)',
    durDefBorder:   'rgba(255,255,255,0.08)',
    durValue:       'rgba(255,255,255,0.88)',
    durLabel:       'rgba(255,255,255,0.3)',
    startBtnBg:     '#fff',
    startBtnColor:  '#0A0A0A',
    focusLabel:     'rgba(255,255,255,0.25)',
    endBtnBg:       'rgba(255,255,255,0.04)',
    endBtnBorder:   'rgba(255,255,255,0.08)',
    endBtnColor:    'rgba(255,255,255,0.28)',
    taskTitle:      'rgba(255,255,255,0.9)',
    barTrack:       'rgba(255,255,255,0.07)',
    barFill:        'rgba(255,255,255,0.5)',
    timerMeta:      'rgba(255,255,255,0.22)',
    timerTrack:     'rgba(255,255,255,0.06)',
    timerStroke:    'rgba(255,255,255,0.55)',
    timerValue:     'rgba(255,255,255,0.92)',
    timerState:     'rgba(255,255,255,0.3)',
    stopBtnBg:      'rgba(255,255,255,0.06)',
    stopBtnBorder:  'rgba(255,255,255,0.1)',
    stopBtnColor:   'rgba(255,255,255,0.45)',
    pauseBtnBg:     '#fff',
    pauseBtnColor:  '#0A0A0A',
    nudgeBg:        'rgba(255,255,255,0.03)',
    nudgeBorder:    'rgba(255,255,255,0.07)',
    nudgeTagColor:  'rgba(255,255,255,0.35)',
    nudgeTagBg:     'rgba(255,255,255,0.07)',
    nudgeText:      'rgba(255,255,255,0.38)',
    completeIconBg: 'rgba(255,255,255,0.07)',
    completeTitle:  'rgba(255,255,255,0.9)',
    completeBody:   'rgba(255,255,255,0.35)',
    completeSub:    'rgba(255,255,255,0.72)',
    doneBtnBg:      '#fff',
    doneBtnColor:   '#0A0A0A',
    notYetBg:       'rgba(255,255,255,0.07)',
    notYetColor:    'rgba(255,255,255,0.6)',
    notYetBorder:   'rgba(255,255,255,0.1)',
    reflInpBg:      'rgba(255,255,255,0.04)',
    reflInpBorder:  'rgba(255,255,255,0.08)',
    reflInpColor:   'rgba(255,255,255,0.7)',
    navLinkBg:      'rgba(255,255,255,0.05)',
    navLinkBorder:  'rgba(255,255,255,0.09)',
    navLinkColor:   'rgba(255,255,255,0.52)',
    quitBg:         '#111',
    quitBorder:     'rgba(255,255,255,0.1)',
    quitTitle:      'rgba(255,255,255,0.9)',
    quitBody:       'rgba(255,255,255,0.38)',
    keepBtnBg:      '#fff',
    keepBtnColor:   '#0A0A0A',
    endBg:          'rgba(255,255,255,0.06)',
    endBorder:      'rgba(255,255,255,0.1)',
    endColor:       'rgba(255,255,255,0.55)',
  },
  light: {
    pageBg:         '#F5F5F5',
    cardBg:         '#FFFFFF',
    cardBorder:     'rgba(0,0,0,0.09)',
    backColor:      'rgba(0,0,0,0.4)',
    logoIconBg:     '#1a1a1a',
    logoIconColor:  '#fff',
    logoText:       '#1a1a1a',
    sectionLabel:   'rgba(0,0,0,0.35)',
    titleColor:     '#1a1a1a',
    bodyText:       'rgba(0,0,0,0.45)',
    inputBg:        '#F5F5F5',
    inputBorder:    'rgba(0,0,0,0.1)',
    inputColor:     '#1a1a1a',
    durSelBg:       'rgba(0,0,0,0.08)',
    durSelBorder:   'rgba(0,0,0,0.4)',
    durDefBg:       'rgba(0,0,0,0.04)',
    durDefBorder:   'rgba(0,0,0,0.08)',
    durValue:       '#1a1a1a',
    durLabel:       'rgba(0,0,0,0.4)',
    startBtnBg:     '#1a1a1a',
    startBtnColor:  '#fff',
    focusLabel:     'rgba(0,0,0,0.35)',
    endBtnBg:       'rgba(0,0,0,0.04)',
    endBtnBorder:   'rgba(0,0,0,0.08)',
    endBtnColor:    'rgba(0,0,0,0.4)',
    taskTitle:      '#1a1a1a',
    barTrack:       'rgba(0,0,0,0.08)',
    barFill:        'rgba(0,0,0,0.45)',
    timerMeta:      'rgba(0,0,0,0.3)',
    timerTrack:     'rgba(0,0,0,0.08)',
    timerStroke:    'rgba(0,0,0,0.5)',
    timerValue:     '#1a1a1a',
    timerState:     'rgba(0,0,0,0.4)',
    stopBtnBg:      'rgba(0,0,0,0.05)',
    stopBtnBorder:  'rgba(0,0,0,0.1)',
    stopBtnColor:   'rgba(0,0,0,0.45)',
    pauseBtnBg:     '#1a1a1a',
    pauseBtnColor:  '#fff',
    nudgeBg:        '#FFFFFF',
    nudgeBorder:    'rgba(0,0,0,0.08)',
    nudgeTagColor:  'rgba(0,0,0,0.4)',
    nudgeTagBg:     'rgba(0,0,0,0.06)',
    nudgeText:      'rgba(0,0,0,0.45)',
    completeIconBg: 'rgba(0,0,0,0.06)',
    completeTitle:  '#1a1a1a',
    completeBody:   'rgba(0,0,0,0.45)',
    completeSub:    '#1a1a1a',
    doneBtnBg:      '#1a1a1a',
    doneBtnColor:   '#fff',
    notYetBg:       'rgba(0,0,0,0.06)',
    notYetColor:    'rgba(0,0,0,0.6)',
    notYetBorder:   'rgba(0,0,0,0.1)',
    reflInpBg:      '#F5F5F5',
    reflInpBorder:  'rgba(0,0,0,0.09)',
    reflInpColor:   'rgba(0,0,0,0.7)',
    navLinkBg:      '#FFFFFF',
    navLinkBorder:  'rgba(0,0,0,0.09)',
    navLinkColor:   'rgba(0,0,0,0.5)',
    quitBg:         '#FFFFFF',
    quitBorder:     'rgba(0,0,0,0.1)',
    quitTitle:      '#1a1a1a',
    quitBody:       'rgba(0,0,0,0.45)',
    keepBtnBg:      '#1a1a1a',
    keepBtnColor:   '#fff',
    endBg:          'rgba(0,0,0,0.05)',
    endBorder:      'rgba(0,0,0,0.1)',
    endColor:       'rgba(0,0,0,0.55)',
  },
}

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
  const theme = useTheme()
  const th = THEMES[theme]
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
    <div style={{ minHeight: '100vh', background: th.pageBg, position: 'relative' }}>
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20 }}>
        <SidebarReopenButton />
      </div>

      {/* SETUP SCREEN */}
      {screen === 'setup' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
          <div style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, borderRadius: '20px', padding: '36px', maxWidth: '480px', width: '100%' }}>
            <a href="/home" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: th.backColor, textDecoration: 'none', marginBottom: '24px' }}>← Back to dashboard</a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <div style={{ width: '26px', height: '26px', background: th.logoIconBg, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M3 8L6.5 11.5L13 4.5" stroke={th.logoIconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: th.logoText }}>TaskFlow</span>
            </div>

            <div style={{ fontSize: '10px', fontWeight: 600, color: th.sectionLabel, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Focus Mode</div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '6px', color: th.titleColor }}>What are you working on?</div>
            <div style={{ fontSize: '13px', color: th.bodyText, marginBottom: '28px', lineHeight: 1.6 }}>Choose a task and set your session duration. Then lock in.</div>

            <div style={{ fontSize: '10px', fontWeight: 600, color: th.sectionLabel, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Task</div>
            <select value={selTaskId ?? ''} onChange={e => { setSelTaskId(Number(e.target.value)); setSelTaskTitle(e.target.options[e.target.selectedIndex].text) }}
              style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBorder}`, borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: th.inputColor, fontFamily: 'inherit', outline: 'none', marginBottom: '22px', cursor: 'pointer', boxSizing: 'border-box' }}>
              {tasks.length === 0
                ? <option value="">No tasks — add one first</option>
                : tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)
              }
            </select>

            <div style={{ fontSize: '10px', fontWeight: 600, color: th.sectionLabel, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Session duration</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '22px' }}>
              {[25, 45, 60].map(d => (
                <div key={d} onClick={() => { setSelDur(d); setCustomDur(null) }}
                  style={{ background: activeDur === d && !customDur ? th.durSelBg : th.durDefBg, border: `1px solid ${activeDur === d && !customDur ? th.durSelBorder : th.durDefBorder}`, borderRadius: '10px', padding: '12px 6px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.8px', color: th.durValue, lineHeight: 1 }}>{d}</div>
                  <div style={{ fontSize: '10px', color: th.durLabel, marginTop: '3px' }}>min</div>
                </div>
              ))}
              <div onClick={() => { const v = prompt('Session duration (1–120 minutes):', '30'); if (v && !isNaN(Number(v))) setCustomDur(Math.min(120, Math.max(1, parseInt(v)))) }}
                style={{ background: customDur ? th.durSelBg : th.durDefBg, border: `1px solid ${customDur ? th.durSelBorder : th.durDefBorder}`, borderRadius: '10px', padding: '12px 6px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.8px', color: th.durValue, lineHeight: 1 }}>{customDur || '—'}</div>
                <div style={{ fontSize: '10px', color: th.durLabel, marginTop: '3px' }}>custom</div>
              </div>
            </div>

            <button onClick={startFocus} style={{ width: '100%', background: th.startBtnBg, color: th.startBtnColor, border: 'none', borderRadius: '11px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.2px', fontFamily: 'inherit' }}>
              Start Focus Session →
            </button>
          </div>
        </div>
      )}

      {/* FOCUS SCREEN */}
      {screen === 'focus' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', color: th.focusLabel }}>Focus · {activeDur} min</div>
            <button onClick={tryExit} style={{ fontSize: '11px', color: th.endBtnColor, background: th.endBtnBg, border: `1px solid ${th.endBtnBorder}`, borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>✕ End session</button>
          </div>

          <div style={{ textAlign: 'center', maxWidth: '560px', width: '100%' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: th.focusLabel, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Now focused on</div>
            <div style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: th.taskTitle, marginBottom: '36px' }}>{selTaskTitle}</div>

            {/* Progress bar */}
            <div style={{ maxWidth: '400px', margin: '0 auto 32px' }}>
              <div style={{ height: '3px', background: th.barTrack, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: th.barFill, borderRadius: '2px', width: `${(pct * 100).toFixed(1)}%`, transition: 'width 1s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: th.timerMeta }}>
                <span>{elMin}:{elSec.toString().padStart(2,'0')} elapsed</span>
                <span>{reMin}:{reSec.toString().padStart(2,'0')} left</span>
              </div>
            </div>

            {/* Timer ring */}
            <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 36px' }}>
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="100" cy="100" r="88" fill="none" stroke={th.timerTrack} strokeWidth="8"/>
                <circle cx="100" cy="100" r="88" fill="none" stroke={th.timerStroke}
                  strokeWidth="8" strokeDasharray="552.9" strokeDashoffset={dashOffset}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-2px', color: th.timerValue, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{mm}:{ss}</div>
                <div style={{ fontSize: '11px', color: th.timerState, marginTop: '5px' }}>{paused ? 'Paused' : 'Focus'}</div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '36px' }}>
              <button onClick={tryExit} style={{ width: '52px', height: '52px', borderRadius: '50%', background: th.stopBtnBg, border: `1px solid ${th.stopBtnBorder}`, color: th.stopBtnColor, fontSize: '14px', cursor: 'pointer' }}>■</button>
              <button onClick={togglePause} style={{ width: '52px', height: '52px', borderRadius: '50%', background: th.pauseBtnBg, color: th.pauseBtnColor, border: 'none', fontSize: '18px', cursor: 'pointer' }}>
                {paused ? '▶' : '⏸'}
              </button>
              <button onClick={() => { clearInterval(intervalRef.current!); setRunning(false); showComplete(totalSec, totalSec - timeLeft) }} style={{ width: '52px', height: '52px', borderRadius: '50%', background: th.stopBtnBg, border: `1px solid ${th.stopBtnBorder}`, color: th.stopBtnColor, fontSize: '14px', cursor: 'pointer' }}>↪</button>
            </div>

            {/* AI nudge */}
            <div style={{ background: th.nudgeBg, border: `1px solid ${th.nudgeBorder}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ fontSize: '10px', color: th.nudgeTagColor, background: th.nudgeTagBg, borderRadius: '6px', padding: '3px 7px', flexShrink: 0, marginTop: '1px' }}>✦</div>
              <div style={{ fontSize: '12px', color: th.nudgeText, lineHeight: 1.6, fontStyle: 'italic' }}>"{nudge}"</div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE SCREEN */}
      {screen === 'complete' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
          <div style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, borderRadius: '20px', padding: '36px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: th.completeIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 18px' }}>✦</div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '8px', color: th.completeTitle }}>Session complete.</div>
            <div style={{ fontSize: '13px', color: th.completeBody, marginBottom: '28px', lineHeight: 1.65 }}>
              You spent {Math.floor(spent/60) > 0 ? `${Math.floor(spent/60)}m ` : ''}{spent % 60}s on "{selTaskTitle}". Every session compounds.
            </div>

            <div style={{ fontSize: '14px', fontWeight: 600, color: th.completeSub, marginBottom: '14px' }}>Did you complete this task?</div>

            {taskDone === null ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <button onClick={() => markDone(true)} style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: th.doneBtnBg, color: th.doneBtnColor, border: 'none', fontFamily: 'inherit' }}>Yes, done ✓</button>
                <button onClick={() => markDone(false)} style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: th.notYetBg, color: th.notYetColor, border: `1px solid ${th.notYetBorder}`, fontFamily: 'inherit' }}>Not yet</button>
              </div>
            ) : (
              <div style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px', textAlign: 'center', background: taskDone ? 'rgba(80,210,130,0.08)' : th.notYetBg, border: `1px solid ${taskDone ? 'rgba(80,210,130,0.18)' : th.notYetBorder}`, color: taskDone ? 'rgba(100,220,140,0.8)' : th.completeBody }}>
                {taskDone ? '✓ Task marked complete' : 'Kept as in progress'}
              </div>
            )}

            <input value={reflection} onChange={e => setReflection(e.target.value)} placeholder="How did it go? What distracted you?"
              style={{ width: '100%', background: th.reflInpBg, border: `1px solid ${th.reflInpBorder}`, borderRadius: '9px', padding: '10px 14px', fontSize: '12px', color: th.reflInpColor, fontFamily: 'inherit', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={restartSetup} style={{ background: th.navLinkBg, border: `1px solid ${th.navLinkBorder}`, borderRadius: '10px', padding: '12px', fontSize: '12px', color: th.navLinkColor, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Start another session</button>
              <a href="/home" style={{ background: th.navLinkBg, border: `1px solid ${th.navLinkBorder}`, borderRadius: '10px', padding: '12px', fontSize: '12px', color: th.navLinkColor, textDecoration: 'none', display: 'block' }}>⌂ Back to dashboard</a>
              <a href="/ai" style={{ background: th.navLinkBg, border: `1px solid ${th.navLinkBorder}`, borderRadius: '10px', padding: '12px', fontSize: '12px', color: th.navLinkColor, textDecoration: 'none', display: 'block' }}>✦ Talk to AI coach</a>
            </div>
          </div>
        </div>
      )}

      {/* QUIT MODAL */}
      {showQuit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: th.quitBg, border: `1px solid ${th.quitBorder}`, borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px', color: th.quitTitle }}>Still have time left</div>
            <div style={{ fontSize: '13px', color: th.quitBody, marginBottom: '22px', lineHeight: 1.65 }}>
              You still have {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')} left. Leaving breaks your focus momentum.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowQuit(false); setRunning(true); setPaused(false) }} style={{ flex: 1, background: th.keepBtnBg, color: th.keepBtnColor, border: 'none', borderRadius: '9px', padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Keep going</button>
              <button onClick={endSession} style={{ flex: 1, background: th.endBg, border: `1px solid ${th.endBorder}`, borderRadius: '9px', padding: '11px', fontSize: '13px', color: th.endColor, cursor: 'pointer', fontFamily: 'inherit' }}>End session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
