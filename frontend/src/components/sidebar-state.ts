export const SIDEBAR_COLLAPSED_KEY = 'tf-sidebar-collapsed'

export function syncSidebarCollapsed(next: boolean) {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: SIDEBAR_COLLAPSED_KEY,
      newValue: String(next),
    })
  )
}
