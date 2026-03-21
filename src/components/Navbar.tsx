'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, ClipboardList, Users, User } from 'lucide-react'

const tabs = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/log', icon: Plus, label: 'Log' },
  { href: '/history', icon: ClipboardList, label: 'History' },
  { href: '/feed', icon: Users, label: 'Feed' },
  { href: '/profile/me', icon: User, label: 'Profile' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto"
      style={{
        maxWidth: 480,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-4 py-2 min-w-[44px]"
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              <span
                className="text-[11px] font-medium"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
