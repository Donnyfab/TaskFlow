'use client'

import type { CSSProperties } from 'react'
import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import { getTrashTasks, restoreTask, purgeTask, emptyTrashTasks } from '@/lib/api'

type ThemeMode = 'dark' | 'light'

interface TrashColors {
  activeItemBg: string
  activeItemTx: string
  blue: string
  border: string
  contentBg: string
  deleteBg: string
  deleteBorder: string
  deleteText: string
  detailCloseB: string
  hoverItemBg: string
  inputBg: string
  inputBorder: string
  muted: string
  sidebarBg: string
  text: string
}

type TrashItemType = 'task' | 'project' | 'note'
type SortMode = 'recent' | 'oldest' | 'name'
type FilterMode = 'all' | TrashItemType

interface TrashItem {
  id: number
  key: string
  title: string
  type: TrashItemType
  deletedAt: string
  originalLabel: string
  secondaryLabel?: string
  count?: number
}

interface ConfirmState {
  body: string
  keys: string[]
  title: string
  variant: 'delete' | 'empty'
}

interface TasksTrashViewProps {
  colors: TrashColors
  theme: ThemeMode
}

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Recently deleted',
  oldest: 'Oldest first',
  name: 'Name A–Z',
}


function formatRelativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  const min = Math.floor(delta / 60_000)
  if (min < 2) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function formatDaysLeft(iso: string): { text: string; urgent: boolean } {
  const days = 30 - Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return { text: 'Expiring', urgent: true }
  if (days === 1) return { text: '1 day left', urgent: true }
  if (days <= 7) return { text: `${days} days left`, urgent: true }
  return { text: `${days}d`, urgent: false }
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function sortItems(items: TrashItem[], mode: SortMode): TrashItem[] {
  const next = [...items]
  if (mode === 'name') return next.sort((a, b) => a.title.localeCompare(b.title))
  next.sort((a, b) => new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime())
  if (mode === 'recent') next.reverse()
  return next
}

export default function TasksTrashView({ colors: C, theme }: TasksTrashViewProps) {
  const [items, setItems] = useState<TrashItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [typeFilter, setTypeFilter] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [pendingKeys, setPendingKeys] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [notice, setNotice] = useState('')
  const [openSwipeKey, setOpenSwipeKey] = useState<string | null>(null)
  const [isCompact, setIsCompact] = useState(false)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getTrashTasks()
      .then((data: { tasks: Array<{ id: number; title: string; deleted_at: string; list_name: string }> }) => {
        setItems(data.tasks.map(t => ({
          id: t.id,
          key: `task-${t.id}`,
          title: t.title,
          type: 'task' as TrashItemType,
          deletedAt: t.deleted_at,
          originalLabel: t.list_name,
        })))
      })
      .catch(() => setItems([]))
      .finally(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 820px)')
    const sync = () => setIsCompact(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!notice) return
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 2200)
    return () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current) }
  }, [notice])

  const isDark = theme === 'dark'
  const tx1    = isDark ? 'rgba(255,255,255,0.88)' : '#1C1C1E'
  const tx2    = isDark ? 'rgba(255,255,255,0.40)' : '#8E8E93'
  const tx3    = isDark ? 'rgba(255,255,255,0.22)' : '#BCBCC2'
  const ln     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const sf     = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  const cr     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const chromeBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.74)'
  const pillActiveBg = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'
  const pillActiveTx = isDark ? 'rgba(255,255,255,0.92)' : '#1C1C1E'
  const modalShadow  = isDark
    ? '0 24px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)'
    : '0 20px 36px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)'

  const normalizedSearch = deferredSearch.trim().toLowerCase()
  const filteredItems = sortItems(
    items.filter(item => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      const haystack = `${item.title} ${item.originalLabel} ${item.secondaryLabel ?? ''}`.toLowerCase()
      return matchesType && (!normalizedSearch || haystack.includes(normalizedSearch))
    }),
    sortMode,
  )

  const selectedSet   = new Set(selectedKeys)
  const selectedItems = items.filter(item => selectedSet.has(item.key))
  const selectedCount = selectedItems.length
  const counts = {
    all:     items.length,
    task:    items.filter(i => i.type === 'task').length,
    project: items.filter(i => i.type === 'project').length,
    note:    items.filter(i => i.type === 'note').length,
  }

  const selectedOrFocusedKeys = selectedCount > 0
    ? selectedItems.map(i => i.key)
    : activeKey ? [activeKey] : []

  function showNotice(msg: string) { setNotice(msg) }

  function toggleSelection(key: string) {
    setSelectedKeys(cur => cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key])
  }

  function removeKeys(keys: string[]) {
    const rm = new Set(keys)
    setItems(cur => cur.filter(i => !rm.has(i.key)))
    setSelectedKeys(cur => cur.filter(k => !rm.has(k)))
    setOpenSwipeKey(cur => (cur && rm.has(cur) ? null : cur))
    setActiveKey(cur => (cur && rm.has(cur) ? null : cur))
  }

  async function animateAndRemove(keys: string[], message: string) {
    if (!keys.length) return
    setPendingKeys(cur => [...new Set([...cur, ...keys])])
    await new Promise(r => setTimeout(r, 180))
    removeKeys(keys)
    setPendingKeys(cur => cur.filter(k => !keys.includes(k)))
    showNotice(message)
  }

  async function handleRestore(keys: string[]) {
    const ids = items.filter(i => keys.includes(i.key)).map(i => i.id)
    await Promise.all(ids.map(id => restoreTask(id).catch(() => null)))
    await animateAndRemove(keys, keys.length === 1 ? 'Item restored' : `${keys.length} items restored`)
  }

  async function handleDelete(keys: string[]) {
    const ids = items.filter(i => keys.includes(i.key)).map(i => i.id)
    await Promise.all(ids.map(id => purgeTask(id).catch(() => null)))
    await animateAndRemove(keys, keys.length === 1 ? 'Item permanently deleted' : `${keys.length} items permanently deleted`)
    setConfirmState(null)
  }

  async function handleEmptyTrash() {
    await emptyTrashTasks().catch(() => null)
    await animateAndRemove(items.map(i => i.key), 'Trash emptied')
    setConfirmState(null)
  }

  function openDeleteConfirm(keys: string[]) {
    const targets = items.filter(i => keys.includes(i.key))
    if (!targets.length) return
    setConfirmState({
      variant: 'delete', keys,
      title: targets.length === 1 ? 'Delete permanently?' : `Delete ${targets.length} items?`,
      body: "This can't be undone. These items will be gone for good.",
    })
  }

  const handleTrashShortcuts = useEffectEvent((event: KeyboardEvent) => {
    if (isTextInputTarget(event.target)) return
    if (event.key === 'Escape') {
      setConfirmState(null); setOpenSwipeKey(null)
      setSelectionMode(false); setSelectedKeys([])
      return
    }
    if (event.key.toLowerCase() === 'm') {
      event.preventDefault()
      setSelectionMode(cur => !cur)
      if (selectionMode) setSelectedKeys([])
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      if (!selectionMode) setSelectionMode(true)
      setSelectedKeys(filteredItems.map(i => i.key))
      return
    }
    const fallback = activeKey ? items.find(i => i.key === activeKey) : null
    const actionKeys = selectedCount > 0 ? selectedItems.map(i => i.key) : fallback ? [fallback.key] : []
    if (!actionKeys.length) return
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); void handleRestore(actionKeys); return }
    if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); openDeleteConfirm(actionKeys) }
  })

  useEffect(() => {
    const fn = (e: KeyboardEvent) => handleTrashShortcuts(e)
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const headerSubtitle = (() => {
    if (items.length === 0) return 'No deleted items'
    const parts: string[] = []
    if (counts.task > 0) parts.push(`${counts.task} task${counts.task !== 1 ? 's' : ''}`)
    if (counts.project > 0) parts.push(`${counts.project} project${counts.project !== 1 ? 's' : ''}`)
    if (counts.note > 0) parts.push(`${counts.note} note${counts.note !== 1 ? 's' : ''}`)
    if (parts.length <= 1) return `${items.length} deleted item${items.length !== 1 ? 's' : ''}`
    return `${items.length} deleted · ${parts.join(', ')}`
  })()

  const filterOptions: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'task', label: 'Tasks' },
    { id: 'project', label: 'Projects' },
    ...(counts.note > 0 ? [{ id: 'note' as FilterMode, label: 'Notes' }] : []),
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: C.contentBg }}>

      {/* ── Header ── */}
      <div className="tr-header" style={{ padding: '28px 32px 22px', flexShrink: 0 }}>
        <div className="tr-headline">
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.1, letterSpacing: '-0.05em', fontWeight: 700, color: tx1 }}>
              Trash
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: tx2, lineHeight: 1.5 }}>
              {headerSubtitle}
            </p>
          </div>
          <div className="tr-head-actions">
            <button
              type="button"
              onClick={() => { setSelectionMode(cur => !cur); if (selectionMode) setSelectedKeys([]) }}
              style={{
                height: '36px', padding: '0 14px', borderRadius: '10px',
                border: `1px solid ${selectionMode ? 'transparent' : cr}`,
                background: selectionMode ? pillActiveBg : chromeBg,
                color: selectionMode ? pillActiveTx : tx2,
                fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setConfirmState({
                variant: 'empty', keys: [],
                title: 'Empty Trash?',
                body: 'All deleted items will be removed permanently. This cannot be undone.',
              })}
              style={{
                height: '36px', padding: '0 14px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '7px',
                border: `1px solid ${items.length === 0 ? cr : C.deleteBorder}`,
                background: items.length === 0 ? chromeBg : C.deleteBg,
                color: items.length === 0 ? tx3 : C.deleteText,
                fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit',
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                opacity: items.length === 0 ? 0.4 : 1,
              }}
            >
              <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4h10" />
                <path d="M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4" />
                <rect x="3" y="4" width="8" height="8" rx="1.5" />
                <path d="M6 7v3M8 7v3" />
              </svg>
              Empty Trash
            </button>
          </div>
        </div>
      </div>

      {/* ── Separator ── */}
      <div style={{ height: '1px', background: ln, flexShrink: 0, margin: '0 32px' }} className="tr-sep" />

      {/* ── Toolbar ── */}
      <div className="tr-toolbar" style={{ padding: '16px 32px 0', flexShrink: 0 }}>
        <div className="tr-toolbar-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

          {/* Search */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            flex: '1 1 200px', minWidth: 0,
            height: '36px', borderRadius: '10px', padding: '0 12px',
            background: sf, border: `1px solid ${cr}`, cursor: 'text',
          }}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke={tx3} strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4 4" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search deleted items"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: tx1, fontSize: '13px', fontFamily: 'inherit' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: tx3, display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                </svg>
              </button>
            )}
          </label>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '10px', background: sf, border: `1px solid ${cr}`, flexShrink: 0 }}>
            {filterOptions.map(opt => (
              <button
                key={opt.id} type="button"
                onClick={() => setTypeFilter(opt.id)}
                style={{
                  height: '30px', padding: '0 11px', borderRadius: '7px', border: 'none',
                  background: typeFilter === opt.id ? pillActiveBg : 'transparent',
                  color: typeFilter === opt.id ? pillActiveTx : tx2,
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '36px', padding: '0 10px', borderRadius: '10px',
              border: `1px solid ${cr}`, background: sf, color: tx2,
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap', userSelect: 'none',
            }}>
              {SORT_LABELS[sortMode]}
              <svg viewBox="0 0 10 6" width="8" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l4 4 4-4" />
              </svg>
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              >
                <option value="recent">Recently deleted</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>
        </div>

        {/* Notice */}
        {notice && (
          <div style={{
            marginTop: '12px', padding: '10px 13px', borderRadius: '10px',
            border: `1px solid ${cr}`,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
            color: tx1, fontSize: '12.5px', fontWeight: 600,
            animation: 'trashNoticeIn 180ms ease-out',
          }}>
            {notice}
          </div>
        )}

        {/* Bulk action bar */}
        {(selectionMode || selectedCount > 0) && (
          <div className="tr-bulk-bar" style={{
            marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 14px', borderRadius: '12px',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.84)',
            border: `1px solid ${cr}`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: tx1, fontSize: '13px', fontWeight: 650 }}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'Selection mode'}
              </div>
              <div style={{ color: tx2, fontSize: '11.5px', marginTop: '2px' }}>
                `r` restore · `⌫` delete · `⌘A` select all
              </div>
            </div>
            <button type="button"
              onClick={() => setSelectedKeys(filteredItems.map(i => i.key))}
              style={{ height: '32px', padding: '0 11px', borderRadius: '8px', border: `1px solid ${cr}`, background: chromeBg, color: tx1, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Select all
            </button>
            <button type="button" disabled={selectedCount === 0}
              onClick={() => void handleRestore(selectedItems.map(i => i.key))}
              style={{ height: '32px', padding: '0 11px', borderRadius: '8px', border: 'none', background: selectedCount === 0 ? chromeBg : C.activeItemBg, color: selectedCount === 0 ? tx3 : C.activeItemTx, fontSize: '12px', fontWeight: 700, cursor: selectedCount === 0 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: selectedCount === 0 ? 0.4 : 1 }}>
              Restore
            </button>
            <button type="button" disabled={selectedCount === 0}
              onClick={() => openDeleteConfirm(selectedItems.map(i => i.key))}
              style={{ height: '32px', padding: '0 11px', borderRadius: '8px', border: `1px solid ${selectedCount === 0 ? cr : C.deleteBorder}`, background: selectedCount === 0 ? chromeBg : C.deleteBg, color: selectedCount === 0 ? tx3 : C.deleteText, fontSize: '12px', fontWeight: 700, cursor: selectedCount === 0 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: selectedCount === 0 ? 0.4 : 1 }}>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="tr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 32px' }}>
        {!hydrated ? (
          <>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: '70px', borderRadius: '12px', background: sf, border: `1px solid ${cr}`, marginBottom: '6px', opacity: 0.5 - i * 0.07 }} />
            ))}
          </>
        ) : filteredItems.length === 0 && items.length === 0 ? (
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px 80px' }}>
            <div style={{ textAlign: 'center', maxWidth: '320px' }}>
              <div style={{
                width: '40px', height: '40px', margin: '0 auto 20px',
                borderRadius: '12px', border: `1.5px dashed ${tx3}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: tx3,
              }}>
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="8" cy="8" r="5.5" />
                  <path d="M6 8h4" />
                </svg>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.04em', color: tx1, lineHeight: 1.2 }}>
                Nothing in Trash
              </div>
              <p style={{ margin: '10px 0 0', color: tx2, fontSize: '13.5px', lineHeight: 1.65, maxWidth: '28ch', marginLeft: 'auto', marginRight: 'auto' }}>
                Deleted items appear here. Recover anything you need within 30 days.
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 20px 80px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 650, color: tx1 }}>No results</div>
              <p style={{ margin: '8px 0 0', color: tx2, fontSize: '13px', lineHeight: 1.6 }}>
                Try a different search or clear the filters.
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredItems.map((item, i) => (
              <TrashRow
                key={item.key}
                active={activeKey === item.key}
                colors={C}
                compact={isCompact}
                isDark={isDark}
                item={item}
                openSwipe={openSwipeKey === item.key}
                pending={pendingKeys.includes(item.key)}
                selected={selectedSet.has(item.key)}
                selectionMode={selectionMode}
                onActivate={() => setActiveKey(item.key)}
                onDelete={() => openDeleteConfirm([item.key])}
                onOpenSwipe={open => setOpenSwipeKey(open ? item.key : null)}
                onRestore={() => void handleRestore([item.key])}
                onSelectToggle={() => toggleSelection(item.key)}
                style={{ animationDelay: `${i * 20}ms` }}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Footer bar ── */}
      <div style={{
        height: '52px', borderTop: `1px solid ${ln}`, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', flexShrink: 0, background: C.contentBg,
      }}>
        <div style={{ color: tx3, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span>`r` restore</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>`⌫` delete</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>`m` select</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" disabled={!selectedOrFocusedKeys.length}
            onClick={() => void handleRestore(selectedOrFocusedKeys)}
            style={{ height: '34px', padding: '0 13px', borderRadius: '9px', border: 'none', background: selectedOrFocusedKeys.length ? C.activeItemBg : chromeBg, color: selectedOrFocusedKeys.length ? C.activeItemTx : tx3, fontSize: '12px', fontWeight: 700, cursor: selectedOrFocusedKeys.length ? 'pointer' : 'default', opacity: selectedOrFocusedKeys.length ? 1 : 0.4, fontFamily: 'inherit' }}>
            Restore
          </button>
          <button type="button" disabled={!selectedOrFocusedKeys.length}
            onClick={() => openDeleteConfirm(selectedOrFocusedKeys)}
            style={{ height: '34px', padding: '0 13px', borderRadius: '9px', border: `1px solid ${selectedOrFocusedKeys.length ? C.deleteBorder : cr}`, background: selectedOrFocusedKeys.length ? C.deleteBg : chromeBg, color: selectedOrFocusedKeys.length ? C.deleteText : tx3, fontSize: '12px', fontWeight: 700, cursor: selectedOrFocusedKeys.length ? 'pointer' : 'default', opacity: selectedOrFocusedKeys.length ? 1 : 0.4, fontFamily: 'inherit' }}>
            Delete forever
          </button>
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {confirmState && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setConfirmState(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 220,
            background: isDark ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.22)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div style={{
            width: '100%', maxWidth: '400px', borderRadius: '20px',
            background: isDark ? 'rgba(14,14,18,0.98)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${cr}`, boxShadow: modalShadow, overflow: 'hidden',
            animation: 'trashModalIn 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}>
            <div style={{ padding: '22px 22px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.03em', color: tx1, lineHeight: 1.3 }}>
                    {confirmState.title}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13.5px', lineHeight: 1.65, color: tx2 }}>
                    {confirmState.body}
                  </div>
                </div>
                <button type="button" onClick={() => setConfirmState(null)}
                  style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: sf, color: tx2, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 22px 22px', borderTop: `1px solid ${ln}` }}>
              <button type="button" onClick={() => setConfirmState(null)}
                style={{ flex: 1, height: '42px', borderRadius: '12px', border: `1px solid ${cr}`, background: chromeBg, color: tx1, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  if (confirmState.variant === 'empty') void handleEmptyTrash()
                  else void handleDelete(confirmState.keys)
                }}
                style={{ flex: 1, height: '42px', borderRadius: '12px', border: 'none', background: C.deleteBg, color: C.deleteText, fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {confirmState.variant === 'empty' ? 'Empty Trash' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes trashRowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes trashModalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes trashNoticeIn {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 821px) {
          .tr-headline { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
          .tr-head-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        }
        @media (max-width: 820px) {
          .tr-headline { display: grid; gap: 14px; }
          .tr-head-actions { display: flex; gap: 10px; flex-wrap: wrap; }
          .tr-header, .tr-toolbar { padding-left: 18px !important; padding-right: 18px !important; }
          .tr-scroll { padding-left: 18px !important; padding-right: 18px !important; }
          .tr-sep { margin-left: 18px !important; margin-right: 18px !important; }
          .tr-bulk-bar { flex-wrap: wrap; }
        }
        @media (max-width: 680px) {
          .tr-header { padding-top: 22px !important; }
        }
      `}</style>
    </div>
  )
}

function TrashRow({
  active,
  colors: C,
  compact,
  isDark,
  item,
  onActivate,
  onDelete,
  onOpenSwipe,
  onRestore,
  onSelectToggle,
  openSwipe,
  pending,
  selected,
  selectionMode,
  style,
}: {
  active: boolean
  colors: TrashColors
  compact: boolean
  isDark: boolean
  item: TrashItem
  onActivate: () => void
  onDelete: () => void
  onOpenSwipe: (open: boolean) => void
  onRestore: () => void
  onSelectToggle: () => void
  openSwipe: boolean
  pending: boolean
  selected: boolean
  selectionMode: boolean
  style?: CSSProperties
}) {
  const [hov, setHov] = useState(false)
  const startXRef = useRef<number | null>(null)
  const deltaRef  = useRef(0)
  const trayWidth = 130
  const translateX = compact ? (openSwipe ? -trayWidth : 0) : 0

  const tx1    = isDark ? 'rgba(255,255,255,0.70)' : '#48484A'
  const tx2    = isDark ? 'rgba(255,255,255,0.35)' : '#AEAEB2'
  const tx3    = isDark ? 'rgba(255,255,255,0.20)' : '#C7C7CC'
  const cr     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const sf     = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)'
  const sfHov  = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.035)'

  const isProject = item.type === 'project'
  const typeLabel = item.type === 'note' ? 'note' : isProject ? 'project' : 'task'

  const { text: daysLeft, urgent } = formatDaysLeft(item.deletedAt)
  const relTime = formatRelativeTime(item.deletedAt)

  const amberTx = isDark ? 'rgba(251,191,36,0.85)' : 'rgba(146,95,6,0.92)'
  const amberBg = isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.10)'
  const amberBd = isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.22)'

  const borderColor = selected
    ? (isDark ? 'rgba(26,127,232,0.40)' : 'rgba(26,127,232,0.30)')
    : (hov || active)
      ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)')
      : cr

  return (
    <div style={{ position: 'relative', marginBottom: '6px', borderRadius: '14px', overflow: compact ? 'hidden' : 'visible' }}>

      {/* Mobile swipe tray */}
      {compact && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          justifyContent: 'flex-end', alignItems: 'stretch',
          gap: '1px', padding: '0 0 0 60px',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        }}>
          <button type="button" onClick={onRestore}
            style={{ width: '65px', border: 'none', background: C.activeItemBg, color: C.activeItemTx, fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
            Restore
          </button>
          <button type="button" onClick={onDelete}
            style={{ width: '65px', border: 'none', background: C.deleteBg, color: C.deleteText, fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      )}

      <article
        onClick={() => {
          onActivate()
          if (selectionMode) onSelectToggle()
          if (compact && openSwipe) onOpenSwipe(false)
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onTouchStart={e => { if (!compact) return; startXRef.current = e.touches[0]?.clientX ?? null }}
        onTouchMove={e => { if (!compact || startXRef.current === null) return; deltaRef.current = (e.touches[0]?.clientX ?? 0) - startXRef.current }}
        onTouchEnd={() => {
          if (!compact) return
          if (deltaRef.current < -34) onOpenSwipe(true)
          if (deltaRef.current > 30) onOpenSwipe(false)
          startXRef.current = null; deltaRef.current = 0
        }}
        style={{
          position: 'relative',
          transform: `translateX(${translateX}px) scale(${pending ? 0.984 : 1})`,
          opacity: pending ? 0 : 1,
          transition: 'transform 180ms ease, opacity 180ms ease, background 120ms, border-color 120ms',
          borderRadius: '14px',
          border: `1px solid ${borderColor}`,
          background: (hov || active) ? sfHov : sf,
          padding: compact ? '13px 14px 13px 12px' : '13px 16px',
          cursor: 'pointer',
          animation: 'trashRowIn 200ms ease-out both',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>

          {/* Selection indicator */}
          <button
            type="button"
            aria-label={selected ? 'Deselect' : 'Select'}
            onClick={e => { e.stopPropagation(); onActivate(); onSelectToggle() }}
            style={{
              width: '18px', height: '18px', marginTop: '2px', flexShrink: 0,
              borderRadius: '50%',
              border: `1.5px solid ${selected ? C.blue : cr}`,
              background: selected ? C.blue : 'transparent',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: selectionMode || selected || hov ? 1 : 0,
              transition: 'opacity 120ms, border-color 120ms, background 120ms',
              cursor: 'pointer',
            }}
          >
            {selected && (
              <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4l2.5 2.5L9 1" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Top row: type badge + relative time + days left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <span style={{
                padding: '2px 7px', borderRadius: '5px',
                fontSize: '10.5px', fontWeight: 600,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: tx3,
              }}>
                {typeLabel}
              </span>
              <span style={{ fontSize: '11.5px', color: tx2 }}>{relTime}</span>
              <span style={{
                marginLeft: 'auto', flexShrink: 0,
                padding: urgent ? '2px 7px' : '0',
                borderRadius: '5px',
                fontSize: '10.5px', fontWeight: 600,
                background: urgent ? amberBg : 'transparent',
                color: urgent ? amberTx : tx3,
                border: urgent ? `1px solid ${amberBd}` : 'none',
              }}>
                {daysLeft}
              </span>
            </div>

            {/* Title */}
            <div style={{
              fontSize: isProject ? '15px' : '14px',
              fontWeight: isProject ? 620 : 560,
              letterSpacing: '-0.02em', lineHeight: 1.4,
              color: tx1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {item.title}
            </div>

            {/* Bottom row: origin + inline actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
              <span style={{ fontSize: '11.5px', color: tx3 }}>{item.originalLabel}</span>
              {item.secondaryLabel && (
                <span style={{ fontSize: '11.5px', color: tx3 }}>· {item.secondaryLabel}</span>
              )}

              {!compact && (
                <div style={{
                  marginLeft: 'auto', display: 'flex', gap: '6px', flexShrink: 0,
                  opacity: hov || active || selected ? 1 : 0,
                  transition: 'opacity 120ms',
                }}>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); onRestore() }}
                    style={{ height: '28px', padding: '0 10px', borderRadius: '7px', border: 'none', background: C.activeItemBg, color: C.activeItemTx, fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                    Restore
                  </button>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); onDelete() }}
                    style={{ height: '28px', padding: '0 10px', borderRadius: '7px', border: `1px solid ${C.deleteBorder}`, background: C.deleteBg, color: C.deleteText, fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                    Delete forever
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
