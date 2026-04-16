'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl } from '@/lib/api-base'

/**
 * Silently checks /api/me on every app-page mount.
 * If the session cookie is present but expired/invalid on the server,
 * Flask returns 401 and we redirect to login.
 */
export default function AuthGuard() {
  const router = useRouter()

  useEffect(() => {
    fetch(apiUrl('/api/me'), { credentials: 'include' })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          router.replace('/auth/login')
        }
      })
      .catch(() => {
        // Network error — don't force logout, let the page's own API calls surface the problem
      })
  }, [router])

  return null
}
