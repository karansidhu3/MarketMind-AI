'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertCircle, Sparkles, Zap, TrendingUp, TrendingDown, Minus, BookOpen, BarChart2, Bell } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SignalCard from '@/components/feed/SignalCard'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { getFeed, getCompanyRadar, regenerateFeed, getThesisExplain, getFeedExplainSummary, getAlerts } from '@/lib/api'
import { formatDate, greet, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { FeedResponse, CompanyRadarItem, ThesisSignal, ThesisExplain, CompanyAlert } from '@/lib/types'

// ── Skeleton components ───────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('bg-border/50 rounded animate-pulse', className)} style={style} />
}

function HeroSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
      <div className="flex items-start gap-3 mb-5">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-2 mb-5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-[95%]" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="flex gap-2">
        {[80, 72, 88, 96].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>
    </div>
  )
}

function SignalCardSkeleton() {
  return (
    <div className="bg-surface border border-border border-l-4 border-l-border/50 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <div className="flex gap-1.5 pt-0.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        </div>
        <div className="shrink-0 space-y-1.5 text-right pt-1">
          <Skeleton className="h-8 w-12 ml-auto" />
          <Skeleton className="h-3 w-14 ml-auto" />
          <div className="flex gap-2 justify-end pt-1">
            <Skeleton className="h-3.5 w-6" />
            <Skeleton className="h-3.5 w-6" />
          </div>
        </div>
      </div>
      <Skeleton className="h-[2px] w-full mt-3" />
    </div>
  )
}

function ExplainCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-16 rounded-full ml-auto" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-[92%]" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    </div>
  )
}

function RadarRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
      <Skeleton className="h-3 w-3 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-3 w-10 ml-auto" />
        <Skeleton className="h-2.5 w-8 ml-auto" />
      </div>
    </div>
  )
}

// ── Feed hero ─────────────────────────────────────────────────────────────────

