'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
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
  checkin_outcome?: 'kept' | 'missed' | 'partial' | null
  times_carried?: number
  created_at?: string | null
  updated_at?: string | null
}

type Output = {
  id: number
  mission_id: number
  commitment_id?: number | null
  mission_title?: string | null
  description: string
  logged_at?: string | null
}

type PatternEvent = {
  id: number
  pattern_label: string
  reason?: string | null
  evidence?: string[] | null
  created_at?: string | null
}

type WeeklySummary = {
  commitments_made: number
  commitments_kept: number
  commitments_missed: number
  commitments_pending: number
  outputs_logged: number
  commitment_rate: number
  pattern_status: string
}

type IdentityMirror = {
  desired_profile: string
  current_profile: string
  identity_gap: string
  weekly_question: string
  gap_level: 'narrowing' | 'wide' | 'forming' | 'unknown'
  evidence: string[]
  pattern_label?: string | null
  summary?: string | null
}

type RoadmapStage = {
  label: string
  text: string
}

type GoalRoadmap = {
  mission: string
  target: string
  current_position: string
  next_milestone: string
  commitments_kept: number
  commitments_broken: number
  outputs_this_week: number
  last_output?: string | null
  primary_risk?: string | null
  stages: RoadmapStage[]
}

type WeeklyReview = {
  committed_to: string[]
  what_happened: string
  pattern: string
  identity_gap?: string | null
  next_action: string
  review_question: string
  outputs: string[]
}

type RetentionNudge = {
  should_nudge: boolean
  hours_since_checkin?: number | null
  inactivity_prompt?: string | null
  morning_prompt: string
}

type CoachTone = 'direct' | 'balanced' | 'firm_support'

