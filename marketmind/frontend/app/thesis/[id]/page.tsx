'use client'

import { useEffect, useState, use } from 'react'
import { ArrowLeft, RefreshCw, AlertCircle, TrendingUp, Minus, TrendingDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { getThesis, getThesisEvidence } from '@/lib/api'
import { formatConfidence, formatDate, cn } from '@/lib/utils'
import type { ThesisOut, EvidenceOut } from '@/lib/types'

const SENTIMENT_CONFIG = {
  supporting: { label: 'Supporting', color: 'text-green',  bg: 'bg-green/10'  },
  opposing:   { label: 'Opposing',   color: 'text-red',    bg: 'bg-red/10'    },
  neutral:    { label: 'Neutral',    color: 'text-text-tertiary', bg: 'bg-elevated' },
}

export default function ThesisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [thesis,   setThesis]   = useState<ThesisOut | null>(null)
  const [evidence, setEvidence] = useState<EvidenceOut[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState<'all' | 'supporting' | 'opposing' | 'neutral'>('all')

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([getThesis(id), getThesisEvidence(id, 100)])
      .then(([t, e]) => { setThesis(t); setEvidence(e) })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load.'))
      .finally(() => setLoading(false))
  }, [id])

  const filtered = filter === 'all'
    ? evidence
    : evidence.filter(e => e.sentiment === filter)

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto px-8 py-8">

        {/* Back */}
        <Link
          href="/thesis"
          className="inline-flex items-center gap-1.5 text-text-tertiary text-sm hover:text-text-secondary mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Theses
        </Link>

        {loading && (
          <div className="flex items-center justify-center h-48">
            <RefreshCw size={16} className="text-text-tertiary animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {!loading && !error && thesis && (
          <>
            {/* Thesis header */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
                  {thesis.name}
                </h1>
                {thesis.is_system && (
                  <span className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full shrink-0 mt-1">
                    System
                  </span>
                )}
              </div>
              {thesis.description && (
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                  {thesis.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 py-4 border-y border-border">
                <div>
                  <div className="text-text-primary text-xl font-semibold tabular-nums">
                    {formatConfidence(thesis.confidence)}
                  </div>
                  <div className="text-text-tertiary text-xs">confidence</div>
                </div>
                <div>
                  <div className="text-text-primary text-xl font-semibold tabular-nums">
                    {thesis.evidence_count}
                  </div>
                  <div className="text-text-tertiary text-xs">total signals</div>
                </div>
                <div>
                  <div className="text-green text-xl font-semibold tabular-nums">
                    {thesis.supporting_count}
                  </div>
                  <div className="text-text-tertiary text-xs">supporting</div>
                </div>
                <div>
                  <div className="text-red text-xl font-semibold tabular-nums">
                    {thesis.opposing_count}
                  </div>
                  <div className="text-text-tertiary text-xs">opposing</div>
                </div>
              </div>

              {/* Confidence bar */}
              {thesis.evidence_count > 0 && (
                <div className="mt-4 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green/60 rounded-full"
                    style={{ width: `${thesis.confidence * 100}%` }}
                  />
                </div>
              )}

              {/* Keywords */}
              {thesis.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {thesis.keywords.map(kw => (
                    <span key={kw} className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-md">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence */}
            <div>
              {/* Filter tabs */}
              <div className="flex items-center gap-1 mb-4">
                {(['all', 'supporting', 'opposing', 'neutral'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                      filter === f
                        ? 'bg-elevated text-text-primary'
                        : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated/50'
                    )}
                  >
                    {f === 'all' ? `All (${evidence.length})` : (
                      f === 'supporting' ? `Supporting (${thesis.supporting_count})` :
                      f === 'opposing'   ? `Opposing (${thesis.opposing_count})` :
                      `Neutral (${evidence.filter(e => e.sentiment === 'neutral').length})`
                    )}
                  </button>
                ))}
              </div>

              {/* Evidence list */}
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-text-tertiary text-sm">
                  No evidence found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(ev => {
                    const s = SENTIMENT_CONFIG[ev.sentiment]
                    return (
                      <div
                        key={ev.id}
                        className="bg-surface border border-border rounded-xl p-4 animate-fade-in"
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.color, s.bg)}>
                              {s.label}
                            </span>
                            <span className="text-text-tertiary text-xs">
                              {ev.source_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ev.document_date && (
                              <span className="text-text-tertiary text-xs">
                                {formatDate(ev.document_date)}
                              </span>
                            )}
                            {ev.source_url && (
                              <a
                                href={ev.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-text-tertiary hover:text-accent transition-colors"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Excerpt */}
                        <p className="text-text-secondary text-sm leading-relaxed">
                          {ev.excerpt}
                        </p>

                        {/* Score */}
                        <div className="mt-2 text-right">
                          <span className="text-text-tertiary text-xs tabular-nums">
                            score {ev.score.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
