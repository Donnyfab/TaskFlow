import Sidebar from '@/components/Sidebar'
import ThemeShell from '@/components/ThemeShell'
import OnboardingGate from '@/components/OnboardingGate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <ThemeShell>
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
      </ThemeShell>
    </OnboardingGate>
  )
}
