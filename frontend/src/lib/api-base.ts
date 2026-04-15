const DEFAULT_LOCAL_API_URL = 'http://localhost:8001'

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

  // In local development, we still talk directly to Flask.
  if (process.env.NODE_ENV !== 'production' && configured) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined' && isLocalHostname(window.location.hostname)) {
    return DEFAULT_LOCAL_API_URL
  }

  return ''
}

export const API_BASE_URL = resolveApiBaseUrl()

export function apiUrl(path: string) {
  if (isAbsoluteUrl(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
