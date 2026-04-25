'use client'

import type { CSSProperties } from 'react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'

/* ─── Types ─────────────────────────────────────────────────────────── */
type ThemeMode = 'dark' | 'light'
type LogbookItemType = 'task' | 'project' | 'habit'
type SortMode = 'recent' | 'oldest' | 'alpha'
type FilterMode = 'all' | 'task' | 'project' | 'habit'
type TimeGroup = 'today' | 'yesterday' | 'week' | 'month' | 'older'

interface LogbookColors {
  activeItemBg: string; activeItemTx: string; blue: string; border: string
  contentBg: string; deleteBg: string; deleteBorder: string; deleteText: string
  detailCloseB: string; hoverItemBg: string; inputBg: string; inputBorder: string
  muted: string; sidebarBg: string; text: string
}

interface LogbookItem {
  key: string
  title: string
  type: LogbookItemType
  completedAt: string
  category: string
  priority?: 'high' | 'medium' | 'low'
  isRecurring?: boolean
  taskCount?: number
}

interface LogbookViewProps {
  colors: LogbookColors
  theme: ThemeMode
}

/* ─── Storage ────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'taskflow-logbook-items'

/* ─── Seed data ──────────────────────────────────────────────────────── */
function buildSeedItems(): LogbookItem[] {
  const now = Date.now()
  const h = (n: number) => new Date(now - n * 3_600_000).toISOString()
  const d = (n: number, hr = 10) => new Date(now - n * 86_400_000 + hr * 3_600_000).toISOString()

  return [
    // Today
    { key: 'l-001', title: 'Finalize Q2 report draft', type: 'task', completedAt: h(1), category: 'Work', priority: 'high' },
    { key: 'l-002', title: 'Morning workout', type: 'habit', completedAt: h(4), category: 'Health', isRecurring: true },
    { key: 'l-003', title: 'Review pull requests', type: 'task', completedAt: h(6), category: 'Engineering', priority: 'medium' },
    { key: 'l-004', title: 'Website Redesign', type: 'project', completedAt: h(7), category: 'Work', taskCount: 14 },
    // Yesterday
    { key: 'l-005', title: 'Send invoice to clients', type: 'task', completedAt: d(1, 14), category: 'Finance', priority: 'high' },
    { key: 'l-006', title: 'Read 30 minutes', type: 'habit', completedAt: d(1, 20), category: 'Personal', isRecurring: true },
    { key: 'l-007', title: 'Refactor auth middleware', type: 'task', completedAt: d(1, 9), category: 'Engineering', priority: 'medium' },
    // This Week (3-6 days ago)
    { key: 'l-008', title: 'Set up CI/CD pipeline', type: 'task', completedAt: d(3), category: 'Engineering', priority: 'high' },
    { key: 'l-009', title: 'Q1 Performance Review', type: 'project', completedAt: d(4), category: 'Work', taskCount: 8 },
    { key: 'l-010', title: 'Write weekly newsletter', type: 'task', completedAt: d(5), category: 'Personal', priority: 'low' },
    { key: 'l-011', title: 'Meditation practice', type: 'habit', completedAt: d(4, 7), category: 'Health', isRecurring: true },
    // This Month
    { key: 'l-012', title: 'Book flight for conference', type: 'task', completedAt: d(10), category: 'Travel', priority: 'medium' },
    { key: 'l-013', title: 'Mobile App MVP', type: 'project', completedAt: d(14), category: 'Engineering', taskCount: 22 },
    { key: 'l-014', title: 'Update portfolio website', type: 'task', completedAt: d(18), category: 'Personal', priority: 'low' },
    { key: 'l-015', title: 'Team onboarding docs', type: 'task', completedAt: d(21), category: 'Work', priority: 'medium' },
    // Older
    { key: 'l-016', title: 'Annual health checkup', type: 'task', completedAt: d(45), category: 'Health', priority: 'high' },
    { key: 'l-017', title: 'Tax Season Prep', type: 'project', completedAt: d(60), category: 'Finance', taskCount: 6 },
    { key: 'l-018', title: 'Learn TypeScript generics', type: 'habit', completedAt: d(90), category: 'Learning', isRecurring: true },
  ]
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function getTimeGroup(iso: string): TimeGroup {
  const now = new Date()
  const item = new Date(iso)
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(item.getFullYear(), item.getMonth(), item.getDate())
  const diff = Math.round((nowDay.getTime() - itemDay.getTime()) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff <= 7) return 'week'
  if (item.getMonth() === now.getMonth() && item.getFullYear() === now.getFullYear()) return 'month'
  return 'older'
}

const GROUP_ORDER: TimeGroup[] = ['today', 'yesterday', 'week', 'month', 'older']

const GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'Earlier This Month',
  older: 'Older',
}

