'use client'

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { apiUrl } from '@/lib/api-base'
import { useTheme } from '@/hooks/useTheme'
import styles from './coach.module.css'

const COMPLETION_PREFIX = 'FORGE_COMPLETE||'
const FLASK_LOGIN = `${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/login`

type StoredMessage = {
  id?: number
  role: 'user' | 'assistant'
  content: string
  session_date?: string | null
  created_at?: string | null
}

type CoachMessage = StoredMessage & {
  localId: string
  emphasis?: boolean
}

type Commitment = {
  id: number
  text: string
  deadline?: string | null
  status: string
  times_carried?: number
}

type CoachContext = {
  user?: {
    onboarding_complete?: boolean
  } | null
  mission?: {
    title?: string
  } | null
  active_commitment?: Commitment | null
  days_active?: number
  last_checkin_at?: string | null
}

type ContextResponse = {
  context?: CoachContext
  messages?: StoredMessage[]
  error?: string
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isToday(value?: string | null) {
  if (!value) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value === localDateKey()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10) === localDateKey()
  return localDateKey(parsed) === localDateKey()
}

function formatDeadline(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function messagesAfterOnboarding(messages: StoredMessage[]) {
  let completionIndex = -1
  messages.forEach((message, index) => {
    if (message.content.trim().startsWith(COMPLETION_PREFIX)) completionIndex = index
  })
  return messages.slice(completionIndex + 1).filter(message => (
    !message.content.trim().startsWith(COMPLETION_PREFIX)
  ))
}

function buildOpening(context: CoachContext) {
  const commitment = context.active_commitment?.text?.trim()
  const checkedInToday = isToday(context.last_checkin_at)

  if (commitment && !checkedInToday) {
    return `Yesterday you committed to “${commitment}.” Did you do it?`
  }
  if (commitment) {
    return `Your current commitment is “${commitment}.” What could stop you from finishing it?`
  }
  if (context.mission?.title) {
    return `Your mission is “${context.mission.title}.” What concrete action will you finish next, and by when?`
  }
  return 'What concrete result will you complete next, and by when?'
}

function TypingIndicator() {
  return (
    <div className={styles.typing} aria-label="Forge is thinking" role="status">
      <span />
      <span />
      <span />
    </div>
  )
}

export default function CoachPage() {
  const theme = useTheme()
  const [context, setContext] = useState<CoachContext | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ), [])

  const loadCoach = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(apiUrl('/api/coach/context'), {
        credentials: 'include',
      })
      if (response.status === 401 || response.status === 403) {
        window.location.replace(FLASK_LOGIN)
        return
      }

      const payload = await response.json() as ContextResponse
      if (!response.ok || !payload.context) {
        throw new Error(payload.error || 'Could not load your Coach context.')
      }

      const nextContext = payload.context
      const todayMessages = messagesAfterOnboarding(payload.messages || [])
        .filter(message => isToday(message.session_date || message.created_at))
        .map((message, index) => ({
          ...message,
          localId: `stored-${message.id ?? index}`,
        }))

      const firstStoredMessage = todayMessages[0]
      const needsOpening = !firstStoredMessage || firstStoredMessage.role === 'user'
      setContext(nextContext)

      if (needsOpening) {
        setOpening(true)
        if (!reducedMotion) {
          await new Promise(resolve => window.setTimeout(resolve, 650))
        }
        const openingMessage: CoachMessage = {
          localId: 'daily-opening',
          role: 'assistant',
          content: buildOpening(nextContext),
          emphasis: true,
        }
        setMessages([openingMessage, ...todayMessages])
        setOpening(false)
      } else {
        const firstCoachIndex = todayMessages.findIndex(message => message.role === 'assistant')
        setMessages(todayMessages.map((message, index) => ({
          ...message,
          emphasis: index === firstCoachIndex,
        })))
      }
    } catch (loadError) {
      setOpening(false)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load your Coach context.',
      )
    } finally {
      setLoading(false)
    }
  }, [reducedMotion])

  useEffect(() => {
    document.title = 'Coach — Forge'
    void loadCoach()
  }, [loadCoach])

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'end',
    })
  }, [messages, opening, reducedMotion, sending])

  useEffect(() => {
    if (!loading && !opening) textareaRef.current?.focus()
  }, [loading, opening])

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`
  }, [])

  const sendMessage = useCallback(async (event?: FormEvent) => {
    event?.preventDefault()
    const content = input.trim()
    if (!content || sending || loading || opening) return

    const userMessage: CoachMessage = {
      localId: `user-${Date.now()}`,
      role: 'user',
      content,
    }
    setMessages(current => [...current, userMessage])
    setInput('')
    setSending(true)
    setError('')

    if (textareaRef.current) textareaRef.current.style.height = '44px'

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const response = await fetch(apiUrl('/api/coach'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          mode: 'coach',
          timezone,
        }),
      })
      const payload = await response.json() as { reply?: string; error?: string }
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || 'Forge could not respond.')
      }

      setMessages(current => [
        ...current,
        {
          localId: `coach-${Date.now()}`,
          role: 'assistant',
          content: payload.reply as string,
        },
      ])
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Connection failed. Your message is still visible above.',
      )
    } finally {
      setSending(false)
      window.setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [input, loading, opening, sending])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const commitment = context?.active_commitment
  const deadline = formatDeadline(commitment?.deadline)

  return (
    <section className={`${styles.page} ${theme === 'light' ? styles.light : styles.dark}`}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Coach</span>
        {context && (
          <span className={styles.dayLabel}>Day {Math.max(context.days_active || 0, 1)}</span>
        )}
      </header>

      <div className={styles.conversation}>
        <div className={styles.messageColumn} aria-live="polite">
          {loading && !error && <TypingIndicator />}

          {messages.map(message => (
            message.role === 'assistant' ? (
              <article className={styles.coachMessage} key={message.localId}>
                {message.emphasis && <div className={styles.coachLabel}>Forge</div>}
                <p className={message.emphasis ? styles.coachOpening : styles.coachReply}>
                  {message.content}
                </p>
              </article>
            ) : (
              <div className={styles.userRow} key={message.localId}>
                <p className={styles.userMessage}>{message.content}</p>
              </div>
            )
          ))}

          {(opening || sending) && <TypingIndicator />}

          {error && (
            <div className={styles.error} role="alert">
              <span>{error}</span>
              {!context && (
                <button type="button" onClick={() => void loadCoach()}>
                  Try again
                </button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className={styles.composerDock}>
        <div className={styles.composerWrap}>
          {commitment && (
            <div className={styles.commitment}>
              <div className={styles.commitmentCopy}>
                <span className={styles.commitmentLabel}>Current commitment</span>
                <span className={styles.commitmentText}>{commitment.text}</span>
              </div>
              {deadline && <time className={styles.deadline}>{deadline}</time>}
            </div>
          )}

          <form className={styles.composer} onSubmit={sendMessage}>
            <button
              className={styles.utilityButton}
              type="button"
              aria-label="Add attachment"
              title="Attachments are not available yet"
              disabled
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={event => {
                setInput(event.target.value)
                resizeTextarea()
              }}
              onKeyDown={handleKeyDown}
              className={styles.input}
              rows={1}
              maxLength={12_000}
              placeholder="Reply to Forge…"
              aria-label="Reply to Forge"
              disabled={loading || opening || sending || !context}
            />

            <button
              className={styles.utilityButton}
              type="button"
              aria-label="Use microphone"
              title="Voice input is not available yet"
              disabled
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
              </svg>
            </button>

            <button
              className={styles.sendButton}
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || loading || opening || sending || !context}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 12 6-6 6 6M12 6v12" />
              </svg>
            </button>
          </form>
          <p className={styles.hint}>Enter to send · Shift+Enter for a new line</p>
        </div>
      </div>
    </section>
  )
}