function FeedHero({ feed, explainMode }: { feed: FeedResponse; explainMode: boolean }) {
  const [explainSummary, setExplainSummary] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)

  // Fetch plain-English summary the first time Explain mode is activated
  useEffect(() => {
    if (!explainMode || explainSummary !== null) return
    setExplainLoading(true)
    getFeedExplainSummary()
      .then(r => setExplainSummary(r.summary))
      .catch(() => setExplainSummary('Could not generate plain-English briefing.'))
      .finally(() => setExplainLoading(false))
  }, [explainMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalNewSignals = feed.thesis_signals.reduce(
    (sum, s) => sum + s.new_evidence_count, 0
  )

  const stats = [
    { value: feed.thesis_signals.length,     label: 'theses tracked'   },
    { value: totalNewSignals,                 label: 'new signals'      },
    { value: feed.new_companies.length,       label: 'new companies'    },
    { value: feed.insider_clusters.length,    label: 'insider clusters' },
  ]

  // Which summary to show
  const summaryText = explainMode
    ? (explainLoading ? null : explainSummary)
    : feed.summary

  return (
    <div className="relative bg-surface border border-border rounded-2xl p-6 mb-8 overflow-hidden">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(var(--accent) / 0.06), transparent 70%)' }}
      />

      <div className="relative">
        {/* Title row */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            explainMode ? 'bg-green/10' : 'bg-accent/10'
          )}>
            {explainMode
              ? <BookOpen size={14} className="text-green" />
              : <Sparkles size={14} className="text-accent" />
            }
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold leading-tight">
              {explainMode ? 'Plain English Briefing' : 'Intelligence Briefing'}
            </p>
            <p className="text-text-tertiary text-xs mt-0.5">
              {formatDate(feed.feed_date)}
              {feed.from_cache
                ? <span className="ml-1.5 opacity-60">· cached</span>
                : <span className="ml-1.5 text-green">· live</span>
              }
            </p>
          </div>
        </div>

        {/* Summary — switches between analyst tone and casual tone */}
        {explainLoading ? (
          <div className="space-y-2 mb-5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[88%]" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ) : summaryText ? (
          <p className="text-text-primary text-sm leading-relaxed mb-5">
            {summaryText}
          </p>
        ) : (
          <p className="text-text-tertiary text-sm italic mb-5">
            No summary available — click Regenerate to synthesise today's signals.
          </p>
        )}

        {/* Stat pills — same in both modes */}
        <div className="flex flex-wrap gap-2">
          {stats.map(s => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 text-xs bg-elevated border border-border px-2.5 py-1 rounded-full"
            >
              <span className="text-text-primary font-semibold tabular-nums">{s.value}</span>
              <span className="text-text-tertiary">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Explain card — plain English narrative per thesis ─────────────────────────

const TREND_CONFIG = {
  strengthening: {
    Icon: TrendingUp,
    label: 'Building',
    color: 'text-green',
    bg: 'bg-green/10',
  },
  weakening: {
    Icon: TrendingDown,
    label: 'Fading',
    color: 'text-red',
    bg: 'bg-red/10',
  },
  stable: {
    Icon: Minus,
    label: 'Steady',
    color: 'text-text-tertiary',
    bg: 'bg-elevated',
  },
  none: {
    Icon: Minus,
    label: 'No data',
    color: 'text-text-tertiary',
    bg: 'bg-elevated',
  },
}

function ExplainCard({ signal }: { signal: ThesisSignal }) {
  const [data,    setData]    = useState<ThesisExplain | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getThesisExplain(signal.thesis_id)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load explanation.'))
      .finally(() => setLoading(false))
  }, [signal.thesis_id])

  if (loading) return <ExplainCardSkeleton />

  const trend     = data?.trend ?? 'stable'
  const cfg       = TREND_CONFIG[trend] ?? TREND_CONFIG.stable
  const narrative = data?.narrative ?? (error ? 'Could not generate explanation.' : '')

  return (
    <Link
      href={`/thesis/${signal.thesis_id}`}
      className="block bg-surface border border-border rounded-xl p-5 hover:bg-elevated hover:border-border-subtle transition-all duration-150 group"
    >
      {/* Header: thesis name + trend badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-text-primary text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
          {signal.thesis_name}
        </p>
        <span className={cn(
          'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          cfg.color, cfg.bg
        )}>
          <cfg.Icon size={10} />
          {cfg.label}
        </span>
      </div>

      {/* Plain English narrative */}
      {error ? (
        <p className="text-text-tertiary text-xs italic">{error}</p>
      ) : (
        <p className="text-text-secondary text-sm leading-relaxed">
          {narrative}
        </p>
      )}

      {/* Footer: subtle signal count + cache indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-text-tertiary text-[11px]">
          {signal.new_evidence_count} new signal{signal.new_evidence_count !== 1 ? 's' : ''} today
        </span>
        {data?.from_cache && (
          <span className="text-text-tertiary text-[11px] opacity-60">· cached</span>
        )}
      </div>
    </Link>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptySignals() {
  return (
    <div className="bg-surface border border-border rounded-xl py-14 px-8 text-center">
      <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-3">
        <Zap size={18} className="text-text-tertiary" />
      </div>
      <p className="text-text-primary text-sm font-medium mb-1.5">Nothing new today</p>
      <p className="text-text-tertiary text-xs leading-relaxed max-w-[260px] mx-auto">
        No documents matched your theses since midnight. This clears daily — check back after the next ingestion run, or trigger one manually.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [feed,         setFeed]         = useState<FeedResponse | null>(null)
  const [radar,        setRadar]        = useState<CompanyRadarItem[]>([])
  const [alerts,       setAlerts]       = useState<CompanyAlert[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [regenerating, setRegenerating] = useState(false)
  // Data = technical cards, Explain = plain-English narrative per thesis (ADR-022)
  const [explainMode,  setExplainMode]  = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [f, r, a] = await Promise.all([getFeed(), getCompanyRadar(), getAlerts()])
      setFeed(f)
      setRadar(r)
      setAlerts(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load feed.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateFeed()
      await load()
      toast('Feed regenerated successfully', 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Regeneration failed', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-8 py-8">

        {/* ── Controls row ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-text-primary text-lg font-semibold">{greet()}</h1>

          <div className="flex items-center gap-2">
            {/* Data / Explain toggle */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setExplainMode(false)}
                title="Technical view — signal counts, confidence, companies"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all',
                  !explainMode
                    ? 'bg-elevated text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <BarChart2 size={11} />
                Data
              </button>
              <button
                onClick={() => setExplainMode(true)}
                title="Plain English — what's happening and why it matters"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all',
                  explainMode
                    ? 'bg-elevated text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <BookOpen size={11} />
                Explain
              </button>
            </div>

            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-elevated transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>
        </div>

        {/* ── Loading — skeleton layout ────────────────────────── */}
        {loading && (
          <>
            <HeroSkeleton />
            <div className="flex gap-6 items-start">
              <div className="flex-[7] min-w-0 space-y-3">
                {[...Array(4)].map((_, i) => <SignalCardSkeleton key={i} />)}
              </div>
              <div className="flex-[3] min-w-0">
                <Skeleton className="h-3 w-28 mb-2 ml-1" />
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  {[...Array(8)].map((_, i) => <RadarRowSkeleton key={i} />)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Error ────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────── */}
        {!loading && !error && feed && (
          <>
            {/* Hero — switches between analyst tone and plain-English based on mode */}
            <FeedHero feed={feed} explainMode={explainMode} />

            <div className="flex gap-6 items-start">

              {/* ── Left: signals ─────────────────────────────────── */}
              <div className="flex-[7] min-w-0">

                {/* Section header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                    Thesis Signals
                  </h2>
                  <div className="flex items-center gap-3">
                    {explainMode && (
                      <span className="text-text-tertiary text-xs flex items-center gap-1">
                        <BookOpen size={10} />
                        Plain English mode
                      </span>
                    )}
                    <span className="text-text-tertiary text-xs tabular-nums">
                      {feed.thesis_signals.length} active
                    </span>
                  </div>
                </div>

                {/* Alert triggers — shown when a company crosses its threshold */}
                {feed.alert_triggers.length > 0 && (
                  <div className="mb-4 rounded-xl border border-amber/25 bg-amber/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell size={12} className="text-amber shrink-0" />
                      <span className="text-amber text-xs font-semibold uppercase tracking-widest">
                        Alert{feed.alert_triggers.length > 1 ? 's' : ''} Triggered
                      </span>
                    </div>
                    <div className="space-y-2">
                      {feed.alert_triggers.map(t => (
                        <div key={t.normalised_name} className="flex items-center justify-between gap-3">
                          <span className="text-text-primary text-sm font-medium">{t.display_name}</span>
                          <span className="text-text-tertiary text-xs tabular-nums shrink-0">
                            {t.current_doc_count} docs
                            <span className="text-amber ml-1">(threshold: {t.threshold})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {feed.thesis_signals.length === 0 ? (
                    <EmptySignals />
                  ) : explainMode ? (
                    /* Explain mode: plain-English cards, lazy-loaded per thesis */
                    feed.thesis_signals.map(signal => (
                      <ExplainCard key={signal.thesis_id} signal={signal} />
                    ))
                  ) : (
                    /* Data mode: full technical signal cards */
                    feed.thesis_signals.map(signal => (
                      <SignalCard key={signal.thesis_id} signal={signal} />
                    ))
                  )}
                </div>

                {/* Insider clusters */}
                {feed.insider_clusters.length > 0 && (
                  <section className="pt-6">
                    <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                      Insider Clusters
                    </h2>
                    <div className="space-y-2">
                      {feed.insider_clusters.map((cluster, i) => (
                        <div
                          key={i}
                          className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in"
                        >
                          <div>
                            <p className="text-text-primary text-sm font-medium">{cluster.company_name}</p>
                            <p className="text-text-tertiary text-xs mt-0.5">
                              {cluster.filing_count} insiders filed within {cluster.filed_within_days}d
                            </p>
                          </div>
                          <span className="text-amber text-xs bg-amber/10 px-2.5 py-0.5 rounded-full font-medium">
                            Cluster
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* New companies */}
                {feed.new_companies.length > 0 && (
                  <section className="pt-4">
                    <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                      New on Radar
                    </h2>
                    <div className="space-y-2">
                      {feed.new_companies.map((co, i) => (
                        <div
                          key={i}
                          className="bg-surface border border-border rounded-xl px-4 py-3 animate-fade-in"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-text-primary text-sm font-medium">{co.company_name}</span>
                            {co.ticker && (
                              <span className="text-accent text-xs font-mono">{co.ticker}</span>
                            )}
                            <span className="ml-auto text-green text-xs bg-green/10 px-2 py-0.5 rounded-full font-medium">
                              New
                            </span>
                          </div>
                          {co.context && (
                            <p className="text-text-secondary text-xs leading-relaxed line-clamp-2 mb-2">
                              {co.context}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {co.thesis_names.map(t => (
                              <span key={t} className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-md">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* ── Right: company radar ─────────────────────────── */}
              <div className="flex-[3] min-w-0">
                <div className="sticky top-8">
                  <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                    Company Radar
                  </h2>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <CompanyRadar companies={radar.slice(0, 20)} initialAlerts={alerts} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
