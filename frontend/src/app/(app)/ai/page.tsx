'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Holidays from 'date-holidays'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'

const THEMES = {
  dark: {
    pageBg:           '#0A0A0A',
    chatBorder:       'rgba(255,255,255,0.05)',
    topbarBorder:     'rgba(255,255,255,0.05)',
    aiBubbleBg:       'rgba(255,255,255,0.07)',
    aiName:           'rgba(255,255,255,0.9)',
    aiSub:            'rgba(255,255,255,0.3)',
    newChatBg:        'rgba(255,255,255,0.04)',
    newChatBorder:    'rgba(255,255,255,0.08)',
    newChatColor:     'rgba(255,255,255,0.28)',
    quickBarBorder:   'rgba(255,255,255,0.04)',
    quickBtnBg:       'rgba(255,255,255,0.04)',
    quickBtnBorder:   'rgba(255,255,255,0.09)',
    quickBtnColor:    'rgba(255,255,255,0.52)',
    emptyIconBg:      'rgba(255,255,255,0.07)',
    emptyTitle:       'rgba(255,255,255,0.9)',
    emptyBody:        'rgba(255,255,255,0.36)',
    emptyBtnBg:       'rgba(255,255,255,0.05)',
    emptyBtnBorder:   'rgba(255,255,255,0.1)',
    emptyBtnColor:    'rgba(255,255,255,0.62)',
    avatarBg:         'rgba(255,255,255,0.07)',
    avatarColor:      'rgba(255,255,255,0.5)',
    userMsgBg:        'rgba(255,255,255,0.11)',
    userMsgColor:     'rgba(255,255,255,0.88)',
    aiMsgBg:          '#111',
    aiMsgColor:       'rgba(255,255,255,0.78)',
    aiMsgBorder:      'rgba(255,255,255,0.08)',
    timeLabelColor:   'rgba(255,255,255,0.2)',
    actionLabelColor: 'rgba(255,255,255,0.24)',
    actionTitle:      'rgba(255,255,255,0.86)',
    actionBody:       'rgba(255,255,255,0.58)',
    actionStatus:     'rgba(255,255,255,0.34)',
    actionConfirmBg:  '#fff',
    actionConfirmColor: '#0A0A0A',
    actionCancelBg:   'rgba(255,255,255,0.04)',
    actionCancelBorder: 'rgba(255,255,255,0.1)',
    actionCancelColor: 'rgba(255,255,255,0.72)',
    typingDotBg:      'rgba(255,255,255,0.5)',
    typingText:       'rgba(255,255,255,0.22)',
    inputAreaBorder:  'rgba(255,255,255,0.05)',
    inputBoxBg:       'rgba(255,255,255,0.04)',
    inputBoxBorder:   'rgba(255,255,255,0.1)',
    inputColor:       'rgba(255,255,255,0.85)',
    sendBtnBg:        '#fff',
    sendBtnColor:     '#0A0A0A',
    sendBtnDisabledBg: 'rgba(255,255,255,0.2)',
    rightPanelBg:     '#0D0D0D',
    rightPanelBorder: 'rgba(255,255,255,0.05)',
    rightPanelTitle:  'rgba(255,255,255,0.56)',
    rightPanelSub:    'rgba(255,255,255,0.24)',
    searchBg:         'rgba(255,255,255,0.04)',
    searchBorder:     'rgba(255,255,255,0.08)',
    searchIconColor:  'rgba(255,255,255,0.34)',
    searchInputColor: 'rgba(255,255,255,0.8)',
    newProjectBg:     'rgba(255,255,255,0.04)',
    newProjectBorder: 'rgba(255,255,255,0.08)',
    newProjectColor:  'rgba(255,255,255,0.68)',
    formBg:           '#111',
    formBorder:       'rgba(255,255,255,0.08)',
    formLabelColor:   'rgba(255,255,255,0.34)',
    formInputBg:      'rgba(255,255,255,0.04)',
    formInputBorder:  'rgba(255,255,255,0.09)',
    formInputColor:   'rgba(255,255,255,0.82)',
    formCreateBg:     '#fff',
    formCreateColor:  '#0A0A0A',
    formCancelBg:     'rgba(255,255,255,0.04)',
    formCancelBorder: 'rgba(255,255,255,0.08)',
    formCancelColor:  'rgba(255,255,255,0.68)',
    sectionLabel:     'rgba(255,255,255,0.22)',
    itemActiveBg:     'rgba(255,255,255,0.08)',
    itemActiveBorder: 'rgba(255,255,255,0.18)',
    itemBg:           'rgba(255,255,255,0.03)',
    itemBorder:       'rgba(255,255,255,0.05)',
    itemTitle:        'rgba(255,255,255,0.82)',
    itemCount:        'rgba(255,255,255,0.28)',
    itemBody:         'rgba(255,255,255,0.38)',
    itemMeta:         'rgba(255,255,255,0.24)',
    itemTagBg:        'rgba(255,255,255,0.06)',
    itemTagBorder:    'rgba(255,255,255,0.08)',
    emptyItemBg:      'rgba(255,255,255,0.03)',
    emptyItemBorder:  'rgba(255,255,255,0.06)',
    emptyItemColor:   'rgba(255,255,255,0.32)',
    onlineDotBorder:  '#0A0A0A',
  },
  light: {
    pageBg:           '#F5F5F5',
    chatBorder:       'rgba(0,0,0,0.07)',
    topbarBorder:     'rgba(0,0,0,0.07)',
    aiBubbleBg:       'rgba(0,0,0,0.07)',
    aiName:           '#1a1a1a',
    aiSub:            'rgba(0,0,0,0.4)',
    newChatBg:        'rgba(0,0,0,0.04)',
    newChatBorder:    'rgba(0,0,0,0.09)',
    newChatColor:     'rgba(0,0,0,0.4)',
    quickBarBorder:   'rgba(0,0,0,0.06)',
    quickBtnBg:       '#FFFFFF',
    quickBtnBorder:   'rgba(0,0,0,0.1)',
    quickBtnColor:    'rgba(0,0,0,0.55)',
    emptyIconBg:      'rgba(0,0,0,0.06)',
    emptyTitle:       '#1a1a1a',
    emptyBody:        'rgba(0,0,0,0.45)',
    emptyBtnBg:       '#FFFFFF',
    emptyBtnBorder:   'rgba(0,0,0,0.1)',
    emptyBtnColor:    'rgba(0,0,0,0.6)',
    avatarBg:         'rgba(0,0,0,0.07)',
    avatarColor:      'rgba(0,0,0,0.45)',
    userMsgBg:        'rgba(0,0,0,0.08)',
    userMsgColor:     '#1a1a1a',
    aiMsgBg:          '#FFFFFF',
    aiMsgColor:       'rgba(0,0,0,0.75)',
    aiMsgBorder:      'rgba(0,0,0,0.08)',
    timeLabelColor:   'rgba(0,0,0,0.3)',
    actionLabelColor: 'rgba(0,0,0,0.35)',
    actionTitle:      '#1a1a1a',
    actionBody:       'rgba(0,0,0,0.55)',
    actionStatus:     'rgba(0,0,0,0.4)',
    actionConfirmBg:  '#1a1a1a',
    actionConfirmColor: '#fff',
    actionCancelBg:   'rgba(0,0,0,0.04)',
    actionCancelBorder: 'rgba(0,0,0,0.1)',
    actionCancelColor: 'rgba(0,0,0,0.6)',
    typingDotBg:      'rgba(0,0,0,0.4)',
    typingText:       'rgba(0,0,0,0.35)',
    inputAreaBorder:  'rgba(0,0,0,0.07)',
    inputBoxBg:       '#FFFFFF',
    inputBoxBorder:   'rgba(0,0,0,0.1)',
    inputColor:       '#1a1a1a',
    sendBtnBg:        '#1a1a1a',
    sendBtnColor:     '#fff',
    sendBtnDisabledBg: 'rgba(0,0,0,0.15)',
    rightPanelBg:     '#EBEBEB',
    rightPanelBorder: 'rgba(0,0,0,0.07)',
    rightPanelTitle:  'rgba(0,0,0,0.5)',
    rightPanelSub:    'rgba(0,0,0,0.35)',
    searchBg:         '#FFFFFF',
    searchBorder:     'rgba(0,0,0,0.09)',
    searchIconColor:  'rgba(0,0,0,0.35)',
    searchInputColor: 'rgba(0,0,0,0.75)',
    newProjectBg:     '#FFFFFF',
    newProjectBorder: 'rgba(0,0,0,0.09)',
    newProjectColor:  'rgba(0,0,0,0.6)',
    formBg:           '#FFFFFF',
    formBorder:       'rgba(0,0,0,0.09)',
    formLabelColor:   'rgba(0,0,0,0.4)',
    formInputBg:      '#F5F5F5',
    formInputBorder:  'rgba(0,0,0,0.1)',
    formInputColor:   '#1a1a1a',
    formCreateBg:     '#1a1a1a',
    formCreateColor:  '#fff',
    formCancelBg:     '#F5F5F5',
    formCancelBorder: 'rgba(0,0,0,0.09)',
    formCancelColor:  'rgba(0,0,0,0.6)',
    sectionLabel:     'rgba(0,0,0,0.35)',
    itemActiveBg:     'rgba(0,0,0,0.08)',
    itemActiveBorder: 'rgba(0,0,0,0.18)',
    itemBg:           '#FFFFFF',
    itemBorder:       'rgba(0,0,0,0.08)',
    itemTitle:        '#1a1a1a',
    itemCount:        'rgba(0,0,0,0.35)',
    itemBody:         'rgba(0,0,0,0.45)',
    itemMeta:         'rgba(0,0,0,0.3)',
    itemTagBg:        'rgba(0,0,0,0.05)',
    itemTagBorder:    'rgba(0,0,0,0.09)',
    emptyItemBg:      '#FFFFFF',
    emptyItemBorder:  'rgba(0,0,0,0.08)',
    emptyItemColor:   'rgba(0,0,0,0.4)',
    onlineDotBorder:  '#F5F5F5',
  },
}

