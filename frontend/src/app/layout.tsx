import type { Metadata } from 'next'
import './globals.css'
import ConditionalSidebar from '@/components/ConditionalSidebar'
import AIWidget from '@/components/AIWidget'
import ConditionalMain from '@/components/ConditionalMain'

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'Your personal life OS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning style={{
        background: '#0A0A0A',
        display: 'flex',
        minHeight: '100vh',
        margin: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        color: '#fff',
      }}>
        <ConditionalSidebar />
        <ConditionalMain>{children}</ConditionalMain>
        <AIWidget />
      </body>
    </html>
  )
}