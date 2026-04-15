'use client'

import Link from 'next/link'
import { type ReactNode, useState } from 'react'

type PreviewTab = 'home' | 'tasks' | 'habits' | 'journal' | 'calendar' | 'accountability'

type DemoTask = {
  id: number
  label: string
  kind: string
  done: boolean
}

type DemoHabit = {
  id: number
  label: string
  streak: string
  done: boolean
}

type CoachMessage = {
  id: number
  role: 'user' | 'ai'
  text: string
}

const previewTabs: { id: PreviewTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'habits', label: 'Habits' },
  { id: 'journal', label: 'Journal' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'accountability', label: 'Accountability' },
]

const featurePills = [
  'Tasks and goals',
  'Habit tracking',
  'Accountability',
  'Journal and notes',
  'AI life coach',
]

const comparisonRows = [
  { feature: 'Task management', others: '$5/mo', taskflow: 'Included' },
  { feature: 'Habit tracking and streaks', others: '$8/mo', taskflow: 'Included' },
  { feature: 'Journal and notes', others: '$10/mo', taskflow: 'Included' },
  { feature: 'Calendar planning', others: '$19/mo', taskflow: 'Included' },
  { feature: 'Accountability tracker', others: '$12/mo', taskflow: 'Included' },
  { feature: 'AI that studies your patterns', others: 'None', taskflow: 'Included' },
]

const testimonialCards = [
  {
    initials: 'AT',
    name: 'Alex T.',
    title: 'College senior',
    quote: 'The accountability tracker alone is worth it. I could not find anything free like this anywhere.',
  },
  {
    initials: 'KR',
    name: 'Kai Rodriguez',
    title: 'Entrepreneur, 22',
    quote: 'I was paying $54 a month across five apps. TaskFlow replaced all of them and the advice is actually useful.',
  },
  {
    initials: 'DS',
    name: 'Devon S.',
    title: 'Music producer',
    quote: 'The daily growth score changed everything. I actually look forward to seeing how I did at night.',
  },
  {
    initials: 'MP',
    name: 'Marcus P.',
    title: 'High school senior',
    quote: 'I journaled for the first time in my life because the prompt actually made me think.',
  },
  {
    initials: 'TW',
    name: 'Tyler W.',
    title: 'Builder, founder',
    quote: 'The AI noticed I was more productive on workout days before I did. That changed how I plan my week.',
  },
  {
    initials: 'NB',
    name: 'Naomi B.',
    title: 'Student, designer',
    quote: 'Finally one app that does not treat self-improvement like a corporate dashboard.',
  },
]

const faqItems = [
  {
    question: 'Is TaskFlow actually free?',
    answer:
      'Yes. Tasks, habits, journal, calendar, accountability, and the AI layer are all available without a card or trial.',
  },
  {
    question: 'How does the AI actually work?',
    answer:
      'It learns from your completed tasks, streaks, journal entries, and timing patterns, then turns that into daily plans, nudges, and coaching.',
  },
  {
    question: 'What makes TaskFlow different from other productivity apps?',
    answer:
      'Most apps track one slice of your life. TaskFlow connects tasks, habits, reflection, accountability, and coaching in one place.',
  },
  {
    question: 'What is the accountability tracker?',
    answer:
      'It is built for streaks and recovery work such as NoFap, screen limits, junk food, or any other challenge you want to track privately.',
  },
  {
    question: 'Does it work on mobile?',
    answer:
      'Yes. The landing page and the app are responsive today, and native apps can come later without changing the core experience.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Create an account, add your first task and habit, then give the AI a little data to learn from. Most people can do that in under a minute.',
  },
]

const newsletterBenefits = [
  {
    title: 'Early feature access',
    body: 'Be first to try new TaskFlow updates before they go public.',
  },
  {
    title: 'Weekly growth tips',
    body: 'Get practical ideas around the same habits and routines the app helps you build.',
  },
  {
    title: 'Community insights',
    body: 'See what is working for other people building stronger routines with TaskFlow.',
  },
]

const heatmapCells = Array.from({ length: 91 }, (_, index) => {
  const levels = ['bg-white/5', 'bg-white/10', 'bg-white/20', 'bg-white/35', 'bg-white/55']
  return levels[(index * 7 + Math.floor(index / 3)) % levels.length]
})

