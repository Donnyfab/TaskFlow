'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import TasksTrashView from './TasksTrashView'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Task {
  id: number; title: string; completed: boolean; priority: string
  list_id: number | null; list_name: string; pinned: boolean; description: string
  scheduled_for?: string | null
}
interface TaskList { id: number; name: string; pinned: boolean; task_count: number; is_inbox?: boolean }
interface Data {
  lists: TaskList[]; tasks: Task[]; active_list_id: number | null; all_tasks_count: number; inbox_count?: number
}
interface BdTask {
  id: number; title: string; priority: 'high' | 'medium' | 'low'; dueDate?: string
}

/* ─── SVG Icons for sidebar ─────────────────────────────────────── */
const IcInbox = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 11h3.2l1.3 2h4l1.3-2h3.2"/>
    <rect x="2" y="3" width="14" height="12" rx="2.5"/>
  </svg>
)
const IcToday = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="3.5" width="13" height="12" rx="2.5"/>
    <path d="M2.5 7.5h13M6 2v3M12 2v3"/>
    <text x="9" y="14" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" stroke="none" fontFamily="-apple-system,sans-serif">
      {new Date().getDate()}
    </text>
  </svg>
)
const IcUpcoming = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="3.5" width="13" height="12" rx="2.5"/>
    <path d="M2.5 7.5h13M6 2v3M12 2v3M6 11h3M6 13.5h5"/>
  </svg>
)
const IcSomeday = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4.5" width="14" height="11" rx="2.5"/>
    <path d="M5.5 4.5V3a1 1 0 011-1h5a1 1 0 011 1v1.5"/>
    <path d="M6 10h6M6 12.5h3.5"/>
  </svg>
)
const IcLogbook = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="2" width="11" height="14" rx="2"/>
    <path d="M6.5 6.5h5M6.5 9.5h5M6.5 12.5h3"/>
    <path d="M3.5 6.5 L2 6.5" strokeWidth="1.2"/>
    <path d="M3.5 9.5 L2 9.5" strokeWidth="1.2"/>
    <path d="M3.5 12.5 L2 12.5" strokeWidth="1.2"/>
  </svg>
)
const IcTrash = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h12M7 5V3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5"/>
    <rect x="4" y="5" width="10" height="10" rx="2"/>
    <path d="M7.5 8v4M10.5 8v4"/>
  </svg>
)

/* ─── Smart Lists config ─────────────────────────────────────────── */
const SMART_LISTS = [
  { id: 'inbox',    label: 'Inbox',    Icon: IcInbox    },
  { id: 'today',    label: 'Today',    Icon: IcToday    },
  { id: 'upcoming', label: 'Upcoming', Icon: IcUpcoming },
  { id: 'someday',  label: 'Someday',  Icon: IcSomeday  },
]
const SYSTEM_LISTS = [
  { id: 'logbook', label: 'Logbook', Icon: IcLogbook },
  { id: 'trash',   label: 'Trash',   Icon: IcTrash   },
]
const TASK_VIEW_IDS = new Set(['inbox', 'today', 'upcoming', 'someday', 'trash'])

/* ─── Theme colour maps ──────────────────────────────────────────── */
const LIGHT_C = {
  sidebarBg:    '#F2F2F2',
  contentBg:    '#FFFFFF',
  border:       'rgba(0,0,0,0.07)',
  text:         '#1C1C1E',
  muted:        '#8E8E93',
  inputBg:      '#FAFAFA',
  inputBorder:  'rgba(0,0,0,0.10)',
  tagMediumBg:  '#FFF3D4', tagMediumTx: '#9A7010',
  tagHighBg:    '#FFEAEA', tagHighTx:   '#A03030',
  tagLowBg:     '#EEF8EE', tagLowTx:    '#3A7A3A',
  tagListBg:    '#F0F0F6', tagListTx:   '#6B6B78',
  checkBorder:  '#C8C8CE',
  checkDoneBg:  '#1a7fe8',
  checkHoverBg: '#EDF4FF',
  taskRowBg:    '#FFFFFF',
  taskBorder:   '#F4F4F4',
  taskText:     '#1C1C1E',
  taskDone:     '#BCBCC2',
  sectionLbl:   '#BABABA',
  activeItemBg: 'rgba(26,127,232,0.10)',
  activeItemTx: '#1568d0',
  hoverItemBg:  'rgba(0,0,0,0.05)',
  circleBorder: '#ABABAB',
  detailBg:     '#FAFAFA',
  detailInpBg:  '#FFFFFF',
  detailCloseB: 'rgba(0,0,0,0.06)',
  blue:         '#1a7fe8',
  deleteText:   '#D03030',
  deleteBg:     'rgba(220,50,50,0.07)',
  deleteBorder: 'rgba(220,50,50,0.14)',
}

const DARK_C = {
  sidebarBg:    '#0A0A0A',
  contentBg:    '#111111',
  border:       'rgba(255,255,255,0.06)',
  text:         'rgba(255,255,255,0.88)',
  muted:        'rgba(255,255,255,0.35)',
  inputBg:      'rgba(255,255,255,0.04)',
  inputBorder:  'rgba(255,255,255,0.09)',
  tagMediumBg:  'rgba(255,180,50,0.08)', tagMediumTx: 'rgba(255,200,80,0.75)',
  tagHighBg:    'rgba(255,80,80,0.08)',  tagHighTx:   'rgba(255,120,120,0.75)',
  tagLowBg:     'rgba(100,200,100,0.08)',tagLowTx:    'rgba(120,200,120,0.75)',
  tagListBg:    'rgba(255,255,255,0.06)',tagListTx:   'rgba(255,255,255,0.38)',
  checkBorder:  'rgba(255,255,255,0.22)',
  checkDoneBg:  'rgba(255,255,255,0.65)',
  checkHoverBg: 'rgba(255,255,255,0.07)',
  taskRowBg:    '#111111',
  taskBorder:   'rgba(255,255,255,0.05)',
  taskText:     'rgba(255,255,255,0.78)',
  taskDone:     'rgba(255,255,255,0.25)',
  sectionLbl:   'rgba(255,255,255,0.25)',
  activeItemBg: 'rgba(26,127,232,0.15)',
  activeItemTx: 'rgba(255,255,255,0.92)',
  hoverItemBg:  'rgba(255,255,255,0.05)',
  circleBorder: 'rgba(255,255,255,0.3)',
  detailBg:     '#0F0F0F',
  detailInpBg:  'rgba(255,255,255,0.05)',
  detailCloseB: 'rgba(255,255,255,0.08)',
  blue:         '#1a7fe8',
  deleteText:   'rgba(255,100,100,0.8)',
  deleteBg:     'rgba(255,50,50,0.07)',
  deleteBorder: 'rgba(255,50,50,0.15)',
}

type Colors = typeof LIGHT_C

/* ─── Calendar helpers ───────────────────────────────────────────── */
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CAL_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const LIST_COLORS = ['#9b7de0','#5ba4cf','#e07d5b','#5bc49b','#e0c45b','#cf5b8a']

function calDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function calFirstDow(year: number, month: number) { return new Date(year, month, 1).getDay() }
function toIsoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

