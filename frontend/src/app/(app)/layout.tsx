export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
