'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Building2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { getCompany } from '@/lib/api'
import { cn, formatDateShort } from '@/lib/utils'
import { spring } from '@/lib/motion'
import { SectionLabel } from '@/components/SectionLabel'
import type { CompanyDetail, CompanyEvidenceItem, CompanyThesisBreakdown } from '@/lib/types'

// ── Verdict ───────────────────────────────────────────────────────────────────

type SignalStrength = 'STRONG' | 'MODERATE' | 'THIN' | 'NOISE'
type ConsensusState = 'ACCELERATING' | 'WIDENING' | 'EMERGING' | 'STEADY'

interface VerdictResult {
  signal_strength: SignalStrength
  consensus: ConsensusState
  sentence: string
}

function deriveVerdict(data: CompanyDetail): VerdictResult {
  const { doc_count, weekly_counts, thesis_breakdown, evidence } = data
  const latest  = weekly_counts[weekly_counts.length - 1] ?? 0
  const prev    = weekly_counts[weekly_counts.length - 2] ?? 0
  const thesisCount = thesis_breakdown.length
  const supporting  = evidence.filter(e => e.sentiment === 'supporting').length
  const supportRate = evidence.length > 0 ? supporting / evidence.length : 0

  let signal_strength: SignalStrength
  if (doc_count >= 20 && latest > 0)         signal_strength = 'STRONG'
  else if (doc_count >= 8 || thesisCount >= 2) signal_strength = 'MODERATE'
  else if (doc_count >= 3)                   signal_strength = 'THIN'
  else                                       signal_strength = 'NOISE'

  let consensus: ConsensusState
  if (latest >= 2 && prev > 0 && latest >= prev * 2) consensus = 'ACCELERATING'
  else if (thesisCount >= 3)                         consensus = 'WIDENING'
  else if (doc_count <= 8 && latest > 0)             consensus = 'EMERGING'
  else                                               consensus = 'STEADY'

  const name = data.display_name
  const tp   = thesisCount === 1 ? 'theme' : 'themes'
  const sp   = Math.round(supportRate * 100)
  let sentence: string

  if (signal_strength === 'STRONG' && consensus === 'ACCELERATING') {
    sentence = `${name} is accelerating — ${latest} docs this week with ${sp}% support rate across ${thesisCount} investment ${tp}.`
  } else if (signal_strength === 'STRONG' && consensus === 'WIDENING') {
    sentence = `${name} has broad coverage across ${thesisCount} investment ${tp} with a ${doc_count}-doc corpus and ${sp}% support rate.`
  } else if (signal_strength === 'STRONG') {
    sentence = `${name} has built a strong ${doc_count}-doc corpus signal with ${sp}% of evidence supporting the thesis.`
  } else if (signal_strength === 'MODERATE' && consensus === 'ACCELERATING') {
    sentence = `${name} is an emerging signal — activity up ${prev > 0 ? `${Math.round(latest / prev)}×` : 'sharply'} this week across ${thesisCount} investment ${tp}.`
  } else if (signal_strength === 'MODERATE' && consensus === 'WIDENING') {
    sentence = `Signal for ${name} is widening — appearing across ${thesisCount} investment ${tp} with ${doc_count} source documents.`
  } else if (signal_strength === 'MODERATE') {
    sentence = `${name} has a moderate corpus signal with ${doc_count} docs across ${thesisCount} investment ${tp}.`
  } else if (signal_strength === 'THIN') {
    sentence = `${name} is on the radar with a thin signal — ${doc_count} docs. Watch for follow-through.`
  } else {
    sentence = `${name} has ${doc_count} corpus ${doc_count === 1 ? 'mention' : 'mentions'} — too early to assess signal strength.`
  }

  return { signal_strength, consensus, sentence }
}

