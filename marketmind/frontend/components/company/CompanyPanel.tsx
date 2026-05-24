'use client'

import { useEffect, useState, useRef } from 'react'
import { X, ExternalLink, TrendingUp, TrendingDown, Minus, Calendar, FileText, Building2 } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'
import { getCompany } from '@/lib/api'
import { cn, formatDateShort } from '@/lib/utils'
import type { CompanyDetail, CompanyEvidenceItem, CompanyThesisBreakdown } from '@/lib/types'

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
    <div className="bg-elevated rounded-xl p-3 border border-border/60">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-text-primary text-xs font-medium leading-snug flex-1">{td.thesis_name}</p>
        {confPct !== null && (
          <span className={cn(
            'text-[11px] font-semibold tabular-nums shrink-0',
            confPct >= 60 ? 'text-green' : confPct >= 40 ? 'text-amber' : 'text-red'
          )}>
            {confPct}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
        <span className="tabular-nums">{td.doc_count}d</span>
        {total > 0 && (
          <>
            <span className="text-green font-medium">{td.supporting}↑</span>
            <span className="text-red font-medium">{td.opposing}↓</span>
          </>
        )}
      </div>
      {/* Mini sentiment bar */}
      {total > 0 && (
        <div className="mt-2 h-[2px] bg-border/40 rounded-full overflow-hidden flex">
          <div className="h-full bg-green/50" style={{ width: `${(td.supporting / total) * 100}%` }} />
          <div className="h-full bg-red/50" style={{ width: `${(td.opposing / total) * 100}%` }} />
        </div>
      )}
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

export default function CompanyPanel() {
  const { selectedCompany, closeCompany } = useCompany()
  const [data, setData]       = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const panelRef              = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence'>('overview')

  // Fetch company data whenever selected changes
  useEffect(() => {
    if (!selectedCompany) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setActiveTab('overview')
    getCompany(selectedCompany)
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [selectedCompany])

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
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeCompany}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[95vw]',
          'bg-surface border-l border-border shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-elevated rounded animate-pulse" />
                <div className="h-3 w-20 bg-elevated rounded animate-pulse" />
              </div>
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

        {/* ── Tabs ── */}
        <div className="flex gap-0 border-b border-border shrink-0">
          {(['overview', 'evidence'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium capitalize transition-colors duration-150',
                activeTab === tab
                  ? 'text-text-primary border-b-2 border-accent -mb-px'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              {tab}
              {tab === 'evidence' && data && (
                <span className="ml-1 text-[10px] text-text-tertiary">({data.evidence.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-5 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-elevated rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-5 text-center">
              <p className="text-text-tertiary text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && data && activeTab === 'overview' && (
            <div className="p-5 space-y-5">
              {/* 4-week trajectory */}
              <div>
                <h3 className="text-text-tertiary text-[10px] uppercase tracking-wider font-semibold mb-3">
                  4-week activity
                </h3>
                <TrajectoryChart counts={data.weekly_counts} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-elevated rounded-xl p-3 text-center">
                  <div className="text-text-primary font-bold text-lg tabular-nums">{data.doc_count}</div>
                  <div className="text-text-tertiary text-[10px] uppercase tracking-wide">docs</div>
                </div>
                <div className="bg-elevated rounded-xl p-3 text-center">
                  <div className="text-text-primary font-bold text-lg tabular-nums">{data.mention_count}</div>
                  <div className="text-text-tertiary text-[10px] uppercase tracking-wide">mentions</div>
                </div>
                <div className="bg-elevated rounded-xl p-3 text-center">
                  <div className="text-text-primary font-bold text-lg tabular-nums">
                    {data.thesis_breakdown.length}
                  </div>
                  <div className="text-text-tertiary text-[10px] uppercase tracking-wide">theses</div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-xs text-text-tertiary">
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  <span>First: {formatDateShort(data.first_seen)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  <span>Last: {formatDateShort(data.last_seen)}</span>
                </div>
              </div>

              {/* Thesis breakdown */}
              {data.thesis_breakdown.length > 0 && (
                <div>
                  <h3 className="text-text-tertiary text-[10px] uppercase tracking-wider font-semibold mb-3">
                    Thesis exposure ({data.thesis_breakdown.length})
                  </h3>
                  <div className="space-y-2">
                    {data.thesis_breakdown.map(td => (
                      <ThesisCard key={td.thesis_id} td={td} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top evidence preview (first 3) */}
              {data.evidence.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-text-tertiary text-[10px] uppercase tracking-wider font-semibold">
                      Recent signals
                    </h3>
                    <button
                      onClick={() => setActiveTab('evidence')}
                      className="text-accent text-[10px] hover:underline"
                    >
                      View all {data.evidence.length} →
                    </button>
                  </div>
                  <div>
                    {data.evidence.slice(0, 3).map(ev => (
                      <EvidenceRow key={ev.id} ev={ev} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && data && activeTab === 'evidence' && (
            <div className="p-5">
              <h3 className="text-text-tertiary text-[10px] uppercase tracking-wider font-semibold mb-3">
                {data.evidence.length} evidence records
              </h3>
              <div>
                {data.evidence.map(ev => (
                  <EvidenceRow key={ev.id} ev={ev} />
                ))}
              </div>
              {data.evidence.length === 0 && (
                <p className="text-text-tertiary text-xs text-center py-8">No evidence records yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
