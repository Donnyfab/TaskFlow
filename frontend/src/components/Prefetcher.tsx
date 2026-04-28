'use client'
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'

export const ROUTE_QUERIES: Record<string, { queryKey: unknown[]; url: string }[]> = {
  '/home':     [{ queryKey: ['home'],              url: apiUrl('/api/home') }],
  '/tasks':    [{ queryKey: ['tasks', 'inbox'],    url: apiUrl('/api/tasks/data?smart=inbox') }],
  '/habits':   [{ queryKey: ['habits'],            url: apiUrl('/api/habits/data') }],
  '/journal':  [{ queryKey: ['journal'],           url: apiUrl('/api/journal/entries') }],
  '/calendar': [{ queryKey: ['calendar'],          url: apiUrl('/api/calendar/data') }],
}

function prefetchRoute(queryClient: ReturnType<typeof useQueryClient>, route: string) {
  const queries = ROUTE_QUERIES[route] ?? []
  queries.forEach(({ queryKey, url }) => {
    if (!queryClient.getQueryData(queryKey)) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn:   () => fetch(url, { credentials: 'include' }).then(r => r.json()),
        staleTime: 1000 * 60 * 5,
      })
    }
  })
}

export { prefetchRoute }

// Eagerly loads all sidebar routes in parallel on first mount so
// every page is instant when the user navigates to it.
export default function Prefetcher() {
  const queryClient  = useQueryClient()
  const didEagerLoad = useRef(false)

  useEffect(() => {
    if (didEagerLoad.current) return
    didEagerLoad.current = true

    Object.keys(ROUTE_QUERIES).forEach(route => prefetchRoute(queryClient, route))
  }, [queryClient])

  return null
}
