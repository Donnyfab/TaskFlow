'use client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:  1000 * 60 * 5,   // treat data as fresh for 5 min
        gcTime:     1000 * 60 * 60,  // keep in cache for 1 hour (must be >= maxAge below)
      }
    }
  }))

  const [persister] = useState(() => {
    // createSyncStoragePersister will safely no-op during SSR (no window)
    if (typeof window === 'undefined') return undefined as any
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'taskflow-cache',   // the localStorage key everything is stored under
    })
  })

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60,  // cache survives for 1 hour after last write
        buster: '1',              // bump this string to invalidate all users' caches on deploy
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
