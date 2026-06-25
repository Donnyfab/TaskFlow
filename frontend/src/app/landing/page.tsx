import type { Metadata } from 'next'
import LandingPageClient from './LandingPageClient'

export const metadata: Metadata = {
  title: 'Forge - Turn goals into action',
  description:
    'Forge is a personal execution coach that turns goals into commitments, proof, and measurable progress.',
}

export default function LandingPage() {
  return <LandingPageClient />
}
