'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, BookOpen, LogOut, Sun, Moon, BriefcaseBusiness } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/feed',      icon: Zap,                label: 'Feed'      },
  { href: '/thesis',    icon: BookOpen,            label: 'Themes'    },
  { href: '/portfolio', icon: BriefcaseBusiness,   label: 'Portfolio' },
]

export default function Header() {
  const path = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  function signOut() {
    localStorage.removeItem('mm_token')
    window.location.href = '/login'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 select-none">
      {/* Frosted glass layer */}
      <div className="absolute inset-0 bg-surface/85 backdrop-blur-xl border-b border-border/50" />

      {/* Hairline accent at very top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="relative max-w-[1400px] mx-auto h-full px-4 sm:px-6 flex items-center gap-4 sm:gap-6">

        {/* ── Logo ── */}
        <Link href="/feed" className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center justify-center w-6 h-6">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <div className="absolute inset-0 rounded-full border border-accent/30 animate-pulse-subtle" />
          </div>
          <span className="text-text-primary font-semibold text-sm tracking-tight hidden xs:block sm:block">
            Market<span className="text-accent">Mind</span>
          </span>
        </Link>

        {/* ── Divider (hidden on xs) ── */}
        <div className="w-px h-4 bg-border shrink-0 hidden sm:block" />

        {/* ── Navigation ── */}
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg transition-all duration-150',
                  // compact on mobile (icon only), full on sm+
                  'px-2 py-1.5 sm:px-3 sm:py-1.5',
                  'text-xs font-medium',
                  active
                    ? 'bg-elevated text-text-primary border border-border/70 shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated/50'
                )}
                title={label}
              >
                <Icon size={13} strokeWidth={active ? 2.25 : 1.75} />
                {/* Label hidden on mobile, visible on sm+ */}
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Right actions ── */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated/70 transition-colors"
            title={mounted ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : 'Toggle theme'}
          >
            {mounted ? (
              theme === 'dark'
                ? <Sun size={14} strokeWidth={1.75} />
                : <Moon size={14} strokeWidth={1.75} />
            ) : (
              <Sun size={14} strokeWidth={1.75} />
            )}
          </button>

          <div className="w-px h-4 bg-border mx-0.5 hidden sm:block" />

          {/* Sign out — icon only on mobile, icon + text on sm+ */}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-text-tertiary hover:text-text-secondary hover:bg-elevated/70 transition-colors"
            title="Sign out"
          >
            <LogOut size={13} strokeWidth={1.75} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
