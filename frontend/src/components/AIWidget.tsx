'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface Message { role: 'user' | 'ai'; text: string; time?: string }
interface ActionCard { id: number; title: string; confirmation_text: string }

export default function AIWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [actions, setActions] = useState<ActionCard[]>([])
  const [resolvedActions, setResolvedActions] = useState<Set<number>>(new Set())
  const [actionStatus, setActionStatus] = useState<Record<number, string>>({})
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [threadId, setThreadId] = useState<number | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const panelRef    = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const historyRef  = useRef<{ role: string; content: string }[]>([])
  const dragRef     = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const activePage = pathname?.split('/')[1] || 'app'
  const hidden = pathname?.startsWith('/auth') || pathname?.startsWith('/ai')

  useEffect(() => {
    if (hidden) return
    const stored = localStorage.getItem('taskflow.aiWidget.open')
    if (stored === '1') setOpen(true)
    const storedPos = localStorage.getItem('taskflow.aiWidget.position')
    if (storedPos) { try { setPos(JSON.parse(storedPos)) } catch {} }
  }, [hidden])

  useEffect(() => {
    if (hidden) return
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, pending, hidden])

  useEffect(() => {
    if (hidden) return
    localStorage.setItem('taskflow.aiWidget.open', open ? '1' : '0')
    if (open && !pos) {
      setPos({ x: window.innerWidth - 384, y: window.innerHeight - 480 })
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open, hidden])

  // All hooks above — early return safe here
  if (hidden) return null

  function now12() {
    const d = new Date()
    const h = d.getHours() % 12 || 12
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
  }

  function clamp(p: { x: number; y: number }) {
    const pw = panelRef.current?.offsetWidth || 360
    const ph = panelRef.current?.offsetHeight || 460
    return {
      x: Math.min(Math.max(p.x, 8), window.innerWidth - pw - 8),
      y: Math.min(Math.max(p.y, 8), window.innerHeight - ph - 8),
    }
  }

  function onDragStart(e: React.PointerEvent) {
    if (!pos) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onDragMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const next = clamp({
      x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
    })
    setPos(next)
    localStorage.setItem('taskflow.aiWidget.position', JSON.stringify(next))
  }

  function onDragEnd(e: React.PointerEvent) {
    if (!dragRef.current) return
    dragRef.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || pending) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    const userMsg = { role: 'user' as const, text: msg, time: now12() }
    setMessages(prev => [...prev, userMsg])
    historyRef.current = [...historyRef.current, { role: 'user', content: msg }]
    if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-20)
    setPending(true)

    try {
      let tid = threadId
      if (!tid) {
        const tRes = await fetch(`${API}/ai/threads/create`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const tData = await tRes.json()
        if (tData.ok && tData.thread) { tid = tData.thread.id; setThreadId(tid) }
      }
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyRef.current,
          system: `You are Taskflow AI, a personal life coach. Be direct, warm, and specific. Keep responses under 3 sentences unless a plan is needed. The user is on the ${activePage} page right now.`,
          active_page: activePage,
          persist_chat: true,
          thread_id: tid,
        })
      })
      const data = await res.json()
      const reply = data.reply || "I'm here — what do you need?"
      setMessages(prev => [...prev, { role: 'ai', text: reply, time: now12() }])
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]
      if (data.thread) setThreadId(data.thread.id)
      if (data.pending_actions) setActions(prev => [...prev, ...data.pending_actions])
      else if (data.pending_action) setActions(prev => [...prev, data.pending_action])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm here for you. What's on your mind?", time: now12() }])
    }
    setPending(false)
  }

  async function resolveAction(actionId: number, decision: 'confirm' | 'cancel') {
    setActionStatus(prev => ({ ...prev, [actionId]: decision === 'confirm' ? 'Applying...' : 'Clearing...' }))
    setResolvedActions(prev => new Set([...prev, actionId]))
    try {
      const res = await fetch(`${API}/ai/actions/${actionId}/${decision}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId })
      })
      const data = await res.json()
      setActionStatus(prev => ({ ...prev, [actionId]: data.ok ? (decision === 'confirm' ? 'Done.' : 'Skipped.') : 'Could not apply.' }))
      if (data.reply) setMessages(prev => [...prev, { role: 'ai', text: data.reply, time: now12() }])
    } catch {
      setActionStatus(prev => ({ ...prev, [actionId]: 'Could not apply.' }))
    }
  }

  function resetChat() {
    setMessages([]); setActions([]); setResolvedActions(new Set())
    setActionStatus({}); setThreadId(null); historyRef.current = []
    setInput(''); inputRef.current?.focus()
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          position: 'fixed', right: '18px', bottom: '18px', width: '54px', height: '54px',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', background: '#0F0F0F',
          color: 'rgba(255,255,255,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 18px 42px rgba(0,0,0,0.34)', cursor: 'pointer', fontSize: '20px', zIndex: 9999,
        }}>✦</button>
      )}

      {open && pos && (
        <div ref={panelRef} style={{
          position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`, zIndex: 9999,
          width: 'min(360px, calc(100vw - 48px))',
          background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '18px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.44)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Topbar */}
          <div onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}
            style={{ padding: hasMessages ? '10px 10px 0' : '0', cursor: 'grab', userSelect: 'none', display: hasMessages ? 'flex' : 'none', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setOpen(false)} style={{ width: '26px', height: '26px', borderRadius: '7px', border: 0, background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => window.location.href = '/ai'} title="Open full AI" style={{ width: '26px', height: '26px', borderRadius: '7px', border: 0, background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⤢</button>
              <button onClick={resetChat} title="New chat" style={{ width: '26px', height: '26px', borderRadius: '7px', border: 0, background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
            </div>
          </div>

          {/* Messages */}
          {hasMessages && (
            <div ref={messagesRef} style={{ maxHeight: '320px', overflowY: 'auto', padding: '12px 10px 4px', display: 'flex', flexDirection: 'column', gap: '12px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'ai' ? (
                    <div style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(255,255,255,0.78)', wordBreak: 'break-word' }}>
                      {msg.text.split('\n').map((line, li) => <span key={li}>{line}{li < msg.text.split('\n').length - 1 && <br/>}</span>)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px 12px', maxWidth: '70%', wordBreak: 'break-word' }}>
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}

              {actions.map(action => (
                <div key={action.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '12px', padding: '12px 13px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', marginBottom: '6px' }}>Needs confirmation</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.78)', marginBottom: '6px' }}>{action.title}</div>
                  <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'rgba(255,255,255,0.58)' }}>{action.confirmation_text}</div>
                  {actionStatus[action.id] ? (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.78)' }}>{actionStatus[action.id]}</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => resolveAction(action.id, 'confirm')} disabled={resolvedActions.has(action.id)} style={{ borderRadius: '999px', padding: '8px 11px', border: '1px solid #fff', background: '#fff', color: '#0A0A0A', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                      <button onClick={() => resolveAction(action.id, 'cancel')} disabled={resolvedActions.has(action.id)} style={{ borderRadius: '999px', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.78)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Not now</button>
                    </div>
                  )}
                </div>
              ))}

              {pending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[0, 180, 360].map(d => (
                    <div key={d} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.48)', animation: `tdot 1.2s ${d}ms infinite` }}/>
                  ))}
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', marginLeft: '5px' }}>Analyzing your patterns…</span>
                </div>
              )}
            </div>
          )}

          {/* Composer */}
          <div style={{ padding: '8px', flexShrink: 0 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.09)', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', padding: '10px 10px 9px' }}>
              <textarea ref={inputRef} value={input} onChange={autoResize}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask anything" rows={1}
                style={{ width: '100%', minHeight: '28px', maxHeight: '96px', resize: 'none', border: 0, outline: 'none', background: 'transparent', color: 'rgba(255,255,255,0.78)', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.45, marginBottom: '8px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={() => setOpen(false)} style={{ width: '28px', height: '28px', borderRadius: '10px', border: 0, background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
                  <button onClick={() => window.location.href = '/ai'} style={{ width: '28px', height: '28px', borderRadius: '10px', border: 0, background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>⤢</button>
                </div>
                <button onClick={() => send()} disabled={pending || !input.trim()} style={{
                  width: '32px', height: '32px', borderRadius: '999px', border: 0,
                  background: pending || !input.trim() ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: pending || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 12.5V3.5M8 3.5L4.8 6.7M8 3.5L11.2 6.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tdot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 0.9; }
        }
      `}</style>
    </>
  )
}