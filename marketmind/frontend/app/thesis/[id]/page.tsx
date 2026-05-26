'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, AlertCircle, ExternalLink,
  Search, ArrowRight, ArrowUpRight, TrendingUp, TrendingDown,
  ShieldAlert, GitCompare, Plus, Minus, Zap,
} from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { getThesis, getThesisEvidence, getSupplyChain, getConfidenceHistory, getLanguageDelta, evaluateThesis, research } from '@/lib/api'
import { formatConfidence, formatDate, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { ThesisOut, EvidenceOut, SupplyChainLink, ConfidenceSnapshot, LanguageDelta, ResearchResponse } from '@/lib/types'

// ── Sentiment config ──────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  supporting: { label: 'Supporting', color: 'text-green',         bg: 'bg-green/10'  },
  opposing:   { label: 'Opposing',   color: 'text-red',           bg: 'bg-red/10'    },
  neutral:    { label: 'Neutral',    color: 'text-text-tertiary', bg: 'bg-elevated'  },
}

const REL_CONFIG: Record<string, { label: string; color: string }> = {
  supplier: { label: 'Supplier',  color: 'text-amber' },
  customer: { label: 'Customer',  color: 'text-accent' },
  partner:  { label: 'Partner',   color: 'text-green'  },
}

// ── Confidence sparkline ──────────────────────────────────────────────────────

