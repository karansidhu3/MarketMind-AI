'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Zap, ExternalLink } from 'lucide-react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import CompanyPanel from '@/components/company/CompanyPanel'
import Logo from '@/components/ui/Logo'

/**
 * Minimal shell for public routes (/demo, /about) — no auth check.
 * showBadge=true (default) shows the amber DEMO badge.
 * showBadge=false renders a clean header for informational pages.
 */
export default function DemoShell({
  children,
  showBadge = true,
}: {
  children: React.ReactNode
  showBadge?: boolean
}) {
  return (
    <CompanyProvider>
      <div className="min-h-screen bg-background">
        <DemoHeader showBadge={showBadge} />
        <main className="pt-14 min-h-screen">
          {children}
        </main>
        <CompanyPanel demoMode />
      </div>
    </CompanyProvider>
  )
}

function DemoHeader({ showBadge }: { showBadge: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 select-none">
      {/* Frosted glass layer */}
      <div className="absolute inset-0 bg-surface/85 backdrop-blur-xl border-b border-border/50" />
      {/* Hairline accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="relative max-w-[1400px] mx-auto h-full px-4 sm:px-6 flex items-center gap-4">

        {/* Logo */}
        <Logo size={22} showWordmark />

        {/* Demo badge (optional) */}
        {showBadge && (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30">
            <Zap size={9} />
            DEMO
          </span>
        )}

        {/* Nav links */}
        <div className="flex items-center gap-1 ml-1">
          <Link href="/demo" className="text-xs text-text-tertiary hover:text-text-secondary px-2.5 py-1.5 rounded-lg hover:bg-elevated/70 transition-colors">
            Demo
          </Link>
          <Link href="/about" className="text-xs text-text-tertiary hover:text-text-secondary px-2.5 py-1.5 rounded-lg hover:bg-elevated/70 transition-colors">
            About
          </Link>
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <p className="text-text-tertiary text-xs hidden sm:block">
            {showBadge ? 'Sample data — no account needed' : 'Local investment intelligence'}
          </p>

          <div className="w-px h-4 bg-border hidden sm:block" />

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

          <div className="w-px h-4 bg-border" />

          {/* Sign in CTA */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Sign in for live data
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </header>
  )
}
