import { apiUrl } from '@/lib/api-base'

type VapidResponse = {
  public_key?: string
  error?: string
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

function requirePushSupport() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.')
  }
  if (!('PushManager' in window)) {
    throw new Error('This browser does not support push notifications.')
  }
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications.')
  }
}

export async function subscribeToForgePush() {
  requirePushSupport()

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications were not allowed.')
  }

  const keyResponse = await fetch(apiUrl('/api/push/vapid-public-key'), {
    credentials: 'include',
  })
  const keyPayload = await keyResponse.json() as VapidResponse
  if (!keyResponse.ok || !keyPayload.public_key) {
    throw new Error(keyPayload.error || 'Forge push notifications are not configured yet.')
  }

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyPayload.public_key),
  })

  const saveResponse = await fetch(apiUrl('/api/push/subscriptions'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    }),
  })
  const savePayload = await saveResponse.json().catch(() => ({})) as { error?: string }
  if (!saveResponse.ok) {
    throw new Error(savePayload.error || 'Could not save the notification subscription.')
  }

  return subscription
}

export async function unsubscribeFromForgePush() {
  requirePushSupport()

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false

  await fetch(apiUrl('/api/push/subscriptions'), {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
  return true
}

export async function getForgePushSubscription() {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}
