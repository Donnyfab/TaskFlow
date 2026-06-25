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
            height: '100dvh',
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </main>
      </ThemeShell>
    </OnboardingGate>
  )
}