const calendarDays = [
  '', '', '', '', '', '', '1',
  '2', '3', '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22',
  '23', '24', '25', '26', '27', '28', '29',
  '30', '31',
]

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function LogoMark() {
  return (
    <div className="flex items-center gap-2 text-white">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M3 8L6.5 11.5L13 4.5"
            stroke="#0A0A0A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-sm font-semibold tracking-tight text-white">TaskFlow</span>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow: string
  title: ReactNode
  subtitle: string
  align?: 'center' | 'left'
}) {
  return (
    <div className={cx('mb-12', align === 'center' ? 'text-center' : 'text-left')}>
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">{eyebrow}</p>
      <h2 className="mb-4 text-4xl font-black leading-[1.05] tracking-[-0.08em] text-white md:text-5xl">
        {title}
      </h2>
      <p className={cx('text-sm leading-7 text-white/45', align === 'center' ? 'mx-auto max-w-xl' : 'max-w-lg')}>
        {subtitle}
      </p>
    </div>
  )
}

function coachReply(input: string) {
  const text = input.toLowerCase()

  if (text.includes('plan')) {
    return 'Start with the hardest thing before noon, keep your workout, and leave journaling for the shutdown routine tonight.'
  }

  if (text.includes('unmotivated') || text.includes('stuck')) {
    return 'Do not wait for motivation. Pick one task that takes under ten minutes, finish it, and let momentum handle the rest.'
  }

  if (text.includes('relapse') || text.includes('slip')) {
    return 'Log it honestly, remove the trigger for the next hour, and protect the next clean rep. One bad moment is not the whole story.'
  }

  return 'Focus on one win, one habit, and one honest reflection today. That is enough data for tomorrow to get sharper.'
}

