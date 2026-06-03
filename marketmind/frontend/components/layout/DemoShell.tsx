'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Activity, BriefcaseBusiness, ExternalLink, Zap } from 'lucide-react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import CompanyPanel from '@/components/company/CompanyPanel'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { DEMO_COMPANY_DETAIL } from '@/lib/demo-data'

const NAV = [
  { href: '/demo',           icon: Activity,          label: 'Signals'   },
  { href: '/demo/portfolio', icon: BriefcaseBusiness, label: 'Portfolio' },
]

/**
 * Shell for public demo routes — no auth check.
 * Header mirrors the logged-in Header.tsx: same nav pill style, same active state.
 * showBadge=false hides the DEMO chip (used by /about).
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
        <main className="pt-20 min-h-screen">
          {children}
        </main>
        <CompanyPanel demoMode demoCompanyData={DEMO_COMPANY_DETAIL} />
      </div>
    </CompanyProvider>
  )
}

function DemoHeader({ showBadge }: { showBadge: boolean }) {
  const path               = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header
      className="fixed top-3 left-4 right-4 z-50 select-none bg-surface/85 backdrop-blur-xl border border-border/50 rounded-2xl"
      style={{ boxShadow: 'var(--c-navbar-shadow)' }}
    >
      <div className="max-w-[1400px] mx-auto h-12 px-4 sm:px-5 flex items-center gap-4 sm:gap-6">

        {/* Logo → demo home */}
        <Link href="/demo" className="flex items-center shrink-0 active:scale-[0.95] transition-transform">
          <Logo size={20} showWordmark className="hidden sm:inline-flex" />
          <Logo size={20} className="sm:hidden" />
        </Link>

        {/* Demo badge */}
        {showBadge && (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 shrink-0">
            <Zap size={9} />
            DEMO
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-4 bg-border shrink-0 hidden sm:block" />

        {/* Navigation — same pill style as Header.tsx */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <p className="text-text-tertiary text-xs hidden sm:block mr-2">Sample data</p>

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

          {/* Sign in CTA */}
          <Link
            href="/login"
            className="btn-primary flex items-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium active:scale-[0.95] transition-transform"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
