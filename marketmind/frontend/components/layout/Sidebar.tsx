'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, BookOpen, Search, LogOut, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/feed',     icon: Zap,      label: 'Feed'     },
  { href: '/thesis',   icon: BookOpen, label: 'Theses'   },
  { href: '/research', icon: Search,   label: 'Research' },
]

export default function Sidebar() {
  const path = usePathname()
  const { theme, setTheme } = useTheme()
  // Avoid hydration mismatch — only render theme icon client-side
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  function signOut() {
    localStorage.removeItem('mm_token')
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[200px] bg-surface border-r border-border flex flex-col z-40 select-none">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-border shrink-0">
        <span className="text-accent font-bold text-base leading-none">●</span>
        <span className="text-text-primary font-semibold text-sm tracking-tight">MarketMind</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100',
                active
                  ? 'bg-elevated text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated/60'
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: theme toggle + sign out */}
      <div className="p-2 border-t border-border shrink-0 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-secondary hover:bg-elevated/60 transition-colors duration-100"
        >
          {mounted ? (
            theme === 'dark'
              ? <Sun size={14} strokeWidth={1.75} />
              : <Moon size={14} strokeWidth={1.75} />
          ) : (
            <Sun size={14} strokeWidth={1.75} />
          )}
          {mounted ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : 'Light mode'}
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-secondary hover:bg-elevated/60 transition-colors duration-100"
        >
          <LogOut size={14} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
