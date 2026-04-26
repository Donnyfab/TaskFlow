'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'

// Route-aware prefetcher: only fetches data relevant to the current page,
// and only when it isn't already cached.
const ROUTE_QUERIES: Record<string, { queryKey: unknown[]; url: string }[]> = {
  '/home':     [{ queryKey: ['home'],              url: apiUrl('/api/home') }],
  '/tasks':    [{ queryKey: ['tasks', 'inbox'],    url: apiUrl('/api/tasks/data?smart=inbox') }],
  '/habits':   [{ queryKey: ['habits'],            url: apiUrl('/api/habits/data') }],
  '/journal':  [{ queryKey: ['journal'],           url: apiUrl('/api/journal/entries') }],
  '/calendar': [{ queryKey: ['calendar'],          url: apiUrl('/api/calendar/data') }],
}

export default function Prefetcher() {
  const pathname    = usePathname()
  const queryClient = useQueryClient()

  useEffect(() => {
    const segment  = '/' + (pathname?.split('/')[1] ?? '')
    const queries  = ROUTE_QUERIES[segment] ?? []

    queries.forEach(({ queryKey, url }) => {
      if (!queryClient.getQueryData(queryKey)) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn:   () => fetch(url, { credentials: 'include' }).then(r => r.json()),
          staleTime: 1000 * 60 * 5,
        })
      }
    })
  }, [pathname, queryClient])

  return null
}
