'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, TrendingUp, Info } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { getTopTrajectories } from '@/lib/api'
import { useCompany } from '@/contexts/CompanyContext'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { TrajectoryRow } from '@/lib/types'

// ── ICR Sparkline — 12-week bar chart ─────────────────────────────────────────

function ICRSparkline({ series, inflecting }: { series: number[]; inflecting: boolean }) {
  const max = Math.max(...series, 1)
  const BAR_W = 4
  const BAR_GAP = 2
  const H = 28

  if (series.every(v => v === 0)) {
    return (
      <div className="flex items-end gap-0.5" style={{ width: series.length * (BAR_W + BAR_GAP) - BAR_GAP, height: H }}>
        {series.map((_, i) => (
          <div
            key={i}
            className="bg-border/60 rounded-sm"
            style={{ width: BAR_W, height: 2, alignSelf: 'flex-end' }}
          />
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
              isCurrent && inflecting
                ? 'bg-amber'
                : isCurrent
                ? 'bg-accent'
                : inflecting
                ? 'bg-amber/30'
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

  const delta = row.icr_current - Math.round(row.icr_4w_avg)
  const deltaStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'
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
        {/* This week */}
        <div className="text-right">
          <div className="text-text-primary text-sm font-bold tabular-nums leading-tight">
            {row.icr_current}
          </div>
          <div className="text-text-tertiary text-[10px] leading-tight">this week</div>
        </div>

        {/* Delta vs avg */}
        <div className="text-right w-8">
          <div className={cn('text-xs font-semibold tabular-nums leading-tight', deltaColor)}>
            {deltaStr}
          </div>
          <div className="text-text-tertiary text-[10px] leading-tight">vs avg</div>
        </div>

        {/* 4w avg */}
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

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="py-16 px-6 text-center"
    >
      <div className="w-10 h-10 rounded-2xl bg-accent/8 border border-accent/12 flex items-center justify-center mx-auto mb-4">
        <Activity size={18} className="text-accent/70" />
      </div>
      <p className="text-text-primary text-sm font-semibold mb-1">No ICR data yet</p>
      <p className="text-text-tertiary text-xs leading-relaxed max-w-xs mx-auto">
        Independent Citation Rate accumulates from daily ingestion runs.
        New data arrives each morning at 6am PT — check back tomorrow.
      </p>
      <div className="mt-6 pt-5 border-t border-border/60 max-w-sm mx-auto text-left">
        <p className="text-text-tertiary text-[11px] font-medium mb-2 uppercase tracking-wide">How ICR works</p>
        <ul className="space-y-2 text-text-secondary text-xs leading-relaxed">
          <li className="flex gap-2">
            <span className="text-accent shrink-0 mt-0.5">·</span>
            Each morning, MarketMind pulls SEC filings from ~60 curated tickers
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0 mt-0.5">·</span>
            When Company A's 10-Q mentions Company B in a supply chain context, that's one citation
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0 mt-0.5">·</span>
            ICR counts how many structurally independent companies cited an entity this week
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0 mt-0.5">·</span>
            9 companies citing Vertiv is a different category of signal from 9 mentions in one filing
          </li>
        </ul>
      </div>
    </motion.div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
          <div className="w-5 h-3 bg-elevated rounded" />
          <div className="flex items-end gap-0.5 h-7">
            {Array.from({ length: 12 }).map((_, j) => (
              <div
                key={j}
                className="bg-elevated rounded-sm"
                style={{ width: 4, height: Math.random() * 24 + 2 }}
              />
            ))}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-elevated rounded w-32" />
            <div className="h-2.5 bg-elevated/60 rounded w-20" />
          </div>
          <div className="flex gap-5">
            <div className="text-right space-y-1">
              <div className="h-4 bg-elevated rounded w-6 ml-auto" />
              <div className="h-2 bg-elevated/60 rounded w-12" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-3 bg-elevated rounded w-5 ml-auto" />
              <div className="h-2 bg-elevated/60 rounded w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Filter chips ──────────────────────────────────────────────────────────────

type Filter = 'all' | 'accelerating'

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

export default function SignalsPage() {
  const [rows,    setRows]    = useState<TrajectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Filter>('all')
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    getTopTrajectories(12, 100)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'accelerating'
    ? rows.filter(r => r.is_inflecting)
    : rows

  const inflectingCount = rows.filter(r => r.is_inflecting).length

  return (
    <AppShell>
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
        {!loading && rows.length > 0 && (
          <div className="flex items-center gap-1 mb-4">
            <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterChip
              label={inflectingCount > 0 ? `Accelerating · ${inflectingCount}` : 'Accelerating'}
              active={filter === 'accelerating'}
              onClick={() => setFilter('accelerating')}
            />
            <div className="flex-1" />
            {/* Column labels */}
            <div className="hidden sm:flex items-center gap-5 pr-4 text-[10px] text-text-tertiary uppercase tracking-wide font-medium">
              <span className="w-28">12w ICR</span>
              <span className="w-12 text-right">Now</span>
              <span className="w-8 text-right">vs avg</span>
              <span className="w-10 text-right">4w avg</span>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--c-shadow-sm)' }}>
          {loading ? (
            <Skeleton />
          ) : filtered.length === 0 ? (
            filter === 'accelerating' ? (
              <div className="py-10 text-center">
                <TrendingUp size={20} className="text-text-tertiary mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-text-tertiary text-xs">No accelerating signals this week.</p>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <div>
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
                  <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-10 text-right">
                    Now
                  </span>
                  <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-8 text-right">
                    Δ avg
                  </span>
                  <span className="text-text-tertiary text-[10px] font-medium uppercase tracking-wide w-10 text-right hidden sm:block">
                    4w avg
                  </span>
                </div>
              </div>
              {/* Rows */}
              {filtered.map((row, i) => (
                <SignalRow key={row.normalised_name} row={row} index={i} />
              ))}
              {/* Footer */}
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
      </div>
    </AppShell>
  )
}
