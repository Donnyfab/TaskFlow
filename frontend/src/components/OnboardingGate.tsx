'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiUrl } from '@/lib/api-base'

type GateState = 'checking' | 'allowed'

type OnboardingStatus = {
  checking: boolean
  onboardingComplete: boolean | null
}

const OnboardingStatusContext = createContext<OnboardingStatus>({
  checking: true,
  onboardingComplete: null,
})

export function useOnboardingStatus() {
  return useContext(OnboardingStatusContext)
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('checking')
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)

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
        setOnboardingComplete(Boolean(data.onboarding_complete))
        setState('allowed')
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Do not lock an authenticated user out of the app during a status outage.
        setOnboardingComplete(null)
        setState('allowed')
      })

    return () => controller.abort()
  }, [])

  const value = useMemo(() => ({
    checking: state === 'checking',
    onboardingComplete,
  }), [onboardingComplete, state])

  if (state !== 'allowed') return null
  return (
    <OnboardingStatusContext.Provider value={value}>
      {children}
    </OnboardingStatusContext.Provider>
  )
}
