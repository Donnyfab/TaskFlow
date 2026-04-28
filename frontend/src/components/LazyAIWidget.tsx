'use client'
import dynamic from 'next/dynamic'

const AIWidget = dynamic(() => import('./AIWidget'), { ssr: false })

export default function LazyAIWidget() {
  return <AIWidget />
}
