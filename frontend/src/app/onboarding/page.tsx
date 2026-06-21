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
import { useRouter } from 'next/navigation'
import { apiUrl } from '@/lib/api-base'
import styles from './onboarding.module.css'

const COMPLETION_PREFIX = 'FORGE_COMPLETE||'
const FLASK_LOGIN = `${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/login`

type Message = {
  id?: number
  role: 'user' | 'assistant'
  content: string
}

type CompletionPayload = {
  mission: string
  outcome: string
  obstacle: string
  deadline: string
  commitment_text: string
  commitment_deadline: string
}

type CompletionResult = {
  mission: string
  commitment: string
  commitmentDeadline: string
}

function parseCompletionReply(reply: string): CompletionPayload | null {
  const normalizedReply = reply.trim()
  if (!normalizedReply.startsWith(COMPLETION_PREFIX)) return null

  const parsed: unknown = JSON.parse(
    normalizedReply.slice(COMPLETION_PREFIX.length).trim(),
  )
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Completion response was not an object')
  }
  return parsed as CompletionPayload
}

function formatDeadline(value: string) {
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(deadline)
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className={styles.typing} aria-label={label}>
      <span />
      <span />
      <span />
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [coachThinking, setCoachThinking] = useState(false)
  const [openingStage, setOpeningStage] = useState(0)
  const [openingTyping, setOpeningTyping] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error' | 'complete'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedPayload, setSavedPayload] = useState<CompletionPayload | null>(null)
  const [completion, setCompletion] = useState<CompletionResult | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const openingStartedRef = useRef(false)

  const lastMessage = messages[messages.length - 1]
  const awaitingConfirmation = Boolean(
    lastMessage?.role === 'assistant'
      && lastMessage.content.toLowerCase().includes('is that accurate'),
  )

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const saveCompletion = useCallback(async (payload: CompletionPayload) => {
    setSavedPayload(payload)
    setSaveState('saving')
    setSaveError('')

    try {
      const response = await fetch(apiUrl('/api/onboarding/complete'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Save failed.')
      }

      setCompletion({
        mission: result.mission || payload.mission,
        commitment: result.commitment || payload.commitment_text,
        commitmentDeadline:
          result.commitment_deadline || payload.commitment_deadline,
      })
      setSaveState('complete')
    } catch (error) {
      setSaveState('error')
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Connection failed. Your conversation is preserved.',
      )
    }
  }, [])

  useEffect(() => {
    document.title = 'Forge — Onboarding'
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadOnboarding() {
      try {
        const statusResponse = await fetch(apiUrl('/api/onboarding/status'), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (statusResponse.status === 401 || statusResponse.status === 403) {
          window.location.replace(FLASK_LOGIN)
          return
        }
        if (!statusResponse.ok) throw new Error('Could not load onboarding.')
        const status = await statusResponse.json()
        if (status.onboarding_complete) {
          router.replace('/ai')
          return
        }

        const contextResponse = await fetch(apiUrl('/api/coach/context'), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!contextResponse.ok) throw new Error('Could not restore the conversation.')
        const context = await contextResponse.json()
        const restoredMessages = (context.messages || []) as Message[]
        let interruptedPayload: CompletionPayload | null = null
        const visibleMessages = restoredMessages.filter(message => {
          try {
            const payload = parseCompletionReply(message.content)
            if (payload) interruptedPayload = payload
            return !payload
          } catch {
            return false
          }
        })

        setMessages(visibleMessages)
        if (visibleMessages.length > 0) {
          setOpeningStage(2)
          setOpeningTyping(false)
        }
        if (interruptedPayload) void saveCompletion(interruptedPayload)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSaveState('error')
        setSaveError(
          error instanceof Error ? error.message : 'Could not load onboarding.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadOnboarding()
    return () => controller.abort()
  }, [router, saveCompletion])

  useEffect(() => {
    if (loading || messages.length > 0 || openingStartedRef.current) return
    openingStartedRef.current = true
    let cancelled = false
    const wait = (milliseconds: number) => new Promise(resolve => {
      window.setTimeout(resolve, reducedMotion ? 0 : milliseconds)
    })

    async function runOpening() {
      setOpeningTyping(true)
      await wait(600)
      if (cancelled) return
      setOpeningTyping(false)
      setOpeningStage(1)
      await wait(900)
      if (cancelled) return
      setOpeningTyping(true)
      await wait(500)
      if (cancelled) return
      setOpeningTyping(false)
      setOpeningStage(2)
      window.setTimeout(() => textareaRef.current?.focus(), 100)
    }

    void runOpening()
    return () => {
      cancelled = true
    }
  }, [loading, messages.length, reducedMotion])

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'end',
    })
  }, [messages, coachThinking, openingStage, openingTyping, reducedMotion, saveState])

  const submitMessage = useCallback(async (content: string) => {
    const normalizedContent = content.trim()
    if (
      !normalizedContent
      || loading
      || coachThinking
      || openingStage < 2
      || saveState === 'saving'
      || saveState === 'complete'
    ) return

    setMessages(current => [
      ...current,
      { role: 'user', content: normalizedContent },
    ])
    setCoachThinking(true)
    setSaveError('')
    if (saveState === 'error') setSaveState('idle')

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const response = await fetch(apiUrl('/api/coach'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: normalizedContent,
          mode: 'onboarding',
          timezone,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Forge could not respond.')

      const reply = String(result.reply || '')
      let completionPayload: CompletionPayload | null = null
      try {
        completionPayload = parseCompletionReply(reply)
      } catch {
        setSavedPayload(null)
        setSaveState('error')
        setSaveError('The completion response was invalid. Your conversation is preserved.')
        return
      }

      if (completionPayload) {
        await saveCompletion(completionPayload)
      } else {
        setMessages(current => [
          ...current,
          { role: 'assistant', content: reply },
        ])
      }
    } catch (error) {
      setSaveState('error')
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Connection failed. Your conversation is preserved.',
      )
    } finally {
      setCoachThinking(false)
      window.setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [coachThinking, loading, openingStage, saveCompletion, saveState])

  function sendMessage(event?: FormEvent) {
    event?.preventDefault()
    const content = input.trim()
    if (!content) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    void submitMessage(content)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const composerDisabled =
    loading
    || coachThinking
    || openingStage < 2
    || awaitingConfirmation
    || saveState === 'saving'
    || saveState === 'complete'

  return (
    <main className={styles.page} data-theme={theme}>
      <header className={styles.header}>
        <div className={styles.brand} aria-label="Forge">
          <span className={styles.brandMark} aria-hidden="true" />
          <span>Forge</span>
        </div>
        <button
          className={styles.themeButton}
          type="button"
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </header>

      <section className={styles.feed} aria-live="polite">
        <div className={styles.column}>
          {openingStage === 0 && openingTyping && (
            <TypingIndicator label="Forge is preparing the first question" />
          )}

          {openingStage >= 1 && (
            <div className={styles.coachBlock}>
              <p className={styles.coachLabel}>Forge</p>
              <p className={styles.coachText}>
                Before we begin, I need to understand what you&apos;re building.
              </p>
            </div>
          )}

          {openingStage === 1 && openingTyping && (
            <TypingIndicator label="Forge is preparing the next question" />
          )}

          {openingStage >= 2 && (
            <div className={styles.coachBlock}>
              <h1 className={styles.coachQuestion}>
                What are you trying to make real right now?
              </h1>
            </div>
          )}

          {messages.map((message, index) =>
            message.role === 'user' ? (
              <div className={styles.userBlock} key={message.id || `user-${index}`}>
                <div className={styles.userMessage}>{message.content}</div>
              </div>
            ) : (
              <div className={styles.coachBlock} key={message.id || `coach-${index}`}>
                <p className={styles.coachText}>{message.content}</p>
              </div>
            ),
          )}

          {coachThinking && <TypingIndicator label="Forge is thinking" />}

          {awaitingConfirmation && !coachThinking && (
            <div className={styles.confirmBox}>
              <p className={styles.confirmLabel}>Confirm your mission</p>
              <div className={styles.confirmButtons}>
                <button
                  className={styles.confirmPrimary}
                  type="button"
                  onClick={() => void submitMessage("Yes, that's accurate.")}
                >
                  Yes, that&apos;s right
                </button>
                <button
                  className={styles.confirmSecondary}
                  type="button"
                  onClick={() => void submitMessage("No, that's not quite right. Let me clarify.")}
                >
                  Not quite
                </button>
              </div>
            </div>
          )}

          {saveState === 'saving' && (
            <div className={styles.saving}>
              <span className={styles.savingSpinner} aria-hidden="true" />
              Locking in your mission and first commitment.
            </div>
          )}

          {saveState === 'error' && (
            <div className={styles.error} role="alert">
              <span>{saveError || 'Something went wrong. Your conversation is preserved.'}</span>
              {savedPayload && (
                <button
                  className={styles.retryButton}
                  type="button"
                  onClick={() => void saveCompletion(savedPayload)}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {saveState === 'complete' && completion && (
            <div className={styles.completeCard}>
              <p className={styles.completeLabel}>Mission locked</p>
              <div className={styles.completeRow}>
                <p className={styles.completeKey}>Mission</p>
                <p className={styles.completeValue}>{completion.mission}</p>
              </div>
              <div className={styles.divider} />
              <div className={styles.completeRow}>
                <p className={styles.completeKey}>First commitment</p>
                <p className={styles.completeValue}>{completion.commitment}</p>
              </div>
              <div className={styles.divider} />
              <div className={styles.completeRow}>
                <p className={styles.completeKey}>Deadline</p>
                <p className={styles.completeValue}>
                  {formatDeadline(completion.commitmentDeadline)}
                </p>
              </div>
              <button
                className={styles.enterButton}
                type="button"
                onClick={() => router.replace('/ai')}
              >
                Enter Forge <span aria-hidden="true">→</span>
              </button>
              <p className={styles.completeHint}>
                The coach will ask about this tomorrow.
              </p>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </section>

      {saveState !== 'complete' && (
        <div className={styles.composerWrap}>
          <form className={styles.composer} onSubmit={sendMessage}>
            <button
              className={styles.plusButton}
              type="button"
              disabled
              aria-label="Add attachment"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <label className={styles.srOnly} htmlFor="forge-onboarding-input">
              Reply to Forge
            </label>
            <textarea
              ref={textareaRef}
              id="forge-onboarding-input"
              className={styles.input}
              rows={1}
              value={input}
              disabled={composerDisabled}
              placeholder="Tell Forge what you're working toward"
              onChange={event => {
                setInput(event.target.value)
                event.target.style.height = 'auto'
                event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              className={styles.iconButton}
              type="button"
              disabled
              aria-label="Voice input"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2.5 8c0 3 2 5 5.5 5s5.5-2 5.5-5M8 13v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className={styles.sendButton}
              type="submit"
              disabled={composerDisabled || !input.trim()}
              aria-label="Send message"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M7 2 2.5 6.5M7 2l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className={styles.composerHint}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </main>
  )
}
