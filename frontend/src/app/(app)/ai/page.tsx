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
import { readCoachEventStream } from '@/lib/coach-stream'
import { recordForgeCoachSession } from '@/components/PwaLifecycle'
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
  due_commitment?: Commitment | null
  needs_checkin?: boolean
  checkin_prompt?: string | null
  days_active?: number
  last_checkin_at?: string | null
}

type ContextResponse = {
  context?: CoachContext
  messages?: StoredMessage[]
  error?: string
}

type CoachReplyPayload = {
  reply?: string
  error?: string
  commitment?: Commitment | null
  checkin?: (Commitment & { checkin_outcome?: string }) | null
}

type CompletionPayload = {
  name: string
  desired_identity: string
  current_struggle: string
  avoided_task: string
  what_matters: string
  fall_off_trigger: string
  mission: string
  outcome: string
  obstacle: string
  pattern_label: string
  identity_gap: string
  deadline: string
  commitment_text: string
  commitment_deadline: string
}

type CompletionResult = {
  mission: string
  patternLabel: string
  identityGap: string
  commitment: string
  commitmentDeadline: string
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

function formatCompletionDeadline(value: string) {
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(deadline)
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
  if (context.needs_checkin && context.checkin_prompt) {
    return context.checkin_prompt
  }

  const commitment = context.active_commitment?.text?.trim()
  if (commitment) {
    return `Your current commitment is “${commitment}.” What could stop you from finishing it?`
  }
  if (context.mission?.title) {
    return `Your mission is “${context.mission.title}.” What concrete action will you finish next, and by when?`
  }
  return 'What concrete result will you complete next, and by when?'
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
  const [onboardingMessages, setOnboardingMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [openingStage, setOpeningStage] = useState(0)
  const [openingTyping, setOpeningTyping] = useState(false)
  const [showOnboardingOpening, setShowOnboardingOpening] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error' | 'complete'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedPayload, setSavedPayload] = useState<CompletionPayload | null>(null)
  const [completion, setCompletion] = useState<CompletionResult | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const openingStartedRef = useRef(false)

  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ), [])

  const isOnboarding = Boolean(
    context
      && context.user?.onboarding_complete === false
      && saveState !== 'complete',
  )
  const showOnboardingCompletion = saveState === 'complete'
  const lastOnboardingMessage = onboardingMessages[onboardingMessages.length - 1]
  const awaitingConfirmation = Boolean(
    isOnboarding
      && lastOnboardingMessage?.role === 'assistant'
      && lastOnboardingMessage.content.toLowerCase().includes('is that accurate'),
  )

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
        patternLabel: result.pattern_label || payload.pattern_label,
        identityGap: result.identity_gap || payload.identity_gap,
        commitment: result.commitment || payload.commitment_text,
        commitmentDeadline:
          result.commitment_deadline || payload.commitment_deadline,
      })
      setOnboardingMessages(current => current.filter(message => (
        !message.content.trim().startsWith(COMPLETION_PREFIX)
      )))
      setSaveState('complete')
    } catch (completionError) {
      setSaveState('error')
      setSaveError(
        completionError instanceof Error
          ? completionError.message
          : 'Connection failed. Your conversation is preserved.',
      )
    }
  }, [])

  const loadCoach = useCallback(async () => {
    setLoading(true)
    setError('')
    setOpening(false)

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
      const onboardingComplete = Boolean(nextContext.user?.onboarding_complete)
      setContext(nextContext)

      if (!onboardingComplete) {
        let interruptedPayload: CompletionPayload | null = null
        const visibleMessages = (payload.messages || []).filter(message => {
          try {
            const completionPayload = parseCompletionReply(message.content)
            if (completionPayload) interruptedPayload = completionPayload
            return !completionPayload
          } catch {
            return false
          }
        }).map((message, index) => ({
          ...message,
          localId: `onboarding-${message.id ?? index}`,
        }))

        setMessages([])
        setOnboardingMessages(visibleMessages)
        setSaveState('idle')
        setCompletion(null)
        setSavedPayload(null)
        setSaveError('')

        if (visibleMessages.length > 0) {
          openingStartedRef.current = true
          setOpeningStage(2)
          setOpeningTyping(false)
          setShowOnboardingOpening(false)
        } else {
          openingStartedRef.current = false
          setOpeningStage(0)
          setOpeningTyping(true)
          setShowOnboardingOpening(true)
        }

        if (interruptedPayload) void saveCompletion(interruptedPayload)
        return
      }

      setOnboardingMessages([])
      setOpeningStage(0)
      setOpeningTyping(false)
      setShowOnboardingOpening(false)
      setSaveState('idle')
      setCompletion(null)
      setSavedPayload(null)
      setSaveError('')
      openingStartedRef.current = false

      const todayMessages = messagesAfterOnboarding(payload.messages || [])
        .filter(message => isToday(message.session_date || message.created_at))
        .map((message, index) => ({
          ...message,
          localId: `stored-${message.id ?? index}`,
        }))

      const firstStoredMessage = todayMessages[0]
      const needsOpening = !firstStoredMessage || firstStoredMessage.role === 'user'

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
  }, [reducedMotion, saveCompletion])

  useEffect(() => {
    document.title = 'Coach — Forge'
    void loadCoach()
  }, [loadCoach])

  useEffect(() => {
    if (
      !isOnboarding
      || loading
      || onboardingMessages.length > 0
      || openingStartedRef.current
      || saveState === 'complete'
    ) return

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
  }, [isOnboarding, loading, onboardingMessages.length, reducedMotion, saveState])

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'end',
    })
  }, [
    messages,
    onboardingMessages,
    opening,
    openingStage,
    openingTyping,
    reducedMotion,
    saveState,
    sending,
  ])

  useEffect(() => {
    if (!loading && !opening && (!isOnboarding || openingStage >= 2)) {
      textareaRef.current?.focus()
    }
  }, [isOnboarding, loading, opening, openingStage])

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`
  }, [])

  const submitOnboardingMessage = useCallback(async (content: string) => {
    const normalizedContent = content.trim()
    if (
      !normalizedContent
      || loading
      || sending
      || openingStage < 2
      || saveState === 'saving'
      || saveState === 'complete'
    ) return

    setOnboardingMessages(current => [
      ...current,
      {
        localId: `onboarding-user-${Date.now()}`,
        role: 'user',
        content: normalizedContent,
      },
    ])
    setSending(true)
    setError('')
    setSaveError('')
    if (saveState === 'error') setSaveState('idle')

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const assistantId = `onboarding-coach-${Date.now()}`
      const response = await fetch(apiUrl('/api/coach'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: normalizedContent,
          mode: 'onboarding',
          timezone,
          stream: true,
        }),
      })

      let streamedText = ''
      const contentType = response.headers.get('content-type') || ''
      const payload = contentType.includes('text/event-stream')
        ? await readCoachEventStream(response, text => {
            streamedText += text
            setOnboardingMessages(current => {
              const existingIndex = current.findIndex(message => message.localId === assistantId)
              if (existingIndex === -1) {
                return [
                  ...current,
                  {
                    localId: assistantId,
                    role: 'assistant',
                    content: text,
                  },
                ]
              }

              const next = [...current]
              next[existingIndex] = {
                ...next[existingIndex],
                content: `${next[existingIndex].content}${text}`,
              }
              return next
            })
          }) as CoachReplyPayload
        : await response.json() as CoachReplyPayload

      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || 'Forge could not respond.')
      }

      const reply = String(payload.reply || '')
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
        setOnboardingMessages(current => current.filter(message => (
          !message.content.trim().startsWith(COMPLETION_PREFIX)
        )))
        await saveCompletion(completionPayload)
      } else {
        setOnboardingMessages(current => {
          const existingIndex = current.findIndex(message => message.localId === assistantId)
          if (existingIndex === -1) {
            return [
              ...current,
              {
                localId: assistantId,
                role: 'assistant',
                content: reply,
              },
            ]
          }

          if (streamedText === reply) return current
          const next = [...current]
          next[existingIndex] = {
            ...next[existingIndex],
            content: reply,
          }
          return next
        })
      }
    } catch (sendError) {
      setSaveState('error')
      setSaveError(
        sendError instanceof Error
          ? sendError.message
          : 'Connection failed. Your conversation is preserved.',
      )
    } finally {
      setSending(false)
      window.setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [loading, openingStage, saveCompletion, saveState, sending])

  const sendMessage = useCallback(async (event?: FormEvent) => {
    event?.preventDefault()
    const content = input.trim()
    if (!content || sending || loading || opening) return

    if (isOnboarding) {
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = '44px'
      await submitOnboardingMessage(content)
      return
    }

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
      const assistantId = `coach-${Date.now()}`
      const response = await fetch(apiUrl('/api/coach'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: content,
          mode: 'coach',
          timezone,
          stream: true,
        }),
      })

      let streamedText = ''
      const contentType = response.headers.get('content-type') || ''
      const payload = contentType.includes('text/event-stream')
        ? await readCoachEventStream(response, text => {
            streamedText += text
            setMessages(current => {
              const existingIndex = current.findIndex(message => message.localId === assistantId)
              if (existingIndex === -1) {
                return [
                  ...current,
                  {
                    localId: assistantId,
                    role: 'assistant',
                    content: text,
                  },
                ]
              }

              const next = [...current]
              next[existingIndex] = {
                ...next[existingIndex],
                content: `${next[existingIndex].content}${text}`,
              }
              return next
            })
          }) as CoachReplyPayload
        : await response.json() as CoachReplyPayload

      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || 'Forge could not respond.')
      }

      if (payload.commitment) {
        setContext(current => current ? ({
          ...current,
          active_commitment: payload.commitment || current.active_commitment,
          due_commitment: null,
          needs_checkin: false,
          checkin_prompt: null,
        }) : current)
      }

      if (payload.checkin) {
        setContext(current => {
          if (!current) return current
          const checkedInCommitment = payload.checkin
          const isActive = current.active_commitment?.id === checkedInCommitment?.id
          return {
            ...current,
            active_commitment: isActive ? null : current.active_commitment,
            due_commitment: null,
            needs_checkin: false,
            checkin_prompt: null,
            last_checkin_at: new Date().toISOString(),
          }
        })
      }

      setMessages(current => {
        const existingIndex = current.findIndex(message => message.localId === assistantId)
        if (existingIndex === -1) {
          return [
            ...current,
            {
              localId: assistantId,
              role: 'assistant',
              content: payload.reply as string,
            },
          ]
        }

        if (streamedText === payload.reply) return current
        const next = [...current]
        next[existingIndex] = {
          ...next[existingIndex],
          content: payload.reply as string,
        }
        return next
      })
      recordForgeCoachSession()
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
  }, [input, isOnboarding, loading, opening, sending, submitOnboardingMessage])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const commitment = context?.active_commitment
  const deadline = formatDeadline(commitment?.deadline)
  const composerDisabled = isOnboarding
    ? loading
      || sending
      || openingStage < 2
      || awaitingConfirmation
      || saveState === 'saving'
      || saveState === 'complete'
    : loading || opening || sending || !context

  return (
    <section className={`${styles.page} ${theme === 'light' ? styles.light : styles.dark}`}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Coach</span>
        {context && (
          <span className={styles.dayLabel}>
            {isOnboarding || showOnboardingCompletion
              ? 'Setup'
              : `Day ${Math.max(context.days_active || 0, 1)}`}
          </span>
        )}
      </header>

      <div className={styles.conversation}>
        <div className={styles.messageColumn} aria-live="polite">
          {loading && !error && <TypingIndicator />}

          {isOnboarding && openingStage === 0 && openingTyping && (
            <TypingIndicator />
          )}

          {isOnboarding && showOnboardingOpening && openingStage >= 1 && (
            <article className={`${styles.coachMessage} ${styles.onboardingIntro}`}>
              <div className={styles.coachLabel}>Forge</div>
              <p className={styles.coachReply}>
                I&apos;m Forge — your execution coach.
              </p>
              <p className={styles.coachReply}>
                Before we talk goals, I need to understand you a little.
              </p>
              <p className={styles.coachReply}>
                No perfect answer needed. Start simple.
              </p>
            </article>
          )}

          {isOnboarding && openingStage === 1 && openingTyping && (
            <TypingIndicator />
          )}

          {isOnboarding && showOnboardingOpening && openingStage >= 2 && (
            <article className={styles.coachMessage}>
              <h1 className={styles.coachOpening}>
                What&apos;s your name?
              </h1>
            </article>
          )}

          {(isOnboarding || showOnboardingCompletion ? onboardingMessages : messages).map(message => (
            message.role === 'assistant' ? (
              <article className={styles.coachMessage} key={message.localId}>
                {!isOnboarding && message.emphasis && <div className={styles.coachLabel}>Forge</div>}
                <p className={!isOnboarding && message.emphasis ? styles.coachOpening : styles.coachReply}>
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

          {awaitingConfirmation && !sending && (
            <div className={styles.confirmBox}>
              <p className={styles.confirmLabel}>Confirm your mission</p>
              <div className={styles.confirmButtons}>
                <button
                  className={styles.confirmPrimary}
                  type="button"
                  onClick={() => void submitOnboardingMessage("Yes, that's accurate.")}
                >
                  Yes, that&apos;s right
                </button>
                <button
                  className={styles.confirmSecondary}
                  type="button"
                  onClick={() => void submitOnboardingMessage("No, that's not quite right. Let me clarify.")}
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
                  type="button"
                  onClick={() => void saveCompletion(savedPayload)}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {showOnboardingCompletion && completion && (
            <div className={styles.completeCard}>
              <p className={styles.completeLabel}>Mission locked</p>
              <div className={styles.completeRow}>
                <p className={styles.completeKey}>Mission</p>
                <p className={styles.completeValue}>{completion.mission}</p>
              </div>
              <div className={styles.divider} />
              <div className={styles.completeRow}>
                <p className={styles.completeKey}>Pattern</p>
                <p className={styles.completeValue}>{completion.patternLabel}</p>
              </div>
              <div className={styles.divider} />
              <div className={styles.completeRow}>
                <p className={styles.completeKey}>Identity gap</p>
                <p className={styles.completeValue}>{completion.identityGap}</p>
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
                  {formatCompletionDeadline(completion.commitmentDeadline)}
                </p>
              </div>
              <button
                className={styles.enterButton}
                type="button"
                onClick={() => void loadCoach()}
              >
                Enter Forge <span aria-hidden="true">→</span>
              </button>
              <p className={styles.completeHint}>
                The coach will ask about this tomorrow.
              </p>
            </div>
          )}

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
              disabled={composerDisabled}
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
              disabled={!input.trim() || composerDisabled}
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