/* ─── Main Component ─────────────────────────────────────────────── */
export default function TasksPageClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const listId       = searchParams.get('list_id') ? Number(searchParams.get('list_id')) : null
  const viewParam    = searchParams.get('view')
  const queryClient  = useQueryClient()

  // queryId distinguishes each smart list view in the cache
  const initialSmartView = !listId && viewParam && TASK_VIEW_IDS.has(viewParam) ? viewParam : 'inbox'
  const [smartActive, setSmartActive] = useState(initialSmartView)
  const dataSmartActive = !listId && smartActive === 'trash' ? 'inbox' : smartActive
  const queryId: string | number = listId ?? dataSmartActive

  useEffect(() => {
    if (listId) return
    const nextView = viewParam && TASK_VIEW_IDS.has(viewParam) ? viewParam : 'inbox'
    setSmartActive(nextView)
  }, [listId, viewParam])

  const isTrashView = !listId && smartActive === 'trash'

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', queryId],
    queryFn: async () => {
      const url = listId
        ? apiUrl(`/api/tasks/data?list_id=${listId}`)
        : apiUrl(`/api/tasks/data?smart=${dataSmartActive}`)
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json() as Promise<Data>
    },
  })

  const tasks = data?.tasks ?? []

  const [filter,          setFilter]         = useState<'all'|'active'|'completed'>('all')
  const [newList,         setNewList]         = useState('')
  const [showNewList,     setShowNewList]     = useState(false)
  const [showNewListMenu, setShowNewListMenu] = useState(false)
  const [detail,          setDetail]          = useState<Task | null>(null)
  const [dpTitle,         setDpTitle]         = useState('')
  const [dpNotes,         setDpNotes]         = useState('')
  const [dpPriority,      setDpPriority]      = useState('medium')
  const [dpListId,        setDpListId]        = useState<number|null>(null)
  const [hovNL,           setHovNL]           = useState(false)

  // ── New Task Modal state ──────────────────────────────────────────
  const [showTaskModal, setShowTaskModal]   = useState(false)
  const [mtTitle,       setMtTitle]         = useState('')
  const [mtLocation,    setMtLocation]      = useState('inbox')
  const [mtPriority,    setMtPriority]      = useState<'none'|'low'|'medium'|'high'>('none')
  const [mtDate,        setMtDate]          = useState('')
  const [mtShowLoc,     setMtShowLoc]       = useState(false)
  const [mtShowSched,   setMtShowSched]     = useState(false)
  const mtInputRef = useRef<HTMLInputElement>(null)

  // ── Upcoming calendar state ──────────────────────────────────────
  const [calView,         setCalView]         = useState<'month'|'week'>('month')
  const [viewYear,        setViewYear]        = useState(() => new Date().getFullYear())
  const [viewMonth,       setViewMonth]       = useState(() => new Date().getMonth())
  const [selectedCalDate, setSelectedCalDate] = useState(() => toIsoDate(new Date()))
  const [showDayPanel,    setShowDayPanel]    = useState(true)

  // ── Brain Dump (Voice) state ─────────────────────────────────────
  const [bdOpen,       setBdOpen]       = useState(false)
  const [bdListening,  setBdListening]  = useState(false)
  const [bdTranscript, setBdTranscript] = useState('')
  const [bdInterim,    setBdInterim]    = useState('')
  const [bdTasks,      setBdTasks]      = useState<BdTask[]>([])
  const [bdProcessing, setBdProcessing] = useState(false)
  const [bdWave,       setBdWave]       = useState<number[]>(Array(32).fill(3))
  const [bdError,      setBdError]      = useState('')
  const bdRecogRef      = useRef<any>(null)
  const bdAnalyserRef   = useRef<AnalyserNode | null>(null)
  const bdStreamRef     = useRef<MediaStream | null>(null)
  const bdAudioCtxRef   = useRef<AudioContext | null>(null)
  const bdRafRef        = useRef<number | undefined>(undefined)
  const bdTimerRef      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const bdTxtRef        = useRef('')
  const bdListenRef     = useRef(false)
  const bdProcessingRef = useRef(false)

  /* ── Theme sync ── */
  const [theme, setTheme] = useState<'dark'|'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'dark'|'light'|null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const C: Colors = theme === 'light' ? LIGHT_C : DARK_C

  useEffect(() => {
    if (isTrashView) setDetail(null)
  }, [isTrashView])

  /* ── Brain Dump functions ── */
  function bdHandleCommand(text: string): boolean {
    const t = text.toLowerCase().trim()
    if (/\b(scratch that|never mind|undo that|delete that)\b/.test(t)) {
      setBdTasks(p => p.slice(0, -1)); return true
    }
    const dm = t.match(/\bdelete (the )?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/)
    if (dm) {
      const map: Record<string,number> = { first:0,'1st':0, second:1,'2nd':1, third:2,'3rd':2, fourth:3,'4th':3, fifth:4,'5th':4, last:-1 }
      const idx = map[dm[2]] ?? -1
      setBdTasks(p => idx === -1 ? p.slice(0,-1) : p.filter((_,i) => i !== idx))
      return true
    }
    const pm = t.match(/\bmake (that |it )?(high|medium|low) priority\b/)
    if (pm) {
      const pri = pm[2] as BdTask['priority']
      setBdTasks(p => p.length ? p.map((x,i) => i===p.length-1 ? {...x, priority:pri} : x) : p)
      return true
    }
    return false
  }

  async function bdProcess(transcript: string) {
    if (!transcript.trim() || bdProcessingRef.current) return
    bdProcessingRef.current = true; setBdProcessing(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:800,
          messages:[{ role:'user', content:`Extract actionable to-do tasks from this voice brain dump. Return ONLY a JSON array where each item is {"title":"...","priority":"high"|"medium"|"low","dueDate":"..."(optional, omit if none)}. No markdown, no explanation. Brain dump: "${transcript}"` }]
        })
      })
      const json = await res.json()
      const raw  = json.content?.[0]?.text ?? '[]'
      const list: Omit<BdTask,'id'>[] = JSON.parse(raw.replace(/```json|```/g,'').trim())
      setBdTasks(list.map((x,i) => ({ ...x, id:Date.now()+i })))
    } catch {}
    finally { bdProcessingRef.current = false; setBdProcessing(false) }
  }

  async function bdStartListening() {
    setBdError('')
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setBdError('Speech recognition not supported. Try Chrome or Edge.'); return }
    bdTxtRef.current = bdTranscript; bdListenRef.current = true; setBdListening(true)
    const recog = new SR()
    recog.continuous = true; recog.interimResults = true; recog.lang = 'en-US'
    bdRecogRef.current = recog
    recog.onresult = (e: any) => {
      let interim = ''; let newFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) { if (!bdHandleCommand(t)) newFinal += t + ' ' } else interim += t
      }
      if (newFinal) {
        bdTxtRef.current += newFinal; setBdTranscript(bdTxtRef.current)
        clearTimeout(bdTimerRef.current)
        bdTimerRef.current = setTimeout(() => bdProcess(bdTxtRef.current), 1800)
      }
      setBdInterim(interim)
    }
    recog.onerror = (e: any) => { if (e.error !== 'aborted') setBdError(`Mic error: ${e.error}`) }
    recog.onend   = () => { if (bdListenRef.current) { try { recog.start() } catch {} } }
    try { recog.start() } catch { setBdListening(false); bdListenRef.current = false; return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      bdStreamRef.current = stream
      const ctx = new AudioContext(); bdAudioCtxRef.current = ctx
      const analyser = ctx.createAnalyser(); analyser.fftSize = 64; analyser.smoothingTimeConstant = 0.8
      bdAnalyserRef.current = analyser; ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(buf)
        setBdWave(Array.from(buf.slice(0,32)).map(v => Math.max(3,Math.min(100,(v/255)*100))))
        bdRafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      const fakeTick = () => {
        const now = Date.now()
        setBdWave(Array.from({length:32},(_,i) => Math.max(4,Math.min(95,Math.sin(now/280+i*0.45)*28+32+Math.random()*18))))
        bdRafRef.current = requestAnimationFrame(fakeTick)
      }
      fakeTick()
    }
  }

  function bdStopListening() {
    bdListenRef.current = false; setBdListening(false)
    bdRecogRef.current?.stop(); bdRecogRef.current = null
    cancelAnimationFrame(bdRafRef.current!)
    bdStreamRef.current?.getTracks().forEach(t => t.stop()); bdStreamRef.current = null
    bdAudioCtxRef.current?.close(); bdAudioCtxRef.current = null
    setBdWave(Array(32).fill(3)); setBdInterim('')
    if (bdTxtRef.current.trim()) bdProcess(bdTxtRef.current)
  }

  function bdClose() {
    bdListenRef.current = false; bdRecogRef.current?.stop(); bdRecogRef.current = null
    cancelAnimationFrame(bdRafRef.current!); bdRafRef.current = undefined
    clearTimeout(bdTimerRef.current)
    bdStreamRef.current?.getTracks().forEach(t => t.stop()); bdStreamRef.current = null
    bdAudioCtxRef.current?.close(); bdAudioCtxRef.current = null
    setBdOpen(false); setBdListening(false); setBdTranscript('')
    setBdInterim(''); setBdTasks([]); setBdError(''); setBdWave(Array(32).fill(3)); bdTxtRef.current = ''
  }

  async function bdSaveTask(task: BdTask) {
    const temp: Task = { id:-Date.now(), title:task.title, completed:false, priority:task.priority, list_id:listId, list_name:'Task', pinned:false, description:task.dueDate?`Due: ${task.dueDate}`:'' }
    queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, tasks:[temp,...old.tasks] } : old)
    setBdTasks(p => p.filter(t => t.id !== task.id))
    try {
      await fetch(apiUrl('/tasks/quick'), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:task.title, list_id:listId, priority:task.priority }) })
    } finally { queryClient.invalidateQueries({ queryKey:['tasks', queryId] }) }
  }

  async function bdSaveAll() {
    const snapshot = [...bdTasks]; setBdTasks([])
    for (const t of snapshot) {
      await fetch(apiUrl('/tasks/quick'), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:t.title, list_id:listId, priority:t.priority }) })
    }
    queryClient.invalidateQueries({ queryKey:['tasks', queryId] }); bdClose()
  }

  /* ── New Task Modal functions ── */
  function openTaskModal() {
    setMtTitle(''); setMtPriority('none'); setMtDate('')
    setMtShowLoc(false); setMtShowSched(false)
    setMtLocation(listId ? String(listId) : smartActive)
    setShowTaskModal(true)
  }

  function openTaskModalForDate(date: string) {
    setMtTitle(''); setMtPriority('none')
    setMtLocation('upcoming'); setMtDate(date)
    setMtShowLoc(false); setMtShowSched(false)
    setShowTaskModal(true)
    setTimeout(() => mtInputRef.current?.focus(), 60)
  }

  function prevCalMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextCalMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function mtGetLocationLabel() {
    const sm = SMART_LISTS.find(s => s.id === mtLocation)
    if (sm) return sm.label
    return data?.lists.find(l => String(l.id) === mtLocation)?.name ?? 'Inbox'
  }

  function mtClose() {
    setShowTaskModal(false); setMtShowLoc(false); setMtShowSched(false)
  }

  async function mtCreate() {
    if (!mtTitle.trim()) return
    // Capture state values before clearing
    const title       = mtTitle.trim()
    const loc         = mtLocation
    const date        = mtDate
    const pri         = mtPriority
    mtClose(); setMtTitle(''); setMtPriority('none'); setMtDate('')

    const resolvedListId = /^\d+$/.test(loc) ? Number(loc) : null
    const priority = pri === 'none' ? 'medium' : pri

    // Map location → scheduled_for value sent to the API
    const scheduledFor: string | null = (() => {
      if (resolvedListId !== null) return null        // going to a project list
      if (loc === 'inbox')    return null
      if (loc === 'today')    return 'today'
      if (loc === 'someday')  return 'someday'
      if (loc === 'upcoming') return date || new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      return null
    })()

    // Derive which query cache key this task belongs to
    const destQueryId: string | number = resolvedListId !== null
      ? resolvedListId
      : (scheduledFor && scheduledFor.match(/^\d{4}-\d{2}-\d{2}$/) ? 'upcoming' : (scheduledFor ?? 'inbox'))

    const sameList = destQueryId === queryId
    const temp: Task = { id:-Date.now(), title, completed:false, priority, list_id:resolvedListId, list_name:'Task', pinned:false, description:'', scheduled_for: scheduledFor }
    const prev = sameList ? queryClient.getQueryData<Data>(['tasks', queryId]) : undefined
    if (sameList) queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, tasks:[temp,...old.tasks] } : old)
    try {
      const res = await fetch(apiUrl('/tasks/quick'), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title, list_id:resolvedListId, priority, scheduled_for: scheduledFor }) })
      const created = await res.json()
      if (created.id && sameList) {
        queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, tasks:old.tasks.map(t => t.id===temp.id ? {...temp,id:created.id} : t) } : old)
      } else if (!created.id && sameList && prev) {
        queryClient.setQueryData(['tasks', queryId], prev)
      }
    } catch { if (sameList && prev) queryClient.setQueryData(['tasks', queryId], prev) }
    finally {
      queryClient.invalidateQueries({ queryKey:['tasks', queryId] })
      if (!sameList) queryClient.invalidateQueries({ queryKey:['tasks', destQueryId] })
    }
  }

  /* ── Standard mutations ── */
  async function toggleTask(id: number) {
    const prev = queryClient.getQueryData<Data>(['tasks', queryId])
    queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, tasks:old.tasks.map(t => t.id===id ? {...t,completed:!t.completed} : t) } : old)
    try { await fetch(apiUrl(`/tasks/toggle/${id}`), { method:'POST', credentials:'include', headers:{'X-Requested-With':'XMLHttpRequest'} }) }
    catch { queryClient.setQueryData(['tasks', queryId], prev) }
    finally { queryClient.invalidateQueries({ queryKey:['tasks', queryId] }) }
  }

  async function deleteTask(id: number) {
    const prev = queryClient.getQueryData<Data>(['tasks', queryId])
    queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, tasks:old.tasks.filter(t => t.id!==id) } : old)
    if (detail?.id===id) setDetail(null)
    try { await fetch(apiUrl(`/tasks/delete/${id}`), { method:'POST', credentials:'include' }) }
    catch { queryClient.setQueryData(['tasks', queryId], prev) }
    finally { queryClient.invalidateQueries({ queryKey:['tasks', queryId] }) }
  }

  async function addList() {
    if (!newList.trim()) return
    const name = newList.trim(); setNewList(''); setShowNewList(false)
    const prev = queryClient.getQueryData<Data>(['tasks', queryId])
    const tempList: TaskList = { id:-Date.now(), name, pinned:false, task_count:0 }
    queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, lists:[...old.lists,tempList] } : old)
    try {
      const res = await fetch(apiUrl('/lists/create'), { method:'POST', credentials:'include', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`name=${encodeURIComponent(name)}` })
      if (res.ok) {
        const match = res.url.match(/list_id=(\d+)/)
        if (match) router.push(`/tasks?list_id=${match[1]}`)
        else queryClient.invalidateQueries({ queryKey:['tasks', queryId] })
      } else queryClient.setQueryData(['tasks', queryId], prev)
    } catch { queryClient.setQueryData(['tasks', queryId], prev) }
    finally   { queryClient.invalidateQueries({ queryKey:['tasks', queryId] }) }
  }

  async function saveDetail() {
    if (!detail) return
    const prev = queryClient.getQueryData<Data>(['tasks', queryId])
    queryClient.setQueryData<Data>(['tasks', queryId], old => old ? { ...old, tasks:old.tasks.map(t => t.id===detail.id ? { ...t, title:dpTitle, description:dpNotes, priority:dpPriority, list_id:dpListId } : t) } : old)
    setDetail(null)
    try {
      const res = await fetch(apiUrl(`/tasks/update/${detail.id}`), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','Accept':'application/json'}, body:JSON.stringify({ title:dpTitle, description:dpNotes, priority:dpPriority, list_id:dpListId }) })
      const result = await res.json()
      if (!result.ok) queryClient.setQueryData(['tasks', queryId], prev)
    } catch { queryClient.setQueryData(['tasks', queryId], prev) }
    finally   { queryClient.invalidateQueries({ queryKey:['tasks', queryId] }) }
  }

  function openDetail(task: Task) {
    setDetail(task); setDpTitle(task.title); setDpNotes(task.description)
    setDpPriority(task.priority); setDpListId(task.list_id)
  }

  function openTaskView(viewId: string) {
    setSmartActive(viewId)
    router.push(viewId === 'inbox' ? '/tasks' : `/tasks?view=${viewId}`)
  }

  const incomplete   = tasks.filter(t => !t.completed)
  const done         = tasks.filter(t =>  t.completed)
  const currentTitle = listId
    ? (data?.lists.find(l => l.id===listId)?.name ?? 'Tasks')
    : (SMART_LISTS.find(s => s.id===smartActive)?.label ?? 'Inbox')
  const currentIconEmoji = listId ? null : (['📥','⭐','📅','🗂','📦'][SMART_LISTS.findIndex(s=>s.id===smartActive)] ?? '📥')

  const dpInp: React.CSSProperties = {
    width:'100%', background:C.detailInpBg, border:`1px solid ${C.inputBorder}`,
    borderRadius:'8px', padding:'9px 12px', fontSize:'13px', color:C.text,
    outline:'none', fontFamily:'inherit', boxSizing:'border-box',
  }

  if (isLoading) return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'inherit', background:C.contentBg }}>
      <div style={{ width:'240px', background:C.sidebarBg, padding:'20px 14px', borderRight:`1px solid ${C.border}` }}>
        {[1,2,3,4,5].map(i => <div key={i} style={{ height:'40px', background:C.inputBg, borderRadius:'10px', marginBottom:'4px' }}/>)}
      </div>
      <div style={{ flex:1, padding:'32px' }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height:'44px', background:C.inputBg, borderRadius:'10px', marginBottom:'4px' }}/>)}
      </div>
    </div>
  )

  return (
    <div style={{
      display:'flex', height:'100vh', overflow:'hidden',
      fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif',
      background:C.contentBg,
    }}>

      {/* ══ SIDEBAR ══════════════════════════════════════════════════ */}
      <div style={{
        width:'240px', flexShrink:0, background:C.sidebarBg,
        borderRight:`1px solid ${C.border}`,
        display:'flex', flexDirection:'column', height:'100vh', overflow:'visible',
      }}>
        <div style={{ flex:1, overflowY:'auto', padding:'14px 0 8px' }}>

          {/* ── Brain Dump button row (hamburger + Brain Dump inline) ── */}
          <div style={{ padding:'0 10px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
            <SidebarReopenButton theme={theme} />
            <button
              onClick={() => setBdOpen(true)}
              style={{
                flex:1, display:'flex', alignItems:'center', gap:'10px',
                padding:'10px 12px', borderRadius:'12px', cursor:'pointer',
                fontFamily:'inherit', fontSize:'13.5px', fontWeight:600,
                color: theme==='light' ? '#5b5cf6' : 'rgba(148,145,255,0.92)',
                background: theme==='light'
                  ? 'linear-gradient(135deg,rgba(99,102,241,0.09) 0%,rgba(168,85,247,0.06) 100%)'
                  : 'linear-gradient(135deg,rgba(99,102,241,0.14) 0%,rgba(168,85,247,0.10) 100%)',
                border: `1px solid ${theme==='light' ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.26)'}`,
                transition:'all 0.15s',
                letterSpacing:'-0.1px',
              }}
            >
              <div style={{
                width:'26px', height:'26px', borderRadius:'8px', flexShrink:0,
                background:'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 3px 8px rgba(99,102,241,0.35)',
              }}>
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="5" y="1" width="6" height="9" rx="3"/>
                  <path d="M2 7.5 A6 6 0 0 0 14 7.5"/>
                  <line x1="8" y1="13" x2="8" y2="16"/>
                  <line x1="5" y1="16" x2="11" y2="16"/>
                </svg>
              </div>
              Brain Dump
              <span style={{
                marginLeft:'auto', fontSize:'10.5px', padding:'2px 8px', borderRadius:'20px', fontWeight:500,
                background: theme==='light' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.22)',
                color: theme==='light' ? '#6366f1' : 'rgba(148,145,255,0.85)',
                letterSpacing:'0',
              }}>
                Voice
              </span>
            </button>
          </div>

          {/* ── Divider ── */}
          <div style={{ height:'1px', background:C.border, margin:'0 12px 10px' }}/>

          {/* ── Smart lists ── */}
          {SMART_LISTS.map(item => {
            const isActive = !listId && smartActive===item.id
            const count    = item.id==='inbox' ? (data?.inbox_count ?? 0) || null : null
            return (
              <SidebarItem key={item.id}
                Icon={item.Icon} label={item.label}
                count={count} active={isActive} C={C} theme={theme}
                onClick={() => openTaskView(item.id)}
              />
            )
          })}

          {/* ── System lists ── */}
          <div style={{ height:'1px', background:C.border, margin:'10px 12px' }}/>
          {SYSTEM_LISTS.map(item => (
            <SidebarItem key={item.id}
              Icon={item.Icon} label={item.label}
              count={null} active={!listId && smartActive===item.id} C={C} theme={theme}
              onClick={() => { if (item.id === 'trash') openTaskView('trash') }}
            />
          ))}

          {/* ── User lists ── */}
          {data?.lists && data.lists.filter(l => !l.is_inbox).length > 0 && (
            <>
              <div style={{ height:'1px', background:C.border, margin:'10px 12px' }}/>
              <div style={{ fontSize:'10px', fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', padding:'0 16px', marginBottom:'4px' }}>
                My Lists
              </div>
              {data.lists.filter(l => !l.is_inbox).map(lst => (
                <SidebarItemCustom key={lst.id}
                  label={lst.name} count={lst.task_count || null}
                  active={listId===lst.id} C={C} theme={theme}
                  onClick={() => router.push(`/tasks?list_id=${lst.id}`)}
                />
              ))}
            </>
          )}
        </div>

        {/* ── Sidebar bottom bar ── */}
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative',
        }}>

          {/* ── New List popover menu ── */}
          {showNewListMenu && (
            <>
              {/* Invisible backdrop — closes menu on outside click */}
              <div
                onClick={() => setShowNewListMenu(false)}
                style={{ position:'fixed', inset:0, zIndex:99 }}
              />
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '8px',
                right: '8px',
                background: theme === 'light' ? '#FFFFFF' : '#1C1C1E',
                borderRadius: '12px',
                border: `1px solid ${C.border}`,
                boxShadow: theme === 'light'
                  ? '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)'
                  : '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                zIndex: 100,
                animation: 'bdFadeIn 0.12s ease-out',
              }}>
                {/* New Project */}
                <div
                  onClick={() => { setShowNewListMenu(false); setShowNewList(true) }}
                  style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 14px', cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.hoverItemBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width:'26px', height:'26px', borderRadius:'8px', flexShrink:0, marginTop:'1px',
                    background:'linear-gradient(135deg,#1a6fc4 0%,#2d8fef 100%)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="9" r="7"/>
                      <path d="M9 5v4l3 2"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:'13.5px', fontWeight:600, color:C.text, marginBottom:'2px' }}>New Project</div>
                    <div style={{ fontSize:'12px', color:C.muted, lineHeight:1.5 }}>Set a goal and break it down into focused to-dos.</div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height:'1px', background:C.border, margin:'0 12px' }}/>

                {/* New Area */}
                <div
                  onClick={() => { setShowNewListMenu(false); setShowNewList(true) }}
                  style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 14px', cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.hoverItemBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width:'26px', height:'26px', borderRadius:'8px', flexShrink:0, marginTop:'1px',
                    background:'linear-gradient(135deg,#1a7a5e 0%,#26a67d 100%)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="14" height="10" rx="2.5"/>
                      <path d="M5 5V4a2 2 0 012-2h4a2 2 0 012 2v1"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:'13.5px', fontWeight:600, color:C.text, marginBottom:'2px' }}>New Area</div>
                    <div style={{ fontSize:'12px', color:C.muted, lineHeight:1.5 }}>Group related tasks and projects together — like Work, School, or Personal.</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {showNewList ? (
            <input autoFocus value={newList} onChange={e=>setNewList(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter')addList(); if(e.key==='Escape'){setShowNewList(false);setNewList('')} }}
              onBlur={()=>{ if(!newList.trim())setShowNewList(false) }}
              placeholder="List name…"
              style={{ flex:1, border:'none', background:'transparent', fontSize:'13px', color:C.text, outline:'none', fontFamily:'inherit' }}
            />
          ) : (
            <button
              onClick={() => setShowNewListMenu(v => !v)}
              onMouseEnter={() => setHovNL(true)}
              onMouseLeave={() => setHovNL(false)}
              style={{
                display:'flex', alignItems:'center', gap:'6px',
                fontSize:'13px', fontFamily:'inherit', cursor:'pointer',
                padding:'5px 10px', borderRadius:'20px',
                color: hovNL ? C.text : C.muted,
                border: hovNL
                  ? `1px solid ${theme==='light' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)'}`
                  : '1px solid transparent',
                background: hovNL
                  ? theme==='light'
                    ? 'linear-gradient(145deg,rgba(255,255,255,0.95) 0%,rgba(232,232,237,0.88) 100%)'
                    : 'linear-gradient(145deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.05) 100%)'
                  : 'none',
                boxShadow: hovNL
                  ? theme==='light'
                    ? '0 2px 8px rgba(0,0,0,0.12),0 1px 2px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,1)'
                    : '0 2px 8px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.15)'
                  : 'none',
                transform: hovNL ? 'translateY(-1px)' : 'translateY(0)',
                backdropFilter: hovNL ? 'blur(8px)' : 'none',
                transition:'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
              </svg>
              New List
            </button>
          )}
          <button style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:'2px' }}>
            <svg viewBox="0 0 17 17" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h13M4.5 8.5h8M7 13h3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:C.contentBg, overflow:'hidden' }}>
        {isTrashView ? (
          <TasksTrashView theme={theme} colors={C} />
        ) : smartActive === 'upcoming' && !listId ? (
          // ── Upcoming calendar view ──────────────────────────────────
          <>
            {/* Calendar header */}
            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
              <IcUpcoming />
              <span style={{ fontSize:'16px', fontWeight:700, color:C.text }}>Upcoming</span>
              <span style={{ fontSize:'12px', color:C.muted }}>{tasks.length} tasks · {tasks.filter(t=>t.completed).length} completed</span>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px' }}>
                {/* View toggle */}
                <div style={{ display:'flex', background:C.inputBg, borderRadius:'7px', padding:'2px', border:`1px solid ${C.border}`, gap:'2px' }}>
                  {(['month','week'] as const).map(v => (
                    <button key={v} onClick={() => setCalView(v)} style={{
                      padding:'4px 10px', borderRadius:'5px', border:'none', cursor:'pointer',
                      background: calView===v ? C.contentBg : 'transparent',
                      color: calView===v ? C.text : C.muted,
                      fontFamily:'inherit', fontSize:'12px', fontWeight: calView===v ? 500 : 400,
                      transition:'all 0.15s', textTransform:'capitalize',
                    }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
                  ))}
                </div>
                {/* Month nav */}
                <div style={{ display:'flex', alignItems:'center', gap:'2px' }}>
                  <button onClick={prevCalMonth} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:'4px 6px', borderRadius:'5px' }}>
                    <svg viewBox="0 0 8 12" width="8" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10L2 6l4-4"/></svg>
                  </button>
                  <span style={{ fontSize:'13px', fontWeight:500, minWidth:'128px', textAlign:'center', color:C.text }}>{CAL_MONTHS[viewMonth]} {viewYear}</span>
                  <button onClick={nextCalMonth} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:'4px 6px', borderRadius:'5px' }}>
                    <svg viewBox="0 0 8 12" width="8" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10l4-4-4-4"/></svg>
                  </button>
                </div>
                <button onClick={() => { const n=new Date(); setViewYear(n.getFullYear()); setViewMonth(n.getMonth()); setSelectedCalDate(toIsoDate(n)) }} style={{ padding:'5px 10px', borderRadius:'6px', border:`1px solid ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>Today</button>
                <button onClick={() => openTaskModalForDate(selectedCalDate)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 14px', borderRadius:'7px', border:'none', background:C.blue, color:'#fff', cursor:'pointer', fontSize:'13px', fontFamily:'inherit', fontWeight:500 }}>
                  <svg viewBox="0 0 11 11" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/></svg>
                  New To-Do
                </button>
              </div>
            </div>
            {/* Calendar + Day panel */}
            <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {calView === 'month' ? (() => {
                  const todayStr = toIsoDate(new Date())
                  const daysInMonth = calDaysInMonth(viewYear, viewMonth)
                  const firstDay = calFirstDow(viewYear, viewMonth)
                  const daysInPrev = calDaysInMonth(viewYear, viewMonth - 1)
                  const cells: { day: number; cur: boolean }[] = []
                  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + 1 + i, cur: false })
                  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true })
                  while (cells.length < 42) cells.push({ day: cells.length - daysInMonth - firstDay + 1, cur: false })
                  const byDate: Record<string, Task[]> = {}
                  tasks.forEach(t => { if (t.scheduled_for) { if (!byDate[t.scheduled_for]) byDate[t.scheduled_for]=[]; byDate[t.scheduled_for].push(t) } })
                  const listIdx = (data?.lists ?? []).reduce((a,l,i) => { a[l.name]=i; return a }, {} as Record<string,number>)
                  const taskColor = (t: Task) => LIST_COLORS[listIdx[t.list_name] ?? 0] ?? C.blue
                  return (
                    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                        {CAL_DAYS.map(d => <div key={d} style={{ textAlign:'center', padding:'10px 0', fontSize:'11px', fontWeight:500, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>)}
                      </div>
                      <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7,1fr)', gridTemplateRows:'repeat(6,1fr)', overflow:'hidden' }}>
                        {cells.map((cell, i) => {
                          const dateStr = cell.cur ? `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}` : null
                          const dayTasks = dateStr ? (byDate[dateStr] ?? []) : []
                          const isToday = dateStr === todayStr
                          const isSelected = dateStr === selectedCalDate
                          const isWeekend = i%7===0 || i%7===6
                          return (
                            <div key={i} onClick={() => cell.cur && dateStr && (setSelectedCalDate(dateStr), setShowDayPanel(true))} style={{
                              borderRight: i%7<6 ? `1px solid ${C.border}` : 'none',
                              borderBottom: i<35 ? `1px solid ${C.border}` : 'none',
                              padding:'7px 8px', cursor: cell.cur ? 'pointer' : 'default',
                              background: isSelected ? (theme==='dark'?'rgba(26,127,232,0.12)':'rgba(26,127,232,0.07)') : isWeekend&&cell.cur ? (theme==='dark'?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.015)') : 'transparent',
                              display:'flex', flexDirection:'column', gap:'3px', overflow:'hidden', transition:'background 0.12s',
                            }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'22px', height:'22px', borderRadius:'6px', fontSize:'12px', fontWeight:isToday?600:400, color:isToday?'#fff':cell.cur?C.text:C.muted, background:isToday?C.blue:'transparent', flexShrink:0 }}>{cell.day}</span>
                                {cell.cur && isSelected && (
                                  <button onClick={e => { e.stopPropagation(); dateStr && openTaskModalForDate(dateStr) }} style={{ background:theme==='dark'?'rgba(26,127,232,0.18)':'rgba(26,127,232,0.12)', border:'none', borderRadius:'4px', color:C.blue, cursor:'pointer', padding:'2px 5px', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                                    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/></svg>
                                  </button>
                                )}
                              </div>
                              {dayTasks.slice(0,3).map((t,ti) => (
                                <div key={ti} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'2px 5px', borderRadius:'4px', background:`${taskColor(t)}18`, border:`1px solid ${taskColor(t)}30`, overflow:'hidden' }}>
                                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:taskColor(t), flexShrink:0 }}/>
                                  <span style={{ fontSize:'10.5px', color:t.completed?C.muted:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1, textDecoration:t.completed?'line-through':'none' }}>{t.title}</span>
                                </div>
                              ))}
                              {dayTasks.length>3 && <div style={{ fontSize:'10px', color:C.muted, paddingLeft:'4px' }}>+{dayTasks.length-3} more</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })() : (() => {
                  const todayStr = toIsoDate(new Date())
                  const refDate = new Date(selectedCalDate+'T00:00:00')
                  const dow = refDate.getDay()
                  const weekStart = new Date(refDate); weekStart.setDate(weekStart.getDate() - dow)
                  const days = Array.from({length:7},(_,i) => { const d=new Date(weekStart); d.setDate(d.getDate()+i); return d })
                  const byDate: Record<string, Task[]> = {}
                  tasks.forEach(t => { if (t.scheduled_for) { if (!byDate[t.scheduled_for]) byDate[t.scheduled_for]=[]; byDate[t.scheduled_for].push(t) } })
                  const listIdx = (data?.lists ?? []).reduce((a,l,i) => { a[l.name]=i; return a }, {} as Record<string,number>)
                  const taskColor = (t: Task) => LIST_COLORS[listIdx[t.list_name] ?? 0] ?? C.blue
                  const hours = Array.from({length:16},(_,i)=>i+7)
                  return (
                    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                        <div style={{ borderRight:`1px solid ${C.border}` }}/>
                        {days.map((d,i) => {
                          const ds=toIsoDate(d); const isToday=ds===todayStr; const isSel=ds===selectedCalDate
                          return (
                            <div key={i} onClick={() => { setSelectedCalDate(ds); setShowDayPanel(true) }} style={{ textAlign:'center', padding:'10px 0', cursor:'pointer', borderRight:i<6?`1px solid ${C.border}`:'none', background:isSel?(theme==='dark'?'rgba(26,127,232,0.12)':'rgba(26,127,232,0.07)'):'transparent' }}>
                              <div style={{ fontSize:'11px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{'SMTWTFS'[d.getDay()]}</div>
                              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'26px', height:'26px', borderRadius:'6px', marginTop:'2px', background:isToday?C.blue:'transparent', fontSize:'13px', fontWeight:isToday?600:400, color:isToday?'#fff':C.text }}>{d.getDate()}</div>
                              {byDate[ds]?.length>0 && <div style={{ display:'flex', justifyContent:'center', gap:'2px', marginTop:'3px' }}>{byDate[ds].slice(0,3).map((t,ti) => <div key={ti} style={{ width:'4px', height:'4px', borderRadius:'50%', background:taskColor(t) }}/>)}</div>}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)', borderBottom:`1px solid ${C.border}`, flexShrink:0, minHeight:'36px' }}>
                        <div style={{ borderRight:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:C.muted }}>ALL DAY</div>
                        {days.map((d,i) => {
                          const ds=toIsoDate(d); const dayTasks=byDate[ds]||[]
                          return (
                            <div key={i} style={{ borderRight:i<6?`1px solid ${C.border}`:'none', padding:'4px', display:'flex', flexDirection:'column', gap:'2px' }}>
                              {dayTasks.map((t,ti) => <div key={ti} style={{ fontSize:'10px', padding:'2px 5px', borderRadius:'3px', background:`${taskColor(t)}20`, color:t.completed?C.muted:C.text, borderLeft:`2px solid ${taskColor(t)}`, textDecoration:t.completed?'line-through':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>)}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ flex:1, overflowY:'auto', display:'grid', gridTemplateColumns:'52px repeat(7,1fr)' }}>
                        <div style={{ borderRight:`1px solid ${C.border}` }}>
                          {hours.map(h => <div key={h} style={{ height:'48px', padding:'4px 8px 0 0', textAlign:'right', fontSize:'10px', color:C.muted, borderBottom:`1px solid ${C.border}20` }}>{h===12?'12pm':h>12?`${h-12}pm`:`${h}am`}</div>)}
                        </div>
                        {days.map((d,i) => (
                          <div key={i} onClick={() => openTaskModalForDate(toIsoDate(d))} style={{ borderRight:i<6?`1px solid ${C.border}`:'none', cursor:'pointer' }}>
                            {hours.map(h => <div key={h} style={{ height:'48px', borderBottom:`1px solid ${C.border}20` }}/>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              {/* Day panel */}
              {showDayPanel && (() => {
                const dt = new Date(selectedCalDate+'T00:00:00')
                const dayTasks = tasks.filter(t => t.scheduled_for === selectedCalDate)
                const doneCount = dayTasks.filter(t=>t.completed).length
                const listIdx = (data?.lists ?? []).reduce((a,l,i) => { a[l.name]=i; return a }, {} as Record<string,number>)
                const taskColor = (t: Task) => LIST_COLORS[listIdx[t.list_name] ?? 0] ?? C.blue
                return (
                  <div style={{ width:'272px', flexShrink:0, background:C.sidebarBg, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column' }}>
                    <div style={{ padding:'14px 16px 12px', borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:'20px', fontWeight:600, color:C.text }}>{dt.getDate()}</div>
                          <div style={{ fontSize:'12px', color:C.muted }}>{CAL_DAYS[dt.getDay()]}, {CAL_MONTHS[dt.getMonth()]} {dt.getFullYear()}</div>
                        </div>
                        <button onClick={() => setShowDayPanel(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:C.muted, borderRadius:'5px' }}>
                          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13"/></svg>
                        </button>
                      </div>
                      <div style={{ marginTop:'8px', fontSize:'12px', color:C.muted }}>{dayTasks.length} tasks · {doneCount} done</div>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
                      {dayTasks.length===0 ? (
                        <div style={{ padding:'28px 16px', textAlign:'center', color:C.muted, fontSize:'13px', opacity:0.5 }}>No tasks scheduled</div>
                      ) : dayTasks.map(task => (
                        <div key={task.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 14px' }}>
                          <button onClick={() => toggleTask(task.id)} style={{ width:'16px', height:'16px', borderRadius:'4px', flexShrink:0, border:`1.5px solid ${task.completed ? taskColor(task) : C.checkBorder}`, background:task.completed?taskColor(task):'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                            {task.completed && <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l3 3 5-6"/></svg>}
                          </button>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'13px', color:task.completed?C.muted:C.text, textDecoration:task.completed?'line-through':'none', lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
                            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px' }}>
                              <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:taskColor(task) }}/>
                              <span style={{ fontSize:'11px', color:C.muted }}>{task.list_name}</span>
                              {task.priority==='high' && <span style={{ fontSize:'10px', color:'#e07d5b' }}>🚩</span>}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, opacity:0.4, padding:'2px', flexShrink:0 }}>
                            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}` }}>
                      <button onClick={() => openTaskModalForDate(selectedCalDate)} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'8px 10px', borderRadius:'7px', border:`1px dashed ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>
                        <svg viewBox="0 0 11 11" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/></svg>
                        Add task
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        ) : (
          // ── Standard task list view ──────────────────────────────────
          <>
            <div style={{ padding:'28px 40px 0', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'3px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  {currentIconEmoji && <span style={{ fontSize:'22px', lineHeight:1 }}>{currentIconEmoji}</span>}
                  <h1 style={{ fontSize:'22px', fontWeight:700, color:C.text, margin:0, letterSpacing:'-0.3px' }}>{currentTitle}</h1>
                </div>
                <button onClick={openTaskModal} style={{
                  background:C.blue, color:'#fff', border:'none', borderRadius:'8px',
                  padding:'7px 15px', fontSize:'13px', fontWeight:500, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:'6px', fontFamily:'inherit',
                }}>
                  <svg viewBox="0 0 11 11" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/>
                  </svg>
                  New To-Do
                </button>
              </div>
              <div style={{ fontSize:'12px', color:C.muted, marginBottom:'16px' }}>
                {incomplete.length} task{incomplete.length!==1?'s':''} · {done.length} completed
              </div>
              <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
                {(['all','active','completed'] as const).map(f => (
                  <button key={f} onClick={()=>setFilter(f)} style={{
                    background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                    padding:'8px 0', marginRight:'20px', fontSize:'13px',
                    color: filter===f ? C.blue : C.muted,
                    borderBottom: filter===f ? `2px solid ${C.blue}` : '2px solid transparent',
                    marginBottom:'-1px', fontWeight: filter===f ? 500 : 400,
                    transition:'color 0.12s', textTransform:'capitalize',
                  }}>
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable task area */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 40px 40px' }}>
              {tasks.length===0 && (
                <div style={{ textAlign:'center', padding:'70px 0', color:C.muted, fontSize:'13px', lineHeight:2 }}>
                  <div style={{ fontSize:'32px', marginBottom:'8px', opacity:0.3 }}>✓</div>
                  No tasks here yet.<br/>Hit the + button to add one.
                </div>
              )}

              {(filter==='all'||filter==='active') && incomplete.length>0 && (
                <>
                  <div style={{ fontSize:'10.5px', fontWeight:600, color:C.sectionLbl, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:'5px' }}>Active</div>
                  {incomplete.map(task => <TaskRow key={task.id} task={task} C={C} onToggle={toggleTask} onDelete={deleteTask} onOpen={openDetail}/>)}
                  <div onClick={openTaskModal} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'7px 0', cursor:'pointer', opacity:0.4 }}>
                    <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`1.5px dashed ${C.checkBorder}`, flexShrink:0 }}/>
                    <span style={{ fontSize:'13.5px', color:C.muted }}>New To-Do</span>
                  </div>
                </>
              )}
              {(filter==='all'||filter==='completed') && done.length>0 && (
                <div style={{ marginTop:filter==='all'?'22px':'0' }}>
                  <div style={{ fontSize:'10.5px', fontWeight:600, color:C.sectionLbl, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:'5px' }}>Completed</div>
                  {done.map(task => <TaskRow key={task.id} task={task} C={C} onToggle={toggleTask} onDelete={deleteTask} onOpen={openDetail}/>)}
                </div>
              )}
            </div>
          </>
        )}

        {!isTrashView && (
          <div style={{
            borderTop: `1px solid ${C.border}`,
            height: '52px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '96px',
            background: C.contentBg,
          }}>
            <BarBtn title="New To-Do" C={C} onClick={openTaskModal}>
              <svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="11" y1="4" x2="11" y2="18"/>
                <line x1="4" y1="11" x2="18" y2="11"/>
              </svg>
            </BarBtn>
            <BarBtn title="Calendar View" C={C} onClick={() => router.push('/calendar')}>
              <svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="16" height="15" rx="2.5"/>
                <path d="M3 8.5h16M7.5 2.5v3M14.5 2.5v3"/>
                <path d="M7 13h2M10.5 13h2M14 13h2M7 16h2M10.5 16h2"/>
              </svg>
            </BarBtn>
            <BarBtn title="Next" C={C} onClick={() => {}}>
              <svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5l7 6-7 6"/>
              </svg>
            </BarBtn>
            <BarBtn title="Search" C={C} onClick={() => {}}>
              <svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="10" cy="10" r="6.5"/>
                <path d="M15 15l4 4"/>
              </svg>
            </BarBtn>
          </div>
        )}
      </div>

      {/* ══ DETAIL PANEL ═════════════════════════════════════════════ */}
      {!isTrashView && <div style={{
        position:'fixed', right:0, top:0, bottom:0, width:'320px',
        background:C.detailBg, borderLeft:`1px solid ${C.border}`,
        zIndex:50, display:'flex', flexDirection:'column', fontFamily:'inherit',
        transform: detail ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:C.text }}>Task details</div>
          <button onClick={()=>setDetail(null)} style={{ width:'28px', height:'28px', borderRadius:'7px', background:C.detailCloseB, border:'none', color:C.muted, cursor:'pointer', fontSize:'13px' }}>✕</button>
        </div>
        <div style={{ flex:1, padding:'20px', overflowY:'auto' }}>
          {([
            { label:'Title',    content: <input value={dpTitle} onChange={e=>setDpTitle(e.target.value)} style={dpInp}/> },
            { label:'Notes',    content: <textarea value={dpNotes} onChange={e=>setDpNotes(e.target.value)} rows={3} style={{...dpInp,resize:'none',lineHeight:1.6} as React.CSSProperties}/> },
            { label:'Priority', content: <select value={dpPriority} onChange={e=>setDpPriority(e.target.value)} style={dpInp}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select> },
            { label:'List',     content: <select value={dpListId??''} onChange={e=>setDpListId(e.target.value?Number(e.target.value):null)} style={dpInp}><option value="">None</option>{data?.lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select> },
          ] as {label:string,content:React.ReactNode}[]).map(({label,content})=>(
            <div key={label} style={{ marginBottom:'18px' }}>
              <div style={{ fontSize:'10px', fontWeight:500, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>{label}</div>
              {content}
            </div>
          ))}
        </div>
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}`, display:'flex', gap:'8px' }}>
          <button onClick={saveDetail} style={{ flex:1, background:C.blue, color:'#fff', border:'none', borderRadius:'8px', padding:'9px', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Save changes</button>
          <button onClick={()=>detail&&deleteTask(detail.id)} style={{ background:C.deleteBg, border:`1px solid ${C.deleteBorder}`, borderRadius:'8px', padding:'9px 14px', fontSize:'13px', color:C.deleteText, cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
        </div>
      </div>}

      {/* ══ NEW TASK MODAL ══════════════════════════════════════════ */}
      {showTaskModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) mtClose() }}
          style={{ position:'fixed', inset:0, zIndex:200, background:theme==='light'?'rgba(0,0,0,0.18)':'rgba(0,0,0,0.52)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', animation:'bdFadeIn 0.14s ease-out' }}
        >
          <div style={{ width:'100%', maxWidth:'500px', background:theme==='light'?'rgba(255,255,255,0.98)':'rgba(20,20,24,0.98)', backdropFilter:'blur(32px)', borderRadius:'18px', border:`1px solid ${theme==='light'?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.09)'}`, boxShadow:theme==='light'?'0 24px 64px rgba(0,0,0,0.14),0 4px 16px rgba(0,0,0,0.07)':'0 24px 64px rgba(0,0,0,0.8),0 4px 16px rgba(0,0,0,0.5)', overflow:'visible', position:'relative', animation:'mtSlideUp 0.26s cubic-bezier(0.34,1.4,0.64,1)' }}>

            {/* ── Header: location selector + close ── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 0', position:'relative' }}>

              {/* Location selector */}
              <div style={{ position:'relative' }}>
                <button
                  onClick={() => { setMtShowLoc(v => !v); setMtShowSched(false) }}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px 5px 8px', borderRadius:'9px', border:`1px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:'13px', fontWeight:500, fontFamily:'inherit', cursor:'pointer', transition:'all 0.12s' }}
                >
                  <div style={{ color:C.blue, display:'flex', alignItems:'center', flexShrink:0 }}>
                    {(() => { const sl = SMART_LISTS.find(s => s.id === mtLocation); return sl ? <sl.Icon /> : <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.blue }}/> })()}
                  </div>
                  <span>{mtGetLocationLabel()}</span>
                  <svg viewBox="0 0 8 5" width="8" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.45, transform:mtShowLoc?'rotate(180deg)':'none', transition:'transform 0.15s' }}>
                    <path d="M1 1l3 3 3-3"/>
                  </svg>
                </button>

                {/* Location dropdown */}
                {mtShowLoc && (
                  <>
                    <div onClick={() => setMtShowLoc(false)} style={{ position:'fixed', inset:0, zIndex:1 }}/>
                    <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, width:'210px', background:theme==='light'?'#FFFFFF':'#1C1C1E', border:`1px solid ${C.border}`, borderRadius:'13px', boxShadow:theme==='light'?'0 10px 32px rgba(0,0,0,0.13)':'0 10px 32px rgba(0,0,0,0.6)', overflow:'hidden', zIndex:10, animation:'bdFadeIn 0.1s ease-out', padding:'4px' }}>
                      {SMART_LISTS.map(item => (
                        <div key={item.id}
                          onClick={() => { setMtLocation(item.id); setMtShowLoc(false); if (item.id === 'upcoming') setMtShowSched(true) }}
                          style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'9px', cursor:'pointer', background:mtLocation===item.id?C.activeItemBg:'transparent', color:mtLocation===item.id?C.activeItemTx:C.text, fontSize:'13px', transition:'background 0.1s' }}
                          onMouseEnter={e => { if (mtLocation!==item.id) e.currentTarget.style.background = C.hoverItemBg }}
                          onMouseLeave={e => { if (mtLocation!==item.id) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ color:mtLocation===item.id?C.blue:C.muted, display:'flex', flexShrink:0 }}><item.Icon /></div>
                          <span style={{ flex:1 }}>{item.label}</span>
                          {mtLocation===item.id && <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l3 3 5-6"/></svg>}
                        </div>
                      ))}
                      {data?.lists && data.lists.filter(l => !l.is_inbox).length > 0 && (
                        <>
                          <div style={{ height:'1px', background:C.border, margin:'4px 0' }}/>
                          {data.lists.filter(l => !l.is_inbox).map(lst => (
                            <div key={lst.id}
                              onClick={() => { setMtLocation(String(lst.id)); setMtShowLoc(false) }}
                              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'9px', cursor:'pointer', background:mtLocation===String(lst.id)?C.activeItemBg:'transparent', color:mtLocation===String(lst.id)?C.activeItemTx:C.text, fontSize:'13px', transition:'background 0.1s' }}
                              onMouseEnter={e => { if (mtLocation!==String(lst.id)) e.currentTarget.style.background = C.hoverItemBg }}
                              onMouseLeave={e => { if (mtLocation!==String(lst.id)) e.currentTarget.style.background = 'transparent' }}
                            >
                              <div style={{ width:'16px', height:'16px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:mtLocation===String(lst.id)?C.blue:C.circleBorder }}/>
                              </div>
                              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lst.name}</span>
                              {mtLocation===String(lst.id) && <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l3 3 5-6"/></svg>}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Close */}
              <button
                onClick={mtClose}
                style={{ width:'26px', height:'26px', borderRadius:'7px', background:C.detailCloseB, border:'none', color:C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = theme==='light'?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = C.detailCloseB}
              >
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/>
                </svg>
              </button>
            </div>

            {/* ── Task title input ── */}
            <div style={{ padding:'14px 18px 12px' }}>
              <input
                ref={mtInputRef}
                autoFocus
                value={mtTitle}
                onChange={e => setMtTitle(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) mtCreate(); if (e.key==='Escape') mtClose() }}
                placeholder="New Task"
                style={{ width:'100%', border:'none', background:'transparent', fontSize:'18px', fontWeight:500, color:C.text, outline:'none', fontFamily:'inherit', letterSpacing:'-0.25px', lineHeight:1.5, boxSizing:'border-box' }}
              />
              {mtDate && (
                <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'12px', color:C.blue, background:theme==='light'?'rgba(26,127,232,0.09)':'rgba(26,127,232,0.16)', padding:'3px 10px', borderRadius:'20px' }}>
                    <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1.5" y="2.5" width="11" height="10" rx="2"/>
                      <path d="M1.5 6h11M4.5 1v3M9.5 1v3"/>
                    </svg>
                    {mtDate}
                  </span>
                  <button onClick={() => setMtDate('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:'0 2px', fontSize:'14px', lineHeight:1, display:'flex', alignItems:'center' }}>×</button>
                </div>
              )}
            </div>

            {/* ── Footer: schedule | flag | spacer | create ── */}
            <div style={{ display:'flex', alignItems:'center', padding:'10px 12px 14px', gap:'2px', borderTop:`1px solid ${C.border}` }}>

              {/* Schedule */}
              <div style={{ position:'relative' }}>
                <button
                  onClick={() => { setMtShowSched(v => !v); setMtShowLoc(false) }}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 10px', borderRadius:'8px', border:'none', background:mtShowSched?C.hoverItemBg:'transparent', color:(mtDate||mtLocation==='upcoming')?C.blue:C.muted, fontSize:'12.5px', fontFamily:'inherit', cursor:'pointer', transition:'all 0.12s', fontWeight:(mtDate||mtLocation==='upcoming')?500:400 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.hoverItemBg}
                  onMouseLeave={e => e.currentTarget.style.background = mtShowSched?C.hoverItemBg:'transparent'}
                >
                  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1.5" y="3" width="13" height="11" rx="2.5"/>
                    <path d="M1.5 7h13M5 1.5v3M11 1.5v3"/>
                  </svg>
                  {mtDate || (mtLocation === 'upcoming' ? 'Tomorrow' : 'Schedule')}
                </button>
                {mtShowSched && (
                  <>
                    <div onClick={() => setMtShowSched(false)} style={{ position:'fixed', inset:0, zIndex:1 }}/>
                    <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, background:theme==='light'?'#FFFFFF':'#1C1C1E', border:`1px solid ${C.border}`, borderRadius:'13px', boxShadow:theme==='light'?'0 10px 32px rgba(0,0,0,0.13)':'0 10px 32px rgba(0,0,0,0.6)', padding:'14px', zIndex:10, animation:'bdFadeIn 0.1s ease-out', minWidth:'220px' }}>
                      <div style={{ fontSize:'10.5px', fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Due Date</div>
                      <input type="date" value={mtDate} onChange={e => { setMtDate(e.target.value); setMtShowSched(false) }}
                        style={{ width:'100%', padding:'7px 10px', border:`1px solid ${C.inputBorder}`, borderRadius:'8px', background:C.inputBg, color:C.text, fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box', cursor:'pointer' }}
                      />
                      <div style={{ display:'flex', gap:'6px', marginTop:'10px', flexWrap:'wrap' }}>
                        {[
                          { label:'Today',     value: new Date().toISOString().slice(0,10) },
                          { label:'Tomorrow',  value: new Date(Date.now()+86400000).toISOString().slice(0,10) },
                          { label:'Next week', value: new Date(Date.now()+7*86400000).toISOString().slice(0,10) },
                        ].map(q => (
                          <button key={q.label} onClick={() => { setMtDate(q.value); setMtShowSched(false) }}
                            style={{ padding:'5px 11px', borderRadius:'20px', border:`1px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:'12px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = C.hoverItemBg}
                            onMouseLeave={e => e.currentTarget.style.background = C.inputBg}
                          >{q.label}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Priority flag */}
              <button
                onClick={() => { const cycle = ['none','low','medium','high'] as const; setMtPriority(p => cycle[(cycle.indexOf(p)+1)%4]) }}
                title={`Priority: ${mtPriority}`}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'32px', height:'32px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', transition:'all 0.12s', color: mtPriority==='none' ? C.muted : mtPriority==='low' ? C.tagLowTx : mtPriority==='medium' ? C.tagMediumTx : C.tagHighTx, flexShrink:0 }}
                onMouseEnter={e => e.currentTarget.style.background = C.hoverItemBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill={mtPriority!=='none'?'currentColor':'none'} stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 1v14M3 1h9.5l-3 4.5 3 4.5H3"/>
                </svg>
              </button>

              <div style={{ flex:1 }}/>

              {/* Create */}
              <button
                onClick={mtCreate}
                disabled={!mtTitle.trim()}
                style={{ padding:'7px 20px', borderRadius:'9px', border:'none', background:mtTitle.trim()?C.blue:(theme==='light'?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.07)'), color:mtTitle.trim()?'#fff':C.muted, fontSize:'13.5px', fontWeight:700, cursor:mtTitle.trim()?'pointer':'default', fontFamily:'inherit', transition:'all 0.15s', letterSpacing:'-0.1px', flexShrink:0 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BRAIN DUMP MODAL ════════════════════════════════════════ */}
      {bdOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) bdClose() }} style={{ position:'fixed', inset:0, zIndex:200, background:theme==='light'?'rgba(0,0,0,0.35)':'rgba(0,0,0,0.72)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', animation:'bdFadeIn 0.18s ease-out' }}>
          <div style={{ width:'100%', maxWidth:'540px', background:theme==='light'?'rgba(255,255,255,0.97)':'rgba(16,16,20,0.98)', backdropFilter:'blur(24px)', borderRadius:'22px', border:`1px solid ${theme==='light'?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.07)'}`, boxShadow:theme==='light'?'0 24px 72px rgba(0,0,0,0.14),0 0 0 1px rgba(255,255,255,0.6)':'0 24px 72px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column', animation:'bdSlideUp 0.28s cubic-bezier(0.34,1.4,0.64,1)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'11px', flexShrink:0, background:'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(99,102,241,0.4)' }}>
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round"><rect x="5" y="1" width="6" height="9" rx="3"/><path d="M2 7.5 A6 6 0 0 0 14 7.5"/><line x1="8" y1="13" x2="8" y2="16"/><line x1="5" y1="16" x2="11" y2="16"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:700, color:C.text, letterSpacing:'-0.2px' }}>Brain Dump</div>
                  <div style={{ fontSize:'11.5px', color:C.muted, marginTop:'1px' }}>{bdListening?'● Listening — speak freely':bdProcessing?'Extracting tasks…':'Tap the mic to start'}</div>
                </div>
              </div>
              <button onClick={bdClose} style={{ width:'30px', height:'30px', borderRadius:'8px', background:C.detailCloseB, border:'none', color:C.muted, cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
            </div>
            <div style={{ padding:'24px 24px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'18px', background:theme==='light'?'linear-gradient(180deg,rgba(99,102,241,0.04) 0%,transparent 100%)':'linear-gradient(180deg,rgba(99,102,241,0.09) 0%,transparent 100%)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'2.5px', height:'56px', width:'100%', justifyContent:'center' }}>
                {bdWave.map((h,i) => (
                  <div key={i} style={{ width:'3px', borderRadius:'3px', flexShrink:0, height:`${h}%`, background:bdListening?`hsl(${240+i*3.5},68%,${theme==='light'?'55%':'65%'})`:theme==='light'?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.09)', transition:'height 0.06s ease-out' }}/>
                ))}
              </div>
              <button onClick={bdListening?bdStopListening:bdStartListening} style={{ width:'68px', height:'68px', borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0, background:bdListening?'linear-gradient(135deg,#ef4444 0%,#f97316 100%)':'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:bdListening?'0 0 0 0 rgba(239,68,68,0.35),0 10px 28px rgba(239,68,68,0.4)':'0 10px 28px rgba(99,102,241,0.4)', animation:bdListening?'bdPulse 1.6s infinite':'none', transition:'all 0.22s cubic-bezier(0.34,1.2,0.64,1)' }}>
                {bdListening?<div style={{ width:'20px', height:'20px', borderRadius:'5px', background:'white' }}/>:<svg viewBox="0 0 16 16" width="24" height="24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><rect x="4.5" y="1" width="7" height="9" rx="3.5"/><path d="M2 8 A6 6 0 0 0 14 8"/><line x1="8" y1="14" x2="8" y2="16"/><line x1="5" y1="16" x2="11" y2="16"/></svg>}
              </button>
              <div style={{ fontSize:'11px', color:C.muted, textAlign:'center', lineHeight:1.6 }}>
                {bdListening?<span style={{ color:theme==='light'?'#6366f1':'rgba(148,145,255,0.85)', fontWeight:500 }}>Say "Scratch that" · "High priority" · "Due tomorrow"</span>:<span>Voice commands are supported while speaking</span>}
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'0 24px 8px' }}>
              {bdError && <div style={{ padding:'10px 14px', borderRadius:'10px', marginBottom:'14px', background:C.deleteBg, border:`1px solid ${C.deleteBorder}`, color:C.deleteText, fontSize:'12.5px' }}>{bdError}</div>}
              {(bdTranscript||bdInterim) && (
                <div style={{ padding:'14px', borderRadius:'12px', marginBottom:'16px', background:theme==='light'?'rgba(0,0,0,0.03)':'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, fontSize:'13.5px', lineHeight:1.75, color:C.text, maxHeight:'100px', overflowY:'auto' }}>
                  {bdTranscript}{bdInterim&&<span style={{ color:C.muted, fontStyle:'italic' }}>{bdInterim}</span>}
                </div>
              )}
              {bdProcessing && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', color:C.muted, fontSize:'12px', marginBottom:'14px' }}>
                  <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#6366f1', animation:`bdDot 1.2s ${i*0.2}s infinite` }}/>)}
                  </div>
                  Extracting tasks from your words…
                </div>
              )}
              {bdTasks.length > 0 && (
                <>
                  <div style={{ fontSize:'10.5px', fontWeight:600, color:C.sectionLbl, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'10px' }}>{bdTasks.length} task{bdTasks.length!==1?'s':''} extracted</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {bdTasks.map((task,i) => {
                      const pc = task.priority==='high'?{bg:C.tagHighBg,color:C.tagHighTx}:task.priority==='medium'?{bg:C.tagMediumBg,color:C.tagMediumTx}:{bg:C.tagLowBg,color:C.tagLowTx}
                      return (
                        <div key={task.id} style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 14px', borderRadius:'13px', position:'relative', background:theme==='light'?'#fff':'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, boxShadow:theme==='light'?'0 1px 4px rgba(0,0,0,0.05)':'none', animation:`bdCardIn 0.32s ${i*0.06}s cubic-bezier(0.34,1.2,0.64,1) both` }}>
                          <div style={{ width:'18px', height:'18px', borderRadius:'50%', flexShrink:0, marginTop:'2px', border:`1.5px solid ${C.checkBorder}` }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'13.5px', fontWeight:500, color:C.text, lineHeight:1.45, marginBottom:'6px' }}>{task.title}</div>
                            <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                              <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', fontWeight:500, background:pc.bg, color:pc.color }}>{task.priority.charAt(0).toUpperCase()+task.priority.slice(1)}</span>
                              {task.dueDate&&<span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:C.tagListBg, color:C.tagListTx }}>📅 {task.dueDate}</span>}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
                            <button onClick={()=>bdSaveTask(task)} title="Add to tasks" style={{ width:'26px', height:'26px', borderRadius:'7px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)', color:'#fff', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(99,102,241,0.35)' }}>+</button>
                            <button onClick={()=>setBdTasks(p=>p.filter(t=>t.id!==task.id))} style={{ width:'26px', height:'26px', borderRadius:'7px', background:C.detailCloseB, border:'none', color:C.muted, cursor:'pointer', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {!bdTranscript&&!bdInterim&&bdTasks.length===0&&!bdError&&!bdProcessing&&(
                <div style={{ textAlign:'center', padding:'28px 0 20px', color:C.muted }}>
                  <div style={{ fontSize:'36px', marginBottom:'10px', opacity:0.35 }}>🎙️</div>
                  <div style={{ fontSize:'13px', lineHeight:1.8 }}>Tap the mic and speak freely.<br/><span style={{ opacity:0.65, fontSize:'12px' }}>Tasks appear automatically as you talk.</span></div>
                </div>
              )}
              <div style={{ height:'16px' }}/>
            </div>
            {bdTasks.length > 0 && (
              <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:'10px' }}>
                <button onClick={bdSaveAll} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.01em', boxShadow:'0 4px 16px rgba(99,102,241,0.35)', transition:'opacity 0.15s' }}>
                  Save all {bdTasks.length} task{bdTasks.length!==1?'s':''}
                </button>
                <button onClick={()=>setBdTasks([])} style={{ padding:'12px 18px', fontFamily:'inherit', background:C.deleteBg, border:`1px solid ${C.deleteBorder}`, borderRadius:'12px', fontSize:'13px', color:C.deleteText, cursor:'pointer' }}>Clear</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bdFadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes bdSlideUp { from{opacity:0;transform:scale(0.94) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes mtSlideUp { from{opacity:0;transform:scale(0.96) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes bdPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35),0 10px 28px rgba(239,68,68,0.4)}55%{box-shadow:0 0 0 14px rgba(239,68,68,0),0 10px 28px rgba(239,68,68,0.4)} }
        @keyframes bdDot     { 0%,80%,100%{transform:scale(0.55);opacity:0.4}40%{transform:scale(1.1);opacity:1} }
        @keyframes bdCardIn  { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

/* ─── Bottom Bar Button ──────────────────────────────────────────── */
function BarBtn({ title, onClick, C, children }: {
  title: string; onClick: () => void; C: Colors; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '64px', height: '52px',
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hov ? C.text : C.muted,
        transform: hov ? 'scale(1.1)' : 'scale(1)',
        transition: 'color 0.12s, transform 0.12s',
      }}
    >
      {children}
    </button>
  )
}

/* ─── Sidebar Item (smart/system lists with SVG icon) ────────────── */
function SidebarItem({ Icon, label, count, active, C, theme, onClick }: {
  Icon: React.FC; label: string; count: number|null
  active: boolean; C: Colors; theme: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const isLight = theme === 'light'
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:'10px',
        padding:'8px 12px', margin:'1px 8px', borderRadius:'10px', cursor:'pointer',
        background: active ? C.activeItemBg : hov ? C.hoverItemBg : 'transparent',
        transition:'background 0.1s', userSelect:'none',
      }}
    >
      <div style={{
        width:'26px', height:'26px', borderRadius:'7px', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: active
          ? isLight ? 'rgba(26,127,232,0.15)' : 'rgba(26,127,232,0.22)'
          : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
        color: active ? C.activeItemTx : hov ? C.text : C.muted,
        transition:'all 0.12s',
      }}>
        <Icon />
      </div>
      <span style={{
        flex:1, fontSize:'13.5px', fontWeight: active ? 500 : 400,
        color: active ? C.activeItemTx : (hov ? C.text : C.muted),
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        transition:'color 0.12s',
      }}>
        {label}
      </span>
      {count != null && count > 0 && (
        <span style={{
          fontSize:'11.5px', fontWeight:500,
          color: active ? C.activeItemTx : C.muted,
          flexShrink:0, minWidth:'16px', textAlign:'right',
        }}>{count}</span>
      )}
    </div>
  )
}

/* ─── Sidebar Item (user-created lists with dot) ─────────────────── */
function SidebarItemCustom({ label, count, active, C, theme, onClick }: {
  label: string; count: number|null
  active: boolean; C: Colors; theme: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:'10px',
        padding:'8px 12px', margin:'1px 8px', borderRadius:'10px', cursor:'pointer',
        background: active ? C.activeItemBg : (hov ? C.hoverItemBg : 'transparent'),
        transition:'background 0.1s', userSelect:'none',
      }}
    >
      <div style={{
        width:'26px', height:'26px', borderRadius:'7px', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: active
          ? theme==='light' ? 'rgba(26,127,232,0.15)' : 'rgba(26,127,232,0.22)'
          : theme==='light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
      }}>
        <div style={{ width:'7px', height:'7px', borderRadius:'50%', background: active ? C.activeItemTx : C.circleBorder }}/>
      </div>
      <span style={{ flex:1, fontSize:'13.5px', fontWeight:active?500:400, color:active?C.activeItemTx:(hov?C.text:C.muted), whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {label}
      </span>
      {count != null && count > 0 && (
        <span style={{ fontSize:'11.5px', fontWeight:500, color:active?C.activeItemTx:C.muted, flexShrink:0 }}>{count}</span>
      )}
    </div>
  )
}

/* ─── Task Row ───────────────────────────────────────────────────── */
function TaskRow({ task, onToggle, onDelete, onOpen, C }: {
  task: Task; onToggle:(id:number)=>void; onDelete:(id:number)=>void; onOpen:(t:Task)=>void; C: Colors
}) {
  const [hov,  setHov]  = useState(false)
  const [star, setStar] = useState(false)
  const pc = task.priority==='high' ? {bg:C.tagHighBg,color:C.tagHighTx} : task.priority==='medium' ? {bg:C.tagMediumBg,color:C.tagMediumTx} : {bg:C.tagLowBg,color:C.tagLowTx}

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onOpen(task)}
      style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'8px 4px 8px 0', borderBottom:`1px solid ${C.taskBorder}`, cursor:'default', position:'relative', background:C.taskRowBg }}
    >
      <div onClick={e=>{e.stopPropagation();onToggle(task.id)}} style={{ width:'20px', height:'20px', borderRadius:'50%', flexShrink:0, marginTop:'1px', cursor:'pointer', border:task.completed?'none':`1.5px solid ${C.checkBorder}`, background:task.completed?C.checkDoneBg:(hov?C.checkHoverBg:'transparent'), display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {task.completed&&<div style={{ width:'5px', height:'9px', border:'2px solid white', borderTop:'none', borderLeft:'none', transform:'rotate(40deg) translateY(-1px)' }}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13.5px', lineHeight:1.45, color:task.completed?C.taskDone:C.taskText, textDecoration:task.completed?'line-through':'none' }}>{task.title}</div>
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginTop:'4px' }}>
          <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', fontWeight:500, background:pc.bg, color:pc.color }}>{task.priority.charAt(0).toUpperCase()+task.priority.slice(1)}</span>
          {task.list_name&&task.list_name!=='Task'&&<span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:C.tagListBg, color:C.tagListTx }}>{task.list_name}</span>}
        </div>
      </div>
      <button onClick={e=>{e.stopPropagation();setStar(s=>!s)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'15px', lineHeight:1, paddingTop:'2px', flexShrink:0, color:star?'#FFB800':C.checkBorder, opacity:star?1:(hov?0.4:0), transition:'opacity 0.12s, color 0.12s' }}>★</button>
      {hov&&(
        <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', display:'flex', gap:'4px', paddingRight:'28px' }}>
          <button onClick={()=>onDelete(task.id)} style={{ width:'24px', height:'24px', borderRadius:'6px', background:C.deleteBg, border:`1px solid ${C.deleteBorder}`, fontSize:'11px', color:C.deleteText, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>
      )}
    </div>
  )
}