function sortItems(items: LogbookItem[], mode: SortMode): LogbookItem[] {
  const copy = [...items]
  if (mode === 'alpha') return copy.sort((a, b) => a.title.localeCompare(b.title))
  copy.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
  if (mode === 'recent') copy.reverse()
  return copy
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function calcStreak(items: LogbookItem[]): number {
  if (!items.length) return 0
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = new Set(items.map(i => {
    const d = new Date(i.completedAt)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }))
  let streak = 0
  let check = today
  while (days.has(check)) { streak++; check -= 86_400_000 }
  return streak
}

/* ─── LogbookView ────────────────────────────────────────────────────── */
export default function LogbookView({ colors: C, theme }: LogbookViewProps) {
  const [items, setItems]             = useState<LogbookItem[]>([])
  const [hydrated, setHydrated]       = useState(false)
  const [search, setSearch]           = useState('')
  const deferredSearch                = useDeferredValue(search)
  const [filter, setFilter]           = useState<FilterMode>('all')
  const [sort, setSort]               = useState<SortMode>('recent')
  const [pendingKeys, setPendingKeys] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [notice, setNotice]           = useState('')
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Load from localStorage */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setItems(buildSeedItems())
    } else {
      try {
        const parsed = JSON.parse(raw) as LogbookItem[]
        setItems(Array.isArray(parsed) ? parsed : buildSeedItems())
      } catch {
        setItems(buildSeedItems())
      }
    }
    setHydrated(true)
  }, [])

  /* Persist */
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  /* Auto-dismiss notice */
  useEffect(() => {
    if (!notice) return
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 2_200)
    return () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current) }
  }, [notice])

  /* Keyboard shortcuts */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (e.key === 'Escape') { setSelectionMode(false); setSelectedKeys([]); return }
      if (e.key === 'm') { e.preventDefault(); setSelectionMode(p => { if (p) setSelectedKeys([]); return !p }); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); setSelectionMode(true); setSelectedKeys(filtered.map(i => i.key)); return }
      if (e.key === 'r' && selectedKeys.length > 0) { e.preventDefault(); void handleRestore(selectedKeys) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* Filter + sort */
  const q = deferredSearch.trim().toLowerCase()
  const filtered = sortItems(
    items.filter(item => {
      const matchType = filter === 'all' || item.type === filter
      const hay = `${item.title} ${item.category}`.toLowerCase()
      return matchType && (!q || hay.includes(q))
    }),
    sort,
  )

  /* Group */
  const grouped: Record<TimeGroup, LogbookItem[]> = { today: [], yesterday: [], week: [], month: [], older: [] }
  filtered.forEach(item => grouped[getTimeGroup(item.completedAt)].push(item))
  const activeGroups = GROUP_ORDER.filter(g => grouped[g].length > 0)

  /* Stats */
  const todayCount    = items.filter(i => getTimeGroup(i.completedAt) === 'today').length
  const weekCount     = items.filter(i => ['today', 'yesterday', 'week'].includes(getTimeGroup(i.completedAt))).length
  const monthProjects = items.filter(i => i.type === 'project' && ['today', 'yesterday', 'week', 'month'].includes(getTimeGroup(i.completedAt))).length
  const streak        = calcStreak(items)

  const selectedSet = new Set(selectedKeys)

  async function handleRestore(keys: string[]) {
    if (!keys.length) return
    setPendingKeys(p => [...new Set([...p, ...keys])])
    await new Promise(r => setTimeout(r, 200))
    setItems(p => p.filter(i => !keys.includes(i.key)))
    setSelectedKeys(p => p.filter(k => !keys.includes(k)))
    setPendingKeys(p => p.filter(k => !keys.includes(k)))
    setNotice(keys.length === 1 ? 'Item moved back to active' : `${keys.length} items restored`)
    if (selectionMode && selectedKeys.filter(k => !keys.includes(k)).length === 0) setSelectionMode(false)
  }

  /* Derived surfaces */
  const chromeBg         = theme === 'light' ? 'rgba(255,255,255,0.72)'  : 'rgba(19,19,21,0.74)'
  const chromeBorder     = theme === 'light' ? 'rgba(15,23,42,0.06)'     : 'rgba(255,255,255,0.06)'
  const rowSurface       = theme === 'light' ? '#FFFFFF'                  : 'rgba(255,255,255,0.032)'
  const rowSurfaceHover  = theme === 'light' ? '#FFFFFF'                  : 'rgba(255,255,255,0.05)'
  const rowShadow        = theme === 'light'
    ? '0 20px 36px rgba(15,23,42,0.07), 0 2px 10px rgba(15,23,42,0.04)'
    : '0 18px 38px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)'
  const greenBg   = theme === 'light' ? 'rgba(34,197,94,0.10)'   : 'rgba(78,195,127,0.10)'
  const greenText = theme === 'light' ? '#166534'                 : 'rgba(78,210,140,0.85)'

  const statPills = [
    { icon: '◉', label: `${todayCount} today` },
    { icon: '◎', label: `${weekCount} this week` },
    { icon: '◈', label: `${monthProjects} project${monthProjects !== 1 ? 's' : ''} this month` },
    { icon: streak > 0 ? '◆' : '◇', label: `${streak} day streak` },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: C.contentBg }}>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="lb-header" style={{ padding: '28px 32px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div className="lb-headline">
          {/* Left: icon + title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px', flexShrink: 0,
              background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
              color: theme === 'light' ? '#262626' : 'rgba(255,255,255,0.84)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: theme === 'light' ? 'inset 0 1px 0 rgba(255,255,255,0.92)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              <svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2.5" width="14" height="17" rx="2.5"/>
                <path d="M8 8h6M8 11.5h6M8 15h4"/>
                <path d="M4 8H2.5M4 11.5H2.5M4 15H2.5" strokeWidth="1.2"/>
                <path d="M13.5 6l1.5 1.5 2.5-2.5" strokeWidth="1.7"/>
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.1, letterSpacing: '-0.05em', fontWeight: 700, color: C.text }}>
                  Logbook
                </h1>
                <span style={{
                  padding: '5px 10px', borderRadius: '999px',
                  background: greenBg, color: greenText,
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em',
                }}>
                  {items.length} completed
                </span>
              </div>

              <p style={{ margin: '6px 0 0', color: C.muted, fontSize: '13px', lineHeight: 1.6, maxWidth: '52ch' }}>
                Your completed tasks, projects, and progress history.
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                {statPills.map(pill => (
                  <span key={pill.label} style={{
                    padding: '6px 11px', borderRadius: '999px',
                    background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    color: C.muted, fontSize: '11px', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    letterSpacing: '0.01em',
                  }}>
                    <span style={{ color: greenText, fontSize: '8px' }}>{pill.icon}</span>
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="lb-head-actions">
            <button
              type="button"
              onClick={() => { setSelectionMode(p => !p); if (selectionMode) setSelectedKeys([]) }}
              style={{
                height: '38px', padding: '0 14px', borderRadius: '11px',
                border: `1px solid ${chromeBorder}`,
                background: selectionMode ? C.activeItemBg : chromeBg,
                color: selectionMode ? C.activeItemTx : C.text,
                fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'background 120ms, color 120ms',
                backdropFilter: 'blur(14px)',
              }}
            >
              {selectionMode ? 'Done selecting' : 'Multi-select'}
            </button>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="lb-toolbar" style={{ padding: '20px 32px 0', flexShrink: 0 }}>
        <div className="lb-toolbar-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) auto auto',
          gap: '12px', alignItems: 'center',
        }}>
          {/* Search */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            height: '44px', borderRadius: '14px', padding: '0 14px',
            background: C.inputBg, border: `1px solid ${C.inputBorder}`,
            boxShadow: theme === 'light' ? 'inset 0 1px 0 rgba(255,255,255,0.9)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search completed items"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: '13px', fontFamily: 'inherit' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, lineHeight: 1, fontSize: '16px' }}>
                ×
              </button>
            )}
          </label>

          {/* Filter pills */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px',
            borderRadius: '14px',
            background: theme === 'light' ? 'rgba(255,255,255,0.74)' : 'rgba(255,255,255,0.035)',
            border: `1px solid ${chromeBorder}`,
          }}>
            {(['all', 'task', 'project', 'habit'] as const).map(id => (
              <button key={id} type="button" onClick={() => setFilter(id)}
                style={{
                  height: '36px', padding: '0 11px', borderRadius: '10px', border: 'none',
                  background: filter === id ? C.activeItemBg : 'transparent',
                  color: filter === id ? C.activeItemTx : C.muted,
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 120ms, color 120ms',
                }}
              >
                {id === 'all' ? 'All' : id.charAt(0).toUpperCase() + id.slice(1) + 's'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            height: '44px', padding: '0 14px', borderRadius: '14px',
            background: chromeBg, border: `1px solid ${chromeBorder}`,
            color: C.muted, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
            Sort
            <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
              style={{ border: 'none', background: 'transparent', color: C.text, fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="recent">Recently completed</option>
              <option value="oldest">Oldest first</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </label>
        </div>

        {/* Notice banner */}
        {notice && (
          <div style={{
            marginTop: '14px', padding: '12px 14px', borderRadius: '14px',
            border: `1px solid ${theme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)'}`,
            background: theme === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)',
            color: C.text, fontSize: '12.5px', fontWeight: 600,
            animation: 'lbNoticeIn 180ms ease-out', backdropFilter: 'blur(14px)',
          }}>
            {notice}
          </div>
        )}

        {/* Bulk actions bar */}
        {(selectionMode || selectedKeys.length > 0) && (
          <div className="lb-bulk-bar" style={{
            marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderRadius: '18px',
            background: theme === 'light' ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.045)',
            border: `1px solid ${chromeBorder}`, boxShadow: rowShadow, backdropFilter: 'blur(14px)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.text, fontSize: '13px', fontWeight: 650 }}>
                {selectedKeys.length > 0 ? `${selectedKeys.length} selected` : 'Selection mode'}
              </div>
              <div style={{ color: C.muted, fontSize: '11.5px', marginTop: '2px' }}>
                Press `r` to restore • `⌘A` select all • `Esc` to cancel
              </div>
            </div>
            <button type="button" onClick={() => { setSelectionMode(true); setSelectedKeys(filtered.map(i => i.key)) }}
              style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${chromeBorder}`, background: chromeBg, color: C.text, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Select all
            </button>
            <button type="button" disabled={selectedKeys.length === 0}
              onClick={() => void handleRestore(selectedKeys)}
              style={{
                height: '36px', padding: '0 12px', borderRadius: '10px', border: 'none',
                background: selectedKeys.length > 0 ? C.activeItemBg : chromeBg,
                color: selectedKeys.length > 0 ? C.activeItemTx : C.muted,
                fontSize: '12px', fontWeight: 700, cursor: selectedKeys.length > 0 ? 'pointer' : 'default',
                fontFamily: 'inherit', opacity: selectedKeys.length === 0 ? 0.5 : 1,
              }}>
              Restore selected
            </button>
          </div>
        )}
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 48px' }}>

        {!hydrated ? (
          /* Skeleton */
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ marginBottom: '32px' }}>
                <div style={{ height: '14px', width: '72px', borderRadius: '5px', background: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', marginBottom: '12px' }}/>
                {[1, 2].map(j => (
                  <div key={j} style={{
                    height: '64px', borderRadius: '14px',
                    background: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${chromeBorder}`, marginBottom: '8px',
                    opacity: 0.7 - j * 0.15,
                  }}/>
                ))}
              </div>
            ))}
          </div>

        ) : items.length === 0 ? (
          /* Empty state: no completions yet */
          <div style={{ minHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '24px', margin: '0 auto 22px',
                background: theme === 'light'
                  ? 'linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,242,245,0.88))'
                  : 'linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))',
                border: `1px solid ${chromeBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: rowShadow,
              }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3.5"/>
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.04em', color: C.text, fontWeight: 700 }}>
                Nothing here yet
              </h2>
              <p style={{ margin: '10px auto 0', color: C.muted, fontSize: '14px', lineHeight: 1.7, maxWidth: '28ch' }}>
                Complete tasks to build your Logbook. Every ✓ is a step forward.
              </p>
            </div>
          </div>

        ) : filtered.length === 0 ? (
          /* No search/filter results */
          <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 650, color: C.text }}>No results match those filters</div>
              <p style={{ margin: '8px 0 0', color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                Try a different search term or clear the type filter.
              </p>
            </div>
          </div>

        ) : (
          /* Timeline */
          activeGroups.map((group, gi) => (
            <div key={group} style={{
              marginBottom: gi < activeGroups.length - 1 ? '32px' : 0,
              animation: `lbGroupIn 320ms ease-out ${gi * 45}ms both`,
            }}>
              {/* Group label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: C.muted,
                }}>
                  {GROUP_LABELS[group]}
                </span>
                <span style={{ fontSize: '11px', color: C.muted, opacity: 0.45, fontWeight: 500 }}>
                  {grouped[group].length}
                </span>
                <div style={{ flex: 1, height: '1px', background: C.border }}/>
              </div>

              {/* Rows */}
              {grouped[group].map((item, idx) =>
                item.type === 'project' ? (
                  <ProjectCard
                    key={item.key}
                    item={item}
                    theme={theme}
                    colors={C}
                    chromeBorder={chromeBorder}
                    chromeBg={chromeBg}
                    rowShadow={rowShadow}
                    rowSurface={rowSurface}
                    rowSurfaceHover={rowSurfaceHover}
                    greenBg={greenBg}
                    greenText={greenText}
                    pending={pendingKeys.includes(item.key)}
                    selected={selectedSet.has(item.key)}
                    selectionMode={selectionMode}
                    style={{ animationDelay: `${(gi * 4 + idx) * 32}ms` }}
                    onRestore={() => void handleRestore([item.key])}
                    onSelectToggle={() => setSelectedKeys(p => p.includes(item.key) ? p.filter(k => k !== item.key) : [...p, item.key])}
                  />
                ) : (
                  <LogbookRow
                    key={item.key}
                    item={item}
                    theme={theme}
                    colors={C}
                    chromeBorder={chromeBorder}
                    rowShadow={rowShadow}
                    rowSurface={rowSurface}
                    rowSurfaceHover={rowSurfaceHover}
                    greenBg={greenBg}
                    greenText={greenText}
                    pending={pendingKeys.includes(item.key)}
                    selected={selectedSet.has(item.key)}
                    selectionMode={selectionMode}
                    style={{ animationDelay: `${(gi * 4 + idx) * 32}ms` }}
                    onRestore={() => void handleRestore([item.key])}
                    onSelectToggle={() => setSelectedKeys(p => p.includes(item.key) ? p.filter(k => k !== item.key) : [...p, item.key])}
                  />
                )
              )}
            </div>
          ))
        )}
      </div>

      {/* ── KEYLINE FOOTER ────────────────────────────────────────────── */}
      <div style={{
        height: '50px', borderTop: `1px solid ${C.border}`,
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, background: C.contentBg,
      }}>
        <div style={{ color: C.muted, fontSize: '11px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <span>Keyboard</span>
          <span>`r` restore</span>
          <span>`m` multi-select</span>
          <span>`⌘A` select all</span>
        </div>
        <button
          type="button"
          disabled={selectedKeys.length === 0}
          onClick={() => void handleRestore(selectedKeys)}
          style={{
            height: '34px', padding: '0 14px', borderRadius: '10px', border: 'none',
            background: selectedKeys.length > 0 ? C.activeItemBg : 'transparent',
            color: selectedKeys.length > 0 ? C.activeItemTx : C.muted,
            fontSize: '12px', fontWeight: 700, cursor: selectedKeys.length > 0 ? 'pointer' : 'default',
            fontFamily: 'inherit', opacity: selectedKeys.length === 0 ? 0.4 : 1,
            transition: 'all 120ms',
          }}
        >
          Restore
        </button>
      </div>

      {/* ── CSS ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes lbRowIn {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes lbGroupIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes lbNoticeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* Responsive headline layout */
        @media (min-width: 981px) {
          .lb-headline {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }
          .lb-head-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
            margin-top: 4px;
          }
        }
        @media (max-width: 980px) {
          .lb-headline { display: grid; gap: 16px; }
          .lb-head-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        }
        @media (max-width: 820px) {
          .lb-header, .lb-toolbar { padding-left: 18px !important; padding-right: 18px !important; }
          .lb-toolbar-grid { grid-template-columns: 1fr !important; }
          .lb-bulk-bar { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

/* ─── LogbookRow ─────────────────────────────────────────────────────── */
interface RowProps {
  item: LogbookItem
  theme: ThemeMode
  colors: LogbookColors
  chromeBorder: string
  rowShadow: string
  rowSurface: string
  rowSurfaceHover: string
  greenBg: string
  greenText: string
  pending: boolean
  selected: boolean
  selectionMode: boolean
  style?: CSSProperties
  onRestore: () => void
  onSelectToggle: () => void
}

function LogbookRow({ item, theme, colors: C, chromeBorder, rowShadow, rowSurface, rowSurfaceHover, greenBg, greenText, pending, selected, selectionMode, style, onRestore, onSelectToggle }: RowProps) {
  const [hovered, setHovered] = useState(false)

  const priColors = item.priority ? {
    high:   { bg: theme === 'light' ? 'rgba(255,80,80,0.09)'   : 'rgba(255,80,80,0.09)',   tx: theme === 'light' ? '#A03030' : 'rgba(255,120,120,0.75)' },
    medium: { bg: theme === 'light' ? '#FFF3D4'                : 'rgba(255,180,50,0.09)',  tx: theme === 'light' ? '#9A7010' : 'rgba(255,200,80,0.75)' },
    low:    { bg: theme === 'light' ? '#EEF8EE'                : 'rgba(100,200,100,0.09)', tx: theme === 'light' ? '#3A7A3A' : 'rgba(120,200,120,0.75)' },
  }[item.priority] : null

  return (
    <div style={{ marginBottom: '7px' }}>
      <article
        onClick={() => selectionMode && onSelectToggle()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          borderRadius: '14px', padding: '12px 14px',
          border: `1px solid ${selected ? C.activeItemBg : C.border}`,
          background: hovered || selected ? rowSurfaceHover : rowSurface,
          boxShadow: hovered ? rowShadow : 'none',
          transform: `scale(${pending ? 0.985 : 1})`,
          opacity: pending ? 0 : 1,
          transition: 'transform 180ms ease, opacity 180ms ease, background 100ms, box-shadow 120ms, border-color 120ms',
          cursor: selectionMode ? 'pointer' : 'default',
          animation: 'lbRowIn 240ms ease-out both',
          ...style,
        }}
      >
        {/* Selection circle */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onSelectToggle() }}
          style={{
            width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
            border: `1.5px solid ${selected ? C.blue : hovered || selectionMode ? C.inputBorder : 'transparent'}`,
            background: selected ? C.blue : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 120ms', padding: 0,
          }}
        >
          {selected && (
            <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4l2.6 2.6L9 1.2"/>
            </svg>
          )}
        </button>

        {/* Completion check */}
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
          background: greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke={greenText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4l2.6 2.6L9 1.2"/>
          </svg>
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 560, color: C.text, letterSpacing: '-0.01em' }}>
              {item.title}
            </span>
            {item.isRecurring && (
              <span style={{ fontSize: '12px', color: C.muted, opacity: 0.6 }} title="Recurring task">↻</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 7px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 600,
              background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              color: C.muted,
            }}>
              {item.category}
            </span>
            {priColors && (
              <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 600, background: priColors.bg, color: priColors.tx }}>
                {item.priority!.charAt(0).toUpperCase() + item.priority!.slice(1)}
              </span>
            )}
            {item.type === 'habit' && (
              <span style={{
                padding: '2px 7px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 600,
                background: theme === 'light' ? 'rgba(139,92,246,0.09)' : 'rgba(167,139,250,0.09)',
                color: theme === 'light' ? '#6d28d9' : 'rgba(196,170,255,0.85)',
              }}>
                Habit
              </span>
            )}
          </div>
        </div>

        {/* Right: time + restore */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: C.muted, opacity: 0.65, letterSpacing: '0.01em' }}>
            {fmtTime(item.completedAt)}
          </span>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRestore() }}
            style={{
              height: '28px', padding: '0 10px', borderRadius: '7px', border: 'none',
              background: C.activeItemBg, color: C.activeItemTx,
              fontSize: '11px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              opacity: hovered || selected ? 1 : 0,
              transition: 'opacity 140ms ease',
            }}
          >
            Restore
          </button>
        </div>
      </article>
    </div>
  )
}

/* ─── ProjectCard ────────────────────────────────────────────────────── */
interface ProjectCardProps {
  item: LogbookItem
  theme: ThemeMode
  colors: LogbookColors
  chromeBorder: string
  chromeBg: string
  rowShadow: string
  rowSurface: string
  rowSurfaceHover: string
  greenBg: string
  greenText: string
  pending: boolean
  selected: boolean
  selectionMode: boolean
  style?: CSSProperties
  onRestore: () => void
  onSelectToggle: () => void
}

function ProjectCard({ item, theme, colors: C, chromeBorder, chromeBg, rowShadow, rowSurface, rowSurfaceHover, greenBg, greenText, pending, selected, selectionMode, style, onRestore, onSelectToggle }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ marginBottom: '10px' }}>
      <article
        onClick={() => selectionMode && onSelectToggle()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          borderRadius: '18px', padding: '16px 18px',
          border: `1px solid ${selected ? C.blue : hovered ? C.inputBorder : C.border}`,
          background: hovered || selected ? rowSurfaceHover : rowSurface,
          boxShadow: hovered ? rowShadow : 'none',
          transform: `scale(${pending ? 0.985 : 1})`,
          opacity: pending ? 0 : 1,
          transition: 'transform 200ms ease, opacity 200ms ease, background 120ms, box-shadow 140ms, border-color 120ms',
          cursor: selectionMode ? 'pointer' : 'default',
          animation: 'lbRowIn 260ms ease-out both',
          ...style,
        }}
      >
        {/* Selection circle */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onSelectToggle() }}
          style={{
            width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
            border: `1.5px solid ${selected ? C.blue : hovered || selectionMode ? C.inputBorder : 'transparent'}`,
            background: selected ? C.blue : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 120ms', padding: 0,
          }}
        >
          {selected && (
            <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4l2.6 2.6L9 1.2"/>
            </svg>
          )}
        </button>

        {/* Project icon */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
          background: greenBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 1px ${theme === 'light' ? 'rgba(34,197,94,0.18)' : 'rgba(78,195,127,0.18)'}`,
        }}>
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke={greenText} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9l5.5 5.5L16 4"/>
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15.5px', fontWeight: 660, color: C.text, letterSpacing: '-0.02em' }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 600,
              background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              color: C.muted,
            }}>
              Project
            </span>
            <span style={{ fontSize: '11.5px', color: C.muted }}>
              {item.taskCount} task{item.taskCount !== 1 ? 's' : ''} finished
            </span>
            <span style={{ fontSize: '11px', color: C.muted, opacity: 0.4 }}>·</span>
            <span style={{ fontSize: '11.5px', color: C.muted }}>
              Completed {fmtDate(item.completedAt)}
            </span>
          </div>
        </div>

        {/* Right: badge + restore */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{
            padding: '5px 10px', borderRadius: '8px',
            background: greenBg, color: greenText,
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}>
            ✓ Completed
          </span>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRestore() }}
            style={{
              height: '32px', padding: '0 12px', borderRadius: '9px', border: 'none',
              background: C.activeItemBg, color: C.activeItemTx,
              fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              opacity: hovered || selected ? 1 : 0,
              transition: 'opacity 140ms ease',
            }}
          >
            Restore
          </button>
        </div>
      </article>
    </div>
  )
}
