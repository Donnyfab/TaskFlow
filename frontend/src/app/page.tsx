import type { Metadata } from 'next'
import LandingPageClient from '@/components/LandingPageClient'

export const metadata: Metadata = {
  title: 'TaskFlow | Your Personal Growth OS',
  description: 'TaskFlow is the personal growth OS for tasks, habits, journaling, accountability, and AI coaching.',
}

export default function RootPage() {
  return <LandingPageClient />
}
