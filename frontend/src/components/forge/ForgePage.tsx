'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'
import { apiUrl } from '@/lib/api-base'
import styles from './forge-page.module.css'

export type ForgeView = 'mission' | 'commitments' | 'output' | 'patterns'

type Mission = {
  id: number
  title: string
  description?: string | null
  outcome?: string | null
  obstacle?: string | null
  deadline?: string | null
  status: string
  created_at?: string | null
  updated_at?: string | null
}

type Commitment = {
  id: number
  mission_id: number
  text: string
  deadline?: string | null
  status: 'kept' | 'missed' | 'pending'
  times_carried?: number
  created_at?: string | null
  updated_at?: string | null
}

type Output = {
  id: number
  mission_id: number
  description: string
  logged_at?: string | null
}

type ForgeContext = {
  mission?: Mission | null
  active_commitment?: Commitment | null
  commitments?: Commitment[]
  recent_outputs?: Output[]
  outputs_this_week?: number
  pattern_label?: string | null
  pattern_updated_at?: string | null
  avoided_task?: string | null
  days_active?: number
  summary?: string | null
}

type MissionCloseStatus = 'completed' | 'archived'

type ContextResponse = {
  context?: ForgeContext
  error?: string
}

const TITLES: Record<ForgeView, string> = {
  mission: 'Mission',
  commitments: 'Commitments',
  output: 'Output Log',
  patterns: 'Patterns',
}

const FLASK_LOGIN = `${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/login`

function dateValue(value?: string | null) {
  if (!value) return 'No deadline set'
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date)
}

function dateTimeValue(value?: string | null) {
  if (!value) return 'No deadline set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function recentDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= 7 * 24 * 60 * 60 * 1000
}

function daysSince(value?: string | null) {
  if (!value) return 'No output yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No output yet'
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function isWithinDays(value: string | null | undefined, days: number) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(url), {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  if (response.status === 401 || response.status === 403) {
    window.location.replace(FLASK_LOGIN)
    throw new Error('Your session has expired.')
  }
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.')
  return payload
}

function PageHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTitle}>
        <SidebarReopenButton />
        <span>{title}</span>
      </div>
      {meta ? <span className={styles.headerMeta}>{meta}</span> : null}
    </header>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className={styles.label}>{children}</div>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <strong>{value}</strong>
      {detail ? <span className={styles.statDetail}>{detail}</span> : null}
    </div>
  )
}

function LoadingPage({ view, theme }: { view: ForgeView; theme: 'light' | 'dark' }) {
  return (
    <div className={styles.page} data-theme={theme} aria-busy="true">
      <PageHeader title={TITLES[view]} />
      <div className={styles.content}>
        <div className={styles.loadingLabel} />
        <div className={styles.loadingTitle} />
        <div className={styles.loadingRule} />
        <div className={styles.loadingBlock} />
      </div>
    </div>
  )
}

