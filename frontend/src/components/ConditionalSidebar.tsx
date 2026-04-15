'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function ConditionalSidebar() {
  const pathname = usePathname()
  if (pathname.startsWith('/auth') || pathname.startsWith('/landing')) return null
  return <Sidebar />
}