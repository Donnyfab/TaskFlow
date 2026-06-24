'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiUrl } from '@/lib/api-base'

type GateState = 'checking' | 'allowed' | 'redirecting'

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<GateState>('checking')

  useEffect(() => {
    const controller = new AbortController()

    fetch(apiUrl('/api/onboarding/status'), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(`Status request failed: ${response.status}`)
        return response.json() as Promise<{ onboarding_complete?: boolean }>
      })
      .then(data => {
        if (data.onboarding_complete) {
          setState('allowed')
          return
        }
        if (pathname === '/ai') {
          setState('allowed')
          return
        }
        setState('redirecting')
        router.replace('/ai')
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Do not lock an authenticated user out of the app during a status outage.
        setState('allowed')
      })

    return () => controller.abort()
  }, [pathname, router])

  if (state !== 'allowed') return null
  return children
}
