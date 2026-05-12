'use client'
import { useEffect, useState, useRef } from 'react'
import Holidays from 'date-holidays'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'

const THEMES = {
  dark: {
    pageBg:           '#0A0A0A',
    chatBorder:       'rgba(255,255,255,0.05)',
    topbarBorder:     'rgba(255,255,255,0.05)',
    aiBubbleBg:       'rgba(255,255,255,0.06)',
    aiBubbleBorder:   'rgba(255,255,255,0.08)',
    aiName:           'rgba(255,255,255,0.9)',
    aiSub:            'rgba(255,255,255,0.3)',
    newChatBg:        'rgba(255,255,255,0.04)',
    newChatBorder:    'rgba(255,255,255,0.08)',
    newChatColor:     'rgba(255,255,255,0.55)',
    headBtnBg:        'rgba(255,255,255,0.04)',
    headBtnBorder:    'rgba(255,255,255,0.08)',
    headBtnColor:     'rgba(255,255,255,0.55)',
    timeLabelColor:   'rgba(255,255,255,0.28)',
    timeLineColor:    'rgba(255,255,255,0.08)',
    emptyTitle:       'rgba(255,255,255,0.92)',
    emptyTitleItalic: 'rgba(255,255,255,0.6)',
    emptyBody:        'rgba(255,255,255,0.36)',
    promptBorder:     'rgba(255,255,255,0.07)',
    promptHoverBg:    'rgba(255,255,255,0.025)',
    promptIdx:        'rgba(255,255,255,0.22)',
    promptTitle:      'rgba(255,255,255,0.88)',
    promptDesc:       'rgba(255,255,255,0.38)',
    promptArrow:      'rgba(255,255,255,0.25)',
    promptArrowHover: 'rgba(255,255,255,0.75)',
    avatarBg:         'rgba(255,255,255,0.07)',
    avatarColor:      'rgba(255,255,255,0.5)',
    userMsgBg:        'rgba(255,255,255,0.11)',
    userMsgColor:     'rgba(255,255,255,0.88)',
    aiMsgBg:          '#111',
    aiMsgColor:       'rgba(255,255,255,0.78)',
    aiMsgBorder:      'rgba(255,255,255,0.08)',
    msgTimeLabelColor:'rgba(255,255,255,0.2)',
    actionLabelColor: 'rgba(255,255,255,0.24)',
    actionTitle:      'rgba(255,255,255,0.86)',
    actionBody:       'rgba(255,255,255,0.58)',
    actionStatus:     'rgba(255,255,255,0.34)',
    actionConfirmBg:  '#fff',
    actionConfirmColor:'#0A0A0A',
    actionCancelBg:   'rgba(255,255,255,0.04)',
    actionCancelBorder:'rgba(255,255,255,0.1)',
    actionCancelColor:'rgba(255,255,255,0.72)',
    typingDotBg:      'rgba(255,255,255,0.5)',
    typingText:       'rgba(255,255,255,0.22)',
    composerBg:       'rgba(255,255,255,0.04)',
    composerBorder:   'rgba(255,255,255,0.09)',
    composerFocusBg:  '#111',
    composerFocusBorder:'rgba(255,255,255,0.14)',
    inputColor:       'rgba(255,255,255,0.85)',
    inputPlaceholder: 'rgba(255,255,255,0.3)',
    toolBtnColor:     'rgba(255,255,255,0.35)',
    toolBtnHoverBg:   'rgba(255,255,255,0.06)',
    toolBtnHoverColor:'rgba(255,255,255,0.75)',
    hintColor:        'rgba(255,255,255,0.2)',
    hintKbdBorder:    'rgba(255,255,255,0.12)',
    hintKbdColor:     'rgba(255,255,255,0.35)',
    sendBtnBg:        '#fff',
    sendBtnColor:     '#0A0A0A',
    sendBtnDisabledBg:'rgba(255,255,255,0.12)',
    sendBtnDisabledColor:'rgba(255,255,255,0.25)',
    rightPanelBg:     '#0D0D0D',
    rightPanelBorder: 'rgba(255,255,255,0.05)',
    rightPanelTitle:  'rgba(255,255,255,0.35)',
    searchBg:         'rgba(255,255,255,0.04)',
    searchBorder:     'rgba(255,255,255,0.08)',
    searchIconColor:  'rgba(255,255,255,0.34)',
    searchInputColor: 'rgba(255,255,255,0.8)',
    newProjectBg:     'rgba(255,255,255,0.04)',
    newProjectBorder: 'rgba(255,255,255,0.08)',
    newProjectColor:  'rgba(255,255,255,0.55)',
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
    archiveBtnBorder: 'rgba(255,255,255,0.1)',
    archiveBtnColor:  'rgba(255,255,255,0.45)',
    archiveBtnHoverBg:'rgba(255,255,255,0.04)',
    archiveBtnHoverColor:'rgba(255,255,255,0.8)',
  },
  light: {
    pageBg:           '#F5F5F5',
    chatBorder:       'rgba(0,0,0,0.07)',
    topbarBorder:     'rgba(0,0,0,0.07)',
    aiBubbleBg:       'rgba(0,0,0,0.06)',
    aiBubbleBorder:   'rgba(0,0,0,0.09)',
    aiName:           '#1a1a1a',
    aiSub:            'rgba(0,0,0,0.4)',
    newChatBg:        'rgba(0,0,0,0.04)',
    newChatBorder:    'rgba(0,0,0,0.09)',
    newChatColor:     'rgba(0,0,0,0.55)',
    headBtnBg:        'rgba(0,0,0,0.04)',
    headBtnBorder:    'rgba(0,0,0,0.09)',
    headBtnColor:     'rgba(0,0,0,0.55)',
    timeLabelColor:   'rgba(0,0,0,0.35)',
    timeLineColor:    'rgba(0,0,0,0.1)',
    emptyTitle:       '#1a1a1a',
    emptyTitleItalic: 'rgba(0,0,0,0.5)',
    emptyBody:        'rgba(0,0,0,0.45)',
    promptBorder:     'rgba(0,0,0,0.08)',
    promptHoverBg:    'rgba(0,0,0,0.025)',
    promptIdx:        'rgba(0,0,0,0.28)',
    promptTitle:      '#1a1a1a',
    promptDesc:       'rgba(0,0,0,0.45)',
    promptArrow:      'rgba(0,0,0,0.28)',
    promptArrowHover: 'rgba(0,0,0,0.75)',
    avatarBg:         'rgba(0,0,0,0.07)',
    avatarColor:      'rgba(0,0,0,0.45)',
    userMsgBg:        'rgba(0,0,0,0.08)',
    userMsgColor:     '#1a1a1a',
    aiMsgBg:          '#FFFFFF',
    aiMsgColor:       'rgba(0,0,0,0.75)',
    aiMsgBorder:      'rgba(0,0,0,0.08)',
    msgTimeLabelColor:'rgba(0,0,0,0.3)',
    actionLabelColor: 'rgba(0,0,0,0.35)',
    actionTitle:      '#1a1a1a',
    actionBody:       'rgba(0,0,0,0.55)',
    actionStatus:     'rgba(0,0,0,0.4)',
    actionConfirmBg:  '#1a1a1a',
    actionConfirmColor:'#fff',
    actionCancelBg:   'rgba(0,0,0,0.04)',
    actionCancelBorder:'rgba(0,0,0,0.1)',
    actionCancelColor:'rgba(0,0,0,0.6)',
    typingDotBg:      'rgba(0,0,0,0.4)',
    typingText:       'rgba(0,0,0,0.35)',
    composerBg:       '#FFFFFF',
    composerBorder:   'rgba(0,0,0,0.1)',
    composerFocusBg:  '#FFFFFF',
    composerFocusBorder:'rgba(0,0,0,0.18)',
    inputColor:       '#1a1a1a',
    inputPlaceholder: 'rgba(0,0,0,0.38)',
    toolBtnColor:     'rgba(0,0,0,0.38)',
    toolBtnHoverBg:   'rgba(0,0,0,0.05)',
    toolBtnHoverColor:'rgba(0,0,0,0.75)',
    hintColor:        'rgba(0,0,0,0.28)',
    hintKbdBorder:    'rgba(0,0,0,0.12)',
    hintKbdColor:     'rgba(0,0,0,0.45)',
    sendBtnBg:        '#1a1a1a',
    sendBtnColor:     '#fff',
    sendBtnDisabledBg:'rgba(0,0,0,0.15)',
    sendBtnDisabledColor:'rgba(0,0,0,0.35)',
    rightPanelBg:     '#EBEBEB',
    rightPanelBorder: 'rgba(0,0,0,0.07)',
    rightPanelTitle:  'rgba(0,0,0,0.4)',
    searchBg:         '#FFFFFF',
    searchBorder:     'rgba(0,0,0,0.09)',
    searchIconColor:  'rgba(0,0,0,0.35)',
    searchInputColor: 'rgba(0,0,0,0.75)',
    newProjectBg:     '#FFFFFF',
    newProjectBorder: 'rgba(0,0,0,0.09)',
    newProjectColor:  'rgba(0,0,0,0.55)',
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
    archiveBtnBorder: 'rgba(0,0,0,0.12)',
    archiveBtnColor:  'rgba(0,0,0,0.45)',
    archiveBtnHoverBg:'rgba(0,0,0,0.04)',
    archiveBtnHoverColor:'rgba(0,0,0,0.75)',
  },
}

