'use client'
import { useEffect, useState } from 'react'

function readTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const t = localStorage.getItem('tf-theme')
  if (t === 'light' || t === 'dark') return t
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const [bg, setBg] = useState(() => readTheme() === 'light' ? '#F5F5F5' : '#0A0A0A')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e: StorageEvent) => {
      if (e.key === 'tf-theme') setBg(readTheme() === 'light' ? '#F5F5F5' : '#0A0A0A')
    }
    const mediaHandler = () => {
      if (localStorage.getItem('tf-theme') === 'system') setBg(readTheme() === 'light' ? '#F5F5F5' : '#0A0A0A')
    }
    window.addEventListener('storage', handler)
    media.addEventListener('change', mediaHandler)
    return () => {
      window.removeEventListener('storage', handler)
      media.removeEventListener('change', mediaHandler)
    }
  }, [])

  return (
    <div suppressHydrationWarning style={{ display: 'flex', minHeight: '100vh', background: bg }}>
      {children}
    </div>
  )
}
