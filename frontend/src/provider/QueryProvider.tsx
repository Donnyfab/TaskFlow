'use client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider, useIsRestoring } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState } from 'react'

// Blocks rendering until the localStorage cache is fully rehydrated.
// Without this, pages briefly show their loading skeleton (~50-100ms)
// while React Query restores the cache — making it look like a DB fetch.
function RestoreGate({ children }: { children: React.ReactNode }) {
  const isRestoring = useIsRestoring()
  if (isRestoring) return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.08)',
        borderTop: '2px solid rgba(255,255,255,0.4)',
        animation: 'spin 0.7s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  return <>{children}</>
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,  // treat data as fresh for 5 min
        gcTime:    1000 * 60 * 60, // keep in cache for 1 hour
      }
    }
  }))

  const [persister] = useState(() => {
    if (typeof window === 'undefined') return undefined as any
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'taskflow-cache',
    })
  })

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60, // cache survives for 1 hour
        buster: '1',             // bump this on deploys that change data shape
      }}
    >
      <RestoreGate>
        {children}
      </RestoreGate>
    </PersistQueryClientProvider>
  )
}
