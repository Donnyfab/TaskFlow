'use client'

import type { CSSProperties } from 'react'
import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'

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

interface TrashItem {
  key: string
  title: string
  type: TrashItemType
  deletedAt: string
  originalLabel: string
  detailLabel: string
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

const STORAGE_KEY = 'taskflow-trash-view-items'

function buildSeedTrashItems(): TrashItem[] {
  const now = Date.now()
  return [
    {
      key: 'task-101',
      title: 'Book follow-up with Taylor',
      type: 'task',
      deletedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      originalLabel: 'Client work',
      detailLabel: 'Task',
      secondaryLabel: 'Restores to Client work',
    },
    {
      key: 'task-102',
      title: 'Rewrite Friday review notes',
      type: 'task',
      deletedAt: new Date(now - 1000 * 60 * 60 * 9).toISOString(),
      originalLabel: 'Journal sweep',
      detailLabel: 'Note',
      secondaryLabel: 'Deleted from notes capture',
    },
    {
      key: 'project-14',
      title: 'Q2 launch cleanup',
      type: 'project',
      deletedAt: new Date(now - 1000 * 60 * 60 * 31).toISOString(),
      originalLabel: 'Project',
      detailLabel: 'Project',
      secondaryLabel: '4 tasks inside',
      count: 4,
    },
    {
      key: 'task-103',
      title: 'Send invoices for March retainers',
      type: 'task',
      deletedAt: new Date(now - 1000 * 60 * 60 * 42).toISOString(),
      originalLabel: 'Finance',
      detailLabel: 'Task',
      secondaryLabel: 'Restores to Finance',
    },
    {
      key: 'project-16',
      title: 'Reading backlog',
      type: 'project',
      deletedAt: new Date(now - 1000 * 60 * 60 * 60).toISOString(),
      originalLabel: 'Project',
      detailLabel: 'Project',
      secondaryLabel: '12 tasks inside',
      count: 12,
    },
  ]
}

function formatDeletedAt(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function sortItems(items: TrashItem[], sortMode: SortMode) {
  const next = [...items]

  if (sortMode === 'name') {
    next.sort((a, b) => a.title.localeCompare(b.title))
    return next
  }

  next.sort((a, b) => new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime())
  if (sortMode === 'recent') next.reverse()
  return next
}

export default function TasksTrashView({ colors: C, theme }: TasksTrashViewProps) {
  const [items, setItems] = useState<TrashItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [typeFilter, setTypeFilter] = useState<'all' | TrashItemType>('all')
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
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seedItems = buildSeedTrashItems()
      setItems(seedItems)
      setHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as TrashItem[]
      setItems(Array.isArray(parsed) ? parsed : buildSeedTrashItems())
    } catch {
      setItems(buildSeedTrashItems())
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

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
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [notice])

  const normalizedSearch = deferredSearch.trim().toLowerCase()
  const filteredItems = sortItems(
    items.filter(item => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      const haystack = `${item.title} ${item.originalLabel} ${item.detailLabel} ${item.secondaryLabel ?? ''}`.toLowerCase()
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      return matchesType && matchesSearch
    }),
    sortMode,
  )

  const selectedSet = new Set(selectedKeys)
  const selectedItems = items.filter(item => selectedSet.has(item.key))
  const selectedCount = selectedItems.length
  const counts = {
    all: items.length,
    task: items.filter(item => item.type === 'task').length,
    project: items.filter(item => item.type === 'project').length,
    note: items.filter(item => item.type === 'note').length,
  }

  function showNotice(message: string) {
    setNotice(message)
  }

  function toggleSelection(key: string) {
    setSelectedKeys(current => current.includes(key) ? current.filter(entry => entry !== key) : [...current, key])
  }

  function removeKeys(keys: string[]) {
    const removalSet = new Set(keys)
    setItems(current => current.filter(item => !removalSet.has(item.key)))
    setSelectedKeys(current => current.filter(key => !removalSet.has(key)))
    setOpenSwipeKey(current => current && removalSet.has(current) ? null : current)
    setActiveKey(current => current && removalSet.has(current) ? null : current)
  }

