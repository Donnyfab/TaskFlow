import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '@/provider/QueryProvider'
import Prefetcher from '@/components/Prefetcher'

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'Your personal life OS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning style={{
        background: '#0A0A0A',
        margin: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        color: '#fff',
      }}>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('tf-theme');
              if (t === 'light') {
                document.body.style.background = '#F5F5F5';
                document.body.style.color = '#1a1a1a';
              } else {
                document.body.style.background = '#0A0A0A';
                document.body.style.color = '#fff';
              }
            } catch(e) {}
          })();
        ` }} />
        <QueryProvider>
          <Prefetcher />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
