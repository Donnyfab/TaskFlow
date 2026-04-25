'use client'

import type { CSSProperties } from 'react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'

/* ─── Types ─────────────────────────────────────────────────────── */
type ThemeMode      = 'dark' | 'light'
type LogbookItemType = 'task' | 'project' | 'habit'
type SortMode       = 'recent' | 'oldest' | 'alpha'
type FilterMode     = 'all' | 'task' | 'project' | 'habit'
type TimeGroup      = 'today' | 'yesterday' | 'week' | 'month' | 'older'

interface LogbookColors {
  activeItemBg: string; activeItemTx: string; blue: string; border: string
  contentBg: string; deleteBg: string; deleteBorder: string; deleteText: string
  detailCloseB: string; hoverItemBg: string; inputBg: string; inputBorder: string
  muted: string; sidebarBg: string; text: string
}
interface LogbookItem {
  key: string; title: string; type: LogbookItemType
  completedAt: string; category: string
  priority?: 'high' | 'medium' | 'low'
  isRecurring?: boolean; taskCount?: number
}

/* ─── Storage + seed data ────────────────────────────────────────── */
const STORAGE_KEY = 'taskflow-logbook-items'

function buildSeedItems(): LogbookItem[] {
  const now = Date.now()
  const h = (n: number) => new Date(now - n * 3_600_000).toISOString()
  const d = (n: number, hr = 10) => new Date(now - n * 86_400_000 + hr * 3_600_000).toISOString()
  return [
    { key: 'l-001', title: 'Finalize Q2 report draft',      type: 'task',    completedAt: h(1),     category: 'Work',        priority: 'high'   },
    { key: 'l-002', title: 'Morning workout',                type: 'habit',   completedAt: h(4),     category: 'Health',      isRecurring: true  },
    { key: 'l-003', title: 'Review open pull requests',      type: 'task',    completedAt: h(6),     category: 'Engineering', priority: 'medium' },
    { key: 'l-004', title: 'Website Redesign',               type: 'project', completedAt: h(7),     category: 'Work',        taskCount: 14      },
    { key: 'l-005', title: 'Send invoices for April',        type: 'task',    completedAt: d(1, 14), category: 'Finance',     priority: 'high'   },
    { key: 'l-006', title: 'Read — 30 minutes',              type: 'habit',   completedAt: d(1, 21), category: 'Personal',    isRecurring: true  },
    { key: 'l-007', title: 'Refactor auth middleware',       type: 'task',    completedAt: d(1, 9),  category: 'Engineering', priority: 'medium' },
    { key: 'l-008', title: 'Set up CI/CD pipeline',         type: 'task',    completedAt: d(3),     category: 'Engineering', priority: 'high'   },
    { key: 'l-009', title: 'Q1 Performance Review',          type: 'project', completedAt: d(4),     category: 'Work',        taskCount: 8       },
    { key: 'l-010', title: 'Write the weekly newsletter',    type: 'task',    completedAt: d(5),     category: 'Personal',    priority: 'low'    },
    { key: 'l-011', title: 'Meditation — 20 min',            type: 'habit',   completedAt: d(4, 7),  category: 'Health',      isRecurring: true  },
    { key: 'l-012', title: 'Book flight for the conference', type: 'task',    completedAt: d(10),    category: 'Travel',      priority: 'medium' },
    { key: 'l-013', title: 'Mobile App MVP',                 type: 'project', completedAt: d(14),    category: 'Engineering', taskCount: 22      },
    { key: 'l-014', title: 'Update portfolio case studies',  type: 'task',    completedAt: d(18),    category: 'Personal',    priority: 'low'    },
    { key: 'l-015', title: 'Write team onboarding docs',     type: 'task',    completedAt: d(21),    category: 'Work',        priority: 'medium' },
    { key: 'l-016', title: 'Annual health checkup',          type: 'task',    completedAt: d(45),    category: 'Health',      priority: 'high'   },
    { key: 'l-017', title: 'Tax Season Prep',                type: 'project', completedAt: d(60),    category: 'Finance',     taskCount: 6       },
    { key: 'l-018', title: 'Read — Deep Work, Cal Newport',  type: 'habit',   completedAt: d(90),    category: 'Learning',    isRecurring: true  },
  ]
}

