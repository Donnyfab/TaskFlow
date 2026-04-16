'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'

export default function Prefetcher() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const queries = [
      { queryKey: ['home'],     url: apiUrl('/api/home') },
      { queryKey: ['tasks', null], url: apiUrl('/api/tasks/data') },
      { queryKey: ['habits'],   url: apiUrl('/api/habits/data') },
      { queryKey: ['journal'],  url: apiUrl('/api/journal/entries') },
      { queryKey: ['calendar'], url: apiUrl('/api/calendar/data') },
    ]

    queries.forEach(({ queryKey, url }) => {
      // Only prefetch if not already cached
      if (!queryClient.getQueryData(queryKey)) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: () => fetch(url, { credentials: 'include' }).then(r => r.json()),
          staleTime: 1000 * 60 * 5,
        })
      }
    })
  }, [queryClient])

  return null // renders nothing, just fires fetches
}