'use client'
import { usePathname } from 'next/navigation'

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/' || pathname.startsWith('/landing')

  if (isLanding) {
    return <>{children}</>
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh', minWidth: 0 }}>
      {children}
    </main>
  )
}