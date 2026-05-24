'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertCircle, Sparkles, Zap, TrendingUp, TrendingDown, Minus, BookOpen, BarChart2, Bell, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SignalCard from '@/components/feed/SignalCard'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { getFeed, getFeedDates, getCompanyRadar, regenerateFeed, getThesisExplain, getFeedExplainSummary, getAlerts } from '@/lib/api'
import { formatDate, greet, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useCompany } from '@/contexts/CompanyContext'
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

function FeedHero({
  feed,
  explainMode,
  onToggleMode,
  isHistorical,
}: {
  feed: FeedResponse
  explainMode: boolean
  onToggleMode: (val: boolean) => void
  isHistorical?: boolean
}) {
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
        {/* Title row — icon + label on left, Data/Explain toggle on right */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200',
            explainMode ? 'bg-green/10' : 'bg-accent/10'
          )}>
            {explainMode
              ? <BookOpen size={14} className="text-green" />
              : <Sparkles size={14} className="text-accent" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-semibold leading-tight">
              {explainMode ? 'Plain English Briefing' : 'Intelligence Briefing'}
            </p>
            <p className="text-text-tertiary text-xs mt-0.5 flex items-center gap-1.5">
              {formatDate(feed.feed_date)}
              {isHistorical
                ? <span className="text-amber/80 bg-amber/10 px-1.5 py-0.5 rounded-full text-[10px] font-medium">archived</span>
                : feed.from_cache
                  ? <span className="opacity-60">· cached</span>
                  : <span className="text-green">· live</span>
              }
            </p>
          </div>
          {/* Data / Explain toggle — hidden for historical feeds (explain uses today's corpus) */}
          {!isHistorical && <div className="flex items-center bg-elevated border border-border/80 rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => onToggleMode(false)}
              title="Technical view — signal counts, confidence, companies"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                !explainMode
                  ? 'bg-surface text-text-primary shadow-sm border border-border/50'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              <BarChart2 size={10} />
              Data
            </button>
            <button
              onClick={() => onToggleMode(true)}
              title="Plain English — what's happening and why it matters"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                explainMode
                  ? 'bg-surface text-text-primary shadow-sm border border-border/50'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              <BookOpen size={10} />
              Explain
            </button>
          </div>}
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

// ── New company name — needs hook so must be its own component ────────────────

function NewCompanyName({ name, normalisedName }: { name: string; normalisedName?: string }) {
  const { openCompany } = useCompany()
  if (normalisedName) {
    return (
      <button
        onClick={() => openCompany(normalisedName)}
        className="text-text-primary text-sm font-medium hover:text-accent transition-colors"
      >
        {name}
      </button>
    )
  }
  return <span className="text-text-primary text-sm font-medium">{name}</span>
}

// ── Timeline scrubber ─────────────────────────────────────────────────────────

interface TimelineScrubberProps {
  dates: string[]          // ISO date strings, newest first
  viewDate: string | null  // null = today
  onSelect: (date: string | null) => void
  loading: boolean
}

function TimelineScrubber({ dates, viewDate, onSelect, loading }: TimelineScrubberProps) {
  const [showPicker, setShowPicker] = useState(false)
  const isToday = viewDate === null

  // Index of currently viewed date in the sorted list (-1 = today = newest)
  const currentIdx = viewDate ? dates.indexOf(viewDate) : -1
  const canGoNewer = !isToday && currentIdx > 0
  const canGoOlder = currentIdx < dates.length - 1 && (isToday ? dates.length > 0 : true)

  function goNewer() {
    if (isToday) return
    if (currentIdx <= 0) { onSelect(null); return }
    onSelect(dates[currentIdx - 1])
  }

  function goOlder() {
    if (isToday) {
      if (dates.length > 0) onSelect(dates[0])
    } else if (currentIdx < dates.length - 1) {
      onSelect(dates[currentIdx + 1])
    }
  }

  if (dates.length <= 1) return null   // nothing to scrub with only today

  return (
    <div className="flex items-center gap-1.5">
      {/* Older */}
      <button
        onClick={goOlder}
        disabled={loading || !canGoOlder}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Older feed"
      >
        <ChevronLeft size={13} />
      </button>

      {/* Date chip — click to show calendar picker */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(p => !p)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
            isToday
              ? 'border-border text-text-tertiary hover:bg-elevated hover:text-text-secondary'
              : 'border-accent/50 text-accent bg-accent/8 hover:bg-accent/12'
          )}
        >
          <Calendar size={11} />
          {isToday ? 'Today' : formatDate(viewDate!)}
        </button>

        {/* Date picker dropdown */}
        {showPicker && (
          <div className="absolute top-full mt-1.5 right-0 z-20 bg-surface border border-border rounded-xl shadow-xl p-1.5 min-w-[180px] animate-slide-up">
            <button
              onClick={() => { onSelect(null); setShowPicker(false) }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                isToday ? 'bg-elevated text-text-primary' : 'text-text-secondary hover:bg-elevated'
              )}
            >
              Today
            </button>
            <div className="my-1 border-t border-border/50" />
            <div className="max-h-48 overflow-y-auto">
              {dates.map(d => (
                <button
                  key={d}
                  onClick={() => { onSelect(d); setShowPicker(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                    viewDate === d ? 'bg-elevated text-text-primary font-medium' : 'text-text-secondary hover:bg-elevated'
                  )}
                >
                  {formatDate(d)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Newer */}
      <button
        onClick={goNewer}
        disabled={loading || !canGoNewer}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Newer feed"
      >
        <ChevronRight size={13} />
      </button>

      {/* Back to today pill — only when viewing history */}
      {!isToday && (
        <button
          onClick={() => onSelect(null)}
          className="ml-1 px-2.5 py-1.5 rounded-lg text-xs text-text-tertiary hover:text-text-secondary border border-border hover:bg-elevated transition-colors"
        >
          ← Today
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [feed,         setFeed]         = useState<FeedResponse | null>(null)
  const [radar,        setRadar]        = useState<CompanyRadarItem[]>([])
  const [alerts,       setAlerts]       = useState<CompanyAlert[]>([])
  const [feedDates,    setFeedDates]    = useState<string[]>([])
  const [viewDate,     setViewDate]     = useState<string | null>(null)  // null = today
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [regenerating, setRegenerating] = useState(false)
  // Data = technical cards, Explain = plain-English narrative per thesis (ADR-022)
  const [explainMode,  setExplainMode]  = useState(false)
  const { toast } = useToast()

  const isHistorical = viewDate !== null

  // Build company_name → normalised_name map from radar data (used by SignalCard company tags)
  const companyNameMap = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const c of radar) {
      if (c.normalised_name) map[c.company_name] = c.normalised_name
    }
    return map
  }, [radar])

  // Load radar + alerts once (always current, not historical)
  useEffect(() => {
    Promise.all([getCompanyRadar(), getAlerts(), getFeedDates()])
      .then(([r, a, d]) => { setRadar(r); setAlerts(a); setFeedDates(d) })
      .catch(() => {})
  }, [])

  const loadFeed = useCallback(async (date: string | null) => {
    setLoading(true)
    setError('')
    try {
      const f = await getFeed(date ?? undefined)
      setFeed(f)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load feed.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFeed(viewDate) }, [loadFeed, viewDate])

  function handleSelectDate(date: string | null) {
    setViewDate(date)
    setExplainMode(false)  // reset to data mode when navigating
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateFeed()
      const [f, d] = await Promise.all([getFeed(), getFeedDates()])
      setFeed(f)
      setFeedDates(d)
      toast('Feed regenerated successfully', 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Regeneration failed', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* ── Page header row ───────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-text-primary font-semibold text-base leading-tight">
              {isHistorical ? 'Historical Feed' : greet()}
            </p>
            <p className="text-text-tertiary text-xs mt-0.5">
              {isHistorical ? 'You\'re viewing a past feed snapshot.' : 'Your thesis intelligence, updated daily.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeline scrubber */}
            <TimelineScrubber
              dates={feedDates}
              viewDate={viewDate}
              onSelect={handleSelectDate}
              loading={loading}
            />

            {/* Regenerate — disabled when viewing history */}
            {!isHistorical && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating || loading}
                className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-elevated transition-all disabled:opacity-40"
                title="Regenerate feed"
              >
                <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{regenerating ? 'Regenerating…' : 'Regenerate'}</span>
              </button>
            )}
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
            <FeedHero feed={feed} explainMode={explainMode} onToggleMode={setExplainMode} isHistorical={isHistorical} />

            <div className="flex gap-6 items-start">

              {/* ── Left: signals ─────────────────────────────────── */}
              <div className="flex-[7] min-w-0">

                {/* Section header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                    Thesis Signals
                  </h2>
                  <span className="text-text-tertiary text-xs tabular-nums">
                    {feed.thesis_signals.length} active
                  </span>
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
                      <SignalCard
                        key={signal.thesis_id}
                        signal={signal}
                        companyNameMap={companyNameMap}
                      />
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
                            <NewCompanyName name={co.company_name} normalisedName={companyNameMap[co.company_name]} />
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
                <div className="sticky top-[76px]">
                  <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                    Company Radar
                  </h2>
                  <div className="bg-surface border border-border rounded-xl">
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
