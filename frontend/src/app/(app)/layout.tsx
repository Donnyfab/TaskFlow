import AIWidget from '@/components/AIWidget'
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <AuthGuard />
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '100vh',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>
      <AIWidget />
    </div>
  )
}