const STRENGTH_CONFIG: Record<SignalStrength, { label: string; containerClass: string; dotClass: string; labelClass: string }> = {
  STRONG:   { label: 'Strong signal',   containerClass: 'border-green/20 bg-green/[0.06]',   dotClass: 'bg-green',         labelClass: 'text-green' },
  MODERATE: { label: 'Moderate signal', containerClass: 'border-accent/20 bg-accent/[0.06]', dotClass: 'bg-accent',        labelClass: 'text-accent' },
  THIN:     { label: 'Thin signal',     containerClass: 'border-amber/20 bg-amber/[0.06]',   dotClass: 'bg-amber',         labelClass: 'text-amber' },
  NOISE:    { label: 'Low signal',      containerClass: 'border-border/60 bg-elevated',      dotClass: 'bg-text-tertiary', labelClass: 'text-text-tertiary' },
}
const CONSENSUS_LABEL: Record<ConsensusState, string> = {
  ACCELERATING: 'Accelerating',
  WIDENING:     'Widening',
  EMERGING:     'Emerging',
  STEADY:       'Steady',
}

function VerdictCard({ data }: { data: CompanyDetail }) {
  const { signal_strength, consensus, sentence } = deriveVerdict(data)
  const { label, containerClass, dotClass, labelClass } = STRENGTH_CONFIG[signal_strength]

  return (
    <div className={cn('rounded-xl border p-4', containerClass)}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
        <span className={cn('text-[11px] font-bold uppercase tracking-wider', labelClass)}>{label}</span>
        <span className="text-text-tertiary/50 text-[10px]">·</span>
        <span className="text-[11px] text-text-tertiary font-semibold">{CONSENSUS_LABEL[consensus]}</span>
      </div>
      <p className="text-text-primary text-sm leading-relaxed font-medium">
        {sentence}
      </p>
    </div>
  )
}

// ── 4-week bar chart ──────────────────────────────────────────────────────────

