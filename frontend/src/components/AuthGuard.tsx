'use client'
import { useEffect } from 'react'
import { apiUrl } from '@/lib/api-base'

const FLASK_LOGIN = `${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/login`

// Silently checks /api/me on every app-page mount.
// Flask returns 401 when the session cookie is expired/invalid → redirect to Flask login.
export default function AuthGuard() {
  useEffect(() => {
    fetch(apiUrl('/api/me'), { credentials: 'include' })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          window.location.replace(FLASK_LOGIN)
        }
      })
      .catch(() => {
        // Network error — don't force logout, let the page's own API calls surface the problem
      })
  }, [])

  return null
}
