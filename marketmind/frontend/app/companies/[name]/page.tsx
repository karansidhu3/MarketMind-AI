'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Activity } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { getCompany, getTrajectoryDetail } from '@/lib/api'
import { formatDateShort, cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import type { CompanyDetail, CompanyEvidenceItem, TrajectoryDetail } from '@/lib/types'

// ── ICR Sparkline — reused from signals page ──────────────────────────────────

function ICRSparkline({ series, inflecting }: { series: number[]; inflecting: boolean }) {
  const max   = Math.max(...series, 1)
  const BAR_W = 5
  const GAP   = 2
  const H     = 32

  if (series.every(v => v === 0)) {
    return (
      <div className="flex items-end gap-0.5" style={{ width: series.length * (BAR_W + GAP) - GAP, height: H }}>
        {series.map((_, i) => (
          <div key={i} className="bg-border/50 rounded-sm" style={{ width: BAR_W, height: 2 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-end" style={{ gap: GAP, height: H }}>
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
                : inflecting          ? 'bg-amber/25'
                                      : 'bg-accent/20',
            )}
            style={{ width: BAR_W, height: heightPx }}
            initial={{ scaleY: 0, originY: '100%' }}
            animate={{ scaleY: 1 }}
            transition={{ ...spring.gentle, delay: i * 0.025 }}
          />
        )
      })}
    </div>
  )
}

// ── 4-week doc trajectory (bar chart, always shown) ───────────────────────────

function DocTrajectory({ counts }: { counts: number[] }) {
  if (!counts || counts.length === 0) return null
  const max = Math.max(...counts, 1)
  const labels = counts.length === 4
    ? ['3w ago', '2w ago', '1w ago', 'This wk']
    : counts.map((_, i) => i === counts.length - 1 ? 'Now' : `${counts.length - 1 - i}w`)

  return (
    <div className="flex items-end gap-3 h-20">
      {counts.map((v, i) => {
        const pct = (v / max) * 100
        const isLatest = i === counts.length - 1
        const prev = counts[i - 1] ?? 0
        const rising = v > prev
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary tabular-nums font-medium">{v}</span>
            <div className="w-full relative flex items-end" style={{ height: 56 }}>
              <motion.div
                className={cn(
                  'w-full rounded-md',
                  isLatest
                    ? rising ? 'bg-green/55' : v === prev ? 'bg-accent/35' : 'bg-red/35'
                    : 'bg-border/40'
                )}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 3)}%` }}
                transition={{ ...spring.gentle, delay: i * 0.07 }}
              />
            </div>
            <span className="text-[9px] text-text-tertiary/60 truncate w-full text-center">
              {labels[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sentiment dot ─────────────────────────────────────────────────────────────

function SentimentDot({ sentiment }: { sentiment: string }) {
  if (sentiment === 'supporting') return <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0 mt-[3px]" />
  if (sentiment === 'opposing')   return <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0 mt-[3px]" />
  return <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0 mt-[3px]" />
}

// ── Evidence row ──────────────────────────────────────────────────────────────

function EvidenceRow({ ev }: { ev: CompanyEvidenceItem }) {
  return (
    <div className="flex gap-3 py-4 border-b border-border/50 last:border-0">
      <SentimentDot sentiment={ev.sentiment} />
      <div className="flex-1 min-w-0">
        <p className="text-text-secondary text-sm leading-relaxed">{ev.excerpt}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-text-tertiary text-xs">{ev.source_name}</span>
          {ev.document_date && (
            <span className="text-text-tertiary text-xs">{formatDateShort(ev.document_date)}</span>
          )}
          <span className="text-text-tertiary/60 text-xs bg-elevated px-2 py-0.5 rounded-full">
            {ev.thesis_name}
          </span>
          {ev.source_url && (
            <a
              href={ev.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent/70 hover:text-accent text-xs flex items-center gap-1 ml-auto transition-colors"
            >
              <ExternalLink size={10} />
              <span>Source</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-tertiary text-[11px] font-semibold uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────────

type SentimentFilter = 'all' | 'supporting' | 'opposing' | 'neutral'

function FilterChip({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-lg text-xs font-medium transition-all border',
        active
          ? 'bg-elevated text-text-primary border-border shadow-sm'
          : 'text-text-tertiary border-transparent hover:border-border/50 hover:text-text-secondary'
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn('ml-1.5 tabular-nums', active ? 'text-text-secondary' : 'text-text-tertiary/60')}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 animate-pulse">
      <div className="h-4 w-24 bg-elevated rounded mb-6" />
      <div className="h-7 w-52 bg-elevated rounded mb-2" />
      <div className="h-4 w-72 bg-elevated/70 rounded mb-8" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="h-28 bg-elevated rounded-2xl" />
        <div className="h-28 bg-elevated rounded-2xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-elevated rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const params = useParams()
  const router = useRouter()
  const normalisedName = decodeURIComponent(params.name as string)

  const [company,    setCompany]    = useState<CompanyDetail | null>(null)
  const [trajectory, setTrajectory] = useState<TrajectoryDetail | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filter,     setFilter]     = useState<SentimentFilter>('all')

  useEffect(() => {
    if (!normalisedName) return

    setLoading(true)
    setError(null)

    // Fetch company data + trajectory in parallel; trajectory may 404 (OK)
    Promise.all([
      getCompany(normalisedName),
      getTrajectoryDetail(normalisedName, 12).catch(() => null),
    ]).then(([co, traj]) => {
      setCompany(co)
      setTrajectory(traj)
    }).catch(e => {
      setError(e.message)
    }).finally(() => setLoading(false))
  }, [normalisedName])

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    )
  }

  if (error || !company) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 pt-12 text-center">
          <p className="text-text-tertiary text-sm mb-4">Company not found.</p>
          <button
            onClick={() => router.push('/signals')}
            className="text-accent text-sm hover:underline"
          >
            ← Back to Signal Map
          </button>
        </div>
      </AppShell>
    )
  }

  // Evidence filter
  const filteredEvidence = filter === 'all'
    ? company.evidence
    : company.evidence.filter(ev => ev.sentiment === filter)

  const sentimentCounts = {
    supporting: company.evidence.filter(ev => ev.sentiment === 'supporting').length,
    opposing:   company.evidence.filter(ev => ev.sentiment === 'opposing').length,
    neutral:    company.evidence.filter(ev => ev.sentiment === 'neutral').length,
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16">

        {/* ── Back nav ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-tertiary text-xs hover:text-text-secondary transition-colors mb-6 group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* ── Company header ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="mb-8"
        >
          <div className="flex items-start gap-3 mb-1">
            <h1 className="text-text-primary text-2xl font-bold tracking-tight leading-tight">
              {company.display_name}
            </h1>
            {company.ticker && (
              <span className="text-accent text-sm font-mono font-semibold bg-accent/10 border border-accent/15 px-2 py-1 rounded-lg shrink-0 mt-0.5">
                {company.ticker}
              </span>
            )}
          </div>
          <p className="text-text-tertiary text-sm">
            {company.doc_count} source documents
            {company.thesis_breakdown.length > 0 && (
              <> · {company.thesis_breakdown.length} investment {company.thesis_breakdown.length === 1 ? 'theme' : 'themes'}</>
            )}
            {' · '}first seen {formatDateShort(company.first_seen)}
          </p>
        </motion.div>

        {/* ── Two-column top section ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

          {/* ICR card */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.05 }}
            className="bg-surface border border-border rounded-2xl p-4"
            style={{ boxShadow: 'var(--c-shadow-sm)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity size={13} className="text-accent" strokeWidth={2} />
              <SectionLabel>Independent Citation Rate</SectionLabel>
            </div>

            {trajectory && trajectory.icr_current > 0 ? (
              <>
                <div className="flex items-end gap-4 mb-3">
                  <div>
                    <div className="text-text-primary text-3xl font-bold tabular-nums leading-none">
                      {trajectory.icr_current}
                    </div>
                    <div className="text-text-tertiary text-xs mt-1">this week</div>
                  </div>
                  <div className="pb-0.5">
                    <div className="text-text-secondary text-sm tabular-nums font-medium">
                      {trajectory.icr_4w_avg.toFixed(1)}
                    </div>
                    <div className="text-text-tertiary text-xs">4w avg</div>
                  </div>
                  {trajectory.is_inflecting && (
                    <span className="text-amber text-[11px] font-semibold bg-amber/10 border border-amber/25 px-2 py-1 rounded-full leading-none self-end mb-0.5">
                      Accelerating
                    </span>
                  )}
                </div>
                <ICRSparkline series={trajectory.icr_series} inflecting={trajectory.is_inflecting} />
                <p className="text-text-tertiary/60 text-[10px] mt-2">
                  Independent filers per week · PRIMARY_DISCLOSURE only
                </p>
              </>
            ) : (
              <div className="py-2">
                <ICRSparkline
                  series={Array.from({ length: 12 }, () => 0)}
                  inflecting={false}
                />
                <p className="text-text-tertiary text-xs mt-3 leading-relaxed">
                  ICR accumulates from daily ingestion runs.
                  Data available after the next 6am PT run.
                </p>
              </div>
            )}
          </motion.div>

          {/* Corpus trajectory card */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.08 }}
            className="bg-surface border border-border rounded-2xl p-4"
            style={{ boxShadow: 'var(--c-shadow-sm)' }}
          >
            <SectionLabel>Corpus trajectory</SectionLabel>
            <DocTrajectory counts={company.weekly_counts} />
            <p className="text-text-tertiary/60 text-[10px] mt-2">
              Docs added per week across all themes
            </p>
          </motion.div>
        </div>

        {/* ── Thesis exposure ── */}
        {company.thesis_breakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.1 }}
            className="bg-surface border border-border rounded-2xl p-4 mb-6"
            style={{ boxShadow: 'var(--c-shadow-sm)' }}
          >
            <SectionLabel>Thesis exposure</SectionLabel>
            <div>
              {company.thesis_breakdown.map(td => (
                <div
                  key={td.thesis_id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0"
                >
                  <p className="text-text-secondary text-sm flex-1 leading-snug">{td.thesis_name}</p>
                  <span className="text-text-tertiary text-xs tabular-nums shrink-0">
                    {td.doc_count} docs
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Evidence ── */}
        {company.evidence.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.13 }}
            className="bg-surface border border-border rounded-2xl p-4"
            style={{ boxShadow: 'var(--c-shadow-sm)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Evidence trail</SectionLabel>
              <div className="flex items-center gap-1">
                <FilterChip
                  label="All"
                  active={filter === 'all'}
                  count={company.evidence.length}
                  onClick={() => setFilter('all')}
                />
                {sentimentCounts.supporting > 0 && (
                  <FilterChip
                    label="Supporting"
                    active={filter === 'supporting'}
                    count={sentimentCounts.supporting}
                    onClick={() => setFilter('supporting')}
                  />
                )}
                {sentimentCounts.opposing > 0 && (
                  <FilterChip
                    label="Opposing"
                    active={filter === 'opposing'}
                    count={sentimentCounts.opposing}
                    onClick={() => setFilter('opposing')}
                  />
                )}
              </div>
            </div>

            <div>
              {filteredEvidence.map(ev => (
                <EvidenceRow key={ev.id} ev={ev} />
              ))}
              {filteredEvidence.length === 0 && (
                <p className="text-text-tertiary text-sm py-6 text-center">
                  No {filter} evidence found.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {company.evidence.length === 0 && (
          <div className="text-center py-10">
            <p className="text-text-tertiary text-sm">No evidence found for this entity.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
