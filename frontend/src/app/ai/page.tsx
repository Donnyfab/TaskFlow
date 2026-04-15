'use client'
import { useEffect, useState, useRef, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const historyRef     = useRef<Message[]>([])
  historyRef.current = messages

  useEffect(() => {
    fetch(`${API}/api/me`, { credentials: 'include' }).then(r => r.json()).then(d => {
      if (d.name) {
        const parts = d.name.split(' ')
        setUserInitials(parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : d.name.slice(0,2).toUpperCase())
      }
    }).catch(() => {})
    fetchSidebar()
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function fetchSidebar() {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${API}/ai/threads/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        fetch(`${API}/ai/projects/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{"name":"__list__"}' }),
      ])
    } catch {}
    // Just load existing threads via the chat endpoint on first message
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
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, system: SYSTEM_PROMPT, active_page: 'ai', persist_chat: true, thread_id: threadId, project_id: projectId })
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
      const res = await fetch(`${API}/ai/actions/${actionId}/${decision}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId })
      })
      const data = await res.json()
      setActionStatus(prev => ({ ...prev, [actionId]: data.ok ? (decision === 'confirm' ? 'Done.' : 'Skipped.') : 'Could not apply.' }))
      setResolvedActions(prev => new Set([...prev, actionId]))
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timeLabel: now12() }])
      if (data.thread) { setThreadId(data.thread.id); setThreads(prev => { const f = prev.filter(t => t.id !== data.thread.id); return [data.thread, ...f] }) }
    } catch {
      setActionStatus(prev => ({ ...prev, [actionId]: 'Could not apply.' }))
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return
    try {
      const res = await fetch(`${API}/ai/projects/create`, {
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', height: '100vh', overflow: 'hidden' }}>

      {/* CHAT AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', borderRight: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', position: 'relative', flexShrink: 0 }}>
              ✦
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(80,220,130,0.9)', border: '2px solid #0A0A0A' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Taskflow AI</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Your personal growth coach · Always online</div>
            </div>
          </div>
          <button onClick={startNewChat} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '5px 11px', cursor: 'pointer' }}>New chat</button>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '7px', padding: '12px 24px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)', scrollbarWidth: 'none' }}>
          {QUICK_ACTIONS.map(q => (
            <button key={q.label} onClick={() => send(q.text)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '100px', padding: '6px 14px', fontSize: '11px', color: 'rgba(255,255,255,0.52)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span>{q.icon}</span>{q.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isEmpty ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 24px', textAlign: 'center', margin: 'auto' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>✦</div>
              <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', color: 'rgba(255,255,255,0.9)', marginBottom: '10px', lineHeight: 1.2 }}>Let's get your life<br/>organized.</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.36)', lineHeight: 1.75, maxWidth: '340px', marginBottom: '28px' }}>I know your tasks, habits, streaks, and journal. I'm not a generic AI — I'm your personal growth coach. Tell me what you need.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
                {[
                  { icon: '☀️', text: 'Plan my day — tell me exactly what I should focus on right now.', label: 'Plan My Day' },
                  { icon: '🎯', text: 'Help me set my first goals in Taskflow. Where should I start?', label: 'Set My First Goals' },
                  { icon: '🔁', text: 'Help me build better habits. What should I track and how do I stay consistent?', label: 'Build Better Habits' },
                ].map(b => (
                  <button key={b.label} onClick={() => send(b.text)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '13px 18px', fontSize: '13px', color: 'rgba(255,255,255,0.62)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', width: '26px', textAlign: 'center', flexShrink: 0 }}>{b.icon}</span>{b.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {msg.role === 'user' ? userInitials : '✦'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '78%', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '11px 15px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      fontSize: '13px', lineHeight: 1.68, wordBreak: 'break-word',
                      background: msg.role === 'user' ? 'rgba(255,255,255,0.11)' : '#111',
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)',
                      border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    }}>
                      {msg.content.split('\n').map((line, li) => <span key={li}>{line}{li < msg.content.split('\n').length - 1 && <br/>}</span>)}
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', padding: '0 4px' }}>{msg.timeLabel}</div>
                  </div>
                </div>
              ))}

              {/* Action cards */}
              {actions.map(action => (
                <div key={action.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>✦</div>
                  <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 14px', maxWidth: '78%' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.24)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Needs confirmation</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.86)', marginBottom: '6px' }}>{action.title}</div>
                    <div style={{ fontSize: '12px', lineHeight: 1.65, color: 'rgba(255,255,255,0.58)' }}>{action.confirmation_text}</div>
                    {actionStatus[action.id] ? (
                      <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.34)' }}>{actionStatus[action.id]}</div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button onClick={() => resolveAction(action.id, 'confirm')} disabled={resolvedActions.has(action.id)} style={{ borderRadius: '10px', padding: '8px 11px', border: '1px solid #fff', background: '#fff', color: '#0A0A0A', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                        <button onClick={() => resolveAction(action.id, 'cancel')} disabled={resolvedActions.has(action.id)} style={{ borderRadius: '10px', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.72)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Not now</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>✦</div>
                  <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 16px 16px 16px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {[0, 180, 360].map(delay => (
                      <div key={delay} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: `tdot 1.2s ${delay}ms infinite` }} />
                    ))}
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginLeft: '4px' }}>Analyzing your patterns…</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '10px 12px' }}>
            <textarea ref={textareaRef} value={input} onChange={autoResize}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask your AI coach anything…"
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit', resize: 'none', maxHeight: '120px', lineHeight: 1.55, padding: '2px 0' }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: '32px', height: '32px', borderRadius: '9px', background: loading || !input.trim() ? 'rgba(255,255,255,0.2)' : '#fff', border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Saved chats */}
      <div style={{ background: '#0D0D0D', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>Saved chats</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.24)' }}>Persistent AI conversations and projects</div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 12px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.34)' }}>⌕</span>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search saved chats and projects"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 12px 0' }}>
          <button onClick={() => setShowProjectForm(f => !f)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.68)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            ▣ New Project
          </button>
        </div>

        {/* Project form */}
        {showProjectForm && (
          <div style={{ margin: '12px 12px 0', padding: '12px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.34)', marginBottom: '10px' }}>Create new project</div>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="TaskFlow launch, Fitness reset..."
              style={{ width: '100%', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.82)', fontFamily: 'inherit', fontSize: '12px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
            <textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Optional description" rows={2}
              style={{ width: '100%', marginTop: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.82)', fontFamily: 'inherit', fontSize: '12px', padding: '10px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={createProject} style={{ flex: 1, background: '#fff', color: '#0A0A0A', border: '1px solid #fff', borderRadius: '10px', padding: '9px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Create project</button>
              <button onClick={() => setShowProjectForm(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.68)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <>
            <div style={{ padding: '16px 18px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>Projects</div>
            <div style={{ padding: '0 10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.projects.map(p => (
                <div key={p.id} onClick={() => setProjectId(p.id)} style={{ background: projectId === p.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${projectId === p.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{p.chat_count || 0}</div>
                  </div>
                  {p.description && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, marginTop: '5px' }}>{p.description}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Threads */}
        <div style={{ padding: '16px 18px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>Recent chats</div>
        <div style={{ padding: '0 10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.threads.length === 0 ? (
            <div style={{ margin: '0 2px', padding: '12px 13px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', fontSize: '11px', color: 'rgba(255,255,255,0.32)', lineHeight: 1.6 }}>
              Start a chat and it will show up here automatically.
            </div>
          ) : (
            filtered.threads.map(t => (
              <div key={t.id} onClick={() => { setThreadId(t.id); /* load thread messages */ }}
                style={{ background: threadId === t.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${threadId === t.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{t.activity_label}</div>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, marginTop: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.preview || 'No messages yet.'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px', fontSize: '10px', color: 'rgba(255,255,255,0.24)' }}>
                  {t.project_name && <span style={{ display: 'inline-flex', padding: '3px 7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>{t.project_name}</span>}
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