export default function LandingPageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<PreviewTab>('home')
  const [newTask, setNewTask] = useState('')
  const [accountabilityDays, setAccountabilityDays] = useState(22)
  const [faqOpen, setFaqOpen] = useState(0)
  const [coachInput, setCoachInput] = useState('')
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
    {
      id: 1,
      role: 'ai',
      text: 'Hey Donny. I know your streaks, habits, and goals. Ask me anything.',
    },
  ])
  const [tasks, setTasks] = useState<DemoTask[]>([
    { id: 1, label: 'Morning workout', kind: 'Habit', done: true },
    { id: 2, label: 'Journal entry', kind: 'Habit', done: true },
    { id: 3, label: 'Deploy TaskFlow', kind: 'Task', done: false },
    { id: 4, label: 'Rebuild landing page', kind: 'Task', done: false },
    { id: 5, label: 'NoFap check-in', kind: 'Accountability', done: false },
    { id: 6, label: 'Read 20 pages', kind: 'Task', done: false },
  ])
  const [habits, setHabits] = useState<DemoHabit[]>([
    { id: 1, label: 'Morning workout', streak: '14 days', done: true },
    { id: 2, label: 'Journal entry', streak: '7 days', done: true },
    { id: 3, label: 'Read 20 pages', streak: '3 days', done: false },
    { id: 4, label: 'No junk food', streak: '5 days', done: false },
    { id: 5, label: 'Wake up before 7am', streak: '10 days', done: false },
  ])

  function toggleTask(taskId: number) {
    setTasks(current =>
      current.map(task => (task.id === taskId ? { ...task, done: !task.done } : task)),
    )
  }

  function addTask() {
    const value = newTask.trim()
    if (!value) return

    setTasks(current => [
      ...current,
      { id: current.length + 1, label: value, kind: 'Task', done: false },
    ])
    setNewTask('')
  }

  function toggleHabit(habitId: number) {
    setHabits(current =>
      current.map(habit => (habit.id === habitId ? { ...habit, done: !habit.done } : habit)),
    )
  }

  function sendCoachMessage(message?: string) {
    const text = (message ?? coachInput).trim()
    if (!text) return

    const nextId = coachMessages.length + 1
    setCoachMessages(current => [
      ...current,
      { id: nextId, role: 'user', text },
      { id: nextId + 1, role: 'ai', text: coachReply(text) },
    ])
    setCoachInput('')
  }

  const priorityTasks = tasks.slice(0, 5)
  const successCount = Math.min(accountabilityDays, 30)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_52%)]" />
      <div className="pointer-events-none absolute left-[-12rem] top-[26rem] h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-[52rem] h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-6 md:px-10">
          <a href="#top" className="shrink-0">
            <LogoMark />
          </a>

          <nav className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <a href="#preview" className="transition hover:text-white">Product</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#comparison" className="transition hover:text-white">Compare</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden rounded-full px-3 py-2 text-sm text-white/60 transition hover:text-white md:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition hover:bg-white/90 md:inline-flex"
            >
              Start free
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm md:hidden"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <div
        className={cx(
          'fixed inset-0 z-[60] bg-[#0A0A0A] px-6 py-6 transition-transform duration-300 md:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="mb-10 flex items-center justify-between">
          <LogoMark />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-5 text-lg text-white/80">
          <a href="#preview" onClick={() => setMobileMenuOpen(false)}>Product</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#comparison" onClick={() => setMobileMenuOpen(false)}>Compare</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/auth/register"
            className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#0A0A0A]"
          >
            Start free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/80"
          >
            Log in
          </Link>
        </div>
      </div>

      <div id="top" className="mx-auto max-w-[1440px] px-6 pb-16 pt-36 md:px-10 md:pt-40">
        <section className="scroll-mt-28">
          <div className="mx-auto max-w-[720px] text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/45">
              <span className="h-2 w-2 rounded-full bg-white/70" />
              Personal growth OS
            </div>

            <h1 className="mb-6 text-5xl font-black leading-[0.95] tracking-[-0.1em] text-white md:text-7xl">
              Stop juggling apps.
              <span className="block text-white/30">Start becoming who you are supposed to be.</span>
            </h1>

            <p className="mx-auto mb-10 max-w-[540px] text-base leading-8 text-white/50 md:text-lg">
              Not another productivity app. TaskFlow studies your behavior, connects every part of your life,
              and gets sharper every day.
            </p>

            <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-white/90"
              >
                Start for free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-6 py-3 text-sm font-medium text-white/65 transition hover:border-white/20 hover:text-white"
              >
                See how it works
              </a>
            </div>

            <div className="mb-14 flex flex-wrap items-center justify-center gap-4 text-sm text-white/35">
              <div className="flex -space-x-2">
                {['JM', 'AT', 'KR', 'DS'].map(initials => (
                  <div
                    key={initials}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0A0A0A] bg-white/10 text-[10px] font-semibold text-white/70"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <span>2,000+ people already building better systems with TaskFlow</span>
            </div>
          </div>

          <div
            id="preview"
            className="scroll-mt-28 overflow-hidden rounded-[30px] border border-white/10 bg-[#101010]/90 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
          >
            <div className="border-b border-white/8 bg-white/[0.02] px-4 py-3 md:px-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-white/25" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <div className="ml-auto rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] text-white/35">
                  {`tflow.live/${activeTab}`}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="hidden border-r border-white/8 bg-[#0d0d0d] p-4 md:block">
                <div className="mb-6">
                  <LogoMark />
                </div>
                <div className="space-y-1">
                  {previewTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cx(
                        'flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition',
                        activeTab === tab.id ? 'bg-white text-[#0A0A0A]' : 'text-white/50 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className={cx('h-2 w-2 rounded-full', activeTab === tab.id ? 'bg-[#0A0A0A]' : 'bg-white/20')} />
                    </button>
                  ))}
                </div>
              </aside>

              <div className="p-4 md:p-6">
                <div className="mb-4 grid grid-cols-2 gap-2 md:hidden">
                  {previewTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cx(
                        'rounded-2xl border px-3 py-2 text-sm transition',
                        activeTab === tab.id
                          ? 'border-white bg-white text-[#0A0A0A]'
                          : 'border-white/10 bg-white/[0.03] text-white/55',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'home' && (
                  <div>
                    <div className="mb-1 text-2xl font-bold tracking-[-0.05em] text-white">Good morning, Donny</div>
                    <div className="mb-5 text-sm text-white/35">Saturday, March 28 - 7 tasks - 3 habits due</div>
                    <div className="mb-5 grid gap-3 sm:grid-cols-3">
                      {[
                        ['Streak', '14 days'],
                        ['Tasks', `${tasks.filter(task => task.done).length} / ${tasks.length}`],
                        ['NoFap', `${accountabilityDays} days`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-white/30">{label}</div>
                          <div className="text-xl font-bold tracking-[-0.05em] text-white">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-5 flex gap-3 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[10px] font-semibold text-white/65">
                        AI
                      </div>
                      <p className="text-sm leading-7 text-white/52">
                        <span className="font-semibold text-white/72">AI insight:</span> You finish 40% more tasks on days
                        you work out first. Your workout is at 8am today. Do not skip it.
                      </p>
                    </div>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-white/75">Today&apos;s priorities</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45 transition hover:text-white"
                      >
                        Open tasks
                      </button>
                    </div>
                    <div className="space-y-3">
                      {priorityTasks.map(task => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left"
                        >
                          <div
                            className={cx(
                              'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                              task.done
                                ? 'border-white bg-white text-[#0A0A0A]'
                                : 'border-white/15 bg-transparent text-white/25',
                            )}
                          >
                            {task.done ? 'OK' : ''}
                          </div>
                          <div className="flex-1">
                            <div className={cx('text-sm', task.done ? 'text-white/40 line-through' : 'text-white/78')}>
                              {task.label}
                            </div>
                          </div>
                          <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                            {task.kind}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div>
                    <div className="mb-1 text-2xl font-bold tracking-[-0.05em] text-white">Tasks</div>
                    <div className="mb-5 text-sm text-white/35">Manage the work that actually matters.</div>
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                      <input
                        value={newTask}
                        onChange={event => setNewTask(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') addTask()
                        }}
                        placeholder="Add a new task"
                        className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20"
                      />
                      <button
                        type="button"
                        onClick={addTask}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0A0A0A]"
                      >
                        Add task
                      </button>
                    </div>
                    <div className="space-y-3">
                      {tasks.map(task => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left"
                        >
                          <div
                            className={cx(
                              'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                              task.done
                                ? 'border-white bg-white text-[#0A0A0A]'
                                : 'border-white/15 bg-transparent text-white/25',
                            )}
                          >
                            {task.done ? 'OK' : ''}
                          </div>
                          <div className={cx('flex-1 text-sm', task.done ? 'text-white/40 line-through' : 'text-white/78')}>
                            {task.label}
                          </div>
                          <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                            {task.kind}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'habits' && (
                  <div>
                    <div className="mb-1 text-2xl font-bold tracking-[-0.05em] text-white">Habits</div>
                    <div className="mb-5 text-sm text-white/35">Build consistency one honest day at a time.</div>
                    <div className="space-y-3">
                      {habits.map(habit => (
                        <button
                          key={habit.id}
                          type="button"
                          onClick={() => toggleHabit(habit.id)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left"
                        >
                          <div
                            className={cx(
                              'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                              habit.done
                                ? 'border-white bg-white text-[#0A0A0A]'
                                : 'border-white/15 bg-transparent text-white/25',
                            )}
                          >
                            {habit.done ? 'OK' : ''}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-white/78">{habit.label}</div>
                          </div>
                          <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                            {habit.streak}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'journal' && (
                  <div>
                    <div className="mb-1 text-2xl font-bold tracking-[-0.05em] text-white">Journal</div>
                    <div className="mb-5 text-sm text-white/35">Saturday, March 28, 2026</div>
                    <div className="mb-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/55">
                      <span className="font-semibold text-white/72">AI prompt:</span> You completed five tasks today.
                      What drove that momentum and how do you keep it tomorrow?
                    </div>
                    <textarea
                      defaultValue="Today felt cleaner because I started with movement and stayed off my phone long enough to focus."
                      className="min-h-[220px] w-full rounded-[28px] border border-white/8 bg-white/[0.02] px-5 py-4 text-sm leading-7 text-white/75 outline-none"
                    />
                    <button
                      type="button"
                      className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0A0A0A]"
                    >
                      Save entry
                    </button>
                  </div>
                )}

                {activeTab === 'calendar' && (
                  <div>
                    <div className="mb-1 text-2xl font-bold tracking-[-0.05em] text-white">Calendar</div>
                    <div className="mb-5 text-sm text-white/35">March 2026</div>
                    <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.18em] text-white/22">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="py-2">{day}</div>
                      ))}
                      {calendarDays.map((day, index) => (
                        <div
                          key={`${day}-${index}`}
                          className={cx(
                            'flex aspect-square items-center justify-center rounded-2xl border text-sm',
                            day === ''
                              ? 'border-transparent bg-transparent'
                              : day === '28'
                                ? 'border-white bg-white text-[#0A0A0A]'
                                : Number(day) % 2 === 0
                                  ? 'border-white/8 bg-white/[0.03] text-white/72'
                                  : 'border-white/8 bg-transparent text-white/48',
                          )}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'accountability' && (
                  <div>
                    <div className="mb-1 text-2xl font-bold tracking-[-0.05em] text-white">Accountability</div>
                    <div className="mb-5 text-sm text-white/35">NoFap and recovery tracking that stays private.</div>
                    <div className="mb-5 rounded-[32px] border border-white/8 bg-white/[0.03] p-6 text-center">
                      <div className="text-[56px] font-black tracking-[-0.08em] text-white">{accountabilityDays}</div>
                      <div className="text-sm uppercase tracking-[0.24em] text-white/30">days clean</div>
                    </div>
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setAccountabilityDays(current => current + 1)}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0A0A0A]"
                      >
                        Check in today
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountabilityDays(0)}
                        className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/70"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="mb-3 text-sm font-semibold text-white/72">Last 30 days</div>
                    <div className="mb-5 grid grid-cols-10 gap-2">
                      {Array.from({ length: 30 }, (_, index) => (
                        <div
                          key={index}
                          className={cx(
                            'h-6 rounded-md border',
                            index < successCount ? 'border-white/10 bg-white/45' : 'border-white/8 bg-white/[0.04]',
                          )}
                        />
                      ))}
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/55">
                      <span className="font-semibold text-white/72">Reflection:</span> The urge is temporary. Protect the
                      next hour and let the streak keep compounding.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {featurePills.map(pill => (
              <div
                key={pill}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/55"
              >
                <span className="h-2 w-2 rounded-full bg-white/55" />
                {pill}
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 py-24">
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                Start fast.
                <br />
                <span className="text-white/30">Let the system learn you.</span>
              </>
            }
            subtitle="The original landing page had the right idea. This version keeps the same story but moves it into real React components."
          />

          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Sign up with no setup required.',
                tag: '60 seconds',
                body: 'Create your account in seconds. No questionnaire, no busywork, no credit card.',
                card: (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-white/30">Create account</div>
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white/65">
                        Donny Fabuluje
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white/65">
                        donny@tflow.live
                      </div>
                      <Link
                        href="/auth/register"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0A0A0A]"
                      >
                        Create my account
                      </Link>
                    </div>
                  </div>
                ),
              },
              {
                step: '02',
                title: 'Add tasks, habits, and goals.',
                tag: 'First five minutes',
                body: 'Drop in what matters and TaskFlow starts learning from day one instead of waiting for a perfect setup.',
                card: (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="space-y-3">
                      {['Deploy TaskFlow', 'Morning workout', 'Journal entry', 'NoFap tracker'].map(item => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-[10px] font-semibold text-white/60">
                            OK
                          </div>
                          <div className="text-sm text-white/70">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                step: '03',
                title: 'The AI starts learning your patterns.',
                tag: 'Ongoing',
                body: 'Every completed task, habit streak, and journal entry becomes useful context for better nudges and better plans.',
                card: (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="space-y-3">
                      {[
                        'Pattern found: you complete 40% more tasks on days you exercise first.',
                        'Slip detected: journaling dropped for three days and productivity followed.',
                        'Insight: your best days start before 9am with no phone for the first hour.',
                      ].map(item => (
                        <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-white/55">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                step: '04',
                title: 'Talk to your AI coach anytime.',
                tag: 'Always available',
                body: 'The coach is not generic. It knows your streaks, your routines, and where you tend to slip.',
                card: (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {['Plan my day', 'I am unmotivated', 'I relapsed'].map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => sendCoachMessage(suggestion)}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55 transition hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="mb-4 max-h-52 space-y-3 overflow-y-auto pr-1">
                      {coachMessages.map(message => (
                        <div
                          key={message.id}
                          className={cx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cx(
                              'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7',
                              message.role === 'user'
                                ? 'bg-white text-[#0A0A0A]'
                                : 'border border-white/8 bg-white/[0.02] text-white/62',
                            )}
                          >
                            {message.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <input
                        value={coachInput}
                        onChange={event => setCoachInput(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') sendCoachMessage()
                        }}
                        placeholder="Ask your AI coach"
                        className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => sendCoachMessage()}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0A0A0A]"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ),
              },
              {
                step: '05',
                title: 'Wake up to a plan built for you.',
                tag: 'Every morning',
                body: 'The daily plan turns your habits, priorities, and current momentum into a realistic schedule.',
                card: (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-semibold text-white/78">Your plan for today</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">Sat, Mar 28</div>
                    </div>
                    <div className="space-y-3">
                      {[
                        ['7:00am', 'Morning workout', 'Habit'],
                        ['8:30am', 'Deep work - Deploy TaskFlow', 'Task'],
                        ['12:00pm', 'Record music session', 'Task'],
                        ['9:00pm', 'Journal and NoFap check-in', 'Habit'],
                      ].map(([time, label, kind]) => (
                        <div key={time} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                          <div className="min-w-16 text-xs uppercase tracking-[0.18em] text-white/30">{time}</div>
                          <div className="flex-1 text-sm text-white/72">{label}</div>
                          <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                            {kind}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
            ].map(item => (
              <div
                key={item.step}
                className="grid gap-6 rounded-[32px] border border-white/8 bg-white/[0.02] p-6 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,420px)] md:p-8"
              >
                <div className="flex items-start md:items-center">
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.32em] text-white/55">
                    {item.step}
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.24em] text-white/30">{item.tag}</div>
                  <h3 className="mb-4 text-3xl font-black tracking-[-0.08em] text-white md:text-4xl">{item.title}</h3>
                  <p className="max-w-xl text-sm leading-7 text-white/45">{item.body}</p>
                </div>
                <div>{item.card}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-28 py-24">
          <SectionHeading
            eyebrow="Built different"
            title={
              <>
                Features you will not find
                <br />
                <span className="text-white/30">anywhere else for free.</span>
              </>
            }
            subtitle="The original static HTML already had strong feature ideas. This TSX version keeps the same product narrative in a componentized layout."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[30px] border border-white/8 bg-[#111] lg:col-span-2">
              <div className="border-b border-white/8 p-6">
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/30">Daily growth score</p>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.05em] text-white">Your day, scored.</h3>
                <p className="max-w-xl text-sm leading-7 text-white/45">
                  TaskFlow gives you a simple score based on completion, streaks, and consistency so you know how the day actually went.
                </p>
              </div>
              <div className="grid gap-6 p-6 md:grid-cols-[120px_minmax(0,1fr)]">
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-[10px] border-white/12 text-center">
                  <div>
                    <div className="text-4xl font-black tracking-[-0.08em] text-white">78</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/30">out of 100</div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    ['Tasks', '71%'],
                    ['Habits', '66%'],
                    ['Journal', '100%'],
                    ['Streak', '80%'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-2 flex items-center justify-between text-sm text-white/45">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/6">
                        <div
                          className="h-2 rounded-full bg-white/45"
                          style={{ width: value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-[#111]">
              <div className="border-b border-white/8 p-6">
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/30">Weekly AI summary</p>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.05em] text-white">Your week from the AI view.</h3>
                <p className="text-sm leading-7 text-white/45">
                  Every week the AI turns scattered behavior into specific recommendations.
                </p>
              </div>
              <div className="space-y-3 p-6">
                {[
                  'Best day: Wednesday. You cleared all seven tasks and every habit.',
                  'Slip: journaling dropped for three days and productivity followed.',
                  'Focus next week: sleep earlier so your mornings stop starting behind.',
                ].map(item => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/55">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-[#111] lg:col-span-2">
              <div className="border-b border-white/8 p-6">
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/30">Consistency map</p>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.05em] text-white">See the full pattern over time.</h3>
                <p className="text-sm leading-7 text-white/45">
                  Like a contribution graph for your life. Every day you show up leaves a visible trace.
                </p>
              </div>
              <div className="p-6">
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                  {heatmapCells.map((cell, index) => (
                    <div key={index} className={cx('aspect-square rounded-[4px]', cell)} />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-white/25">
                  <span>Less</span>
                  {['bg-white/5', 'bg-white/10', 'bg-white/20', 'bg-white/35', 'bg-white/55'].map(level => (
                    <div key={level} className={cx('h-3 w-3 rounded-[3px]', level)} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-[#111]">
              <div className="border-b border-white/8 p-6">
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/30">AI nudges</p>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.05em] text-white">Get pulled back before you drift.</h3>
                <p className="text-sm leading-7 text-white/45">
                  TaskFlow notices when you are slipping and surfaces the right nudge at the right time.
                </p>
              </div>
              <div className="space-y-3 p-6">
                {[
                  'Three days without a journal. Want a quick two-minute check-in?',
                  'Your 8am workout starts in 30 minutes. Your best days begin there.',
                  'You have not checked in today. Protect the 22-day streak.',
                ].map(item => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/55">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="scroll-mt-28 py-24">
          <SectionHeading
            eyebrow="Real people, real results"
            title={
              <>
                People who stopped juggling
                <br />
                <span className="text-white/30">and started becoming.</span>
              </>
            }
            subtitle="The copy from the original page was strong, so the social proof stays sharp here too."
          />

          <div className="mx-auto mb-10 max-w-[920px] rounded-[32px] border border-white/8 bg-[#111] px-6 py-8 md:px-10">
            <p className="mb-6 text-2xl font-bold leading-[1.45] tracking-[-0.04em] text-white/88 md:text-3xl">
              &quot;I&apos;ve tried every productivity app out there. TaskFlow is the first one that actually feels like
              it is on my side. The AI knows when I am slipping before I do.&quot;
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/70">
                JM
              </div>
              <div>
                <div className="text-sm font-semibold text-white/80">Jordan Mitchell</div>
                <div className="text-xs text-white/35">CS student, content creator</div>
              </div>
              <div className="ml-auto text-sm text-white/40">Rated 5/5</div>
            </div>
          </div>

          <div className="mx-auto grid max-w-[920px] gap-3 md:grid-cols-3">
            {testimonialCards.map(card => (
              <div key={card.name} className="rounded-[28px] border border-white/8 bg-[#111] p-5">
                <div className="mb-3 text-xs text-white/35">Rated 5/5</div>
                <p className="mb-4 text-sm leading-7 text-white/55">{card.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-white/60">
                    {card.initials}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/72">{card.name}</div>
                    <div className="text-[11px] text-white/30">{card.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 grid max-w-[920px] overflow-hidden rounded-[28px] border border-white/8 bg-[#111] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['2,000+', 'People signed up'],
              ['4.9/5', 'Average rating'],
              ['$0', 'Cost to start'],
              ['6-in-1', 'Apps replaced'],
            ].map(([value, label], index) => (
              <div
                key={label}
                className={cx(
                  'px-6 py-6 text-center',
                  index < 3 && 'border-b border-white/8 lg:border-b-0 lg:border-r',
                  index === 1 && 'sm:border-r-0 lg:border-r',
                )}
              >
                <div className="mb-1 text-3xl font-black tracking-[-0.08em] text-white">{value}</div>
                <div className="text-xs text-white/30">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="comparison" className="scroll-mt-28 py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              eyebrow="The math is simple"
              title={
                <>
                  Why pay $50 a month
                  <br />
                  <span className="text-white/30">for five different apps?</span>
                </>
              }
              subtitle="TaskFlow replaces the stack and adds the AI layer that actually connects everything."
              align="left"
            />
            <div className="text-right">
              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-white/25">You save</div>
              <div className="text-5xl font-black tracking-[-0.1em] text-white">$600+</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">every year</div>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[32px] border border-white/8 md:block">
            <div className="grid grid-cols-[minmax(0,1fr)_160px_160px] border-b border-white/8 bg-white/[0.03]">
              <div className="px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-white/30">Feature</div>
              <div className="px-5 py-4 text-center text-[10px] uppercase tracking-[0.22em] text-white/30">Other apps</div>
              <div className="px-5 py-4 text-center text-[10px] uppercase tracking-[0.22em] text-white/75">TaskFlow</div>
            </div>
            {comparisonRows.map(row => (
              <div
                key={row.feature}
                className="grid grid-cols-[minmax(0,1fr)_160px_160px] border-b border-white/6 bg-[#111] last:border-b-0"
              >
                <div className="px-5 py-4 text-sm text-white/65">{row.feature}</div>
                <div className="px-5 py-4 text-center text-sm text-white/45">{row.others}</div>
                <div className="px-5 py-4 text-center text-sm font-semibold text-white">{row.taskflow}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 md:hidden">
            {comparisonRows.map(row => (
              <div key={row.feature} className="rounded-[24px] border border-white/8 bg-[#111] p-4">
                <div className="mb-3 text-sm font-semibold text-white/78">{row.feature}</div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">Other apps</div>
                    <div className="text-white/45">{row.others}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">TaskFlow</div>
                    <div className="font-semibold text-white">{row.taskflow}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#0A0A0A]"
            >
              Start for free
            </Link>
            <span className="text-sm text-white/28">No credit card. No catch. Just one cleaner system.</span>
          </div>
        </section>

        <section className="py-24">
          <div className="grid items-center gap-10 rounded-[36px] border border-white/8 bg-white/[0.02] p-6 md:grid-cols-2 md:p-10">
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.24em] text-white/30">Ready when you are</p>
              <h2 className="mb-5 text-4xl font-black leading-[1.05] tracking-[-0.08em] text-white md:text-5xl">
                Stop planning.
                <span className="block text-white/30">Start becoming.</span>
              </h2>
              <p className="mb-8 max-w-md text-sm leading-7 text-white/45">
                You have been juggling apps, missing habits, and losing streaks. TaskFlow puts everything in one place
                with an AI that actually knows you and helps you move forward.
              </p>
              <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#0A0A0A]"
                >
                  Start for free
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-6 py-3 text-sm text-white/65"
                >
                  See the feature stack
                </a>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/28">
                <div className="flex -space-x-2">
                  {['JM', 'AT', 'KR', 'DS'].map(initials => (
                    <div
                      key={initials}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0A0A0A] bg-white/10 text-[10px] font-semibold text-white/60"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span>2,000+ people already building better routines</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/8 bg-[#111]">
              <div className="border-b border-white/8 bg-[#0F0F0F] px-4 py-3">
                <div className="mx-auto w-fit rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] text-white/25">
                  tflow.live/home
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <div className="text-lg font-bold tracking-[-0.04em] text-white">Good morning, Donny</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">Your streak is on the line</div>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-white/25">Daily growth score</div>
                  <div className="text-4xl font-black tracking-[-0.08em] text-white">78</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Streak', '14d'],
                    ['Tasks', '5/7'],
                    ['NoFap', '22d'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/25">{label}</div>
                      <div className="text-lg font-bold tracking-[-0.05em] text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[10px] font-semibold text-white/65">
                    AI
                  </div>
                  <p className="text-sm leading-7 text-white/52">
                    <span className="font-semibold text-white/72">AI insight:</span> You are 40% more productive on workout
                    days. Your 8am workout is next.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="grid gap-10 rounded-[36px] border border-white/8 bg-white/[0.02] p-6 md:grid-cols-2 md:p-10">
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.24em] text-white/30">Stay in the loop</p>
              <h2 className="mb-4 text-4xl font-black leading-[1.05] tracking-[-0.08em] text-white md:text-5xl">
                Be first to know
                <span className="block text-white/30">what ships next.</span>
              </h2>
              <p className="mb-7 max-w-md text-sm leading-7 text-white/45">
                Get early access to new features, AI updates, and weekly growth tips straight to your inbox.
              </p>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20"
                />
                <button
                  type="button"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0A0A0A]"
                >
                  Subscribe
                </button>
              </div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/25">No spam. Unsubscribe anytime.</p>
            </div>

            <div className="space-y-3">
              {newsletterBenefits.map(item => (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-[#111] p-5">
                  <div className="mb-2 text-sm font-semibold tracking-[-0.03em] text-white/78">{item.title}</div>
                  <div className="text-sm leading-7 text-white/45">{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 py-24">
          <SectionHeading
            eyebrow="FAQ"
            title={
              <>
                Questions?
                <br />
                <span className="text-white/30">We got you.</span>
              </>
            }
            subtitle="Everything a new visitor needs to understand before jumping into the app."
          />

          <div className="mx-auto max-w-[920px] space-y-3">
            {faqItems.map((item, index) => {
              const open = faqOpen === index
              return (
                <div key={item.question} className="overflow-hidden rounded-[26px] border border-white/8 bg-[#111]">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(open ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  >
                    <span className={cx('text-base font-semibold tracking-[-0.03em]', open ? 'text-white' : 'text-white/70')}>
                      {item.question}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-white/35">
                      {open ? 'Hide' : 'Open'}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-white/6 px-5 py-5 text-sm leading-7 text-white/48">
                      {item.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mx-auto mt-10 flex max-w-[920px] flex-col items-start justify-between gap-6 rounded-[28px] border border-white/8 bg-white/[0.02] px-6 py-6 md:flex-row md:items-center">
            <div>
              <div className="mb-1 text-sm font-semibold text-white/82">Still have questions?</div>
              <div className="text-sm text-white/38">Reach out and we will get back to you fast.</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0A0A0A]"
              >
                Start for free
              </Link>
              <a
                href="mailto:hello@tflow.live"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/65"
              >
                Contact us
              </a>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/8 bg-[#0A0A0A] px-6 pb-10 pt-16 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
            <div className="space-y-4">
              <LogoMark />
              <p className="max-w-sm text-sm leading-7 text-white/38">
                Your personal growth OS. Tasks, habits, journal, accountability, and AI in one place.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0A0A0A]"
              >
                Start for free
              </Link>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/28">Product</div>
              <a href="#preview" className="block text-sm text-white/38 transition hover:text-white/70">Overview</a>
              <a href="#features" className="block text-sm text-white/38 transition hover:text-white/70">Features</a>
              <a href="#comparison" className="block text-sm text-white/38 transition hover:text-white/70">Compare</a>
              <a href="#faq" className="block text-sm text-white/38 transition hover:text-white/70">FAQ</a>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/28">Company</div>
              <Link href="/auth/login" className="block text-sm text-white/38 transition hover:text-white/70">Log in</Link>
              <Link href="/auth/register" className="block text-sm text-white/38 transition hover:text-white/70">Sign up</Link>
              <a href="https://github.com/Donnyfab/TaskFlow" className="block text-sm text-white/38 transition hover:text-white/70">GitHub</a>
              <a href="mailto:hello@tflow.live" className="block text-sm text-white/38 transition hover:text-white/70">Contact</a>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/6 pt-6 text-xs text-white/22 md:flex-row md:items-center md:justify-between">
            <div>© 2026 TaskFlow. Built by Donny Fabuluje.</div>
            <div className="flex gap-4">
              <a href="#faq" className="transition hover:text-white/45">FAQ</a>
              <a href="mailto:hello@tflow.live" className="transition hover:text-white/45">Contact</a>
              <a href="https://github.com/Donnyfab/TaskFlow" className="transition hover:text-white/45">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
