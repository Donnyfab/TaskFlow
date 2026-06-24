import type { Metadata, Viewport } from 'next'
import './globals.css'
import QueryProvider from '@/provider/QueryProvider'
import Prefetcher from '@/components/Prefetcher'
import PwaLifecycle from '@/components/PwaLifecycle'

export const metadata: Metadata = {
  title: 'Forge',
  description: 'A direct AI execution coach for turning goals into commitments and real output.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Forge',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/forge-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F9F7' },
    { media: '(prefers-color-scheme: dark)', color: '#080808' },
  ],
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
              var resolved = t === 'light' || t === 'dark'
                ? t
                : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
              if (resolved === 'light') {
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
          <PwaLifecycle />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