interface Message { role: 'user' | 'assistant'; content: string; timeLabel?: string }
interface ActionCard { id: number; title: string; confirmation_text: string; type?: string }
interface Thread {
  id: number
  title: string
  preview: string
  activity_label: string
  message_count: number
  project_id?: number | null
  project_name?: string
  is_pinned?: boolean
  title_generated?: boolean
  title_manually_edited?: boolean
}
interface Project { id: number; name: string; description?: string; chat_count?: number }

const PROMPTS = [
  { idx: '01', title: 'Plan my day from what\'s on deck',   desc: 'Pull today\'s tasks, calendar, and energy into a workable shape.' },
  { idx: '02', title: 'Reflect on yesterday',               desc: 'A short, honest review — what moved, what stalled, why.' },
  { idx: '03', title: 'Untangle what I\'m avoiding',        desc: 'Walk through the resistance, find the first useful step.' },
  { idx: '04', title: 'Set a goal worth tracking',          desc: 'Define one outcome, the leading habits, and a check-in cadence.' },
]

const SYSTEM_PROMPT = `You are Taskflow AI, a personal life coach. Be direct, warm, and specific. Keep responses under 3 sentences unless a plan is needed. The user is on the ai page right now.`
const GENERIC_THREAD_TITLES = new Set(['new chat', 'new conversation', 'conversation', 'chat', 'untitled', 'untitled chat'])
const THREAD_TITLE_CACHE_KEY = 'taskflowAiThreadTitles'

