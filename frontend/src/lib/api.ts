import { apiUrl } from '@/lib/api-base'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ── Tasks ──────────────────────────────────────────
type TaskUpdatePayload = Partial<{
  title: string
  completed: boolean
  priority: string
  description: string
  list_id: number | null
  scheduled_for: string | null
}>

type JournalEntryPayload = {
  content?: string
  title?: string
  mood?: string
  [key: string]: unknown
}

export const getTasks   = ()                        => apiFetch('/api/tasks')
export const createTask = (data: { title: string }) => apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) })
export const updateTask = (id: number, data: TaskUpdatePayload) => apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTask = (id: number)              => apiFetch(`/api/tasks/${id}`, { method: 'DELETE' })

// ── Task Trash ─────────────────────────────────────
export const getTrashTasks  = ()           => apiFetch('/api/tasks/trash')
export const restoreTask    = (id: number) => apiFetch(`/api/tasks/${id}/restore`, { method: 'POST' })
export const purgeTask      = (id: number) => apiFetch(`/api/tasks/${id}/purge`, { method: 'POST' })
export const emptyTrashTasks = ()          => apiFetch('/api/tasks/empty-trash', { method: 'POST' })

// ── Habits ─────────────────────────────────────────
export const getHabits  = ()           => apiFetch('/api/habits')
export const logHabit   = (id: number) => apiFetch(`/api/habits/${id}/log`, { method: 'POST' })

// ── Journal ────────────────────────────────────────
export const getEntries  = ()           => apiFetch('/api/journal')
export const createEntry = (data: JournalEntryPayload) => apiFetch('/api/journal', { method: 'POST', body: JSON.stringify(data) })

// ── AI ─────────────────────────────────────────────
export const getAIInsight = () => apiFetch('/api/ai/insight')

// ── Auth ───────────────────────────────────────────
export const getMe   = ()           => apiFetch('/api/me')
export const logout  = ()           => apiFetch('/api/logout', { method: 'POST' })