function MissionPage({ context, refresh }: { context: ForgeContext; refresh: () => Promise<unknown> }) {
  const mission = context.mission
  const commitments = context.commitments || []
  const weeklyCommitments = commitments.filter(item => isWithinDays(item.updated_at || item.created_at, 7))
  const kept = weeklyCommitments.filter(item => item.status === 'kept').length
  const missed = weeklyCommitments.filter(item => item.status === 'missed').length
  const lastOutput = context.recent_outputs?.[0]
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [outcome, setOutcome] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [closeIntent, setCloseIntent] = useState<MissionCloseStatus | null>(null)
  const [closeReason, setCloseReason] = useState('')

  useEffect(() => {
    setDescription(mission?.description || '')
    setOutcome(mission?.outcome || '')
    setDeadline(mission?.deadline?.slice(0, 10) || '')
  }, [mission])

  if (!mission) {
    return (
      <EmptyState>
        <strong>No active mission.</strong>
        <p>Open Coach and define the one result you are working toward.</p>
        <Link className={styles.primaryButton} href="/ai">Define it with Coach</Link>
      </EmptyState>
    )
  }

  async function saveMission(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await jsonRequest('/api/forge/mission', {
        method: 'PATCH',
        body: JSON.stringify({ description, outcome, deadline: deadline || null }),
      })
      await refresh()
      setEditing(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Mission could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  function beginCloseMission(status: MissionCloseStatus) {
    setCloseIntent(status)
    setCloseReason('')
    setError('')
  }

  async function closeMission(event: FormEvent) {
    event.preventDefault()
    if (!closeIntent || closeReason.trim().length < 12) {
      setError('Write one honest sentence before closing this mission.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await jsonRequest('/api/forge/mission', {
        method: 'PATCH',
        body: JSON.stringify({ status: closeIntent, reason: closeReason.trim() }),
      })
      setCloseIntent(null)
      setCloseReason('')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Mission could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className={styles.heroSection}>
        <Label>Active mission</Label>
        <h1>{mission.title}</h1>
        <div className={styles.heroMeta}>
          <span>Started {dateValue(mission.created_at)}</span>
          <span>Deadline {dateValue(mission.deadline)}</span>
        </div>
      </section>

      <div className={styles.rule} />

      {editing ? (
        <form className={styles.editForm} onSubmit={saveMission}>
          <label>
            <span>Description</span>
            <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} />
          </label>
          <label>
            <span>What finished looks like</span>
            <textarea value={outcome} onChange={event => setOutcome(event.target.value)} rows={3} />
          </label>
          <label>
            <span>Deadline</span>
            <input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button className={styles.secondaryButton} type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <section className={styles.section}>
            <Label>What finished looks like</Label>
            <p className={styles.bodyCopy}>{mission.outcome || mission.description || 'No outcome has been written yet.'}</p>
          </section>

          <div className={styles.rule} />

          <div className={styles.statGrid}>
            <Stat label="Days active" value={context.days_active || 0} />
            <Stat label="Outputs logged" value={context.recent_outputs?.length || 0} detail={`${context.outputs_this_week || 0} this week`} />
            <Stat label="Last output" value={daysSince(lastOutput?.logged_at)} detail="since shipped work" />
            <Stat label="Commitments kept" value={kept} detail={`${weeklyCommitments.length} this week`} />
            <Stat label="Commitments missed" value={missed} detail="this week" />
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={() => setEditing(true)}>Update mission</button>
            <button className={styles.secondaryButton} onClick={() => beginCloseMission('completed')} disabled={saving}>Mark complete</button>
            <button className={styles.dangerButton} onClick={() => beginCloseMission('archived')} disabled={saving}>Abandon</button>
          </div>
          {closeIntent ? (
            <form className={styles.decisionPanel} onSubmit={closeMission}>
              <Label>{closeIntent === 'completed' ? 'Complete mission' : 'Abandon mission'}</Label>
              <p className={styles.panelTitle}>
                {closeIntent === 'completed'
                  ? 'What proves this mission is complete?'
                  : 'Why is this mission being abandoned?'}
              </p>
              <textarea
                value={closeReason}
                onChange={event => setCloseReason(event.target.value)}
                rows={3}
                placeholder="One honest sentence. Coach will remember it."
                autoFocus
              />
              <div className={styles.actions}>
                <button className={styles.primaryButton} type="submit" disabled={saving || closeReason.trim().length < 12}>
                  {saving ? 'Saving…' : closeIntent === 'completed' ? 'Confirm complete' : 'Confirm abandon'}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setCloseIntent(null)
                    setCloseReason('')
                    setError('')
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
          <p className={styles.quietNote}>Closed missions remain part of your history and will be acknowledged by Coach.</p>
        </>
      )}
    </>
  )
}

function CommitmentsPage({ context, refresh }: { context: ForgeContext; refresh: () => Promise<unknown> }) {
  const commitments = context.commitments || []
  const history = commitments.filter(item => isWithinDays(item.updated_at || item.created_at, 14))
  const active = context.active_commitment
  const avoided = commitments.find(item => item.text === context.avoided_task)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [outputText, setOutputText] = useState('')
  const [loggingOutput, setLoggingOutput] = useState(false)
  const [error, setError] = useState('')
  const [killId, setKillId] = useState<number | null>(null)
  const [killReason, setKillReason] = useState('')

  async function setStatus(id: number, status: 'kept' | 'missed') {
    setSavingId(id)
    setError('')
    try {
      await jsonRequest(`/api/forge/commitments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Commitment could not be updated.')
    } finally {
      setSavingId(null)
    }
  }

  function beginKillCommitment(id: number) {
    setKillId(id)
    setKillReason('')
    setError('')
  }

  async function killCommitment(event: FormEvent) {
    event.preventDefault()
    if (!killId || killReason.trim().length < 12) {
      setError('Write one honest sentence before killing this commitment.')
      return
    }
    const reason = killReason.trim()
    const id = killId
    setSavingId(id)
    setError('')
    try {
      await jsonRequest(`/api/forge/commitments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'missed', kill: true, reason }),
      })
      setKillId(null)
      setKillReason('')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Commitment could not be killed.')
    } finally {
      setSavingId(null)
    }
  }

  async function logOutput(event: FormEvent) {
    event.preventDefault()
    if (!outputText.trim()) return
    setLoggingOutput(true)
    setError('')
    try {
      await jsonRequest('/api/forge/outputs', {
        method: 'POST',
        body: JSON.stringify({ description: outputText.trim() }),
      })
      setOutputText('')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Output could not be logged.')
    } finally {
      setLoggingOutput(false)
    }
  }

  return (
    <>
      <section className={styles.sectionFirst}>
        <Label>Current commitment</Label>
        {active ? (
          <div className={styles.commitmentCard}>
            <h1 className={styles.commitmentTitle}>{active.text}</h1>
            <p className={styles.deadline}>{dateTimeValue(active.deadline)}</p>
            <div className={styles.splitActions}>
              <button className={styles.primaryButton} onClick={() => setStatus(active.id, 'kept')} disabled={savingId === active.id}>I did it</button>
              <button className={styles.secondaryButton} onClick={() => setStatus(active.id, 'missed')} disabled={savingId === active.id}>I didn&apos;t do it</button>
              <button className={styles.dangerButton} onClick={() => beginKillCommitment(active.id)} disabled={savingId === active.id}>Kill it</button>
            </div>
            {killId === active.id ? (
              <form className={styles.decisionPanel} onSubmit={killCommitment}>
                <Label>Kill commitment</Label>
                <p className={styles.panelTitle}>Why is this no longer the right commitment?</p>
                <textarea
                  value={killReason}
                  onChange={event => setKillReason(event.target.value)}
                  rows={3}
                  placeholder="One honest sentence. Coach will use this context."
                  autoFocus
                />
                <div className={styles.actions}>
                  <button className={styles.primaryButton} type="submit" disabled={savingId === active.id || killReason.trim().length < 12}>
                    {savingId === active.id ? 'Saving…' : 'Confirm kill'}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      setKillId(null)
                      setKillReason('')
                      setError('')
                    }}
                    disabled={savingId === active.id}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ) : (
          <p className={styles.bodyCopy}>No active commitment. Coach will ask you to lock in the next concrete action.</p>
        )}
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {context.avoided_task ? (
        <section className={styles.avoided}>
          <Label>Avoided{avoided?.times_carried ? ` — carried ${avoided.times_carried} times` : ''}</Label>
          <p>{context.avoided_task}</p>
          <span>This has repeated enough to address directly.</span>
          <Link className={styles.primaryButton} href="/ai">Deal with this in Coach</Link>
        </section>
      ) : null}

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Output log</Label>
        <form className={styles.outputForm} onSubmit={logOutput}>
          <textarea
            value={outputText}
            onChange={event => setOutputText(event.target.value)}
            rows={3}
            placeholder="What did you actually finish today?"
          />
          <button className={styles.primaryButton} type="submit" disabled={loggingOutput || !outputText.trim()}>
            {loggingOutput ? 'Logging…' : 'Log output'}
          </button>
        </form>
      </section>

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Last 14 days</Label>
        {history.length ? (
          <div className={styles.list}>
            {history.map(item => (
              <div className={styles.historyRow} key={item.id}>
                <div>
                  <span className={styles.rowDate}>{dateValue(item.updated_at || item.created_at)}</span>
                  <p className={item.status === 'missed' ? styles.missedText : undefined}>{item.text}</p>
                  <small>Deadline {dateTimeValue(item.deadline)}</small>
                </div>
                <span className={`${styles.status} ${styles[item.status]}`}>{item.status}</span>
              </div>
            ))}
          </div>
        ) : <p className={styles.bodyCopy}>No commitments have been recorded in the last 14 days.</p>}
      </section>
    </>
  )
}

