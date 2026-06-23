'use client'

import { useEffect, useState } from 'react'

const SESSION_COUNT_KEY = 'forge-coach-session-count'
const INSTALL_DISMISSED_KEY = 'forge-install-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function readCoachSessionCount() {
  if (typeof window === 'undefined') return 0
  const parsed = Number(window.localStorage.getItem(SESSION_COUNT_KEY) || '0')
  return Number.isFinite(parsed) ? parsed : 0
}

function installWasDismissed() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true'
}

export function recordForgeCoachSession() {
  if (typeof window === 'undefined') return
  const next = Math.max(0, readCoachSessionCount()) + 1
  window.localStorage.setItem(SESSION_COUNT_KEY, String(next))
  window.dispatchEvent(new CustomEvent('forge-coach-session-count', { detail: next }))
}

export default function PwaLifecycle() {
  const [online, setOnline] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [eligible, setEligible] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOnline(window.navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('serviceWorker' in window.navigator) {
      window.navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('Forge service worker registration failed', error)
      })
    }

    const checkEligibility = () => {
      setEligible(readCoachSessionCount() >= 3 && !installWasDismissed())
    }
    checkEligibility()

    const handleCount = () => checkEligibility()
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      checkEligibility()
    }
    const handleAppInstalled = () => {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
      setDeferredPrompt(null)
      setEligible(false)
    }

    window.addEventListener('forge-coach-session-count', handleCount)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('forge-coach-session-count', handleCount)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function installApp() {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'dismissed') {
        window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
      }
      setDeferredPrompt(null)
      setEligible(false)
    } finally {
      setInstalling(false)
    }
  }

  function dismissInstallPrompt() {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
    setEligible(false)
  }

  return (
    <>
      {!online && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            zIndex: 10_000,
            left: '50%',
            bottom: 'calc(18px + env(safe-area-inset-bottom))',
            transform: 'translateX(-50%)',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(15,15,15,0.92)',
            color: '#F0F0F0',
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            boxShadow: '0 18px 50px rgba(0,0,0,0.24)',
            backdropFilter: 'blur(14px)',
          }}
        >
          Reconnecting…
        </div>
      )}

      {eligible && deferredPrompt && (
        <div
          role="dialog"
          aria-label="Install Forge"
          style={{
            position: 'fixed',
            zIndex: 9999,
            right: 'max(18px, env(safe-area-inset-right))',
            bottom: 'calc(18px + env(safe-area-inset-bottom))',
            width: 'min(340px, calc(100vw - 36px))',
            borderRadius: '18px',
            border: '1px solid rgba(0,0,0,0.08)',
            background: '#F9F9F7',
            color: '#111',
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            padding: '18px',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Forge
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.045em', marginBottom: '6px' }}>
            Install the app.
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.55, color: '#6F6F6F', marginBottom: '16px' }}>
            Keep the coach one tap away. Forge waits until you have used Coach a few times before asking.
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={dismissInstallPrompt}
              style={{ border: '1px solid #E5E5E0', borderRadius: '999px', background: 'transparent', color: '#6F6F6F', padding: '9px 12px', font: 'inherit', fontSize: '13px', cursor: 'pointer' }}
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => void installApp()}
              disabled={installing}
              style={{ border: 'none', borderRadius: '999px', background: '#111', color: '#F7F7F5', padding: '9px 14px', font: 'inherit', fontSize: '13px', fontWeight: 700, cursor: installing ? 'default' : 'pointer', opacity: installing ? 0.7 : 1 }}
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
