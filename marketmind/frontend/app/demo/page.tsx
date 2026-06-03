'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, TrendingUp, ArrowUpRight, Info } from 'lucide-react'
import Link from 'next/link'
import DemoShell from '@/components/layout/DemoShell'
import { useCompany } from '@/contexts/CompanyContext'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { DEMO_TRAJECTORIES } from './data'
import type { TrajectoryRow } from '@/lib/types'

// ── ICR Sparkline — 12-week bar chart ─────────────────────────────────────────

function ICRSparkline({ series, inflecting }: { series: number[]; inflecting: boolean }) {
  const max    = Math.max(...series, 1)
  const BAR_W  = 4
  const BAR_GAP = 2
  const H      = 28

  if (series.every(v => v === 0)) {
    return (
      <div className="flex items-end gap-0.5" style={{ width: series.length * (BAR_W + BAR_GAP) - BAR_GAP, height: H }}>
        {series.map((_, i) => (
          <div key={i} className="bg-border/60 rounded-sm" style={{ width: BAR_W, height: 2, alignSelf: 'flex-end' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-end gap-0.5" style={{ height: H }}>
      {series.map((v, i) => {
        const isCurrent = i === series.length - 1
        const heightPx  = Math.max(v === 0 ? 0 : 2, Math.round((v / max) * H))
        return (
          <motion.div
            key={i}
            className={cn(
              'rounded-sm',
              isCurrent && inflecting ? 'bg-amber'
                : isCurrent           ? 'bg-accent'
                : inflecting          ? 'bg-amber/30'
                                      : 'bg-accent/25',
            )}
            style={{ width: BAR_W, height: heightPx }}
            initial={{ scaleY: 0, originY: '100%' }}
            animate={{ scaleY: 1 }}
            transition={{ ...spring.gentle, delay: i * 0.03 }}
          />
        )
      })}
    </div>
  )
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({ row, index }: { row: TrajectoryRow; index: number }) {
  const { openCompany } = useCompany()

  const delta     = row.icr_current - Math.round(row.icr_4w_avg)
  const deltaStr  = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'
  const deltaColor = delta > 0 ? 'text-green' : delta < 0 ? 'text-red' : 'text-text-tertiary'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: index * 0.02 }}
      className={cn(
        'group flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0',
        'hover:bg-elevated/60 transition-colors cursor-default',
        row.is_inflecting && 'bg-amber/[0.025]'
      )}
    >
      {/* Rank */}
      <span className="text-text-tertiary text-[11px] tabular-nums w-5 text-right shrink-0 font-medium">
        {index + 1}
      </span>

      {/* Sparkline */}
      <div className="shrink-0">
        <ICRSparkline series={row.icr_series} inflecting={row.is_inflecting} />
      </div>

      {/* Company */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openCompany(row.normalised_name)}
            className="text-text-primary text-sm font-semibold leading-snug hover:text-accent transition-colors text-left"
          >
            {row.display_name}
          </button>
          {row.ticker && (
            <span className="text-text-tertiary text-[11px] font-mono shrink-0">{row.ticker}</span>
          )}
          {row.is_inflecting && (
            <span className="text-amber text-[10px] font-semibold bg-amber/10 border border-amber/25 px-1.5 py-0.5 rounded-full leading-none shrink-0">
              Accelerating
            </span>
          )}
        </div>
      </div>

      {/* ICR stats */}
      <div className="shrink-0 flex items-center gap-5">
        <div className="text-right">
          <div className="text-text-primary text-sm font-bold tabular-nums leading-tight">
            {row.icr_current}
          </div>
          <div className="text-text-tertiary text-[10px] leading-tight">this week</div>
        </div>
        <div className="text-right w-8">
          <div className={cn('text-xs font-semibold tabular-nums leading-tight', deltaColor)}>
            {deltaStr}
          </div>
          <div className="text-text-tertiary text-[10px] leading-tight">vs avg</div>
        </div>
        <div className="text-right w-10 hidden sm:block">
          <div className="text-text-secondary text-xs tabular-nums leading-tight">
            {row.icr_4w_avg.toFixed(1)}
          </div>
          <div className="text-text-tertiary text-[10px] leading-tight">4w avg</div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border',
        active
          ? 'bg-elevated text-text-primary border-border shadow-sm'
          : 'text-text-tertiary border-transparent hover:border-border/60 hover:text-text-secondary hover:bg-elevated/50'
      )}
    >
      {label}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'accelerating'

export default function DemoPage() {
  const [filter,   setFilter]   = useState<Filter>('all')
  const [showInfo, setShowInfo] = useState(false)

  const filtered        = filter === 'accelerating'
    ? DEMO_TRAJECTORIES.filter(r => r.is_inflecting)
    : DEMO_TRAJECTORIES
  const inflectingCount = DEMO_TRAJECTORIES.filter(r => r.is_inflecting).length

  return (
    <DemoShell>
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-16">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Activity size={16} className="text-accent shrink-0" strokeWidth={2} />
              <h1 className="text-text-primary text-lg font-bold tracking-tight">Signal Map</h1>
            </div>
            <p className="text-text-tertiary text-xs leading-relaxed max-w-md">
              Independent companies citing each entity in primary SEC filings —
              ranked by weekly acceleration.
            </p>
          </div>
          <button
            onClick={() => setShowInfo(v => !v)}
            className={cn(
              'p-2 rounded-lg transition-colors border mt-0.5',
              showInfo
                ? 'bg-accent/8 border-accent/20 text-accent'
                : 'text-text-tertiary border-transparent hover:bg-elevated hover:border-border/60'
            )}
            title="How ICR works"
          >
            <Info size={14} />
          </button>
        </div>

        {/* ── ICR explainer (collapsible) ── */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={spring.gentle}
              className="overflow-hidden"
            >
              <div className="bg-accent/[0.04] border border-accent/10 rounded-2xl p-4">
                <p className="text-text-secondary text-xs leading-relaxed mb-3">
                  <span className="font-semibold text-text-primary">ICR</span> — Independent Citation Rate —
                  counts how many structurally independent companies referenced an entity
                  in primary SEC filings (8-K, 10-Q) each week.
                </p>
                <p className="text-text-tertiary text-xs leading-relaxed mb-3">
                  A company going <span className="font-mono text-accent">0 → 2 → 9</span> independent citations
                  over 8 weeks is a different category of signal from one mentioned
                  9 times in a single document. The former represents independent corroboration
                  across supply chains — a signal no search engine or LLM can surface
                  without a system that has been running and accumulating.
                </p>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-amber font-medium">
                    <span className="w-2 h-2 rounded-sm bg-amber inline-block" />
                    Accelerating — current ≥ 2× 4-week avg AND ≥ 3 citations
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filter bar ── */}
        <div className="flex items-center gap-1 mb-4">
          <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterChip
            label={`Accelerating · ${inflectingCount}`}
            active={filter === 'accelerating'}
            onClick={() => setFilter('accelerating')}
          />
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-5 pr-4 text-[10px] text-text-tertiary uppercase tracking-wide font-medium">
            <span className="w-28">12w ICR</span>
            <span className="w-12 text-right">Now</span>
            <span className="w-8 text-right">vs avg</span>
            <span className="w-10 text-right">4w avg</span>
          </div>
        </div>

        {/* ── Signal Map table ── */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--c-shadow-sm)' }}>
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border/60 bg-elevated/40">
            <span className="w-5 shrink-0" />
            <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-[72px] shrink-0">
              12-week
            </span>
            <span className="flex-1 text-text-tertiary text-[10px] font-medium uppercase tracking-wide">
              Company
            </span>
            <div className="flex items-center gap-5 shrink-0">
              <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-10 text-right">Now</span>
              <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-8 text-right">Δ avg</span>
              <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-10 text-right hidden sm:block">4w avg</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <TrendingUp size={20} className="text-text-tertiary mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-text-tertiary text-xs">No accelerating signals this week.</p>
            </div>
          ) : (
            <div>
              {filtered.map((row, i) => (
                <SignalRow key={row.normalised_name} row={row} index={i} />
              ))}
              <div className="px-4 py-2.5 border-t border-border/50 bg-elevated/30 flex items-center justify-between">
                <p className="text-text-tertiary text-[10px]">
                  {filtered.length} {filter === 'accelerating' ? 'accelerating' : ''} compan{filtered.length === 1 ? 'y' : 'ies'}
                </p>
                <p className="text-text-tertiary text-[10px]">
                  ICR = independent filers per week · PRIMARY_DISCLOSURE only
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="mt-10 rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
          <p className="text-text-primary text-sm font-semibold mb-1.5">
            Market<span className="text-accent">Mind</span>
          </p>
          <p className="text-text-secondary text-xs leading-relaxed max-w-md mx-auto mb-5">
            Runs entirely locally. Pulls SEC filings from ~60 curated tickers daily and
            tracks how many independent companies cite each entity week over week.
            The trajectory that emerges — when it started, how fast it grew, which companies
            are driving it — is a signal no terminal or LLM can surface without a system
            that has been running and accumulating.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Sign in for live data
            <ArrowUpRight size={13} />
          </Link>
        </div>

        {/* ── Footer note ── */}
        <p className="text-text-tertiary/50 text-[11px] text-center mt-8 pb-4">
          Sample data · Click any company to see its evidence trail · Real data accumulates from daily 6am PT ingestion
        </p>

      </div>
    </DemoShell>
  )
}
