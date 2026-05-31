'use client'

import { motion } from 'framer-motion'
import { Eye, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import DemoShell from '@/components/layout/DemoShell'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { SectionLabel } from '@/components/SectionLabel'
import { spring } from '@/lib/motion'
import { greet, cn } from '@/lib/utils'
import { DEMO_FEED, DEMO_RADAR } from './data'

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const signals       = DEMO_FEED.thesis_signals
  const risingThemes  = signals.filter(s => s.momentum === 'rising')
  const fallingThemes = signals.filter(s => s.momentum === 'falling')

  return (
    <DemoShell>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8">

        {/* ── Page header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-text-primary font-serif-display text-3xl leading-tight">
              {greet()}
            </h1>
            <p className="text-text-tertiary text-xs mt-1">
              Your thesis intelligence, updated daily.
            </p>
          </div>
        </div>

        {/* ── Watch callout ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.04 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/25 bg-accent/[0.06]">
            <Eye size={13} className="text-accent shrink-0" />
            <p className="text-text-primary text-sm font-medium flex-1">
              Vertiv Holdings —{' '}
              <span className="font-mono text-accent">4 → 8 → 11 → 23</span>
              {' '}docs over 4 weeks. Accelerating across AI Infrastructure and Data Center themes.
            </p>
          </div>
        </motion.div>

        {/* ── Radar — hero, above the fold ─────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.08 }}
        >
          <SectionLabel className="mb-4">Company radar</SectionLabel>
          <CompanyRadar companies={DEMO_RADAR.slice(0, 10)} initialAlerts={[]} />
        </motion.section>

        {/* ── Context — one sentence, below the fold ────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...spring.gentle, delay: 0.2 }}
          className="mt-10 pt-8 border-t border-border/40"
        >
          <p className="text-text-tertiary text-[11px] mb-3">
            {signals.length} theme{signals.length !== 1 ? 's' : ''}
            {risingThemes.length > 0 && (
              <span className="text-green ml-1.5">· {risingThemes.length} rising</span>
            )}
            {fallingThemes.length > 0 && (
              <span className="text-red ml-1.5">· {fallingThemes.length} fading</span>
            )}
          </p>

          <p className="text-text-secondary text-[15px] leading-relaxed mb-5 max-w-3xl">
            {DEMO_FEED.summary}
          </p>

          {/* Theme pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {signals.map(s => (
              <span
                key={s.thesis_id}
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full border',
                  s.momentum === 'rising'
                    ? 'text-green border-green/30 bg-green/5'
                    : s.momentum === 'falling'
                      ? 'text-red border-red/30 bg-red/5'
                      : 'text-text-tertiary border-border/60 bg-elevated/60'
                )}
              >
                {s.thesis_name.split(' ').slice(0, 2).join(' ')}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <div className="mt-10 rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
          <p className="text-text-primary text-sm font-semibold mb-1.5">
            Market<span className="text-accent">Mind</span>
          </p>
          <p className="text-text-secondary text-xs leading-relaxed max-w-md mx-auto mb-5">
            Runs entirely locally. Reads SEC filings and news daily, scores them against your
            investment theses, and builds a corpus that compounds over time. Zero API costs.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Sign in for live data
            <ArrowUpRight size={13} />
          </Link>
        </div>

        {/* ── Quiet footer note ─────────────────────────────────── */}
        <p className="text-text-tertiary/50 text-[11px] text-center mt-8 pb-4">
          Sample data · Real data is generated daily from SEC filings and financial news · No API costs
        </p>

      </div>
    </DemoShell>
  )
}