function now12() {
  const d = new Date()
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}

function isGenericThreadTitle(title?: string) {
  return GENERIC_THREAD_TITLES.has(String(title || '').trim().replace(/[.!?]+$/g, '').toLowerCase())
}

function readThreadTitleCache(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.sessionStorage.getItem(THREAD_TITLE_CACHE_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function writeThreadTitleCache(thread: Thread) {
  if (typeof window === 'undefined' || !thread.id || !thread.title || isGenericThreadTitle(thread.title)) return
  try {
    const cache = readThreadTitleCache()
    cache[String(thread.id)] = thread.title
    const entries = Object.entries(cache).slice(-30)
    window.sessionStorage.setItem(THREAD_TITLE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {}
}

function applyCachedThreadTitles(list: Thread[]) {
  const cache = readThreadTitleCache()
  return list.map(thread => {
    const cachedTitle = cache[String(thread.id)]
    if (!cachedTitle || !isGenericThreadTitle(thread.title)) return thread
    return { ...thread, title: cachedTitle }
  })
}

// SVG icons
const IconAttach = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.5 7l-4 4a2.5 2.5 0 0 1-3.5-3.5l5-5a1.6 1.6 0 0 1 2.3 2.3L6.4 9.7a.8.8 0 0 1-1.1-1.1l4.4-4.4"/>
  </svg>
)

const IconSend = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12.5V3.5M4 7l4-4 4 4"/>
  </svg>
)

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="7.5" r="4"/><path d="M10.5 10.5l3 3"/>
  </svg>
)

const IconArchive = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="3" width="11" height="3" rx="1"/><path d="M3.5 6v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V6"/><path d="M6.5 9h3"/>
  </svg>
)

const IconCoach = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3.5h10v6.5a1 1 0 0 1-1 1H6.5L4 13.5V11a1 1 0 0 1-1-1V3.5z"/>
  </svg>
)

