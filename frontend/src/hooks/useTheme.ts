import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

function resolveTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('tf-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme())

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme') {
        setTheme(resolveTheme())
      }
    }
    const onSystemChange = () => {
      if (localStorage.getItem('tf-theme') === 'system') setTheme(resolveTheme())
    }

    window.addEventListener('storage', onStorage)
    media.addEventListener('change', onSystemChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      media.removeEventListener('change', onSystemChange)
    }
  }, [])

  return theme
}