type ToneCalibration = {
  tone: CoachTone
  label: string
  instruction: string
  specificity_rule: string
  emotional_validation_rule: string
  forbidden_phrases: string[]
  required_references: string[]
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
  pattern_history?: PatternEvent[]
  weekly_summary?: WeeklySummary
  identity_mirror?: IdentityMirror
  goal_roadmap?: GoalRoadmap
  weekly_review?: WeeklyReview
  retention_nudge?: RetentionNudge
  coach_tone?: CoachTone
  tone_calibration?: ToneCalibration
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
  const roadmap = context.goal_roadmap
  const retention = context.retention_nudge
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

          <section className={styles.section}>
            <Label>Goal roadmap</Label>
            {roadmap ? (
              <div className={styles.roadmapBlock}>
                <div className={styles.roadmapMeta}>
                  <p>{roadmap.current_position}</p>
                  <strong>{roadmap.next_milestone}</strong>
                </div>
                <div className={styles.roadmapStages}>
                  {roadmap.stages.map(stage => (
                    <article className={styles.roadmapStage} key={stage.label}>
                      <span>{stage.label}</span>
                      <p>{stage.text}</p>
                    </article>
                  ))}
                </div>
                <div className={styles.roadmapStats}>
                  <span>{roadmap.commitments_kept} kept</span>
                  <span>{roadmap.commitments_broken} broken</span>
                  <span>{roadmap.outputs_this_week} outputs this week</span>
                </div>
                {retention?.morning_prompt ? (
                  <p className={styles.identityQuestion}>{retention.morning_prompt}</p>
                ) : null}
              </div>
            ) : (
              <p className={styles.bodyCopy}>Forge needs an active mission before it can reverse-engineer the path.</p>
            )}
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
  const proofByCommitment = new Map(
    (context.recent_outputs || [])
      .filter(output => output.commitment_id)
      .map(output => [output.commitment_id as number, output]),
  )
  const history = commitments.filter(item => isWithinDays(item.updated_at || item.created_at, 14))
  const active = context.active_commitment
  const avoided = commitments.find(item => item.text === context.avoided_task)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [outputText, setOutputText] = useState('')
  const [loggingOutput, setLoggingOutput] = useState(false)
  const [error, setError] = useState('')
  const [killId, setKillId] = useState<number | null>(null)
  const [killReason, setKillReason] = useState('')
  const [decision, setDecision] = useState<'kept' | 'partial' | null>(null)
  const [proofText, setProofText] = useState('')

  async function setStatus(id: number, status: 'kept' | 'missed' | 'partial', proof?: string) {
    setSavingId(id)
    setError('')
    try {
      await jsonRequest(`/api/forge/commitments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(proof ? { proof } : {}) }),
      })
      setDecision(null)
      setProofText('')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Commitment could not be updated.')
    } finally {
      setSavingId(null)
    }
  }

  async function submitProof(event: FormEvent) {
    event.preventDefault()
    if (!active || !decision) return
    if (!proofText.trim()) {
      setError('Log proof before resolving this commitment.')
      return
    }
    await setStatus(active.id, decision, proofText.trim())
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
              <button
                className={styles.primaryButton}
                onClick={() => {
                  setDecision('kept')
                  setProofText('')
                  setKillId(null)
                  setError('')
                }}
                disabled={savingId === active.id}
              >
                Yes
              </button>
              <button className={styles.secondaryButton} onClick={() => setStatus(active.id, 'missed')} disabled={savingId === active.id}>I didn&apos;t do it</button>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setDecision('partial')
                  setProofText('')
                  setKillId(null)
                  setError('')
                }}
                disabled={savingId === active.id}
              >
                Partial
              </button>
              <button className={styles.dangerButton} onClick={() => beginKillCommitment(active.id)} disabled={savingId === active.id}>Kill it</button>
            </div>
            {decision ? (
              <form className={styles.decisionPanel} onSubmit={submitProof}>
                <Label>{decision === 'kept' ? 'Proof' : 'Partial proof'}</Label>
                <p className={styles.panelTitle}>
                  {decision === 'kept'
                    ? 'What exists now that proves this is done?'
                    : 'What got done, and what is still unfinished?'}
                </p>
                <textarea
                  value={proofText}
                  onChange={event => setProofText(event.target.value)}
                  rows={3}
                  placeholder={decision === 'kept' ? 'Example: Published the landing page and sent it to 3 people.' : 'Example: Drafted the page, but did not publish it.'}
                  autoFocus
                />
                <div className={styles.actions}>
                  <button className={styles.primaryButton} type="submit" disabled={savingId === active.id || !proofText.trim()}>
                    {savingId === active.id ? 'Saving…' : decision === 'kept' ? 'Log proof and mark kept' : 'Log partial and mark missed'}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      setDecision(null)
                      setProofText('')
                      setError('')
                    }}
                    disabled={savingId === active.id}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
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
                  {proofByCommitment.get(item.id) ? (
                    <div className={styles.proofBlock}>
                      <span>Proof</span>
                      <p>{proofByCommitment.get(item.id)?.description}</p>
                    </div>
                  ) : null}
                </div>
                <span className={`${styles.status} ${styles[item.checkin_outcome || item.status]}`}>
                  {item.checkin_outcome || item.status}
                </span>
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
              <small>{output.mission_title ? `Mission: ${output.mission_title}` : 'Mission linked'}</small>
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

function PatternsPage({ context, refresh }: { context: ForgeContext; refresh: () => Promise<unknown> }) {
  const commitments = context.commitments || []
  const recent = commitments.filter(item => recentDate(item.updated_at || item.created_at))
  const kept = recent.filter(item => item.status === 'kept').length
  const missed = recent.filter(item => item.status === 'missed').length
  const totalResolved = kept + missed
  const fallbackRate = totalResolved ? Math.round((kept / totalResolved) * 100) : 0
  const weekly = context.weekly_summary
  const history = context.pattern_history || []
  const latestHistory = history[0]
  const rate = weekly?.commitment_rate ?? fallbackRate
  const identity = context.identity_mirror
  const review = context.weekly_review
  const tone = context.tone_calibration
  const activeTone = context.coach_tone || tone?.tone || 'direct'
  const [savingTone, setSavingTone] = useState<CoachTone | null>(null)
  const [toneError, setToneError] = useState('')

  async function updateTone(nextTone: CoachTone) {
    setToneError('')
    setSavingTone(nextTone)
    try {
      await jsonRequest('/api/forge/tone', {
        method: 'PATCH',
        body: JSON.stringify({ tone: nextTone }),
      })
      await refresh()
    } catch (err) {
      setToneError(err instanceof Error ? err.message : 'Forge could not save the tone setting.')
    } finally {
      setSavingTone(null)
    }
  }

  const evidenceItems: string[] = []
  if (latestHistory?.evidence?.length) evidenceItems.push(...latestHistory.evidence)
  if (context.avoided_task) evidenceItems.push(`“${context.avoided_task}” has been carried repeatedly without resolution.`)
  if (missed) evidenceItems.push(`${missed} recent commitment${missed === 1 ? ' was' : 's were'} missed.`)
  if (kept) evidenceItems.push(`${kept} recent commitment${kept === 1 ? ' was' : 's were'} kept.`)
  if (context.outputs_this_week) evidenceItems.push(`${context.outputs_this_week} real output${context.outputs_this_week === 1 ? '' : 's'} logged this week.`)
  if (context.summary) evidenceItems.push(context.summary)
  const evidence = Array.from(new Set(evidenceItems)).slice(0, 5)

  return (
    <>
      <section className={styles.patternHero}>
        <div className={styles.strongRule} />
        <Label>Current pattern</Label>
        <h1>{context.pattern_label || 'No pattern identified yet.'}</h1>
        {context.pattern_updated_at ? <p>Updated {dateValue(context.pattern_updated_at)}</p> : null}
        <div className={styles.strongRule} />
      </section>

      <section className={styles.identityMirror}>
        <Label>Identity mirror</Label>
        {identity ? (
          <>
            <div className={styles.identityGrid}>
              <article className={styles.identityCard}>
                <span>Profile A</span>
                <h2>The person you say you want to be</h2>
                <p>{identity.desired_profile}</p>
              </article>
              <article className={styles.identityCard}>
                <span>Profile B</span>
                <h2>The person your current habits are building</h2>
                <p>{identity.current_profile}</p>
              </article>
            </div>
            <div className={styles.identityGap} data-level={identity.gap_level}>
              <span>{identity.gap_level}</span>
              <p>{identity.identity_gap}</p>
            </div>
            {identity.evidence?.length ? (
              <div className={styles.identityEvidence}>
                {identity.evidence.slice(0, 4).map((item, index) => (
                  <p key={`${item}-${index}`}>{item}</p>
                ))}
              </div>
            ) : null}
            <p className={styles.identityQuestion}>{identity.weekly_question}</p>
          </>
        ) : (
          <p className={styles.bodyCopy}>
            Forge needs a mission and a few resolved commitments before it can build the mirror.
          </p>
        )}
      </section>

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Tone calibration</Label>
        <div className={styles.toneGrid}>
          {([
            ['direct', 'Direct', 'Concise. Blunt. Fast to proof.'],
            ['balanced', 'Balanced', 'Calm. Direct. Emotion-aware.'],
            ['firm_support', 'Firm Support', 'Support first. No soft excuses.'],
          ] as const).map(([value, label, description]) => (
            <button
              className={`${styles.toneButton} ${activeTone === value ? styles.toneButtonActive : ''}`}
              disabled={Boolean(savingTone)}
              key={value}
              onClick={() => void updateTone(value)}
              type="button"
            >
              <span>{label}</span>
              <strong>{description}</strong>
            </button>
          ))}
        </div>
        {tone ? (
          <div className={styles.toneRules}>
            <p>{tone.instruction}</p>
            <p>{tone.emotional_validation_rule}</p>
            <p>{tone.specificity_rule}</p>
          </div>
        ) : (
          <p className={styles.bodyCopy}>Forge will default to Direct until a tone is saved.</p>
        )}
        {savingTone ? <p className={styles.quietNote}>Saving tone…</p> : null}
        {toneError ? <p className={styles.error}>{toneError}</p> : null}
      </section>

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Weekly review</Label>
        {review ? (
          <div className={styles.reviewBlock}>
            <article>
              <span>What happened</span>
              <p>{review.what_happened}</p>
            </article>
            <article>
              <span>Pattern</span>
              <p>{review.pattern}</p>
            </article>
            <article>
              <span>Next</span>
              <p>{review.next_action}</p>
            </article>
            {review.committed_to.length ? (
              <div className={styles.reviewList}>
                <span>Committed to</span>
                {review.committed_to.map((item, index) => (
                  <p key={`${item}-${index}`}>{item}</p>
                ))}
              </div>
            ) : null}
            <p className={styles.identityQuestion}>{review.review_question}</p>
          </div>
        ) : (
          <p className={styles.bodyCopy}>Forge needs this week&apos;s commitments before it can run a weekly review.</p>
        )}
      </section>

      <div className={styles.rule} />

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
        <Label>Weekly summary</Label>
        <div className={styles.weekGrid}>
          <Stat label="Made" value={weekly?.commitments_made ?? recent.length} />
          <Stat label="Kept" value={weekly?.commitments_kept ?? kept} />
          <Stat label="Missed" value={weekly?.commitments_missed ?? missed} />
          <Stat label="Shipped" value={weekly?.outputs_logged ?? context.outputs_this_week ?? 0} />
        </div>
        {weekly?.pattern_status ? <p className={styles.summaryLine}>{weekly.pattern_status}</p> : null}
        <div className={styles.rateHeader}><span>Commitment rate</span><strong>{rate}%</strong></div>
        <div className={styles.rateTrack}><span style={{ width: `${rate}%` }} /></div>
      </section>

      <div className={styles.rule} />

      <section className={styles.section}>
        <Label>Pattern history</Label>
        {history.length ? (
          <div className={styles.patternHistoryList}>
            {history.map(event => (
              <div className={styles.patternHistory} key={event.id}>
                <span>{dateValue(event.created_at)}</span>
                <div>
                  <p>{event.pattern_label}</p>
                  {event.reason ? <small>{event.reason}</small> : null}
                </div>
              </div>
            ))}
          </div>
        ) : context.pattern_label ? (
          <div className={styles.patternHistory}>
            <span>{dateValue(context.pattern_updated_at)}</span>
            <div><p>{context.pattern_label}</p><small>Current pattern</small></div>
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
        {context && view === 'patterns' ? <PatternsPage context={context} refresh={refresh} /> : null}
      </main>
    </div>
  )
}