const IconChevRight = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 4l3.5 4-3.5 4"/>
  </svg>
)

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
  const [hoveredPrompt, setHoveredPrompt]     = useState<string | null>(null)
  const [hoveredToolBtn, setHoveredToolBtn]   = useState(false)
  const [animatedTitleIds, setAnimatedTitleIds] = useState<Set<number>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const historyRef     = useRef<Message[]>([])
  const pendingTitleRequestsRef = useRef<Set<number>>(new Set())
  historyRef.current = messages

  const now = new Date()
  const dayLabel  = now.toLocaleDateString(undefined, { weekday: 'long' })
  const dateLabel = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  useEffect(() => {
    fetch(apiUrl('/api/me'), { credentials: 'include' }).then(r => r.json()).then(d => {
      if (d.name) {
        const parts = d.name.split(' ')
        setUserInitials(parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : d.name.slice(0,2).toUpperCase())
      }
    }).catch(() => {})
    fetchSidebar().then(fetched => { if (fetched.length > 0) loadThread(fetched[0].id) })

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
        const combined = [...userEvents, ...holidayEvents].sort((a, b) => a.date.localeCompare(b.date))
        setCalendarContext(combined)
      } catch {}
    })()
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  function upsertThread(thread: Thread, animateTitle = false) {
    writeThreadTitleCache(thread)
    setThreads(prev => {
      const existing = prev.find(t => t.id === thread.id)
      const changedTitle = Boolean(existing && existing.title !== thread.title && !isGenericThreadTitle(thread.title))
      const filtered = prev.filter(t => t.id !== thread.id)
      if (animateTitle && changedTitle) {
        setAnimatedTitleIds(current => new Set([...current, thread.id]))
        window.setTimeout(() => {
          setAnimatedTitleIds(current => {
            const next = new Set(current)
            next.delete(thread.id)
            return next
          })
        }, 650)
      }
      return [thread, ...filtered]
    })
  }

  async function generateThreadTitleInBackground(thread: Thread, firstMessage: string) {
    if (
      !thread?.id ||
      thread.title_generated ||
      thread.title_manually_edited ||
      !isGenericThreadTitle(thread.title)
    ) {
      return
    }

    if (pendingTitleRequestsRef.current.has(thread.id)) return
    pendingTitleRequestsRef.current.add(thread.id)

    try {
      const res = await fetch(apiUrl(`/ai/threads/${thread.id}/generate-title`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_message: firstMessage }),
      })
      const data = await res.json()
      if (res.ok && data.ok && data.thread && !isGenericThreadTitle(data.thread.title)) {
        upsertThread(data.thread, true)
      }
    } catch {
    } finally {
      pendingTitleRequestsRef.current.delete(thread.id)
    }
  }

  async function fetchSidebar(): Promise<Thread[]> {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(apiUrl('/ai/threads'), { credentials: 'include' }),
        fetch(apiUrl('/ai/projects'), { credentials: 'include' }),
      ])
      let fetchedThreads: Thread[] = []
      if (tRes.ok) {
        const td = await tRes.json()
        if (td.threads) {
          fetchedThreads = applyCachedThreadTitles(td.threads)
          setThreads(fetchedThreads)
        }
      }
      if (pRes.ok) {
        const pd = await pRes.json()
        if (pd.projects) setProjects(pd.projects)
      }
      return fetchedThreads
    } catch { return [] }
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
        upsertThread(data.thread)
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
        upsertThread(data.thread)
        generateThreadTitleInBackground(data.thread, msg)
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
      if (data.thread) { setThreadId(data.thread.id); upsertThread(data.thread) }
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
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  function applyPrompt(title: string) {
    setInput(title + ' — ')
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
        textareaRef.current.focus()
      }
    }, 0)
  }

  const filtered = {
    threads:  threads.filter(t => !searchQuery || (t.title + t.preview + (t.project_name || '')).toLowerCase().includes(searchQuery.toLowerCase())),
    projects: projects.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const isEmpty = messages.length === 0

  const monoFont = "ui-monospace, SFMono-Regular, Menlo, 'SF Mono', Consolas, monospace"
  const serifFont = "'Fraunces', ui-serif, Georgia, 'Times New Roman', serif"

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', height: '100vh', overflow: 'hidden', background: th.pageBg }}>

      {/* CHAT AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', borderRight: `1px solid ${th.chatBorder}`, overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', borderBottom: `1px solid ${th.topbarBorder}`, flexShrink: 0, minHeight: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SidebarReopenButton />
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: th.aiBubbleBg,
              border: `1px solid ${th.aiBubbleBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: th.aiSub, flexShrink: 0,
            }}>
              <IconCoach />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.1 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: th.aiName, letterSpacing: '-0.01em' }}>Coach</span>
              <span style={{ fontSize: 11.5, color: th.aiSub, fontWeight: 400 }}>Private to you · trained on your tasks, habits, and journal</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              height: 30, padding: '0 11px', borderRadius: 7,
              border: `1px solid ${th.headBtnBorder}`,
              background: th.headBtnBg,
              color: th.headBtnColor,
              fontSize: 12.5, fontWeight: 450, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              Context
            </button>
            <button onClick={startNewChat} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              height: 30, padding: '0 11px', borderRadius: 7,
              border: `1px solid ${th.newChatBorder}`,
              background: th.newChatBg,
              color: th.newChatColor,
              fontSize: 12.5, fontWeight: 450, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              New chat
              <span style={{ fontFamily: monoFont, fontSize: 10.5, border: `1px solid ${th.headBtnBorder}`, padding: '0 4px', lineHeight: '14px', borderRadius: 3, color: th.aiSub }}>⌘N</span>
            </button>
          </div>
        </div>

        {/* Messages / Empty state */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {isEmpty ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 32px 0' }}>
              <div style={{ width: '100%', maxWidth: 560 }}>

                {/* Time marker */}
                <div style={{
                  fontFamily: monoFont, fontSize: 11, color: th.timeLabelColor,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  marginBottom: 20,
                }}>
                  <span style={{ display: 'inline-block', width: 18, height: 1, background: th.timeLineColor }} />
                  {dayLabel} · {dateLabel}
                  <span style={{ display: 'inline-block', width: 18, height: 1, background: th.timeLineColor }} />
                </div>

                {/* Headline */}
                <h1 style={{
                  margin: 0,
                  fontFamily: serifFont,
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1.12,
                  letterSpacing: '-0.022em',
                  color: th.emptyTitle,
                }}>
                  {"What's worth your attention "}
                  <em style={{ fontStyle: 'italic', color: th.emptyTitleItalic, fontWeight: 300 }}>today?</em>
                </h1>

                {/* Lede */}
                <p style={{
                  margin: '14px auto 0',
                  maxWidth: 440,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: th.emptyBody,
                }}>
                  Start anywhere — a half-formed thought, a stuck project, a goal you keep postponing. Coach has your week&apos;s context already.
                </p>

                {/* Numbered prompt list */}
                <div style={{ marginTop: 36, borderTop: `1px solid ${th.promptBorder}` }}>
                  {PROMPTS.map(p => (
                    <button
                      key={p.idx}
                      onClick={() => applyPrompt(p.title)}
                      onMouseEnter={() => setHoveredPrompt(p.idx)}
                      onMouseLeave={() => setHoveredPrompt(null)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr 14px',
                        alignItems: 'baseline',
                        gap: 14,
                        width: '100%',
                        padding: '14px 4px 14px 0',
                        borderBottom: `1px solid ${th.promptBorder}`,
                        background: hoveredPrompt === p.idx ? th.promptHoverBg : 'transparent',
                        border: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottomWidth: 1,
                        borderBottomStyle: 'solid',
                        borderBottomColor: th.promptBorder,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'background 120ms ease',
                      }}
                    >
                      <span style={{ fontFamily: monoFont, fontSize: 11, color: th.promptIdx }}>{p.idx}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 14, color: th.promptTitle, fontWeight: 450, letterSpacing: '-0.005em', lineHeight: 1.35 }}>{p.title}</span>
                        <span style={{ fontSize: 12.5, color: th.promptDesc, lineHeight: 1.4 }}>{p.desc}</span>
                      </span>
                      <span style={{
                        color: hoveredPrompt === p.idx ? th.promptArrowHover : th.promptArrow,
                        display: 'flex', alignItems: 'center',
                        transition: 'color 120ms ease, transform 120ms ease',
                        transform: hoveredPrompt === p.idx ? 'translateX(2px)' : 'none',
                        alignSelf: 'center',
                      }}>
                        <IconChevRight />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    <div style={{ fontSize: '9px', color: th.msgTimeLabelColor, marginTop: '4px', padding: '0 4px' }}>{msg.timeLabel}</div>
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
                              <button onClick={() => resolveAction(action.id, 'confirm')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionConfirmBg}`, background: th.actionConfirmBg, color: th.actionConfirmColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Add to Calendar</button>
                              <button onClick={() => resolveAction(action.id, 'cancel')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionCancelBorder}`, background: th.actionCancelBg, color: th.actionCancelColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
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
                              <button onClick={() => resolveAction(action.id, 'confirm')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionConfirmBg}`, background: th.actionConfirmBg, color: th.actionConfirmColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm</button>
                              <button onClick={() => resolveAction(action.id, 'cancel')} disabled={isResolved} style={{ borderRadius: '10px', padding: '8px 11px', border: `1px solid ${th.actionCancelBorder}`, background: th.actionCancelBg, color: th.actionCancelColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Not now</button>
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: '16px 32px 28px', flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div
              style={{
                background: th.composerBg,
                border: `1px solid ${th.composerBorder}`,
                borderRadius: 14,
                padding: '12px 12px 8px 16px',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={autoResize}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Write to your coach…"
                rows={1}
                style={{
                  width: '100%',
                  minHeight: 24,
                  maxHeight: 200,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: th.inputColor,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  padding: '4px 0',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                {/* Tools — paperclip only */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    title="Attach file"
                    onMouseEnter={() => setHoveredToolBtn(true)}
                    onMouseLeave={() => setHoveredToolBtn(false)}
                    style={{
                      width: 28, height: 28,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6,
                      background: hoveredToolBtn ? th.toolBtnHoverBg : 'transparent',
                      border: 'none',
                      color: hoveredToolBtn ? th.toolBtnHoverColor : th.toolBtnColor,
                      cursor: 'pointer',
                      transition: 'background 120ms ease, color 120ms ease',
                    }}
                  >
                    <IconAttach />
                  </button>
                </div>
                {/* Hint + send */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: monoFont, fontSize: 10.5, color: th.hintColor }}>
                    <kbd style={{ fontFamily: monoFont, border: `1px solid ${th.hintKbdBorder}`, padding: '1px 5px', borderRadius: 3, color: th.hintKbdColor, marginRight: 2 }}>⏎</kbd>
                    send ·
                    <kbd style={{ fontFamily: monoFont, border: `1px solid ${th.hintKbdBorder}`, padding: '1px 5px', borderRadius: 3, color: th.hintKbdColor, margin: '0 2px' }}>⇧⏎</kbd>
                    newline
                  </span>
                  <button
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    title="Send"
                    style={{
                      width: 28, height: 28,
                      borderRadius: 6,
                      border: 'none',
                      background: loading || !input.trim() ? th.sendBtnDisabledBg : th.sendBtnBg,
                      color: loading || !input.trim() ? th.sendBtnDisabledColor : th.sendBtnColor,
                      cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 120ms ease, opacity 120ms ease',
                    }}
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ background: th.rightPanelBg, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Panel header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${th.rightPanelBorder}`, flexShrink: 0, minHeight: 64, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: monoFont, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: th.rightPanelTitle }}>Saved</span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* Search */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${th.rightPanelBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: th.searchIconColor, flexShrink: 0 }}><IconSearch /></span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: th.searchInputColor, fontSize: 12.5, fontFamily: 'inherit' }}
            />
          </div>

          {/* New project */}
          <div style={{ padding: '12px 12px 0' }}>
            <button onClick={() => setShowProjectForm(f => !f)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px', borderRadius: 8, border: `1px solid ${th.newProjectBorder}`, background: th.newProjectBg, color: th.newProjectColor, fontSize: 12, fontWeight: 500, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
              ▣ New Project
            </button>
          </div>

          {/* Project form */}
          {showProjectForm && (
            <div style={{ margin: '12px 12px 0', padding: '12px', background: th.formBg, border: `1px solid ${th.formBorder}`, borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: th.formLabelColor, marginBottom: 10, fontFamily: monoFont }}>Create new project</div>
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="TaskFlow launch, Fitness reset..."
                style={{ width: '100%', borderRadius: 8, border: `1px solid ${th.formInputBorder}`, background: th.formInputBg, color: th.formInputColor, fontFamily: 'inherit', fontSize: 12, padding: '9px 11px', outline: 'none', boxSizing: 'border-box' }} />
              <textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Optional description" rows={2}
                style={{ width: '100%', marginTop: 7, borderRadius: 8, border: `1px solid ${th.formInputBorder}`, background: th.formInputBg, color: th.formInputColor, fontFamily: 'inherit', fontSize: 12, padding: '9px 11px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={createProject} style={{ flex: 1, background: th.formCreateBg, color: th.formCreateColor, border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Create project</button>
                <button onClick={() => setShowProjectForm(false)} style={{ flex: 1, background: th.formCancelBg, color: th.formCancelColor, border: `1px solid ${th.formCancelBorder}`, borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <>
              <div style={{ padding: '16px 18px 6px', fontFamily: monoFont, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.sectionLabel }}>Projects</div>
              <div style={{ padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {filtered.projects.map(p => (
                  <div key={p.id} onClick={() => setProjectId(p.id)} style={{ background: projectId === p.id ? th.itemActiveBg : th.itemBg, border: `1px solid ${projectId === p.id ? th.itemActiveBorder : th.itemBorder}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: th.itemTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: th.itemCount, flexShrink: 0, fontFamily: monoFont }}>{p.chat_count || 0}</div>
                    </div>
                    {p.description && <div style={{ fontSize: 11, color: th.itemBody, lineHeight: 1.55, marginTop: 5 }}>{p.description}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pinned section */}
          <div style={{ padding: '16px 18px 6px', fontFamily: monoFont, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.sectionLabel }}>Pinned</div>
          <div style={{ padding: '0 10px 6px' }}>
            <div style={{ padding: '12px 13px', borderRadius: 10, border: `1px solid ${th.emptyItemBorder}`, background: th.emptyItemBg, fontSize: 12, color: th.emptyItemColor, lineHeight: 1.6 }}>
              No pinned threads yet. Star a chat to keep it close.
            </div>
          </div>

          {/* Recent chats */}
          <div style={{ padding: '16px 18px 6px', fontFamily: monoFont, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.sectionLabel }}>Recent</div>
          <div style={{ padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {filtered.threads.length === 0 ? (
              <div style={{ padding: '12px 13px', borderRadius: 10, border: `1px solid ${th.emptyItemBorder}`, background: th.emptyItemBg, fontSize: 12, color: th.emptyItemColor, lineHeight: 1.6 }}>
                Start a chat and it will show up here automatically.
              </div>
            ) : (
              filtered.threads.map(t => (
                <div key={t.id} onClick={() => loadThread(t.id)}
                  style={{ background: threadId === t.id ? th.itemActiveBg : th.itemBg, border: `1px solid ${threadId === t.id ? th.itemActiveBorder : th.itemBorder}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: th.itemTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 220ms ease, opacity 220ms ease', animation: animatedTitleIds.has(t.id) ? 'threadTitleSettle 520ms ease' : undefined }}>{t.title}</div>
                    <div style={{ fontSize: 10, color: th.itemCount, flexShrink: 0, fontFamily: monoFont }}>{t.activity_label}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: th.itemBody, lineHeight: 1.55, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.preview || 'No messages yet.'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 10, color: th.itemMeta, fontFamily: monoFont }}>
                    {t.project_name && <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 999, background: th.itemTagBg, border: `1px solid ${th.itemTagBorder}` }}>{t.project_name}</span>}
                    <span>{t.message_count} {t.message_count === 1 ? 'message' : 'messages'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Archive button — pinned at bottom of sidebar */}
        <div style={{ borderTop: `1px solid ${th.rightPanelBorder}`, padding: '10px 12px', flexShrink: 0 }}>
          <button style={{
            width: '100%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '8px 12px',
            borderRadius: 7,
            border: `1px dashed ${th.archiveBtnBorder}`,
            background: 'transparent',
            color: th.archiveBtnColor,
            fontSize: 12.5, fontWeight: 450, cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 120ms ease, color 120ms ease',
          }}>
            <IconArchive />
            <span>Archive</span>
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,300;9..144,0,400;9..144,1,300;9..144,1,400&display=swap');
        @keyframes threadTitleSettle {
          0% { opacity: 0.42; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes tdot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