function Sparkline({ data }: { data: ConfidenceSnapshot[] }) {
  if (data.length < 2) return null

  const W = 160, H = 36, PAD = 3
  const values = data.map(d => d.confidence)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const range = hi - lo || 0.01

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD)
    const y = H - PAD - ((d.confidence - lo) / range) * (H - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const latest = values[values.length - 1]
  const first  = values[0]
  const up     = latest >= first

  return (
    <div className="flex items-center gap-2">
      <svg
        width={W}
        height={H}
        className={up ? 'text-green' : 'text-red'}
        style={{ overflow: 'visible' }}
      >
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dot at latest point */}
        <circle
          cx={parseFloat(pts[pts.length - 1].split(',')[0])}
          cy={parseFloat(pts[pts.length - 1].split(',')[1])}
          r={2.5}
          fill="currentColor"
        />
      </svg>
      <span className={cn('text-xs tabular-nums', up ? 'text-green' : 'text-red')}>
        {up ? <TrendingUp size={11} className="inline mr-0.5" /> : <TrendingDown size={11} className="inline mr-0.5" />}
        {Math.round(latest * 100)}%
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ThesisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()

  // Feed provenance: eids=<comma-separated evidence IDs> when navigating from feed
  const fromFeed    = searchParams.get('from') === 'feed'
  const feedEidSet  = new Set((searchParams.get('eids') ?? '').split(',').filter(Boolean))

  const [thesis,    setThesis]    = useState<ThesisOut | null>(null)
  const [evidence,  setEvidence]  = useState<EvidenceOut[]>([])
  const [history,   setHistory]   = useState<ConfidenceSnapshot[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // Ref map for scrolling to highlighted evidence cards
  const evidenceRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Evidence tab state — default to 'all' but auto-scroll to feed evidence if present
  const [filter,    setFilter]    = useState<'all' | 'supporting' | 'opposing' | 'neutral'>('all')

  // Main tab
  const [mainTab,   setMainTab]   = useState<'evidence' | 'supply-chain' | 'search'>('evidence')

  // Supply chain state
  const [scQuery,   setScQuery]   = useState('')
  const [scInput,   setScInput]   = useState('')
  const [scLinks,   setScLinks]   = useState<SupplyChainLink[]>([])
  const [scLoading, setScLoading] = useState(false)
  const [scError,   setScError]   = useState('')

  // Language delta state
  const [delta,        setDelta]        = useState<LanguageDelta | null>(null)
  const [deltaLoading, setDeltaLoading] = useState(false)
  const [deltaError,   setDeltaError]   = useState('')

  // Re-evaluate state
  const [evalRunning, setEvalRunning] = useState(false)
  const { toast } = useToast()

  // Corpus search state
  const [srQuery,   setSrQuery]   = useState('')
  const [srInput,   setSrInput]   = useState('')
  const [srResult,  setSrResult]  = useState<ResearchResponse | null>(null)
  const [srLoading, setSrLoading] = useState(false)
  const [srError,   setSrError]   = useState('')
  const [srElapsed, setSrElapsed] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      getThesis(id),
      getThesisEvidence(id, 100),
      getConfidenceHistory(id, 30),
    ])
      .then(([t, e, h]) => { setThesis(t); setEvidence(e); setHistory(h) })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load.'))
      .finally(() => setLoading(false))
  }, [id])

  // Auto-scroll to first feed-highlighted evidence card after load
  useEffect(() => {
    if (!fromFeed || feedEidSet.size === 0 || loading) return
    const firstId = [...feedEidSet][0]
    const el = evidenceRefs.current[firstId]
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [loading, fromFeed]) // eslint-disable-line react-hooks/exhaustive-deps

  async function searchSupplyChain(company: string) {
    const q = company.trim()
    if (!q) return
    setScQuery(q)
    setScError('')
    setScLoading(true)
    setScLinks([])
    try {
      const results = await getSupplyChain(q)
      setScLinks(results)
    } catch (e: unknown) {
      setScError(e instanceof Error ? e.message : 'Failed to fetch supply chain.')
    } finally {
      setScLoading(false)
    }
  }

  async function runEvaluate() {
    setEvalRunning(true)
    try {
      const res = await evaluateThesis(id)
      toast(res.message ?? 'Re-evaluation started in background', 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Evaluation failed', 'error')
    } finally {
      setEvalRunning(false)
    }
  }

  async function loadDelta() {
    setDeltaError('')
    setDeltaLoading(true)
    try {
      setDelta(await getLanguageDelta(id))
    } catch (e: unknown) {
      setDeltaError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setDeltaLoading(false)
    }
  }

  // Elapsed timer for corpus search
  useEffect(() => {
    if (!srLoading) { setSrElapsed(0); return }
    const t = setInterval(() => setSrElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [srLoading])

  async function runSearch(q?: string) {
    const query = (q ?? srInput).trim()
    if (!query || srLoading) return
    if (q) setSrInput(q)
    setSrQuery(query)
    setSrError('')
    setSrLoading(true)
    setSrResult(null)
    try {
      setSrResult(await research(query, undefined))
    } catch (e: unknown) {
      setSrError(e instanceof Error ? e.message : 'Search failed.')
    } finally {
      setSrLoading(false)
    }
  }

  const filtered = filter === 'all' ? evidence : evidence.filter(e => e.sentiment === filter)

  // Top opposing evidence (pinned counter-argument)
  const topOpposing = evidence
    .filter(e => e.sentiment === 'opposing')
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

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
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
                  {thesis.name}
                </h1>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  {thesis.is_system && (
                    <span className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full">
                      System
                    </span>
                  )}
                  <button
                    onClick={runEvaluate}
                    disabled={evalRunning}
                    title="Re-score all ingested documents against this thesis"
                    className={cn(
                      'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors',
                      evalRunning
                        ? 'text-text-tertiary bg-elevated cursor-not-allowed'
                        : 'text-text-secondary bg-elevated hover:text-text-primary hover:bg-elevated/80'
                    )}
                  >
                    {evalRunning
                      ? <><RefreshCw size={10} className="animate-spin" /> Running…</>
                      : <><RefreshCw size={10} /> Re-evaluate</>
                    }
                  </button>
                </div>
              </div>
              {thesis.description && (
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                  {thesis.description}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-6 py-4 border-y border-border">
                {thesis.evidence_count === 0 ? (
                  /* No evidence yet — replace stats with a clear "no data" indicator */
                  <div className="flex items-center gap-3 py-1">
                    <span className="text-amber text-sm font-medium">No signals yet</span>
                    <span className="text-text-tertiary text-xs">—</span>
                    <span className="text-text-tertiary text-xs">
                      Run corpus evaluation to score existing documents against this thesis
                    </span>
                  </div>
                ) : (
                  <>
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
                    {/* Confidence history sparkline (if data) */}
                    {history.length >= 2 && (
                      <div className="ml-auto flex flex-col items-end gap-0.5">
                        <Sparkline data={history} />
                        <span className="text-text-tertiary text-[10px]">30-day trend</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Confidence bar */}
              {thesis.evidence_count > 0 && (
                <div className="mt-4 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green/60 rounded-full transition-all duration-500"
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

            {/* ── Pinned counter-argument ────────────────────────────────── */}
            {topOpposing.length > 0 && (
              <div className="mb-6 rounded-xl border border-red/20 bg-red/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={13} className="text-red shrink-0" />
                  <span className="text-red text-xs font-semibold uppercase tracking-widest">
                    Counter-argument{topOpposing.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-text-tertiary text-xs ml-auto">
                    Strongest opposing signal{topOpposing.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {topOpposing.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-secondary text-sm leading-relaxed">
                          {ev.excerpt}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-text-tertiary text-xs">{ev.source_name}</span>
                          {ev.document_date && (
                            <span className="text-text-tertiary text-xs">· {formatDate(ev.document_date)}</span>
                          )}
                          <span className="text-text-tertiary text-xs tabular-nums ml-auto">
                            score {ev.score.toFixed(3)}
                          </span>
                        </div>
                      </div>
                      {ev.source_url && (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-tertiary hover:text-red transition-colors shrink-0 mt-0.5"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Language shift detector ───────────────────────────────── */}
            <div className="mb-6 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitCompare size={13} className="text-accent shrink-0" />
                  <span className="text-text-primary text-xs font-semibold">Language Shift</span>
                  <span className="text-text-tertiary text-xs">· 30-day vs prior 30-day</span>
                </div>
                {!delta && !deltaLoading && (
                  <button
                    onClick={loadDelta}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-elevated text-text-secondary hover:text-text-primary hover:bg-elevated/80 transition-colors"
                  >
                    <GitCompare size={11} />
                    Analyse
                  </button>
                )}
                {delta && !deltaLoading && (
                  <button
                    onClick={loadDelta}
                    className="text-text-tertiary text-xs hover:text-text-secondary transition-colors"
                  >
                    Refresh
                  </button>
                )}
              </div>

              {/* Idle state */}
              {!delta && !deltaLoading && !deltaError && (
                <p className="text-text-tertiary text-xs">
                  Click Analyse to compare language patterns across the last two 30-day windows.
                  Requires at least 2 signals in each window — check back as data accumulates.
                </p>
              )}

              {/* Loading */}
              {deltaLoading && (
                <div className="flex items-center gap-2 text-text-tertiary text-xs py-2">
                  <RefreshCw size={11} className="animate-spin" />
                  Comparing language patterns… (10–30 seconds)
                </div>
              )}

              {/* Error */}
              {deltaError && !deltaLoading && (
                <p className="text-red text-xs">{deltaError}</p>
              )}

              {/* Insufficient data */}
              {delta && delta.status === 'insufficient_data' && (
                <div className="text-text-tertiary text-xs space-y-1">
                  <p>{delta.message}</p>
                  <p className="text-text-tertiary/60">
                    Recent window: {delta.recent_window} ({delta.evidence_count_recent} signals) ·
                    Prior window: {delta.prior_window} ({delta.evidence_count_prior} signals)
                  </p>
                </div>
              )}

              {/* Results */}
              {delta && delta.status === 'ok' && (
                <div className="space-y-3">
                  {/* Summary */}
                  <p className="text-text-secondary text-sm leading-relaxed">{delta.summary}</p>

                  {/* Tag rows */}
                  {delta.appeared.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-green text-xs font-medium shrink-0 mt-0.5">
                        <Plus size={10} /> Appeared
                      </span>
                      {delta.appeared.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green/10 text-green">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {delta.disappeared.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-red text-xs font-medium shrink-0 mt-0.5">
                        <Minus size={10} /> Disappeared
                      </span>
                      {delta.disappeared.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red/10 text-red">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {delta.intensified.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-amber text-xs font-medium shrink-0 mt-0.5">
                        <Zap size={10} /> Intensified
                      </span>
                      {delta.intensified.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber/10 text-amber">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-text-tertiary text-[10px]">
                    {delta.recent_window} vs {delta.prior_window}
                    {delta.from_cache && ' · cached'}
                  </p>
                </div>
              )}
            </div>

            {/* ── Main tab switcher ──────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-border mb-5">
              {([
                { key: 'evidence',     label: 'Evidence'      },
                { key: 'supply-chain', label: 'Supply Chain'  },
                { key: 'search',       label: 'Search Corpus' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMainTab(key)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium transition-colors relative',
                    mainTab === key
                      ? 'text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  )}
                >
                  {label}
                  {mainTab === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            {/* ── Evidence tab ───────────────────────────────────────────── */}
            {mainTab === 'evidence' && (
              <div>
                {/* Filter pills */}
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
                      {f === 'all'        ? `All (${evidence.length})`                                      :
                       f === 'supporting' ? `Supporting (${thesis.supporting_count})`                       :
                       f === 'opposing'   ? `Opposing (${thesis.opposing_count})`                           :
                                           `Neutral (${evidence.filter(e => e.sentiment === 'neutral').length})`}
                    </button>
                  ))}
                </div>

                {/* Feed provenance banner — shown when navigated from feed */}
                {fromFeed && feedEidSet.size > 0 && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
                    <ArrowUpRight size={12} className="text-accent shrink-0" />
                    <p className="text-text-secondary text-xs">
                      Showing {feedEidSet.size} signal{feedEidSet.size !== 1 ? 's' : ''} from today's feed —
                      highlighted below.
                    </p>
                  </div>
                )}

                {/* Evidence list */}
                {filtered.length === 0 ? (
                  evidence.length === 0 ? (
                    /* Thesis has never been scored — prominent CTA */
                    <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber/10 flex items-center justify-center">
                        <Zap size={22} className="text-amber" />
                      </div>
                      <div>
                        <p className="text-text-primary text-sm font-semibold mb-1">
                          No signals scored yet
                        </p>
                        <p className="text-text-tertiary text-xs max-w-xs leading-relaxed">
                          Run a corpus evaluation to score all ingested documents against this thesis.
                          This runs in the background and usually takes 1–3 minutes.
                        </p>
                      </div>
                      <button
                        onClick={runEvaluate}
                        disabled={evalRunning}
                        className={cn(
                          'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                          evalRunning
                            ? 'bg-elevated text-text-tertiary cursor-not-allowed'
                            : 'bg-accent text-white hover:opacity-90'
                        )}
                      >
                        {evalRunning
                          ? <><RefreshCw size={13} className="animate-spin" /> Running…</>
                          : <><RefreshCw size={13} /> Run Corpus Evaluation</>
                        }
                      </button>
                      <p className="text-text-tertiary text-[11px]">
                        New signals will appear here after the run completes — refresh the page in a few minutes.
                      </p>
                    </div>
                  ) : (
                    /* Filter applied, no matches */
                    <div className="text-center py-16 text-text-tertiary text-sm">
                      No {filter} evidence found.
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {filtered.map(ev => {
                      const s = SENTIMENT_CONFIG[ev.sentiment]
                      const isFromFeed = feedEidSet.has(ev.id)
                      return (
                        <div
                          key={ev.id}
                          ref={el => { evidenceRefs.current[ev.id] = el }}
                          className={cn(
                            'rounded-xl p-4 border transition-colors',
                            isFromFeed
                              ? 'bg-accent/5 border-accent/25'
                              : 'bg-surface border-border',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.color, s.bg)}>
                                {s.label}
                              </span>
                              <span className="text-text-tertiary text-xs">
                                {ev.source_name}
                              </span>
                              {isFromFeed && (
                                <span className="text-accent text-[10px] font-medium bg-accent/10 px-1.5 py-0.5 rounded-full">
                                  Today's feed
                                </span>
                              )}
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
                          <p className="text-text-secondary text-sm leading-relaxed">
                            {ev.excerpt}
                          </p>
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
            )}

            {/* ── Supply Chain tab ───────────────────────────────────────── */}
            {mainTab === 'supply-chain' && (
              <div>
                <p className="text-text-tertiary text-sm mb-4">
                  Search for a company to see known supply chain relationships extracted from SEC filings.
                </p>

                {/* Search input */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                    <input
                      type="text"
                      value={scInput}
                      onChange={e => setScInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') searchSupplyChain(scInput) }}
                      placeholder="e.g. NVIDIA, TSMC, Broadcom…"
                      className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => searchSupplyChain(scInput)}
                    disabled={!scInput.trim() || scLoading}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      scInput.trim() && !scLoading
                        ? 'bg-accent text-white hover:opacity-90'
                        : 'bg-elevated text-text-tertiary cursor-not-allowed'
                    )}
                  >
                    {scLoading
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <ArrowRight size={13} />}
                    Search
                  </button>
                </div>

                {/* Results */}
                {scLoading && (
                  <div className="flex items-center gap-2 text-text-tertiary text-sm py-8 justify-center">
                    <RefreshCw size={14} className="animate-spin" />
                    Querying supply chain database…
                  </div>
                )}

                {scError && !scLoading && (
                  <div className="text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3">
                    {scError}
                  </div>
                )}

                {!scLoading && !scError && scQuery && scLinks.length === 0 && (
                  <div className="text-center py-12 text-text-tertiary text-sm">
                    No supply chain relationships found for <span className="text-text-secondary">"{scQuery}"</span>.
                    <p className="text-xs mt-1">Relationships are extracted from 10-K and 10-Q filings during ingestion.</p>
                  </div>
                )}

                {!scLoading && scLinks.length > 0 && (
                  <div>
                    <p className="text-text-tertiary text-xs mb-3">
                      {scLinks.length} relationship{scLinks.length !== 1 ? 's' : ''} found for
                      <span className="text-text-secondary font-medium ml-1">"{scQuery}"</span>
                    </p>
                    <div className="space-y-2">
                      {scLinks.map(link => {
                        const rel = REL_CONFIG[link.relationship_type] ?? { label: link.relationship_type, color: 'text-text-secondary' }
                        const isParent = link.parent_company.toLowerCase().includes(scQuery.toLowerCase())
                        return (
                          <div key={link.id} className="bg-surface border border-border rounded-xl p-4">
                            {/* Relationship row */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-text-primary text-sm font-medium">{link.parent_company}</span>
                              <ArrowRight size={12} className="text-text-tertiary shrink-0" />
                              <span className={cn('text-xs px-2 py-0.5 rounded-full bg-elevated font-medium', rel.color)}>
                                {rel.label}
                              </span>
                              <ArrowRight size={12} className="text-text-tertiary shrink-0" />
                              <span className="text-text-primary text-sm font-medium">{link.child_company}</span>
                              {/* Highlight which side matched */}
                              {isParent
                                ? <span className="text-[10px] text-text-tertiary ml-auto">searched company is customer/hub</span>
                                : <span className="text-[10px] text-text-tertiary ml-auto">searched company is supplier/child</span>
                              }
                            </div>
                            {/* Evidence text */}
                            {link.evidence_text && (
                              <p className="text-text-tertiary text-xs leading-relaxed italic border-l-2 border-border pl-3">
                                "{link.evidence_text}"
                              </p>
                            )}
                            {/* Footer */}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-text-tertiary text-xs tabular-nums">
                                confidence {Math.round(link.confidence * 100)}%
                              </span>
                              <span className="text-text-tertiary text-[10px]">· doc {link.source_document_id.slice(0, 16)}…</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* No search yet */}
                {!scLoading && !scQuery && (
                  <div className="text-center py-12 text-text-tertiary text-sm">
                    <p>Enter a company name above to explore its supply chain.</p>
                    <p className="text-xs mt-2">
                      Data is extracted from SEC 10-K and 10-Q filings — only available after ingestion has run.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Search Corpus tab ──────────────────────────────────────── */}
            {mainTab === 'search' && (
              <div>
                <p className="text-text-tertiary text-sm mb-4 leading-relaxed">
                  Ask a question against the full corpus. The LLM synthesises an answer from the most
                  relevant ingested documents — not just this theme&apos;s evidence.
                </p>

                {/* Starter queries from this thesis's keywords */}
                {!srQuery && thesis && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      `What are the latest signals for ${thesis.name.split(' ').slice(0, 3).join(' ')}?`,
                      `Which companies are most active in ${thesis.keywords[0] ?? 'this sector'}?`,
                      `What risks are mentioned most in recent filings?`,
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setSrInput(q); runSearch(q) }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="flex items-end gap-2 mb-5">
                  <div className="flex-1 relative">
                    <Search size={13} className="absolute left-3 top-3.5 text-text-tertiary pointer-events-none" />
                    <textarea
                      value={srInput}
                      onChange={e => setSrInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runSearch() } }}
                      placeholder="Ask anything about the corpus…"
                      rows={2}
                      className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                  <button
                    onClick={() => runSearch()}
                    disabled={!srInput.trim() || srLoading}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors shrink-0',
                      srInput.trim() && !srLoading
                        ? 'bg-accent text-white hover:opacity-90'
                        : 'bg-elevated text-text-tertiary cursor-not-allowed'
                    )}
                  >
                    {srLoading
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <ArrowRight size={13} />}
                    {srLoading ? `${srElapsed}s…` : 'Search'}
                  </button>
                </div>

                {/* Loading */}
                {srLoading && (
                  <div className="flex items-center gap-2 text-text-tertiary text-sm py-8 justify-center">
                    <RefreshCw size={14} className="animate-spin" />
                    Searching corpus… {srElapsed}s — LLM synthesis takes 10–30 seconds.
                  </div>
                )}

                {/* Error */}
                {srError && !srLoading && (
                  <div className="text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-4">
                    {srError}
                  </div>
                )}

                {/* Results */}
                {srResult && !srLoading && (
                  <div className="space-y-4">
                    {/* Query */}
                    <p className="text-text-tertiary text-xs">
                      Results for: <span className="text-text-secondary italic">&ldquo;{srQuery}&rdquo;</span>
                    </p>

                    {/* Answer */}
                    <div className="bg-surface border border-border rounded-xl p-5">
                      <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                        {srResult.answer}
                      </p>
                    </div>

                    {/* Sources */}
                    {srResult.sources && srResult.sources.length > 0 && (
                      <div>
                        <p className="text-text-tertiary text-xs mb-2 uppercase tracking-widest font-medium">
                          Sources ({srResult.sources.length})
                        </p>
                        <div className="space-y-2">
                          {srResult.sources.map((src, i) => (
                            <div key={i} className="flex items-start gap-3 bg-surface border border-border rounded-lg px-3 py-2.5">
                              <span className="text-text-tertiary text-[11px] tabular-nums shrink-0 mt-0.5 w-4 text-right">
                                {i + 1}.
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-text-secondary text-xs font-medium truncate block">{src.source_name}</span>
                                {src.title && src.title !== src.source_name && (
                                  <p className="text-text-tertiary text-[11px] leading-relaxed line-clamp-2">{src.title}</p>
                                )}
                              </div>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-text-tertiary hover:text-accent transition-colors shrink-0 mt-0.5"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!srLoading && !srResult && !srError && (
                  <div className="text-center py-10 text-text-tertiary text-sm">
                    Enter a question above to search across all ingested documents.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
