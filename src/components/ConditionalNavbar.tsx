'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function ConditionalNavbar() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname.startsWith('/auth')) return null
  return <Navbar />
}