interface Message { role: 'user' | 'assistant'; content: string; timeLabel?: string }
interface ActionCard { id: number; title: string; confirmation_text: string; type?: string }
interface Thread { id: number; title: string; preview: string; activity_label: string; message_count: number; project_id?: number | null; project_name?: string; is_pinned?: boolean }
interface Project { id: number; name: string; description?: string; chat_count?: number }

const QUICK_ACTIONS = [
  { icon: '☀️', label: 'Plan My Day', text: 'Plan my day — tell me exactly what I should focus on right now based on my tasks and habits.' },
  { icon: '📊', label: 'Review My Day', text: 'Review my day with me. What went well and what should I improve tomorrow?' },
  { icon: '🔁', label: 'Fix My Habits', text: 'Analyze my habits. Tell me exactly which ones I need to fix and why based on my streaks.' },
  { icon: '⚡', label: 'Unmotivated', text: 'I feel completely unmotivated right now. I need real coaching, not generic advice.' },
  { icon: '🧠', label: 'Analyze Progress', text: 'Analyze my progress this week. Be honest — what patterns are holding me back?' },
  { icon: '🌅', label: 'Build My Routine', text: 'Build me an optimized morning routine based on my habits and goals.' },
  { icon: '🔥', label: 'Break The Cycle', text: 'I keep breaking my streaks. Why does this keep happening and how do I stop the cycle?' },
]

