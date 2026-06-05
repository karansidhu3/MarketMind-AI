'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, LogOut, Sun, Moon, BriefcaseBusiness } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'

// Sprint 15: Themes (/thesis) removed from nav.
// Sprint 16+: Feed removed from nav — legacy surface, not primary.
const NAV = [
  { href: '/signals',   icon: Activity,          label: 'Signals'   },
  { href: '/portfolio', icon: BriefcaseBusiness,  label: 'Portfolio' },
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
    <header
      className="fixed top-3 left-4 right-4 z-50 select-none bg-surface/85 backdrop-blur-xl border border-border/50 rounded-2xl"
      style={{ boxShadow: 'var(--c-navbar-shadow)' }}
    >
      <div className="max-w-[1400px] mx-auto h-12 px-4 sm:px-5 flex items-center gap-4 sm:gap-6">

        {/* ── Logo ── */}
        <Link href="/signals" className="flex items-center shrink-0 active:scale-[0.95] transition-transform">
          <Logo size={20} showWordmark className="hidden sm:inline-flex" />
          <Logo size={20} className="sm:hidden" />
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
                  'relative flex items-center gap-1.5 rounded-lg transition-all duration-150 active:scale-[0.95]',
                  'px-2 py-1.5 sm:px-3 sm:py-1.5',
                  'text-xs font-medium',
                  active
                    ? 'bg-elevated text-text-primary border border-border/70 shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated/50'
                )}
                title={label}
              >
                <Icon size={13} strokeWidth={active ? 2.25 : 1.75} />
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
            className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated/70 transition-colors active:scale-[0.95]"
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

          {/* Sign out */}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-text-tertiary hover:text-text-secondary hover:bg-elevated/70 transition-colors active:scale-[0.95]"
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
