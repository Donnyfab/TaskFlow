import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('tf-theme')
    if (stored === 'light' || stored === 'dark') setTheme(stored)
    else if (stored === 'system') {
      setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tf-theme') {
        if (e.newValue === 'light' || e.newValue === 'dark') setTheme(e.newValue)
        else if (e.newValue === 'system') {
          setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return theme
}