function OutputLogPage({ context, refresh }: { context: ForgeContext; refresh: () => Promise<unknown> }) {
  const outputs = context.recent_outputs || []
  const [adding, setAdding] = useState(false)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function addOutput(event: FormEvent) {
    event.preventDefault()
    if (!description.trim()) return
    setSaving(true)
    setError('')
    try {
      await jsonRequest('/api/forge/outputs', {
        method: 'POST',
        body: JSON.stringify({ description: description.trim() }),
      })
      setDescription('')
      setAdding(false)
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Output could not be logged.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className={styles.sectionFirst}>
        {adding ? (
          <form className={styles.outputForm} onSubmit={addOutput}>
            <Label>What did you actually finish?</Label>
            <textarea
              autoFocus
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="A real thing you shipped, sent, posted, or published."
              rows={3}
            />
            <p>Log outcomes, not activity.</p>
            {error ? <div className={styles.error}>{error}</div> : null}
            <div className={styles.actions}>
              <button className={styles.primaryButton} type="submit" disabled={saving || !description.trim()}>{saving ? 'Logging…' : 'Log output'}</button>
              <button className={styles.secondaryButton} type="button" onClick={() => setAdding(false)} disabled={saving}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className={styles.fullButton} onClick={() => setAdding(true)}>Log an output</button>
        )}
      </section>

      {error && !adding ? <p className={styles.error}>{error}</p> : null}

      {outputs.length ? (
        <div className={styles.outputList}>
          {outputs.map(output => (
            <article key={output.id}>
              <span>{dateValue(output.logged_at)}</span>
              <p>{output.description}</p>
            </article>
          ))}
          <p className={styles.quietNote}>This is the proof: work that exists outside your plans.</p>
        </div>
      ) : (
        <EmptyState>
          <strong>Nothing logged yet.</strong>
          <p>The log grows when you ship real work.</p>
        </EmptyState>
      )}
    </>
  )
}

function PatternsPage({ context }: { context: ForgeContext }) {
  const commitments = context.commitments || []
  const recent = commitments.filter(item => recentDate(item.updated_at || item.created_at))
  const kept = recent.filter(item => item.status === 'kept').length
  const missed = recent.filter(item => item.status === 'missed').length
  const totalResolved = kept + missed
  const rate = totalResolved ? Math.round((kept / totalResolved) * 100) : 0

  const evidence = useMemo(() => {
    const items: string[] = []
    if (context.avoided_task) items.push(`“${context.avoided_task}” has been carried repeatedly without resolution.`)
    if (missed) items.push(`${missed} recent commitment${missed === 1 ? ' was' : 's were'} missed.`)
    if (kept) items.push(`${kept} recent commitment${kept === 1 ? ' was' : 's were'} kept.`)
    if (context.outputs_this_week) items.push(`${context.outputs_this_week} real output${context.outputs_this_week === 1 ? '' : 's'} logged this week.`)
    if (context.summary) items.push(context.summary)
    return items
  }, [context.avoided_task, context.outputs_this_week, context.summary, kept, missed])

  return (
    <>
      <section className={styles.patternHero}>
        <div className={styles.strongRule} />
        <Label>Current pattern</Label>
        <h1>{context.pattern_label || 'No pattern identified yet.'}</h1>
        {context.pattern_updated_at ? <p>Updated {dateValue(context.pattern_updated_at)}</p> : null}
        <div className={styles.strongRule} />
      </section>

      <section className={styles.section}>
        <Label>Evidence</Label>
        {evidence.length ? (
          <div className={styles.evidenceList}>
            {evidence.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
          </div>
        ) : <p className={styles.bodyCopy}>Forge needs more completed check-ins before it can make a defensible claim about your behavior.</p>}
      </section>

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Last 7 days</Label>
        <div className={styles.weekGrid}>
          <Stat label="Made" value={recent.length} />
          <Stat label="Kept" value={kept} />
          <Stat label="Missed" value={missed} />
          <Stat label="Shipped" value={context.outputs_this_week || 0} />
        </div>
        <div className={styles.rateHeader}><span>Commitment rate</span><strong>{rate}%</strong></div>
        <div className={styles.rateTrack}><span style={{ width: `${rate}%` }} /></div>
      </section>

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Pattern history</Label>
        {context.pattern_label ? (
          <div className={styles.patternHistory}>
            <span>{dateValue(context.pattern_updated_at)}</span>
            <div><p>{context.pattern_label}</p><small>Current</small></div>
          </div>
        ) : <p className={styles.bodyCopy}>No pattern changes have been recorded yet.</p>}
      </section>
    </>
  )
}

export default function ForgePage({ view }: { view: ForgeView }) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['forge-context'],
    queryFn: () => jsonRequest<ContextResponse>('/api/coach/context'),
    staleTime: 15_000,
  })

  useEffect(() => {
    document.title = `${TITLES[view]} — Forge`
  }, [view])

  const context = data?.context
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['forge-context'] })

  if (isLoading) return <LoadingPage view={view} theme={theme} />

  return (
    <div className={styles.page} data-theme={theme}>
      <PageHeader
        title={TITLES[view]}
        meta={view === 'output' && context ? `${context.recent_outputs?.length || 0} things shipped` : undefined}
      />
      <main className={styles.content}>
        {error || !context ? (
          <EmptyState>
            <strong>Forge could not load this page.</strong>
            <p>{error instanceof Error ? error.message : 'Try again in a moment.'}</p>
            <button className={styles.secondaryButton} onClick={() => void refresh()}>Try again</button>
          </EmptyState>
        ) : null}
        {context && view === 'mission' ? <MissionPage context={context} refresh={refresh} /> : null}
        {context && view === 'commitments' ? <CommitmentsPage context={context} refresh={refresh} /> : null}
        {context && view === 'output' ? <OutputLogPage context={context} refresh={refresh} /> : null}
        {context && view === 'patterns' ? <PatternsPage context={context} /> : null}
      </main>
    </div>
  )
}