const SYSTEM_PROMPT = `You are Taskflow AI, a personal life coach. Be direct, warm, and specific. Keep responses under 3 sentences unless a plan is needed. The user is on the ai page right now.`

function now12() {
  const d = new Date()
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}

export default function AIPage() {
  const theme = useTheme()
  const th = THEMES[theme]
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [threads, setThreads]         = useState<Thread[]>([])
  const [projects, setProjects]       = useState<Project[]>([])
  const [threadId, setThreadId]       = useState<number | null>(null)
  const [projectId, setProjectId]     = useState<number | null>(null)
  const [actions, setActions]         = useState<ActionCard[]>([])
  const [resolvedActions, setResolvedActions] = useState<Set<number>>(new Set())
  const [actionStatus, setActionStatus]       = useState<Record<number, string>>({})
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [newProjectName, setNewProjectName]   = useState('')
  const [newProjectDesc, setNewProjectDesc]   = useState('')
  const [searchQuery, setSearchQuery]         = useState('')
  const [userInitials, setUserInitials]       = useState('TF')
  const [calendarContext, setCalendarContext] = useState<{title: string; date: string; category: string}[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const historyRef     = useRef<Message[]>([])
  historyRef.current = messages

  useEffect(() => {
    fetch(apiUrl('/api/me'), { credentials: 'include' }).then(r => r.json()).then(d => {
      if (d.name) {
        const parts = d.name.split(' ')
        setUserInitials(parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : d.name.slice(0,2).toUpperCase())
      }
    }).catch(() => {})
    fetchSidebar()

    // Build calendar context: user events + holidays, today onwards, capped at 60
    ;(async () => {
      try {
        const today = new Date()
        const thisYear = today.getFullYear()

        let userEvents: {title: string; date: string; category: string}[] = []
        try {
          const res = await fetch(apiUrl('/api/calendar/data'), { credentials: 'include' })
          if (res.ok) {
            const json = await res.json()
            userEvents = (json.events || [])
              .map((e: {title: string; date: string; category: string}) => ({ title: e.title, date: e.date, category: e.category }))
          }
        } catch {}

        const hd = new Holidays('US')
        const holidayEvents = [...hd.getHolidays(thisYear), ...hd.getHolidays(thisYear + 1)]
          .map(h => ({ title: h.name, date: h.date.slice(0, 10), category: 'holiday' }))

        const combined = [...userEvents, ...holidayEvents]
          .sort((a, b) => a.date.localeCompare(b.date))

        setCalendarContext(combined)
      } catch {}
    })()
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function fetchSidebar() {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(apiUrl('/ai/threads'), { credentials: 'include' }),
        fetch(apiUrl('/ai/projects'), { credentials: 'include' }),
      ])
      if (tRes.ok) {
        const td = await tRes.json()
        if (td.threads) setThreads(td.threads)
      }
      if (pRes.ok) {
        const pd = await pRes.json()
        if (pd.projects) setProjects(pd.projects)
      }
    } catch {}
  }

  async function loadThread(id: number) {
    setThreadId(id)
    setMessages([])
    setActions([])
    setResolvedActions(new Set())
    setActionStatus({})
    try {
      const res = await fetch(apiUrl(`/ai/threads/${id}/messages`), { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages.map((m: { role: string; content: string; time_label: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timeLabel: m.time_label,
        })))
      }
      if (data.thread) {
        setThreads(prev => {
          const filtered = prev.filter(t => t.id !== data.thread.id)
          return [data.thread, ...filtered]
        })
      }
    } catch {}
  }

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }

    const userMsg: Message = { role: 'user', content: msg, timeLabel: now12() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const history = [...historyRef.current, userMsg].map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(apiUrl('/ai/chat'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, system: SYSTEM_PROMPT, active_page: 'ai', persist_chat: true, thread_id: threadId, project_id: projectId, calendar_context: calendarContext })
      })
      const data = await res.json()
      const reply = data.reply || "I'm here — what do you need?"
      const aiMsg: Message = { role: 'assistant', content: reply, timeLabel: now12() }
      setMessages(prev => [...prev, aiMsg])
      if (data.thread) {
        setThreadId(data.thread.id)
        setThreads(prev => {
          const filtered = prev.filter(t => t.id !== data.thread.id)
          return [data.thread, ...filtered]
        })
      }
      if (data.pending_actions) setActions(prev => [...prev, ...data.pending_actions])
      else if (data.pending_action) setActions(prev => [...prev, data.pending_action])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm here for you. What's on your mind?", timeLabel: now12() }])
    }
    setLoading(false)
  }

  async function resolveAction(actionId: number, decision: 'confirm' | 'cancel') {
    setActionStatus(prev => ({ ...prev, [actionId]: decision === 'confirm' ? 'Applying...' : 'Clearing...' }))
    try {
      const res = await fetch(apiUrl(`/ai/actions/${actionId}/${decision}`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId })
      })
      const data = await res.json()
      const isCalendarAction = data.action_type === 'add_calendar_event' || data.action_type === 'create_calendar_event'
      const confirmLabel = isCalendarAction ? '✓ Added to calendar' : 'Done.'
      if (data.ok) {
        setActionStatus(prev => ({ ...prev, [actionId]: decision === 'confirm' ? confirmLabel : 'Skipped.' }))
        setResolvedActions(prev => new Set([...prev, actionId]))
        if (Array.isArray(data.resolved_action_ids)) {
          setResolvedActions(prev => {
            const next = new Set(prev)
            ;(data.resolved_action_ids as number[]).forEach(id => next.add(id))
            return next
          })
        }
      } else {
        setActionStatus(prev => ({ ...prev, [actionId]: 'Could not apply.' }))
      }
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timeLabel: now12() }])
      if (data.thread) { setThreadId(data.thread.id); setThreads(prev => { const f = prev.filter(t => t.id !== data.thread.id); return [data.thread, ...f] }) }
    } catch {
      setActionStatus(prev => ({ ...prev, [actionId]: 'Could not apply.' }))
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return
    try {
      const res = await fetch(apiUrl('/ai/projects/create'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      })
      const data = await res.json()
      if (data.ok && data.project) {
        setProjects(prev => [data.project, ...prev])
        setNewProjectName(''); setNewProjectDesc('')
        setShowProjectForm(false)
      }
    } catch {}
  }

  function startNewChat() {
    setMessages([])
    setThreadId(null)
    setActions([])
    setResolvedActions(new Set())
    setActionStatus({})
    textareaRef.current?.focus()
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const filtered = {
    threads: threads.filter(t => !searchQuery || (t.title + t.preview + (t.project_name || '')).toLowerCase().includes(searchQuery.toLowerCase())),
    projects: projects.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', height: '100vh', overflow: 'hidden', background: th.pageBg }}>

      {/* CHAT AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', borderRight: `1px solid ${th.chatBorder}`, overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: `1px solid ${th.topbarBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SidebarReopenButton />
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: th.aiBubbleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', position: 'relative', flexShrink: 0 }}>
              ✦
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(80,220,130,0.9)', border: `2px solid ${th.onlineDotBorder}` }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: th.aiName }}>Taskflow AI</div>
              <div style={{ fontSize: '11px', color: th.aiSub, marginTop: '1px' }}>Your personal growth coach · Always online</div>
            </div>
          </div>
          <button onClick={startNewChat} style={{ fontSize: '11px', color: th.newChatColor, background: th.newChatBg, border: `1px solid ${th.newChatBorder}`, borderRadius: '7px', padding: '5px 11px', cursor: 'pointer' }}>New chat</button>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '7px', padding: '12px 24px', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${th.quickBarBorder}`, scrollbarWidth: 'none' }}>
          {QUICK_ACTIONS.map(q => (
            <button key={q.label} onClick={() => send(q.text)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: th.quickBtnBg, border: `1px solid ${th.quickBtnBorder}`, borderRadius: '100px', padding: '6px 14px', fontSize: '11px', color: th.quickBtnColor, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span>{q.icon}</span>{q.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isEmpty ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 24px', textAlign: 'center', margin: 'auto' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: th.emptyIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>✦</div>
              <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', color: th.emptyTitle, marginBottom: '10px', lineHeight: 1.2 }}>Let's get your life<br/>organized.</div>
              <div style={{ fontSize: '13px', color: th.emptyBody, lineHeight: 1.75, maxWidth: '340px', marginBottom: '28px' }}>I know your tasks, habits, streaks, and journal. I'm not a generic AI — I'm your personal growth coach. Tell me what you need.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
                {[
                  { icon: '☀️', text: 'Plan my day — tell me exactly what I should focus on right now.', label: 'Plan My Day' },
                  { icon: '🎯', text: 'Help me set my first goals in Taskflow. Where should I start?', label: 'Set My First Goals' },
                  { icon: '🔁', text: 'Help me build better habits. What should I track and how do I stay consistent?', label: 'Build Better Habits' },
                ].map(b => (
                  <button key={b.label} onClick={() => send(b.text)} style={{ background: th.emptyBtnBg, border: `1px solid ${th.emptyBtnBorder}`, borderRadius: '12px', padding: '13px 18px', fontSize: '13px', color: th.emptyBtnColor, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', width: '26px', textAlign: 'center', flexShrink: 0 }}>{b.icon}</span>{b.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: th.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: th.avatarColor, flexShrink: 0 }}>
                    {msg.role === 'user' ? userInitials : '✦'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '78%', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '11px 15px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      fontSize: '13px', lineHeight: 1.68, wordBreak: 'break-word',
                      background: msg.role === 'user' ? th.userMsgBg : th.aiMsgBg,
                      color: msg.role === 'user' ? th.userMsgColor : th.aiMsgColor,
                      border: msg.role === 'assistant' ? `1px solid ${th.aiMsgBorder}` : 'none',
                    }}>
                      {msg.content.split('\n').map((line, li) => <span key={li}>{line}{li < msg.content.split('\n').length - 1 && <br/>}</span>)}
                    </div>
                    <div style={{ fontSize: '9px', color: th.timeLabelColor, marginTop: '4px', padding: '0 4px' }}>{msg.timeLabel}</div>
                  </div>
                </div>
              ))}

              {/* Action cards */}
              {actions.map(action => {
                const isCalendarAction = action.type === 'add_calendar_event' || action.type === 'create_calendar_event'
                const isResolved = resolvedActions.has(action.id)
                const status = actionStatus[action.id]
                return (
                  <div key={action.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: th.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: th.avatarColor, flexShrink: 0 }}>✦</div>
                    <div style={{ background: th.aiMsgBg, border: `1px solid ${th.aiMsgBorder}`, borderRadius: '16px', padding: '12px 14px', maxWidth: '78%' }}>
                      {isCalendarAction ? (
                        <>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: th.actionLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>📅 {action.type === 'add_calendar_event' ? 'Calendar event detected' : 'Add to calendar'}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: th.actionTitle, marginBottom: '6px' }}>{action.type === 'add_calendar_event' ? 'I noticed you mentioned an event. Want me to add it?' : action.title}</div>
                          <div style={{ fontSize: '12px', lineHeight: 1.65, color: th.actionBody }}>{action.confirmation_text}</div>
                          {status ? (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: th.actionStatus }}>{status}</div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              <button onClick={() => resolveAction(action.id, 'confirm')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionConfirmBg}`, background: th.actionConfirmBg, color: th.actionConfirmColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Add to Calendar</button>
                              <button onClick={() => resolveAction(action.id, 'cancel')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionCancelBorder}`, background: th.actionCancelBg, color: th.actionCancelColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: th.actionLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Needs confirmation</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: th.actionTitle, marginBottom: '6px' }}>{action.title}</div>
                          <div style={{ fontSize: '12px', lineHeight: 1.65, color: th.actionBody }}>{action.confirmation_text}</div>
                          {status ? (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: th.actionStatus }}>{status}</div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              <button onClick={() => resolveAction(action.id, 'confirm')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionConfirmBg}`, background: th.actionConfirmBg, color: th.actionConfirmColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                              <button onClick={() => resolveAction(action.id, 'cancel')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionCancelBorder}`, background: th.actionCancelBg, color: th.actionCancelColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Not now</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: th.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: th.avatarColor, flexShrink: 0 }}>✦</div>
                  <div style={{ background: th.aiMsgBg, border: `1px solid ${th.aiMsgBorder}`, borderRadius: '4px 16px 16px 16px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {[0, 180, 360].map(delay => (
                      <div key={delay} style={{ width: '5px', height: '5px', borderRadius: '50%', background: th.typingDotBg, animation: `tdot 1.2s ${delay}ms infinite` }} />
                    ))}
                    <span style={{ fontSize: '10px', color: th.typingText, marginLeft: '4px' }}>Analyzing your patterns…</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${th.inputAreaBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', background: th.inputBoxBg, border: `1px solid ${th.inputBoxBorder}`, borderRadius: '14px', padding: '10px 12px' }}>
            <textarea ref={textareaRef} value={input} onChange={autoResize}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask your AI coach anything…"
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: th.inputColor, fontFamily: 'inherit', resize: 'none', maxHeight: '120px', lineHeight: 1.55, padding: '2px 0' }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: '32px', height: '32px', borderRadius: '9px', background: loading || !input.trim() ? th.sendBtnDisabledBg : th.sendBtnBg, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke={th.sendBtnColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Saved chats */}
      <div style={{ background: th.rightPanelBg, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${th.rightPanelBorder}`, flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: th.rightPanelTitle, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>Saved chats</div>
          <div style={{ fontSize: '10px', color: th.rightPanelSub }}>Persistent AI conversations and projects</div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: th.searchBg, border: `1px solid ${th.searchBorder}`, borderRadius: '12px', padding: '10px 12px' }}>
            <span style={{ fontSize: '12px', color: th.searchIconColor }}>⌕</span>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search saved chats and projects"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: th.searchInputColor, fontSize: '12px', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 12px 0' }}>
          <button onClick={() => setShowProjectForm(f => !f)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${th.newProjectBorder}`, background: th.newProjectBg, color: th.newProjectColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            ▣ New Project
          </button>
        </div>

        {/* Project form */}
        {showProjectForm && (
          <div style={{ margin: '12px 12px 0', padding: '12px', background: th.formBg, border: `1px solid ${th.formBorder}`, borderRadius: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: th.formLabelColor, marginBottom: '10px' }}>Create new project</div>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="TaskFlow launch, Fitness reset..."
              style={{ width: '100%', borderRadius: '10px', border: `1px solid ${th.formInputBorder}`, background: th.formInputBg, color: th.formInputColor, fontFamily: 'inherit', fontSize: '12px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
            <textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Optional description" rows={2}
              style={{ width: '100%', marginTop: '8px', borderRadius: '10px', border: `1px solid ${th.formInputBorder}`, background: th.formInputBg, color: th.formInputColor, fontFamily: 'inherit', fontSize: '12px', padding: '10px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={createProject} style={{ flex: 1, background: th.formCreateBg, color: th.formCreateColor, border: `1px solid ${th.formCreateBg}`, borderRadius: '10px', padding: '9px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Create project</button>
              <button onClick={() => setShowProjectForm(false)} style={{ flex: 1, background: th.formCancelBg, color: th.formCancelColor, border: `1px solid ${th.formCancelBorder}`, borderRadius: '10px', padding: '9px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <>
            <div style={{ padding: '16px 18px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.sectionLabel }}>Projects</div>
            <div style={{ padding: '0 10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.projects.map(p => (
                <div key={p.id} onClick={() => setProjectId(p.id)} style={{ background: projectId === p.id ? th.itemActiveBg : th.itemBg, border: `1px solid ${projectId === p.id ? th.itemActiveBorder : th.itemBorder}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: th.itemTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: th.itemCount, flexShrink: 0 }}>{p.chat_count || 0}</div>
                  </div>
                  {p.description && <div style={{ fontSize: '11px', color: th.itemBody, lineHeight: 1.55, marginTop: '5px' }}>{p.description}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Threads */}
        <div style={{ padding: '16px 18px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.sectionLabel }}>Recent chats</div>
        <div style={{ padding: '0 10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.threads.length === 0 ? (
            <div style={{ margin: '0 2px', padding: '12px 13px', borderRadius: '12px', border: `1px solid ${th.emptyItemBorder}`, background: th.emptyItemBg, fontSize: '11px', color: th.emptyItemColor, lineHeight: 1.6 }}>
              Start a chat and it will show up here automatically.
            </div>
          ) : (
            filtered.threads.map(t => (
              <div key={t.id} onClick={() => loadThread(t.id)}
                style={{ background: threadId === t.id ? th.itemActiveBg : th.itemBg, border: `1px solid ${threadId === t.id ? th.itemActiveBorder : th.itemBorder}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: th.itemTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: '10px', color: th.itemCount, flexShrink: 0 }}>{t.activity_label}</div>
                </div>
                <div style={{ fontSize: '11px', color: th.itemBody, lineHeight: 1.55, marginTop: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.preview || 'No messages yet.'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px', fontSize: '10px', color: th.itemMeta }}>
                  {t.project_name && <span style={{ display: 'inline-flex', padding: '3px 7px', borderRadius: '999px', background: th.itemTagBg, border: `1px solid ${th.itemTagBorder}` }}>{t.project_name}</span>}
                  <span>{t.message_count} {t.message_count === 1 ? 'message' : 'messages'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes tdot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
