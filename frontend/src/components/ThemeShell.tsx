'use client'
import { useEffect, useState } from 'react'

function readTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const t = localStorage.getItem('tf-theme')
  return t === 'light' ? 'light' : 'dark'
}

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const [bg, setBg] = useState(() => readTheme() === 'light' ? '#F5F5F5' : '#0A0A0A')

  useEffect(() => {
    setBg(readTheme() === 'light' ? '#F5F5F5' : '#0A0A0A')
    const handler = (e: StorageEvent) => {
      if (e.key === 'tf-theme') setBg(e.newValue === 'light' ? '#F5F5F5' : '#0A0A0A')
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return (
    <div suppressHydrationWarning style={{ display: 'flex', minHeight: '100vh', background: bg }}>
      {children}
    </div>
  )
}
