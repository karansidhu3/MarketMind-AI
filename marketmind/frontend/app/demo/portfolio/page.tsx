'use client'

import { motion } from 'framer-motion'
import { ChevronRight, TrendingUp, Minus } from 'lucide-react'
import DemoShell from '@/components/layout/DemoShell'
import { SectionLabel } from '@/components/SectionLabel'
import { spring } from '@/lib/motion'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'
import { DEMO_GAPS, DEMO_HOLDINGS, type DemoGap, type DemoHolding } from '../data'

// ── Mini bar sparkline for gap rows — matches Signal Map bar language ──────────

function GapSparkline({ counts }: { counts: number[] }) {
  if (!counts || counts.length === 0 || counts.every(v => v === 0)) return null

  const max    = Math.max(...counts, 1)
  const latest = counts[counts.length - 1]
  const prev   = counts[counts.length - 2] ?? 0
  const surge  = latest >= prev * 2 && prev > 0

  return (
    <div className="flex items-end gap-0.5" style={{ height: 20 }}>
      {counts.map((v, i) => {
        const isCurrent = i === counts.length - 1
        const heightPx  = Math.max(v === 0 ? 0 : 2, Math.round((v / max) * 20))
        return (
          <div
            key={i}
            className={cn(
              'rounded-sm',
              isCurrent && surge  ? 'bg-accent'
                : isCurrent       ? 'bg-accent/60'
                                  : 'bg-border/60'
            )}
            style={{ width: 4, height: heightPx }}
          />
        )
      })}
    </div>
  )
}

// ── Gap row ────────────────────────────────────────────────────────────────────

function DemoGapRow({ gap, rank }: { gap: DemoGap; rank: number }) {
  const { openCompany } = useCompany()
  const surge = gap.weekly_counts[gap.weekly_counts.length - 1] >= gap.weekly_counts[gap.weekly_counts.length - 2] * 2

  return (
    <div
      className={cn(
        'relative group flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0',
        'hover:bg-elevated/50 transition-colors cursor-pointer',
        surge && 'bg-accent/[0.02]'
      )}
      onClick={() => openCompany(gap.normalised_name)}
    >
      <span className="text-text-tertiary text-[11px] tabular-nums w-4 shrink-0 text-right font-medium">
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-text-primary text-sm font-medium truncate group-hover:text-accent transition-colors">
            {gap.company_name}
          </span>
          <span className="text-accent text-[11px] font-mono shrink-0">{gap.ticker}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {gap.thesis_names.map(t => (
            <span key={t} className="text-text-tertiary text-[10px] bg-elevated px-1.5 py-0.5 rounded-md">
              {t.split(' ').slice(0, 2).join(' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Sparkline */}
      <div className="shrink-0 hidden sm:block">
        <GapSparkline counts={gap.weekly_counts} />
      </div>

      <div className="shrink-0 text-right">
        <div className="text-text-primary text-xs font-semibold tabular-nums">
          {gap.doc_count}
          <span className="text-text-tertiary font-normal ml-0.5 text-[10px]">docs</span>
        </div>
        <div className="text-red text-[10px] font-medium">Not held</div>
      </div>

      <ChevronRight size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}

// ── Holding row ────────────────────────────────────────────────────────────────

function DemoHoldingRow({ holding }: { holding: DemoHolding }) {
  const MomIcon = holding.momentum === 'rising' ? TrendingUp : Minus
  const momColor = holding.momentum === 'rising' ? 'text-green' : 'text-text-tertiary'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-accent font-mono font-bold text-sm w-12 shrink-0">{holding.ticker}</span>
      <div className="flex-1 min-w-0">
        <p className="text-text-secondary text-xs truncate">{holding.company_name}</p>
      </div>
      <div className="flex items-center flex-wrap gap-1 justify-end">
        <span className="text-text-tertiary text-[10px] bg-elevated px-1.5 py-0.5 rounded-md">
          {holding.thesis_names[0].split(' ').slice(0, 2).join(' ')}
        </span>
        {holding.thesis_names.length > 1 && (
          <span className="text-text-tertiary text-[10px] bg-elevated px-1.5 py-0.5 rounded-md">
            +{holding.thesis_names.length - 1}
          </span>
        )}
      </div>
      <div className={cn('flex items-center gap-0.5 shrink-0', momColor)}>
        <MomIcon size={10} />
        <span className="text-[10px] font-semibold tabular-nums">{holding.doc_count}d</span>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DemoPortfolioPage() {
  return (
    <DemoShell>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-text-primary font-serif-display text-3xl leading-tight">Portfolio</h1>
          <p className="text-text-tertiary text-xs mt-1">Ranked by exposure gap.</p>
        </div>

        <div className="max-w-3xl">

          {/* Narrative — pull quote with left accent border */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.04 }}
            className="border-l-2 border-accent/35 pl-5 py-1 mb-10"
          >
            <p className="text-text-primary text-xl font-serif-display leading-relaxed mb-2">
              Positioned in AI Infrastructure and Energy Grid. Vertiv Holdings has appeared
              in 23 independent documents across 2 of your investment themes — you have no exposure.
            </p>
            <p className="text-text-tertiary text-xs">
              <span className="text-amber tabular-nums mr-1">40% theme coverage</span>
              · {DEMO_HOLDINGS.length} positions
            </p>
          </motion.div>

          {/* Gap signals */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.1 }}
          >
            <SectionLabel className="mb-3">Gap signals</SectionLabel>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {DEMO_GAPS.map((gap, i) => (
                <motion.div
                  key={gap.normalised_name}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.gentle, delay: 0.12 + i * 0.04 }}
                >
                  <DemoGapRow gap={gap} rank={i + 1} />
                </motion.div>
              ))}
            </div>
            <p className="text-text-tertiary/60 text-[10px] mt-2 px-1">
              Companies with strong corpus signals not represented in your holdings ·
              Click any row to see trajectory and evidence
            </p>
          </motion.div>

          {/* Holdings */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...spring.gentle, delay: 0.3 }}
            className="mt-10"
          >
            <SectionLabel className="mb-3">Holdings — {DEMO_HOLDINGS.length} positions</SectionLabel>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {DEMO_HOLDINGS.map(h => (
                <DemoHoldingRow key={h.ticker} holding={h} />
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </DemoShell>
  )
}