function TrajectoryChart({ counts }: { counts: number[] }) {
  if (!counts || counts.length === 0) return null
  const max = Math.max(...counts, 1)
  const labels = ['3w ago', '2w ago', '1w ago', 'This wk']

  return (
    <div className="flex items-end gap-1.5 h-14">
      {counts.map((v, i) => {
        const pct = (v / max) * 100
        const isLatest = i === counts.length - 1
        const prev = counts[i - 1] ?? 0
        const rising = v > prev
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-text-tertiary tabular-nums">{v}</span>
            <div className="w-full relative flex items-end" style={{ height: '36px' }}>
              <div
                className={cn(
                  'w-full rounded-sm transition-all duration-500',
                  isLatest
                    ? rising ? 'bg-green/60' : v === prev ? 'bg-accent/40' : 'bg-red/40'
                    : 'bg-border/60'
                )}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span className="text-[8px] text-text-tertiary/70 truncate w-full text-center">{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sentiment badge ───────────────────────────────────────────────────────────

function SentimentDot({ sentiment }: { sentiment: string }) {
  if (sentiment === 'supporting') return <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0 mt-1" />
  if (sentiment === 'opposing')   return <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0 mt-1" />
  return <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0 mt-1" />
}

// ── Thesis exposure card ──────────────────────────────────────────────────────

function ThesisCard({ td }: { td: CompanyThesisBreakdown }) {
  const total = td.supporting + td.opposing
  const confPct = total > 0 ? Math.round((td.supporting / total) * 100) : null

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <p className="text-text-secondary text-xs leading-snug flex-1">{td.thesis_name}</p>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-text-tertiary text-[11px] tabular-nums">{td.doc_count} docs</span>
        {confPct !== null && (
          <span className={cn(
            'text-[11px] font-semibold tabular-nums w-9 text-right',
            confPct >= 60 ? 'text-green' : confPct >= 40 ? 'text-amber' : 'text-red'
          )}>
            {confPct}%
          </span>
        )}
      </div>
    </div>
  )
}

// ── Evidence row ──────────────────────────────────────────────────────────────

function EvidenceRow({ ev }: { ev: CompanyEvidenceItem }) {
  return (
    <div className="flex gap-2.5 py-3 border-b border-border/50 last:border-0">
      <SentimentDot sentiment={ev.sentiment} />
      <div className="flex-1 min-w-0">
        <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-3">{ev.excerpt}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-text-tertiary text-[10px] truncate max-w-[120px]">{ev.source_name}</span>
          {ev.document_date && (
            <span className="text-text-tertiary text-[10px]">{formatDateShort(ev.document_date)}</span>
          )}
          <span className="text-text-tertiary/50 text-[10px] bg-elevated px-1.5 py-0.5 rounded-full">{ev.thesis_name}</span>
          {ev.source_url && (
            <a
              href={ev.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent text-[10px] hover:underline flex items-center gap-0.5 ml-auto"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function CompanyPanel({ demoMode = false }: { demoMode?: boolean }) {
  const { selectedCompany, closeCompany } = useCompany()
  const [data, setData]       = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const panelRef              = useRef<HTMLDivElement>(null)

  // Fetch company data whenever selected changes
  useEffect(() => {
    if (!selectedCompany) {
      // Preserve data during exit animation — cleared when next company loads
      return
    }
    if (demoMode) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    getCompany(selectedCompany).then(d => {
      if (cancelled) return
      setData(d)
      setLoading(false)
    }).catch(e => {
      if (!cancelled) { setError(e.message); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [selectedCompany, demoMode])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCompany()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeCompany])

  const isOpen = !!selectedCompany

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={closeCompany}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={spring.standard}
            className="fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[95vw] bg-surface border-l border-border shadow-2xl flex flex-col"
          >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-elevated rounded animate-pulse" />
                <div className="h-3 w-20 bg-elevated rounded animate-pulse" />
              </div>
            ) : demoMode && selectedCompany ? (
              <h2 className="text-text-primary font-semibold text-base leading-tight truncate capitalize">
                {selectedCompany.replace(/-/g, ' ')}
              </h2>
            ) : data ? (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-text-primary font-semibold text-base leading-tight truncate">
                    {data.display_name}
                  </h2>
                  {data.ticker && (
                    <span className="text-accent text-xs font-mono font-semibold bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                      {data.ticker}
                    </span>
                  )}
                </div>
                <p className="text-text-tertiary text-xs mt-0.5">
                  {data.doc_count} docs · first seen {formatDateShort(data.first_seen)}
                </p>
              </>
            ) : (
              <div className="h-4 w-40 bg-elevated rounded" />
            )}
          </div>
          <button
            onClick={closeCompany}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Demo mode: no API call — prompt to sign in */}
          {demoMode && selectedCompany && (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Building2 size={22} className="text-accent" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold mb-1">
                  {selectedCompany.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <p className="text-text-tertiary text-xs leading-relaxed">
                  Company deep-dives show 4-week trajectory, thesis exposure breakdown,
                  and recent signals. Available with live data.
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
              >
                Sign in for live data
                <ArrowUpRight size={12} />
              </Link>
            </div>
          )}

          {loading && (
            <div className="p-5 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-elevated rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-5 text-center">
              <p className="text-text-tertiary text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="p-5 space-y-5">
              {/* ── Verdict — system speaks first ── */}
              <VerdictCard data={data} />

              {/* 4-week trajectory — visual proof of verdict */}
              <TrajectoryChart counts={data.weekly_counts} />

              {/* Thesis exposure */}
              {data.thesis_breakdown.length > 0 && (
                <div>
                  <SectionLabel className="mb-2">Thesis exposure</SectionLabel>
                  <div>
                    {data.thesis_breakdown.map(td => (
                      <ThesisCard key={td.thesis_id} td={td} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent signals — top 3 only */}
              {data.evidence.length > 0 && (
                <div>
                  <SectionLabel className="mb-3">Recent signals</SectionLabel>
                  <div>
                    {data.evidence.slice(0, 3).map(ev => (
                      <EvidenceRow key={ev.id} ev={ev} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
