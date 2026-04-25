'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import {
  readSidebarCollapsed,
  SIDEBAR_COLLAPSED_KEY,
  syncSidebarCollapsed,
} from '@/components/sidebar-state'

type ButtonTheme = 'dark' | 'light'

const BUTTON_THEME: Record<ButtonTheme, { color: string; hoverColor: string; hoverBg: string }> = {
  dark: {
    color: 'rgba(255,255,255,0.4)',
    hoverColor: 'rgba(255,255,255,0.9)',
    hoverBg: 'rgba(255,255,255,0.07)',
  },
  light: {
    color: '#888',
    hoverColor: '#1C1C1E',
    hoverBg: 'rgba(0,0,0,0.06)',
  },
}

interface SidebarReopenButtonProps {
  theme?: ButtonTheme
  title?: string
  style?: CSSProperties
}

export default function SidebarReopenButton({
  theme = 'dark',
  title = 'Expand sidebar',
  style,
}: SidebarReopenButtonProps) {
  const [collapsed, setCollapsed] = useState<boolean | null>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const syncFromStorage = (nextValue?: string | null) => {
      if (nextValue === 'true' || nextValue === 'false') {
        setCollapsed(nextValue === 'true')
        return
      }

      setCollapsed(readSidebarCollapsed())
    }

    syncFromStorage()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_COLLAPSED_KEY) {
        syncFromStorage(event.newValue)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  if (collapsed !== true) return null

  const palette = BUTTON_THEME[theme]

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={() => {
        setCollapsed(false)
        syncSidebarCollapsed(false)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        flexShrink: 0,
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? palette.hoverBg : 'transparent',
        color: hovered ? palette.hoverColor : palette.color,
        transition: 'background 0.12s, color 0.12s',
        ...style,
      }}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M2 4h12M2 8h12M2 12h12" />
      </svg>
    </button>
  )
}