  async function animateAndRemove(keys: string[], message: string) {
    if (keys.length === 0) return
    setPendingKeys(current => [...new Set([...current, ...keys])])
    await new Promise(resolve => setTimeout(resolve, 180))
    removeKeys(keys)
    setPendingKeys(current => current.filter(key => !keys.includes(key)))
    showNotice(message)
  }

  async function handleRestore(keys: string[]) {
    await animateAndRemove(keys, `${keys.length === 1 ? 'Item restored' : `${keys.length} items restored`}`)
  }

  async function handleDelete(keys: string[]) {
    await animateAndRemove(keys, `${keys.length === 1 ? 'Item permanently deleted' : `${keys.length} items permanently deleted`}`)
    setConfirmState(null)
  }

  function openDeleteConfirm(keys: string[]) {
    const targets = items.filter(item => keys.includes(item.key))
    if (targets.length === 0) return
    setConfirmState({
      variant: 'delete',
      keys,
      title: targets.length === 1 ? 'Permanently delete this item?' : `Permanently delete ${targets.length} items?`,
      body: 'This can’t be undone. Restored items will be removed from Trash immediately.',
    })
  }

  const handleTrashShortcuts = useEffectEvent((event: KeyboardEvent) => {
    if (isTextInputTarget(event.target)) return

    if (event.key === 'Escape') {
      setConfirmState(null)
      setOpenSwipeKey(null)
      setSelectionMode(false)
      setSelectedKeys([])
      return
    }

    if (event.key.toLowerCase() === 'm') {
      event.preventDefault()
      setSelectionMode(current => !current)
      if (selectionMode) setSelectedKeys([])
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      if (!selectionMode) setSelectionMode(true)
      setSelectedKeys(filteredItems.map(item => item.key))
      return
    }

    const fallback = activeKey ? items.find(item => item.key === activeKey) : null
    const actionKeys = selectedCount > 0
      ? selectedItems.map(item => item.key)
      : fallback
        ? [fallback.key]
        : []

    if (actionKeys.length === 0) return

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      void handleRestore(actionKeys)
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      openDeleteConfirm(actionKeys)
    }
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleTrashShortcuts(event)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const selectedOrFocusedKeys = selectedCount > 0
    ? selectedItems.map(item => item.key)
    : activeKey
      ? [activeKey]
      : []

  const rowSurface = theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.032)'
  const rowSurfaceHover = theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.05)'
  const rowShadow = theme === 'light'
    ? '0 20px 36px rgba(15,23,42,0.07), 0 2px 10px rgba(15,23,42,0.04)'
    : '0 18px 38px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)'
  const chromeBg = theme === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(19,19,21,0.74)'
  const chromeBorder = theme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)'
  const amberWash = theme === 'light' ? 'rgba(232,168,56,0.12)' : 'rgba(232,168,56,0.14)'
  const amberText = theme === 'light' ? '#8E6512' : 'rgba(232,168,56,0.88)'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: C.contentBg }}>
      <div className="tf-trash-header" style={{ padding: '28px 32px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div className="tf-trash-headline">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: theme === 'light' ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.05)',
              color: theme === 'light' ? '#262626' : 'rgba(255,255,255,0.84)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme === 'light'
                ? 'inset 0 1px 0 rgba(255,255,255,0.92)'
                : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h12M7 5V3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5" />
                <rect x="4" y="5" width="10" height="10" rx="2" />
                <path d="M7.5 8v4M10.5 8v4" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.1, letterSpacing: '-0.05em', fontWeight: 700, color: C.text }}>
                  Trash
                </h1>
                <span style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  background: amberWash,
                  color: amberText,
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}>
                  Recently deleted tasks and projects
                </span>
              </div>
              <p style={{ margin: '7px 0 0', color: C.muted, fontSize: '13px', lineHeight: 1.6, maxWidth: '56ch' }}>
                Review what was removed, restore anything you still need, or clear it out permanently.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px' }}>
                {[
                  { label: `${counts.all} items`, tone: 'default' },
                  { label: `${counts.task} tasks`, tone: 'default' },
                  { label: `${counts.project} projects`, tone: 'default' },
                  ...(counts.note > 0 ? [{ label: `${counts.note} notes`, tone: 'default' as const }] : []),
                ].map(pill => (
                  <span
                    key={pill.label}
                    style={{
                      padding: '7px 11px',
                      borderRadius: '999px',
                      background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                      color: C.muted,
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="tf-trash-head-actions">
            <button
              type="button"
              onClick={() => {
                setSelectionMode(current => !current)
                if (selectionMode) setSelectedKeys([])
              }}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '11px',
                border: `1px solid ${chromeBorder}`,
                background: selectionMode ? C.activeItemBg : chromeBg,
                color: selectionMode ? C.activeItemTx : C.text,
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms, border-color 120ms',
                backdropFilter: 'blur(14px)',
              }}
            >
              {selectionMode ? 'Done selecting' : 'Multi-select'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmState({
                variant: 'empty',
                keys: [],
                title: 'Empty Trash?',
                body: 'Everything in Trash will be removed permanently.',
              })}
              disabled={items.length === 0}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '11px',
                border: `1px solid ${items.length === 0 ? chromeBorder : C.deleteBorder}`,
                background: items.length === 0 ? chromeBg : C.deleteBg,
                color: items.length === 0 ? C.muted : C.deleteText,
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: items.length === 0 ? 'default' : 'pointer',
                opacity: items.length === 0 ? 0.5 : 1,
                transition: 'opacity 120ms, background 120ms, border-color 120ms',
              }}
            >
              Empty Trash
            </button>
          </div>
        </div>
      </div>

      <div className="tf-trash-toolbar" style={{ padding: '20px 32px 0', flexShrink: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '1fr' : 'minmax(0, 1.4fr) auto auto',
          gap: '12px',
          alignItems: 'center',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '44px',
            borderRadius: '14px',
            padding: '0 14px',
            background: C.inputBg,
            border: `1px solid ${C.inputBorder}`,
            boxShadow: theme === 'light'
              ? 'inset 0 1px 0 rgba(255,255,255,0.9)'
              : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4 4" />
            </svg>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search deleted items"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: C.text,
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </label>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px',
            borderRadius: '14px',
            background: theme === 'light' ? 'rgba(255,255,255,0.74)' : 'rgba(255,255,255,0.035)',
            border: `1px solid ${chromeBorder}`,
          }}>
            {([
              { id: 'all', label: 'All' },
              { id: 'task', label: 'Tasks' },
              { id: 'project', label: 'Projects' },
              ...(counts.note > 0 ? [{ id: 'note', label: 'Notes' } as const] : []),
            ] as const).map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTypeFilter(option.id)}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: typeFilter === option.id ? C.activeItemBg : 'transparent',
                  color: typeFilter === option.id ? C.activeItemTx : C.muted,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 120ms, color 120ms',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '44px',
            padding: '0 14px',
            borderRadius: '14px',
            background: chromeBg,
            border: `1px solid ${chromeBorder}`,
            color: C.muted,
            fontSize: '12px',
            fontWeight: 600,
          }}>
            Sort
            <select
              value={sortMode}
              onChange={event => setSortMode(event.target.value as SortMode)}
              style={{
                border: 'none',
                background: 'transparent',
                color: C.text,
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              <option value="recent">Recently deleted</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        {notice && (
          <div style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '14px',
            border: `1px solid ${theme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)'}`,
            background: theme === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)',
            color: C.text,
            fontSize: '12.5px',
            fontWeight: 600,
            animation: 'trashNoticeIn 180ms ease-out',
            backdropFilter: 'blur(14px)',
          }}>
            {notice}
          </div>
        )}

        {(selectionMode || selectedCount > 0) && (
          <div className="tf-trash-bulk-bar" style={{
            marginTop: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '18px',
            background: theme === 'light' ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.045)',
            border: `1px solid ${chromeBorder}`,
            boxShadow: rowShadow,
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: C.text, fontSize: '13px', fontWeight: 650 }}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'Selection mode'}
              </div>
              <div style={{ color: C.muted, fontSize: '11.5px', marginTop: '3px' }}>
                Press `r` to restore, `Delete` to remove permanently, or `⌘/Ctrl + A` to select visible items.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedKeys(filteredItems.map(item => item.key))}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '10px',
                border: `1px solid ${chromeBorder}`,
                background: chromeBg,
                color: C.text,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Select all
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => void handleRestore(selectedItems.map(item => item.key))}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '10px',
                border: 'none',
                background: selectedCount === 0 ? chromeBg : C.activeItemBg,
                color: selectedCount === 0 ? C.muted : C.activeItemTx,
                fontSize: '12px',
                fontWeight: 700,
                cursor: selectedCount === 0 ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: selectedCount === 0 ? 0.55 : 1,
              }}
            >
              Restore
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => openDeleteConfirm(selectedItems.map(item => item.key))}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '10px',
                border: `1px solid ${selectedCount === 0 ? chromeBorder : C.deleteBorder}`,
                background: selectedCount === 0 ? chromeBg : C.deleteBg,
                color: selectedCount === 0 ? C.muted : C.deleteText,
                fontSize: '12px',
                fontWeight: 700,
                cursor: selectedCount === 0 ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: selectedCount === 0 ? 0.55 : 1,
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 32px 26px' }}>
        {!hydrated ? (
          <div className="tf-trash-list">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                style={{
                  height: '88px',
                  borderRadius: '22px',
                  background: theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${chromeBorder}`,
                  marginBottom: '12px',
                  opacity: 0.55 - index * 0.06,
                }}
              />
            ))}
          </div>
        ) : filteredItems.length === 0 && items.length === 0 ? (
          <div style={{
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 20px 80px',
          }}>
            <div style={{ textAlign: 'center', maxWidth: '420px' }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '26px',
                margin: '0 auto 22px',
                background: theme === 'light'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(242,242,245,0.88))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                border: `1px solid ${chromeBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: rowShadow,
              }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={C.muted} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 7h15" />
                  <path d="M9 7V5.5a1 1 0 011-1h4a1 1 0 011 1V7" />
                  <rect x="6" y="7" width="12" height="13" rx="2.5" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: '26px', lineHeight: 1.1, letterSpacing: '-0.05em', color: C.text }}>
                Trash is empty
              </h2>
              <p style={{ margin: '12px auto 0', color: C.muted, fontSize: '14px', lineHeight: 1.7, maxWidth: '34ch' }}>
                Deleted items will appear here. When you need to recover something later, this is where it will wait.
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 20px 80px',
          }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
              <div style={{ fontSize: '15px', color: C.text, fontWeight: 650 }}>No deleted items match those filters</div>
              <p style={{ margin: '8px 0 0', color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                Try a different search term, switch the type filter, or clear sorting back to recently deleted.
              </p>
            </div>
          </div>
        ) : (
          <div className="tf-trash-list">
            {filteredItems.map((item, index) => (
              <TrashRow
                key={item.key}
                active={activeKey === item.key}
                colorShadow={rowShadow}
                colors={C}
                compact={isCompact}
                item={item}
                openSwipe={openSwipeKey === item.key}
                pending={pendingKeys.includes(item.key)}
                rowSurface={rowSurface}
                rowSurfaceHover={rowSurfaceHover}
                selected={selectedSet.has(item.key)}
                selectionMode={selectionMode}
                theme={theme}
                onActivate={() => setActiveKey(item.key)}
                onDelete={() => openDeleteConfirm([item.key])}
                onOpenSwipe={open => setOpenSwipeKey(open ? item.key : null)}
                onRestore={() => void handleRestore([item.key])}
                onSelectToggle={() => toggleSelection(item.key)}
                style={{
                  animationDelay: `${index * 28}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{
        height: '58px',
        borderTop: `1px solid ${C.border}`,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexShrink: 0,
        background: C.contentBg,
      }}>
        <div style={{ color: C.muted, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>Keyboard</span>
          <span>`r` restore</span>
          <span>`Delete` remove</span>
          <span>`m` multi-select</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled={selectedOrFocusedKeys.length === 0}
            onClick={() => void handleRestore(selectedOrFocusedKeys)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '11px',
              border: 'none',
              background: selectedOrFocusedKeys.length === 0 ? chromeBg : C.activeItemBg,
              color: selectedOrFocusedKeys.length === 0 ? C.muted : C.activeItemTx,
              fontSize: '12px',
              fontWeight: 700,
              cursor: selectedOrFocusedKeys.length === 0 ? 'default' : 'pointer',
              opacity: selectedOrFocusedKeys.length === 0 ? 0.55 : 1,
              fontFamily: 'inherit',
            }}
          >
            Restore
          </button>
          <button
            type="button"
            disabled={selectedOrFocusedKeys.length === 0}
            onClick={() => openDeleteConfirm(selectedOrFocusedKeys)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '11px',
              border: `1px solid ${selectedOrFocusedKeys.length === 0 ? chromeBorder : C.deleteBorder}`,
              background: selectedOrFocusedKeys.length === 0 ? chromeBg : C.deleteBg,
              color: selectedOrFocusedKeys.length === 0 ? C.muted : C.deleteText,
              fontSize: '12px',
              fontWeight: 700,
              cursor: selectedOrFocusedKeys.length === 0 ? 'default' : 'pointer',
              opacity: selectedOrFocusedKeys.length === 0 ? 0.55 : 1,
              fontFamily: 'inherit',
            }}
          >
            Delete permanently
          </button>
        </div>
      </div>

      {confirmState && (
        <div
          onClick={event => {
            if (event.target === event.currentTarget) setConfirmState(null)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 220,
            background: theme === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.58)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '430px',
            borderRadius: '22px',
            background: theme === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(18,18,22,0.98)',
            border: `1px solid ${chromeBorder}`,
            boxShadow: rowShadow,
            overflow: 'hidden',
            animation: 'trashModalIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}>
            <div style={{ padding: '22px 22px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: C.text }}>
                    {confirmState.title}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.7, color: C.muted }}>
                    {confirmState.body}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmState(null)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    border: 'none',
                    background: C.detailCloseB,
                    color: C.muted,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '18px 22px 22px', borderTop: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  border: `1px solid ${chromeBorder}`,
                  background: chromeBg,
                  color: C.text,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmState.variant === 'empty') {
                    void handleDelete(items.map(item => item.key))
                    return
                  }
                  void handleDelete(confirmState.keys)
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  border: 'none',
                  background: C.deleteBg,
                  color: C.deleteText,
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {confirmState.variant === 'empty' ? 'Empty Trash' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes trashRowIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes trashModalIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes trashNoticeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 980px) {
          .tf-trash-headline {
            display: grid;
            gap: 18px;
          }

          .tf-trash-head-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
        }

        @media (min-width: 981px) {
          .tf-trash-headline {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }

          .tf-trash-head-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }
        }

        @media (max-width: 820px) {
          .tf-trash-header,
          .tf-trash-toolbar {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }

          .tf-trash-bulk-bar {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 680px) {
          .tf-trash-header {
            padding-top: 22px !important;
          }
        }
      `}</style>
    </div>
  )
}

function TrashRow({
  active,
  colorShadow,
  colors: C,
  compact,
  item,
  onActivate,
  onDelete,
  onOpenSwipe,
  onRestore,
  onSelectToggle,
  openSwipe,
  pending,
  rowSurface,
  rowSurfaceHover,
  selected,
  selectionMode,
  style,
  theme,
}: {
  active: boolean
  colorShadow: string
  colors: TrashColors
  compact: boolean
  item: TrashItem
  onActivate: () => void
  onDelete: () => void
  onOpenSwipe: (open: boolean) => void
  onRestore: () => void
  onSelectToggle: () => void
  openSwipe: boolean
  pending: boolean
  rowSurface: string
  rowSurfaceHover: string
  selected: boolean
  selectionMode: boolean
  style?: CSSProperties
  theme: ThemeMode
}) {
  const [hovered, setHovered] = useState(false)
  const startXRef = useRef<number | null>(null)
  const deltaRef = useRef(0)
  const trayWidth = 124
  const translateX = compact ? (openSwipe ? -trayWidth : 0) : 0
  const isProject = item.type === 'project'
  const typeLabel = item.type === 'note' ? 'Note' : isProject ? 'Project' : 'Task'
  const typeTint = isProject
    ? theme === 'light' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.07)'
    : theme === 'light' ? 'rgba(26,127,232,0.10)' : 'rgba(26,127,232,0.14)'

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: '12px',
        borderRadius: '22px',
        overflow: 'hidden',
      }}
    >
      {compact && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          gap: '1px',
          background: theme === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.03)',
          padding: '0 0 0 60px',
        }}>
          <button
            type="button"
            onClick={onRestore}
            style={{
              width: '62px',
              border: 'none',
              background: C.activeItemBg,
              color: C.activeItemTx,
              fontFamily: 'inherit',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              width: '62px',
              border: 'none',
              background: C.deleteBg,
              color: C.deleteText,
              fontFamily: 'inherit',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={event => {
          if (!compact) return
          startXRef.current = event.touches[0]?.clientX ?? null
        }}
        onTouchMove={event => {
          if (!compact || startXRef.current === null) return
          deltaRef.current = (event.touches[0]?.clientX ?? 0) - startXRef.current
        }}
        onTouchEnd={() => {
          if (!compact) return
          if (deltaRef.current < -34) onOpenSwipe(true)
          if (deltaRef.current > 30) onOpenSwipe(false)
          startXRef.current = null
          deltaRef.current = 0
        }}
        style={{
          position: 'relative',
          transform: `translateX(${translateX}px) scale(${pending ? 0.985 : 1})`,
          opacity: pending ? 0 : 1,
          transition: 'transform 180ms ease, opacity 180ms ease, background 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
          borderRadius: '22px',
          padding: compact ? '16px 16px 16px 14px' : '16px 18px',
          border: `1px solid ${selected ? C.activeItemBg : active ? C.inputBorder : C.border}`,
          background: hovered || active ? rowSurfaceHover : rowSurface,
          boxShadow: active || hovered ? colorShadow : 'none',
          cursor: 'pointer',
          animation: 'trashRowIn 220ms ease-out both',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <button
            type="button"
            aria-label={selected ? 'Unselect item' : 'Select item'}
            onClick={event => {
              event.stopPropagation()
              onActivate()
              onSelectToggle()
            }}
            style={{
              width: '22px',
              height: '22px',
              marginTop: '3px',
              borderRadius: '999px',
              border: `1.5px solid ${selected ? C.blue : C.inputBorder}`,
              background: selected ? C.blue : 'transparent',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: selectionMode || selected || hovered || compact ? 1 : 0.38,
              transition: 'opacity 120ms ease, border-color 120ms ease, background 120ms ease',
              cursor: 'pointer',
            }}
          >
            {selected && (
              <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4l2.6 2.6L9 1.2" />
              </svg>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '5px 9px',
                    borderRadius: '999px',
                    background: typeTint,
                    color: active ? C.text : C.muted,
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}>
                    {typeLabel}
                  </span>
                  <span style={{ color: C.muted, fontSize: '11.5px', fontWeight: 600 }}>
                    Deleted {formatDeletedAt(item.deletedAt)}
                  </span>
                </div>
                <div style={{
                  marginTop: '10px',
                  color: C.text,
                  fontSize: isProject ? '16px' : '15px',
                  lineHeight: 1.45,
                  letterSpacing: '-0.02em',
                  fontWeight: isProject ? 650 : 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{
                    padding: '5px 9px',
                    borderRadius: '10px',
                    background: theme === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)',
                    color: C.text,
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}>
                    {item.originalLabel}
                  </span>
                  {item.secondaryLabel && (
                    <span style={{ color: C.muted, fontSize: '11.5px', fontWeight: 500 }}>
                      {item.secondaryLabel}
                    </span>
                  )}
                </div>
              </div>

              {!compact && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: hovered || active || selected ? 1 : 0.24,
                  transition: 'opacity 120ms ease',
                }}>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      onRestore()
                    }}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: C.activeItemBg,
                      color: C.activeItemTx,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      onDelete()
                    }}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      border: `1px solid ${C.deleteBorder}`,
                      background: C.deleteBg,
                      color: C.deleteText,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
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
