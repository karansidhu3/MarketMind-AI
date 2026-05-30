'use client'

import { motion } from 'framer-motion'
import { Info, Eye, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import DemoShell from '@/components/layout/DemoShell'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { SectionLabel } from '@/components/SectionLabel'
import { spring } from '@/lib/motion'
import { formatDate, greet, cn } from '@/lib/utils'
import { DEMO_FEED, DEMO_RADAR, DEMO_NARRATIVES } from './data'

// ── Static unified narrative ──────────────────────────────────────────────────
// In production this streams from the LLM. In demo mode we serve it pre-rendered.

const DEMO_NARRATIVE_PARAS = [
  DEMO_FEED.summary,
  DEMO_NARRATIVES['demo-ai-infra'],
  DEMO_NARRATIVES['demo-semi-supply'],
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const signals      = DEMO_FEED.thesis_signals
  const risingThemes = signals.filter(s => s.momentum === 'rising')
  const fallingThemes = signals.filter(s => s.momentum === 'falling')

  return (
    <DemoShell>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8">

        {/* ── Demo notice ───────────────────────────────────────── */}
        <div className="flex items-start gap-3 rounded-xl border border-amber/25 bg-amber/5 px-4 py-3 mb-8">
          <Info size={14} className="text-amber shrink-0 mt-0.5" />
          <p className="text-text-secondary text-xs leading-relaxed flex-1">
            <span className="text-amber font-semibold">Demo mode — </span>
            pre-loaded sample data. Real data is generated daily from SEC filings and news feeds,
            scored against your investment theses by a local LLM. Nothing leaves your machine.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-1 text-xs text-accent font-medium hover:underline shrink-0 mt-0.5"
          >
            Sign in <ArrowUpRight size={11} />
          </Link>
        </div>

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

        {/* ── Date ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
        >
          <p className="text-text-tertiary text-xs mb-6">
            {formatDate(DEMO_FEED.feed_date)}
          </p>
        </motion.div>

        {/* ── Watch callout ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.06 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-xl border border-accent/25 bg-accent/[0.06]">
            <Eye size={13} className="text-accent shrink-0" />
            <p className="text-text-primary text-sm font-medium flex-1">
              Vertiv Holdings is accelerating — activity up 2× this week across 2 investment themes.
            </p>
          </div>
        </motion.div>

        {/* ── Narrative — full width ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.12 }}
          className="py-1"
        >
          <p className="text-text-tertiary text-[11px] mb-5">
            {signals.length} theme{signals.length !== 1 ? 's' : ''}
            {risingThemes.length > 0 && (
              <span className="text-green ml-1.5">· {risingThemes.length} rising</span>
            )}
            {fallingThemes.length > 0 && (
              <span className="text-red ml-1.5">· {fallingThemes.length} fading</span>
            )}
          </p>

          <div className="space-y-4">
            {DEMO_NARRATIVE_PARAS.map((para, i) => (
              <p key={i} className="text-text-secondary text-[15px] leading-relaxed">
                {para}
              </p>
            ))}
          </div>

          {/* Theme pill tags */}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
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

        {/* ── Radar — full width, below narrative ───────────────── */}
        <section className="mt-10 pt-8 border-t border-border/40">
          <SectionLabel className="mb-4">Company radar</SectionLabel>
          <CompanyRadar companies={DEMO_RADAR.slice(0, 10)} initialAlerts={[]} />
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <div className="mt-10 rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
          <p className="text-text-primary text-sm font-semibold mb-1.5">
            Market<span className="text-accent">Mind</span>
          </p>
          <p className="text-text-secondary text-xs leading-relaxed max-w-md mx-auto mb-5">
            Runs entirely locally. Reads SEC filings and news daily, scores them against your
            investment theses, and builds a corpus that compounds over time.
            Zero API costs.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Sign in for live data
            <ArrowUpRight size={13} />
          </Link>
        </div>

      </div>
    </DemoShell>
  )
}