/* ─── Timeline helpers ───────────────────────────────────────────── */
const GROUP_ORDER: TimeGroup[]              = ['today', 'yesterday', 'week', 'month', 'older']
const GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Today', yesterday: 'Yesterday', week: 'This week',
  month: 'Earlier this month', older: 'Older',
}

function getGroup(iso: string): TimeGroup {
  const now    = new Date()
  const item   = new Date(iso)
  const todayT = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const itemT  = new Date(item.getFullYear(), item.getMonth(), item.getDate()).getTime()
  const diff   = Math.round((todayT - itemT) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff <= 7)  return 'week'
  if (item.getMonth() === now.getMonth() && item.getFullYear() === now.getFullYear()) return 'month'
  return 'older'
}

function sortItems(arr: LogbookItem[], mode: SortMode): LogbookItem[] {
  const c = [...arr]
  if (mode === 'alpha') return c.sort((a, b) => a.title.localeCompare(b.title))
  c.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
  return mode === 'recent' ? c.reverse() : c
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}
function fmtGroupDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(iso))
}
function fmtShort(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function calcStreak(items: LogbookItem[]): number {
  if (!items.length) return 0
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days  = new Set(items.map(i => {
    const d = new Date(i.completedAt)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }))
  let n = 0, c = today
  while (days.has(c)) { n++; c -= 86_400_000 }
  return n
}

/* ─── LogbookView ────────────────────────────────────────────────── */
export default function LogbookView({ colors: C, theme }: { colors: LogbookColors; theme: ThemeMode }) {
  const [items, setItems]               = useState<LogbookItem[]>([])
  const [hydrated, setHydrated]         = useState(false)
  const [search, setSearch]             = useState('')
  const deferred                        = useDeferredValue(search)
  const [filter, setFilter]             = useState<FilterMode>('all')
  const [sort, setSort]                 = useState<SortMode>('recent')
  const [pendingKeys, setPendingKeys]   = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [selMode, setSelMode]           = useState(false)
  const [notice, setNotice]             = useState('')
  const [searchOpen, setSearchOpen]     = useState(false)
  const searchRef   = useRef<HTMLInputElement>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY)
    try { setItems(raw ? JSON.parse(raw) : buildSeedItems()) }
    catch { setItems(buildSeedItems()) }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  useEffect(() => {
    if (!notice) return
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 2_200)
    return () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }
  }, [notice])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.key === 'Escape') { setSelMode(false); setSelectedKeys([]); setSearchOpen(false); return }
      if (e.key === 'm')      { e.preventDefault(); setSelMode(p => { if (p) setSelectedKeys([]); return !p }); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault(); setSelMode(true); setSelectedKeys(filtered.map(i => i.key)); return
      }
      if (e.key === 'r' && selectedKeys.length > 0) { e.preventDefault(); void restore(selectedKeys) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* Filtered + sorted */
  const q = deferred.trim().toLowerCase()
  const filtered = sortItems(
    items.filter(i => {
      if (filter !== 'all' && i.type !== filter) return false
      return !q || `${i.title} ${i.category}`.toLowerCase().includes(q)
    }),
    sort,
  )

  /* Grouped */
  const grouped = Object.fromEntries(GROUP_ORDER.map(g => [g, [] as LogbookItem[]])) as Record<TimeGroup, LogbookItem[]>
  filtered.forEach(i => grouped[getGroup(i.completedAt)].push(i))
  const activeGroups = GROUP_ORDER.filter(g => grouped[g].length > 0)

  /* Stats */
  const todayCt  = items.filter(i => getGroup(i.completedAt) === 'today').length
  const weekCt   = items.filter(i => ['today', 'yesterday', 'week'].includes(getGroup(i.completedAt))).length
  const monthPrj = items.filter(i => i.type === 'project' && ['today', 'yesterday', 'week', 'month'].includes(getGroup(i.completedAt))).length
  const streak   = calcStreak(items)
  const selSet   = new Set(selectedKeys)

  async function restore(keys: string[]) {
    if (!keys.length) return
    setPendingKeys(p => [...new Set([...p, ...keys])])
    await new Promise(r => setTimeout(r, 170))
    setItems(p => p.filter(i => !keys.includes(i.key)))
    setSelectedKeys(p => p.filter(k => !keys.includes(k)))
    setPendingKeys(p => p.filter(k => !keys.includes(k)))
    setNotice(keys.length === 1 ? 'Moved back to active' : `${keys.length} items restored`)
    if (selMode && !selectedKeys.filter(k => !keys.includes(k)).length) setSelMode(false)
  }

  /* Surface tokens — calibrated for archival tone */
  const isDark = theme === 'dark'

  const tx1     = isDark ? 'rgba(255,255,255,0.88)' : '#1C1C1E'
  const tx2     = isDark ? 'rgba(255,255,255,0.40)' : '#8E8E93'
  const tx3     = isDark ? 'rgba(255,255,255,0.22)' : '#BCBCC2'
  const ln      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'      /* dividers */
  const sf      = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'      /* card surface */
  const sfHov   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'      /* hover */
  const cr      = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'      /* chrome border */

  /* Streak accent — only lights up when earned */
  const amberTx = streak > 0 ? (isDark ? 'rgba(251,191,36,0.9)'  : 'rgba(161,110,6,0.95)') : tx2
  const amberBg = streak > 0 ? (isDark ? 'rgba(251,191,36,0.07)' : 'rgba(251,191,36,0.09)') : sf
  const amberBd = streak > 0 ? (isDark ? 'rgba(251,191,36,0.18)' : 'rgba(251,191,36,0.25)') : cr

  /* Filter pill active — intentionally not blue (retrospective, not action) */
  const pillBg  = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'
  const pillTx  = isDark ? 'rgba(255,255,255,0.92)' : '#1C1C1E'

  const sortLabels: Record<SortMode, string> = { recent: 'Recent first', oldest: 'Oldest first', alpha: 'A – Z' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: C.contentBg }}>

      {/* ══ HEADER ════════════════════════════════════════════════ */}
      <div className="lb-header" style={{ padding: '28px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 style={{
            margin: 0, fontSize: '22px', fontWeight: 700,
            letterSpacing: '-0.04em', color: tx1, lineHeight: 1,
          }}>
            Logbook
          </h1>
          <span style={{ fontSize: '12px', color: tx3, fontWeight: 400 }}>
            {items.length} {items.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: '12px', color: tx2, lineHeight: 1 }}>
          {streak > 0
            ? `${streak}-day streak  ·  a record of your completed work`
            : 'A record of your completed work'}
        </p>
      </div>

      {/* ══ STATS ════════════════════════════════════════════════ */}
      <div className="lb-stats" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px', padding: '20px 32px 0', flexShrink: 0,
      }}>
        {([
          { n: todayCt,  label: 'Completed today',    isStreak: false },
          { n: weekCt,   label: 'This week',           isStreak: false },
          { n: monthPrj, label: 'Projects this month', isStreak: false },
          { n: streak,   label: 'Day streak',           isStreak: true  },
        ] as { n: number; label: string; isStreak: boolean }[]).map(({ n, label, isStreak }) => (
          <div key={label} style={{
            padding: '16px 18px 14px',
            borderRadius: '11px',
            background: isStreak ? amberBg : sf,
            border: `1px solid ${isStreak ? amberBd : cr}`,
          }}>
            <div style={{
              fontSize: '34px', fontWeight: 700,
              letterSpacing: '-0.05em', lineHeight: 1,
              color: isStreak ? amberTx : tx1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {n}
            </div>
            <div style={{
              marginTop: '7px', fontSize: '11px', fontWeight: 500,
              color: isStreak && streak > 0 ? amberTx : tx2,
              letterSpacing: '0.01em', opacity: isStreak && streak > 0 ? 0.85 : 1,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ══ TOOLBAR ══════════════════════════════════════════════ */}
      <div className="lb-toolbar" style={{ padding: '14px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

          {/* Filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
            {(['all', 'task', 'project', 'habit'] as const).map(id => {
              const labels = { all: 'All', task: 'Tasks', project: 'Projects', habit: 'Habits' }
              return (
                <button key={id} type="button" onClick={() => setFilter(id)} style={{
                  padding: '6px 12px', borderRadius: '7px', border: 'none',
                  background: filter === id ? pillBg : 'transparent',
                  color: filter === id ? pillTx : tx2,
                  fontSize: '12.5px', fontWeight: filter === id ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 90ms, color 90ms',
                }}>
                  {labels[id]}
                </button>
              )
            })}
          </div>

          {/* Search (expandable) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0',
            height: '34px',
            borderRadius: '9px',
            border: `1px solid ${searchOpen ? cr : 'transparent'}`,
            background: searchOpen ? sf : 'transparent',
            overflow: 'hidden',
            transition: 'border-color 140ms, background 140ms, width 200ms',
            width: searchOpen ? '180px' : '34px',
          }}>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(p => !p)
                if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 60)
                else setSearch('')
              }}
              style={{
                width: '34px', height: '34px', flexShrink: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                color: searchOpen ? tx1 : tx2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {searchOpen
                ? <svg viewBox="0 0 10 10" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
                : <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="5"/><path d="M12 12l3.5 3.5"/></svg>
              }
            </button>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                color: tx1, fontSize: '12.5px', fontFamily: 'inherit',
                minWidth: 0, paddingRight: '10px', opacity: searchOpen ? 1 : 0,
              }}
            />
          </div>

          {/* Sort selector */}
          <div style={{ position: 'relative' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '34px', padding: '0 10px',
              borderRadius: '9px', border: `1px solid ${cr}`,
              background: sf,
              color: tx2, fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
            }}>
              {sortLabels[sort]}
              <svg viewBox="0 0 10 6" width="8" height="5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M1 1l4 4 4-4"/></svg>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortMode)}
                style={{
                  position: 'absolute', inset: 0, opacity: 0,
                  cursor: 'pointer', width: '100%', height: '100%',
                }}
              >
                <option value="recent">Recent first</option>
                <option value="oldest">Oldest first</option>
                <option value="alpha">A – Z</option>
              </select>
            </label>
          </div>

          {/* Multi-select toggle */}
          <button
            type="button"
            onClick={() => { setSelMode(p => !p); if (selMode) setSelectedKeys([]) }}
            style={{
              height: '34px', padding: '0 12px',
              borderRadius: '9px',
              border: `1px solid ${selMode ? C.blue + '44' : cr}`,
              background: selMode ? C.activeItemBg : 'transparent',
              color: selMode ? C.activeItemTx : tx2,
              fontSize: '12px', fontWeight: 500, fontFamily: 'inherit',
              cursor: 'pointer', transition: 'all 100ms', whiteSpace: 'nowrap',
            }}
          >
            {selMode ? 'Done' : 'Select'}
          </button>
        </div>

        {/* Bulk bar — shown when items are selected */}
        {selectedKeys.length > 0 && (
          <div style={{
            marginTop: '10px',
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${cr}`,
          }}>
            <span style={{ flex: 1, fontSize: '12.5px', color: tx1, fontWeight: 500 }}>
              {selectedKeys.length} selected
            </span>
            <button type="button" onClick={() => setSelectedKeys(filtered.map(i => i.key))}
              style={{ height: '30px', padding: '0 10px', borderRadius: '7px', border: `1px solid ${cr}`, background: 'transparent', color: tx2, fontSize: '11.5px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Select all
            </button>
            <button type="button" onClick={() => void restore(selectedKeys)}
              style={{ height: '30px', padding: '0 12px', borderRadius: '7px', border: 'none', background: C.activeItemBg, color: C.activeItemTx, fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Restore
            </button>
            <button type="button" onClick={() => { setSelectedKeys([]); setSelMode(false) }}
              style={{ height: '30px', padding: '0 10px', borderRadius: '7px', border: 'none', background: 'transparent', color: tx3, fontSize: '11.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        )}

        {/* Notice */}
        {notice && (
          <div style={{
            marginTop: '10px', padding: '9px 14px', borderRadius: '9px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            color: tx1, fontSize: '12px', fontWeight: 500,
            animation: 'lbNoticeIn 150ms ease-out',
          }}>
            {notice}
          </div>
        )}
      </div>

      {/* Separator under toolbar */}
      <div style={{ height: '1px', background: ln, margin: '14px 32px 0', flexShrink: 0 }} className="lb-sep" />

      {/* ══ TIMELINE ════════════════════════════════════════════ */}
      <div className="lb-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 48px' }}>

        {!hydrated ? (
          <SkeletonRows isDark={isDark} cr={cr} />
        ) : items.length === 0 ? (
          <EmptyState tx1={tx1} tx2={tx2} tx3={tx3} cr={cr} sf={sf} isDark={isDark} />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: tx1 }}>No matches</div>
            <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: tx2 }}>
              Try a different search term or filter.
            </p>
          </div>
        ) : (
          activeGroups.map((group, gi) => {
            const groupItems = grouped[group]
            /* Representative date for the right-side label */
            const repDate = groupItems[0]?.completedAt ?? ''

            return (
              <div key={group} style={{ marginTop: gi === 0 ? '18px' : '28px' }}>

                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: tx3, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {GROUP_LABELS[group]}
                  </span>
                  <div style={{ flex: 1, height: '1px', background: ln }} />
                  {group !== 'today' && group !== 'yesterday' && (
                    <span style={{ fontSize: '11px', color: tx3, whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 400 }}>
                      {group === 'older' ? fmtShort(groupItems[groupItems.length - 1]?.completedAt ?? '') + ' – ' + fmtShort(repDate)
                        : fmtGroupDate(repDate)}
                    </span>
                  )}
                  {(group === 'today' || group === 'yesterday') && (
                    <span style={{ fontSize: '11px', color: tx3, whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 400 }}>
                      {groupItems.length} {groupItems.length === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>

                {/* Rows */}
                <div>
                  {groupItems.map((item, idx) => (
                    item.type === 'project'
                      ? <ProjectRow
                          key={item.key}
                          item={item}
                          isDark={isDark}
                          tx1={tx1} tx2={tx2} tx3={tx3} ln={ln} sf={sf} sfHov={sfHov} cr={cr}
                          activeItemBg={C.activeItemBg} activeItemTx={C.activeItemTx} blue={C.blue}
                          pending={pendingKeys.includes(item.key)}
                          selected={selSet.has(item.key)}
                          selMode={selMode}
                          isLast={idx === groupItems.length - 1}
                          onRestore={() => void restore([item.key])}
                          onToggle={() => setSelectedKeys(p => p.includes(item.key) ? p.filter(k => k !== item.key) : [...p, item.key])}
                        />
                      : <ItemRow
                          key={item.key}
                          item={item}
                          isDark={isDark}
                          tx1={tx1} tx2={tx2} tx3={tx3} ln={ln} sf={sf} sfHov={sfHov} cr={cr}
                          activeItemBg={C.activeItemBg} activeItemTx={C.activeItemTx} blue={C.blue}
                          pending={pendingKeys.includes(item.key)}
                          selected={selSet.has(item.key)}
                          selMode={selMode}
                          isLast={idx === groupItems.length - 1}
                          onRestore={() => void restore([item.key])}
                          onToggle={() => setSelectedKeys(p => p.includes(item.key) ? p.filter(k => k !== item.key) : [...p, item.key])}
                        />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── CSS ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes lbNoticeIn {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Responsive */
        @media (max-width: 700px) {
          .lb-header  { padding: 22px 18px 0 !important; }
          .lb-stats   { padding: 16px 18px 0 !important; grid-template-columns: repeat(2,1fr) !important; }
          .lb-toolbar { padding: 12px 18px 0 !important; }
          .lb-sep     { margin-left: 18px !important; margin-right: 18px !important; }
          .lb-scroll  { padding-left: 18px !important; padding-right: 18px !important; }
        }
        @media (max-width: 480px) {
          .lb-stats { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  )
}

/* ─── Shared row prop types ──────────────────────────────────────── */
interface RowShared {
  item: LogbookItem
  isDark: boolean
  tx1: string; tx2: string; tx3: string; ln: string
  sf: string; sfHov: string; cr: string
  activeItemBg: string; activeItemTx: string; blue: string
  pending: boolean; selected: boolean; selMode: boolean; isLast: boolean
  onRestore: () => void; onToggle: () => void
  style?: CSSProperties
}

/* ─── ItemRow (task + habit) ─────────────────────────────────────── */
function ItemRow({ item, isDark, tx1, tx2, tx3, ln, sf, sfHov, cr, activeItemBg, activeItemTx, blue, pending, selected, selMode, isLast, onRestore, onToggle }: RowShared) {
  const [hov, setHov] = useState(false)

  /* Habit gets a subtle purple tint on the indicator */
  const isHabit     = item.type === 'habit'
  const dotColor    = isHabit
    ? (isDark ? 'rgba(167,139,250,0.55)' : 'rgba(109,40,217,0.45)')
    : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)')

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => selMode && onToggle()}
      style={{
        display: 'flex', alignItems: 'center',
        minHeight: '46px', padding: '10px 0',
        borderBottom: isLast ? 'none' : `1px solid ${ln}`,
        background: (hov || selected) ? sfHov : 'transparent',
        transform: pending ? 'scale(0.99)' : 'scale(1)',
        opacity: pending ? 0 : 1,
        transition: 'opacity 170ms ease, transform 170ms ease, background 80ms',
        cursor: selMode ? 'pointer' : 'default',
        borderRadius: '6px',
        marginLeft: '-4px', paddingLeft: '4px',
        marginRight: '-4px', paddingRight: '4px',
      }}
    >
      {/* Selection circle */}
      <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(selMode || selected) ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggle() }}
            style={{
              width: '16px', height: '16px', borderRadius: '50%', border: `1.5px solid ${selected ? blue : cr}`,
              background: selected ? blue : 'transparent', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 100ms',
            }}
          >
            {selected && <svg viewBox="0 0 8 6" width="8" height="6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3l2 2 4-4"/></svg>}
          </button>
        ) : (
          /* Type indicator dot */
          <div style={{
            width: isHabit ? '6px' : '5px',
            height: isHabit ? '6px' : '5px',
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
            outline: isHabit ? `1.5px solid ${dotColor}` : 'none',
            outlineOffset: '2px',
          }} />
        )}
      </div>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '13.5px', fontWeight: 500,
            color: tx1, letterSpacing: '-0.01em',
            textDecoration: 'none',
          }}>
            {item.title}
          </span>
          {item.isRecurring && (
            <span style={{ fontSize: '10px', color: tx3, fontWeight: 400, letterSpacing: '0.02em' }}>
              recurring
            </span>
          )}
        </div>
        {/* Meta — only shown on narrow where time doesn't fit right */}
        <div className="lb-row-meta-mobile" style={{ display: 'none', marginTop: '2px' }}>
          <span style={{ fontSize: '11px', color: tx3 }}>{item.category}</span>
          {item.priority && (
            <span style={{ fontSize: '11px', color: tx3, marginLeft: '6px' }}>· {item.priority}</span>
          )}
        </div>
      </div>

      {/* Right side — category + time + restore */}
      <div className="lb-row-right" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: tx3, fontWeight: 400, letterSpacing: '0.01em' }}>
          {item.category}
        </span>
        <span style={{
          fontSize: '11.5px', color: tx3, fontWeight: 400,
          fontVariantNumeric: 'tabular-nums', minWidth: '52px', textAlign: 'right',
        }}>
          {fmtTime(item.completedAt)}
        </span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRestore() }}
          style={{
            height: '26px', padding: '0 9px', borderRadius: '6px', border: 'none',
            background: activeItemBg, color: activeItemTx,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            opacity: hov || selected ? 1 : 0,
            transition: 'opacity 120ms',
            whiteSpace: 'nowrap',
          }}
        >
          Restore
        </button>
      </div>
    </div>
  )
}

/* ─── ProjectRow ─────────────────────────────────────────────────── */
function ProjectRow({ item, isDark, tx1, tx2, tx3, ln, sf, sfHov, cr, activeItemBg, activeItemTx, blue, pending, selected, selMode, isLast, onRestore, onToggle }: RowShared) {
  const [hov, setHov] = useState(false)

  /* Projects break the row rhythm — they get a subtle full-width callout */
  const projBg = isDark
    ? (hov || selected) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)'
    : (hov || selected) ? 'rgba(0,0,0,0.05)'       : 'rgba(0,0,0,0.025)'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => selMode && onToggle()}
      style={{
        display: 'flex', alignItems: 'center',
        minHeight: '52px', padding: '12px 12px 12px 8px',
        marginBottom: isLast ? '0' : '3px',
        borderRadius: '9px',
        background: projBg,
        border: `1px solid ${selected ? blue + '55' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
        transform: pending ? 'scale(0.99)' : 'scale(1)',
        opacity: pending ? 0 : 1,
        transition: 'opacity 170ms ease, transform 170ms ease, background 90ms, border-color 90ms',
        cursor: selMode ? 'pointer' : 'default',
        marginTop: '8px',
      }}
    >
      {/* Selection / icon */}
      <div style={{ width: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(selMode || selected) ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggle() }}
            style={{
              width: '16px', height: '16px', borderRadius: '50%', border: `1.5px solid ${selected ? blue : cr}`,
              background: selected ? blue : 'transparent', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 100ms',
            }}
          >
            {selected && <svg viewBox="0 0 8 6" width="8" height="6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3l2 2 4-4"/></svg>}
          </button>
        ) : (
          /* Small project-complete mark */
          <div style={{
            width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4l2.5 2.5L9 1.5"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 620, color: tx1, letterSpacing: '-0.02em' }}>
          {item.title}
        </div>
        <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', color: tx2, fontWeight: 400 }}>
            {item.taskCount} task{item.taskCount !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '11px', color: tx3, opacity: 0.5 }}>·</span>
          <span style={{ fontSize: '11.5px', color: tx2, fontWeight: 400 }}>
            {item.category}
          </span>
        </div>
      </div>

      {/* Right — date + restore */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span style={{ fontSize: '11.5px', color: tx3, fontVariantNumeric: 'tabular-nums' }}>
          {fmtShort(item.completedAt)}
        </span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRestore() }}
          style={{
            height: '26px', padding: '0 9px', borderRadius: '6px', border: 'none',
            background: activeItemBg, color: activeItemTx,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            opacity: hov || selected ? 1 : 0,
            transition: 'opacity 120ms', whiteSpace: 'nowrap',
          }}
        >
          Restore
        </button>
      </div>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function SkeletonRows({ isDark, cr }: { isDark: boolean; cr: string }) {
  const bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  return (
    <div style={{ marginTop: '24px' }}>
      {[1, 2, 3].map(g => (
        <div key={g} style={{ marginBottom: '28px' }}>
          <div style={{ height: '10px', width: '60px', borderRadius: '4px', background: bg, marginBottom: '14px', opacity: 0.6 }} />
          {[1, 2, 3].map(r => (
            <div key={r} style={{
              height: '44px', borderRadius: '6px', background: bg,
              marginBottom: '1px', opacity: 0.4 - r * 0.07,
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─── Empty state ────────────────────────────────────────────────── */
function EmptyState({ tx1, tx2, tx3, cr, sf, isDark }: { tx1: string; tx2: string; tx3: string; cr: string; sf: string; isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh', padding: '48px 20px', textAlign: 'center',
    }}>
      {/* Icon */}
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px', marginBottom: '20px',
        background: sf, border: `1px solid ${cr}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox="0 0 22 22" width="20" height="20" fill="none" stroke={tx3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2.5" width="14" height="17" rx="2.5"/>
          <path d="M8 8h6M8 11.5h6M8 15h4"/>
          <path d="M4 8H2.5M4 11.5H2.5M4 15H2.5" strokeWidth="1.2"/>
        </svg>
      </div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: tx1, letterSpacing: '-0.02em' }}>
        Your logbook is empty
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '13px', color: tx2, lineHeight: 1.65, maxWidth: '26ch' }}>
        Complete a task to start building your personal history.
      </p>
    </div>
  )
}
