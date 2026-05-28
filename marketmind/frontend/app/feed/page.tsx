'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertCircle, Sparkles, Zap, TrendingUp, TrendingDown, Minus, BookOpen, BarChart2, Bell, ChevronLeft, ChevronRight, Calendar, Layers, BriefcaseBusiness, Eye, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SignalCard from '@/components/feed/SignalCard'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { getFeed, getFeedDates, getCompanyRadar, regenerateFeed, getAlerts, streamFeedExplainSummary, streamThesisExplain, streamUnifiedExplain, getPortfolioFeedSignals, getWatchlist, unwatchCompany } from '@/lib/api'
import { formatDate, greet, timeAgo, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useCompany } from '@/contexts/CompanyContext'
import type { FeedResponse, CompanyRadarItem, ThesisSignal, CompanyAlert, FeedGapSignal, WatchedCompany } from '@/lib/types'

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
  const [explainText,      setExplainText]      = useState('')
  const [explainStreaming, setExplainStreaming]  = useState(false)
  const explainStarted = React.useRef(false)

  useEffect(() => {
    if (!explainMode || explainStarted.current) return
    explainStarted.current = true
    setExplainStreaming(true)
    ;(async () => {
      try {
        for await (const chunk of streamFeedExplainSummary(feed.feed_date)) {
          setExplainText(prev => prev + chunk)
        }
      } catch {
        setExplainText('Could not generate plain-English briefing.')
      } finally {
        setExplainStreaming(false)
      }
    })()
  }, [explainMode])

  return (
    <div className="relative bg-surface border border-border rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(var(--accent) / 0.06), transparent 70%)' }}
      />

      <div className="relative">

        {/* ── Row 1: header ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            explainMode ? 'bg-green/10' : 'bg-accent/10'
          )}>
            {explainMode ? <BookOpen size={14} className="text-green" /> : <Sparkles size={14} className="text-accent" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-semibold leading-tight">
              Intelligence Brief
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
          {!isHistorical && (
            <div className="flex items-center bg-elevated border border-border/80 rounded-lg p-0.5 gap-0.5 shrink-0">
              <button
                onClick={() => onToggleMode(false)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                  !explainMode ? 'bg-surface text-text-primary shadow-sm border border-border/50' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <BarChart2 size={10} /> Data
              </button>
              <button
                onClick={() => onToggleMode(true)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                  explainMode ? 'bg-surface text-text-primary shadow-sm border border-border/50' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <BookOpen size={10} /> Explain
              </button>
            </div>
          )}
        </div>

        {/* ── Row 2: briefing content ────────────────────────────────── */}
        <div>
          {!explainMode ? (
            feed.summary ? (
              <p className="text-text-secondary text-sm leading-relaxed">{feed.summary}</p>
            ) : (
              <p className="text-text-tertiary text-sm italic">
                No summary available — click Regenerate to synthesise today&apos;s signals.
              </p>
            )
          ) : explainStreaming && !explainText ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-[88%]" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          ) : (
            <p className="text-text-primary text-sm leading-relaxed">
              {explainText || 'Could not generate plain-English briefing.'}
              {explainStreaming && (
                <span className="inline-block w-[2px] h-[0.9em] bg-text-primary ml-[2px] align-middle animate-pulse" />
              )}
            </p>
          )}
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
  const [narrative,  setNarrative]  = useState('')
  const [streaming,  setStreaming]  = useState(true)
  const [trend,      setTrend]      = useState('stable')
  const [fromCache,  setFromCache]  = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    setStreaming(true)
    setNarrative('')
    setError('')
    ;(async () => {
      try {
        for await (const event of streamThesisExplain(signal.thesis_id)) {
          if (event.type === 'meta') {
            setTrend(event.trend)
            setFromCache(event.from_cache)
          } else {
            setNarrative(prev => prev + event.text)
          }
        }
      } catch {
        setError('Could not generate explanation.')
      } finally {
        setStreaming(false)
      }
    })()
  }, [signal.thesis_id])

  // Show skeleton only until the trend metadata arrives (first event)
  if (streaming && !trend && !narrative) return <ExplainCardSkeleton />

  const cfg = TREND_CONFIG[trend as keyof typeof TREND_CONFIG] ?? TREND_CONFIG.stable

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

      {/* Plain English narrative — streams in with blinking cursor */}
      {error ? (
        <p className="text-text-tertiary text-xs italic">{error}</p>
      ) : streaming && !narrative ? (
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[85%]" />
        </div>
      ) : (
        <p className="text-text-secondary text-sm leading-relaxed">
          {narrative}
          {streaming && (
            <span className="inline-block w-[2px] h-[0.9em] bg-text-secondary ml-[2px] align-middle animate-pulse" />
          )}
        </p>
      )}

      {/* Footer: signal count + cache indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-text-tertiary text-[11px]">
          {signal.new_evidence_count} new signal{signal.new_evidence_count !== 1 ? 's' : ''} today
        </span>
        {fromCache && (
          <span className="text-text-tertiary text-[11px] opacity-60">· cached</span>
        )}
      </div>
    </Link>
  )
}

// ── Unified cross-theme Explain narrative ─────────────────────────────────────

function UnifiedExplainBlock({ feedDate, signals }: { feedDate: string; signals: ThesisSignal[] }) {
  const [narrative,  setNarrative]  = useState('')
  const [streaming,  setStreaming]  = useState(true)
  const [error,      setError]      = useState('')
  const started = React.useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    setStreaming(true)
    ;(async () => {
      try {
        for await (const chunk of streamUnifiedExplain(feedDate)) {
          setNarrative(prev => prev + chunk)
        }
      } catch {
        setError('Could not generate cross-theme analysis.')
      } finally {
        setStreaming(false)
      }
    })()
  }, [])

  const risingThemes  = signals.filter(s => s.momentum === 'rising').map(s => s.thesis_name)
  const fallingThemes = signals.filter(s => s.momentum === 'falling').map(s => s.thesis_name)

  if (streaming && !narrative) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <Layers size={13} className="text-accent" />
          </div>
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[95%]" />
          <Skeleton className="h-3.5 w-[88%]" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
          <Layers size={13} className="text-accent" />
        </div>
        <div>
          <p className="text-text-primary text-sm font-semibold leading-tight">Cross-theme analysis</p>
          <p className="text-text-tertiary text-xs mt-0.5">
            {signals.length} theme{signals.length !== 1 ? 's' : ''}
            {risingThemes.length > 0 && (
              <> · <span className="text-green">{risingThemes.length} rising</span></>
            )}
            {fallingThemes.length > 0 && (
              <> · <span className="text-red">{fallingThemes.length} fading</span></>
            )}
          </p>
        </div>
      </div>

      {/* Narrative */}
      {error ? (
        <p className="text-text-tertiary text-sm italic">{error}</p>
      ) : (
        <div className="space-y-3">
          {narrative.split('\n\n').filter(p => p.trim()).map((para, i) => (
            <p key={i} className="text-text-secondary text-sm leading-relaxed">
              {para.trim()}
              {streaming && i === narrative.split('\n\n').filter(p => p.trim()).length - 1 && (
                <span className="inline-block w-[2px] h-[0.9em] bg-text-secondary ml-[2px] align-middle animate-pulse" />
              )}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-3 flex-wrap">
        {signals.map(s => (
          <Link
            key={s.thesis_id}
            href={`/thesis/${s.thesis_id}`}
            className={cn(
              'text-[11px] px-2 py-0.5 rounded-full border transition-colors hover:opacity-80',
              s.momentum === 'rising'  ? 'text-green border-green/30 bg-green/5' :
              s.momentum === 'falling' ? 'text-red border-red/30 bg-red/5' :
                                        'text-text-tertiary border-border bg-elevated'
            )}
          >
            {s.thesis_name.split(' ').slice(0, 2).join(' ')}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Portfolio gap signal row ──────────────────────────────────────────────────

function GapSignalRow({ gap }: { gap: FeedGapSignal }) {
  const { openCompany } = useCompany()
  return (
    <button
      onClick={() => openCompany(gap.normalised_name)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-border hover:bg-elevated hover:border-accent/20 transition-all text-left group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-primary text-sm font-medium group-hover:text-accent transition-colors">
            {gap.company_name}
          </span>
          {gap.ticker && (
            <span className="text-text-tertiary text-[11px] bg-elevated border border-border/60 px-1.5 py-0.5 rounded-md font-mono">
              {gap.ticker}
            </span>
          )}
        </div>
        <p className="text-text-tertiary text-[11px] mt-0.5 truncate">
          {gap.thesis_names.slice(0, 2).map(t => t.split(' ').slice(0, 2).join(' ')).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-accent text-xs font-semibold bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
          +{gap.new_signals_today} today
        </span>
        <p className="text-text-tertiary text-[10px] mt-1 tabular-nums">{gap.doc_count} total docs</p>
      </div>
    </button>
  )
}

// ── "What to watch today" callout ────────────────────────────────────────────

function buildWatchSentence(
  signals: ThesisSignal[],
  gaps: FeedGapSignal[],
  radarItems: CompanyRadarItem[],
): string | null {
  if (signals.length === 0) return null

  // Accelerating gap company (in gap list with signals today)
  const accelGap = [...gaps].sort((a, b) => b.new_signals_today - a.new_signals_today)[0]

  // Accelerating radar company (2× week-over-week growth)
  const accelRadar = radarItems
    .map(c => {
      const latest = c.weekly_counts[c.weekly_counts.length - 1] ?? 0
      const prev   = c.weekly_counts[c.weekly_counts.length - 2] ?? 0
      return { c, latest, prev, ratio: prev > 0 ? latest / prev : latest > 0 ? 999 : 0 }
    })
    .filter(({ latest, prev, ratio }) => ratio >= 2 && latest >= 2 && prev > 0)
    .sort((a, b) => b.ratio - a.ratio)[0]

  // Most-rising thesis
  const risingTop = [...signals]
    .filter(s => s.momentum === 'rising')
    .sort((a, b) => b.new_evidence_count - a.new_evidence_count)[0]

  // Most-active thesis
  const topSignal = [...signals].sort((a, b) => b.new_evidence_count - a.new_evidence_count)[0]

  if (accelGap && accelGap.new_signals_today >= 2) {
    return `${accelGap.company_name} has ${accelGap.new_signals_today} new signals today — not in your portfolio.`
  }
  if (accelRadar) {
    const { c, latest, prev } = accelRadar
    const label = prev > 0 ? `${Math.round(latest / prev)}×` : 'sharply'
    const tp = c.thesis_names.length === 1 ? 'theme' : 'themes'
    return `${c.company_name} is accelerating — activity up ${label} this week across ${c.thesis_names.length} ${tp}.`
  }
  if (risingTop && risingTop.new_evidence_count >= 3) {
    const pct = Math.round(risingTop.confidence * 100)
    return `${risingTop.thesis_name} is gaining strength — ${risingTop.new_evidence_count} new signals today, ${pct}% support rate.`
  }
  if (topSignal.new_evidence_count >= 2) {
    return `${topSignal.thesis_name} is most active today — ${topSignal.new_evidence_count} new signals.`
  }
  return null
}

function WatchCallout({
  feed,
  gaps,
  radarItems,
}: {
  feed: FeedResponse
  gaps: FeedGapSignal[]
  radarItems: CompanyRadarItem[]
}) {
  const sentence = buildWatchSentence(feed.thesis_signals, gaps, radarItems)
  if (!sentence) return null
  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-xl border border-accent/25 bg-accent/[0.06]">
      <Eye size={13} className="text-accent shrink-0" />
      <p className="text-text-primary text-sm font-medium flex-1">{sentence}</p>
    </div>
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

// ── Watchlist row ─────────────────────────────────────────────────────────────

function WatchlistRow({ item, onUnwatch }: { item: WatchedCompany; onUnwatch: (id: string) => void }) {
  const { openCompany } = useCompany()
  const [removing, setRemoving] = useState(false)

  const latest  = item.weekly_counts[item.weekly_counts.length - 1] ?? 0
  const prev    = item.weekly_counts[item.weekly_counts.length - 2] ?? 0
  const trend   = latest > prev ? 'up' : latest < prev ? 'down' : 'flat'
  const trendColor = trend === 'up' ? 'text-green' : trend === 'down' ? 'text-red' : 'text-text-tertiary'

  async function handleUnwatch(e: React.MouseEvent) {
    e.stopPropagation()
    setRemoving(true)
    onUnwatch(item.id)  // optimistic
    try { await unwatchCompany(item.id) } catch { /* already removed optimistically */ }
  }

  return (
    <div className="group relative flex items-center gap-2.5 px-3 py-2.5 border-b border-border/60 last:border-0 hover:bg-elevated/50 transition-colors">
      <button
        onClick={() => openCompany(item.normalised_name)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-text-primary text-sm font-semibold truncate hover:text-accent transition-colors">
            {item.display_name}
          </span>
          {item.ticker && (
            <span className="text-text-tertiary text-[11px] font-mono shrink-0">{item.ticker}</span>
          )}
        </div>
        <div className={cn('text-[11px] tabular-nums mt-0.5', trendColor)}>
          {item.doc_count} docs
          {trend === 'up' && latest > 0 && <span className="ml-1">↑{latest} this wk</span>}
          {trend === 'down' && <span className="ml-1 text-text-tertiary">slowing</span>}
        </div>
      </button>
      <button
        onClick={handleUnwatch}
        disabled={removing}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-tertiary hover:text-red transition-all"
        title="Remove from watchlist"
      >
        <X size={11} />
      </button>
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
  // Explain = plain-English narrative (default), Data = technical cards (ADR-022)
  const [explainMode,  setExplainMode]  = useState(true)
  const [showHistory,  setShowHistory]  = useState(false)
  const [portfolioGaps, setPortfolioGaps] = useState<FeedGapSignal[]>([])
  const [watchlist,     setWatchlist]     = useState<WatchedCompany[]>([])
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

  // ── Unified data loader ────────────────────────────────────────────────────
  // fullLoad = true  → fetch feed + ALL sidebar data (initial load, regeneration)
  // fullLoad = false → fetch feed content only (date navigation — radar is always live)
  const loadPage = useCallback(async (date: string | null, fullLoad: boolean) => {
    setLoading(true)
    setError('')
    try {
      if (fullLoad) {
        // All requests fire simultaneously; state is set atomically when all resolve
        const [f, r, a, d, g, wl] = await Promise.all([
          getFeed(date ?? undefined),
          getCompanyRadar(),
          getAlerts(),
          getFeedDates(),
          getPortfolioFeedSignals(),
          getWatchlist(),
        ])
        setFeed(f)
        setRadar(r)
        setAlerts(a)
        setFeedDates(d)
        setPortfolioGaps(g)
        setWatchlist(wl)
      } else {
        // Date navigation only — sidebar stays current (ADR-028: radar is always live)
        const f = await getFeed(date ?? undefined)
        setFeed(f)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load feed.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial full load, then feed-only on date changes
  const didInitialLoad = React.useRef(false)
  useEffect(() => {
    const isFirst = !didInitialLoad.current
    didInitialLoad.current = true
    loadPage(viewDate, isFirst)
  }, [viewDate, loadPage])

  function handleSelectDate(date: string | null) {
    setViewDate(date)
    setExplainMode(true)  // keep explain as default when navigating history
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateFeed()
      // Refresh every data source atomically — feed, radar, gaps, watchlist all update together
      const [f, r, a, d, g, wl] = await Promise.all([
        getFeed(),
        getCompanyRadar(),
        getAlerts(),
        getFeedDates(),
        getPortfolioFeedSignals(),
        getWatchlist(),
      ])
      setFeed(f)
      setRadar(r)
      setAlerts(a)
      setFeedDates(d)
      setPortfolioGaps(g)
      setWatchlist(wl)
      toast('Feed regenerated successfully', 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Regeneration failed', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8">

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
            {/* Timeline scrubber — shown when in history mode or when user toggled it */}
            {(showHistory || isHistorical) && (
              <TimelineScrubber
                dates={feedDates}
                viewDate={viewDate}
                onSelect={handleSelectDate}
                loading={loading}
              />
            )}

            {/* History toggle — only shown when not already in historical mode */}
            {!isHistorical && (
              <button
                onClick={() => setShowHistory(h => !h)}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
                  showHistory
                    ? 'border-accent/50 text-accent bg-accent/8'
                    : 'border-border text-text-tertiary hover:text-text-secondary hover:bg-elevated'
                )}
                title="View historical feeds"
              >
                <Calendar size={12} />
                <span className="hidden sm:inline">History</span>
              </button>
            )}

            {/* Regenerate — disabled when viewing history */}
            {!isHistorical && (
              <div className="flex items-center gap-2">
                {feed && !regenerating && (
                  <span className="text-[11px] text-text-tertiary hidden sm:inline">
                    Updated {timeAgo(feed.generated_at)}
                  </span>
                )}
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || loading}
                  className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-elevated transition-all disabled:opacity-40"
                  title="Regenerate feed"
                >
                  <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{regenerating ? 'Regenerating…' : 'Regenerate'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Loading — skeleton layout ────────────────────────── */}
        {loading && (
          <>
            <HeroSkeleton />
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-[7] min-w-0 w-full space-y-3">
                {[...Array(4)].map((_, i) => <SignalCardSkeleton key={i} />)}
              </div>
              <div className="flex-[3] min-w-0 w-full">
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
            {/* Hero — key on generated_at so streaming resets after regeneration */}
            <FeedHero key={feed.generated_at} feed={feed} explainMode={explainMode} onToggleMode={setExplainMode} isHistorical={isHistorical} />

            {/* "What to watch today" — one actionable sentence, derived from data */}
            {!isHistorical && (
              <WatchCallout feed={feed} gaps={portfolioGaps} radarItems={radar} />
            )}

            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* ── Left: signals ─────────────────────────────────── */}
              <div className="flex-[7] min-w-0 w-full">


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
                    /* Explain mode: single unified cross-theme narrative (ADR-022) */
                    /* key on generated_at so the narrative re-streams after regeneration */
                    <UnifiedExplainBlock key={feed.generated_at} feedDate={feed.feed_date} signals={feed.thesis_signals} />
                  ) : (
                    /* Data mode: lead story (featured) + secondary signal cards */
                    feed.thesis_signals.map((signal, i) => (
                      <SignalCard
                        key={signal.thesis_id}
                        signal={signal}
                        featured={i === 0}
                        companyNameMap={companyNameMap}
                      />
                    ))
                  )}
                </div>

                {/* Portfolio gaps with activity today */}
                {portfolioGaps.length > 0 && (
                  <section className="pt-6">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                      <BriefcaseBusiness size={11} className="text-text-tertiary" />
                      <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                        Portfolio Gaps · Active Today
                      </h2>
                      <Tooltip content="Companies on the radar that you don't hold, with new signals since today's ingestion." />
                    </div>
                    <div className="space-y-2">
                      {portfolioGaps.map(gap => (
                        <GapSignalRow key={gap.normalised_name} gap={gap} />
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

              {/* ── Right: watchlist + radar ─────────────────────── */}
              <div className="flex-[3] min-w-0 w-full">
                <div className="lg:sticky lg:top-[76px] space-y-5">

                  {/* Watchlist — only shown when non-empty */}
                  {watchlist.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                          Watching
                        </h2>
                        <span className="text-text-tertiary/60 text-xs">({watchlist.length})</span>
                      </div>
                      <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        {watchlist.map(w => (
                          <WatchlistRow
                            key={w.id}
                            item={w}
                            onUnwatch={id => setWatchlist(prev => prev.filter(x => x.id !== id))}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Company Radar */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                        Company Radar
                      </h2>
                      <Tooltip content="Sorted by week-over-week acceleration. A company going 0→5 this week ranks higher than one steady at 20. Surge badge = 2× or more growth." />
                    </div>
                    <div className="bg-surface border border-border rounded-xl">
                      <CompanyRadar companies={radar.slice(0, 10)} initialAlerts={alerts} />
                    </div>
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
