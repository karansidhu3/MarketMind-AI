'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertCircle, Sparkles, Zap, TrendingUp, TrendingDown, Minus, BookOpen, BarChart2, Bell, ChevronLeft, ChevronRight, Calendar, Quote } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SignalCard from '@/components/feed/SignalCard'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { getFeed, getFeedDates, getCompanyRadar, regenerateFeed, getAlerts, streamFeedExplainSummary, streamThesisExplain } from '@/lib/api'
import { formatDate, greet, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useCompany } from '@/contexts/CompanyContext'
import type { FeedResponse, CompanyRadarItem, ThesisSignal, CompanyAlert } from '@/lib/types'

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

// ── Feed hero helpers ─────────────────────────────────────────────────────────

function activityLevel(signals: ThesisSignal[]) {
  const total   = signals.reduce((s, t) => s + t.new_evidence_count, 0)
  const rising  = signals.filter(s => s.momentum === 'rising').length
  const falling = signals.filter(s => s.momentum === 'falling').length
  if (total === 0)            return { label: 'Quiet',     color: 'text-text-tertiary', bg: 'bg-elevated border-border', dot: 'bg-text-tertiary' }
  if (rising >= 2 || total >= 12) return { label: 'Active',    color: 'text-green',          bg: 'bg-green/10 border-green/25', dot: 'bg-green' }
  if (falling >= 2)           return { label: 'Declining', color: 'text-red',            bg: 'bg-red/10 border-red/25',   dot: 'bg-red' }
  return                             { label: 'Steady',    color: 'text-amber',          bg: 'bg-amber/10 border-amber/25', dot: 'bg-amber' }
}

// Short thesis name for the pulse cards
function shortName(name: string): string {
  const map: Record<string, string> = {
    'AI Infrastructure Bottlenecks':        'AI Infra',
    'Semiconductor Supply Chain Stress':    'Semi Chain',
    'Energy Grid Modernisation':            'Grid',
    'Defense Production Ramp':              'Defense',
    'Data Center Physical Infrastructure':  'Data Center',
  }
  return map[name] ?? name.split(' ').slice(0, 2).join(' ')
}

function ThesisPulseCard({ signal }: { signal: ThesisSignal }) {
  const rising  = signal.momentum === 'rising'
  const falling = signal.momentum === 'falling'
  const Icon    = rising ? TrendingUp : falling ? TrendingDown : Minus
  const pct     = Math.round(signal.confidence * 100)

  return (
    <Link
      href={`/thesis/${signal.thesis_id}`}
      className={cn(
        'flex-1 min-w-[110px] max-w-[160px] rounded-xl border p-3 transition-all duration-150 hover:scale-[1.02] hover:shadow-sm',
        rising  ? 'border-green/30 bg-green/5 hover:bg-green/8' :
        falling ? 'border-red/30 bg-red/5 hover:bg-red/8' :
                  'border-border bg-elevated hover:bg-surface'
      )}
    >
      <div className="flex items-center gap-1 mb-1.5">
        <Icon
          size={11}
          className={rising ? 'text-green' : falling ? 'text-red' : 'text-text-tertiary'}
        />
        <p className="text-text-primary text-[11px] font-semibold truncate leading-tight">
          {shortName(signal.thesis_name)}
        </p>
      </div>
      <p className="text-text-tertiary text-[11px] tabular-nums mb-2">
        {signal.new_evidence_count} signal{signal.new_evidence_count !== 1 ? 's' : ''}
      </p>
      {/* Confidence bar */}
      <div className="h-[3px] bg-border/60 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', rising ? 'bg-green' : falling ? 'bg-red' : 'bg-text-tertiary/60')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-text-tertiary text-[10px] mt-1 tabular-nums">{pct}% conf.</p>
    </Link>
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
        for await (const chunk of streamFeedExplainSummary()) {
          setExplainText(prev => prev + chunk)
        }
      } catch {
        setExplainText('Could not generate plain-English briefing.')
      } finally {
        setExplainStreaming(false)
      }
    })()
  }, [explainMode])

  const totalSignals  = feed.thesis_signals.reduce((s, t) => s + t.new_evidence_count, 0)
  const risingCount   = feed.thesis_signals.filter(s => s.momentum === 'rising').length
  const activity      = activityLevel(feed.thesis_signals)
  // Top signal = highest evidence-count thesis with a non-trivial highlight
  const topSignal     = feed.thesis_signals.find(s => s.highlight && s.highlight.length > 40)

  return (
    <div className="relative bg-surface border border-border rounded-2xl p-6 mb-8 overflow-hidden">
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

        {/* ── Row 2: activity status bar ─────────────────────────────── */}
        <div className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg border mb-4 flex-wrap gap-y-1',
          activity.bg
        )}>
          <div className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', activity.dot)} />
            <span className={cn('text-xs font-semibold', activity.color)}>{activity.label}</span>
          </div>
          <span className="text-border/60 text-xs">·</span>
          <span className="text-text-secondary text-xs tabular-nums">
            <span className="font-medium text-text-primary">{totalSignals}</span> new signals
          </span>
          {risingCount > 0 && (
            <>
              <span className="text-border/60 text-xs">·</span>
              <span className="text-green text-xs">
                <span className="font-medium">{risingCount}</span> thesis{risingCount !== 1 ? 'es' : ''} gaining ↑
              </span>
            </>
          )}
          {feed.new_companies.length > 0 && (
            <>
              <span className="text-border/60 text-xs">·</span>
              <span className="text-text-secondary text-xs">
                <span className="font-medium text-text-primary">{feed.new_companies.length}</span> new {feed.new_companies.length === 1 ? 'company' : 'companies'}
              </span>
            </>
          )}
        </div>

        {/* ── Row 3: thesis pulse cards ──────────────────────────────── */}
        {feed.thesis_signals.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {feed.thesis_signals.map(s => (
              <ThesisPulseCard key={s.thesis_id} signal={s} />
            ))}
          </div>
        )}

        {/* ── Row 4: top signal quote ────────────────────────────────── */}
        {topSignal && !explainMode && (
          <div className="mb-4 rounded-xl bg-elevated border border-border/60 px-4 py-3">
            <div className="flex items-start gap-2">
              <Quote size={12} className="text-accent shrink-0 mt-0.5 opacity-60" />
              <p className="text-text-secondary text-sm leading-relaxed italic line-clamp-2">
                {topSignal.highlight.slice(0, 220)}
                {topSignal.highlight.length > 220 ? '…' : ''}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-text-tertiary text-[11px]">→</span>
              <Link
                href={`/thesis/${topSignal.thesis_id}`}
                className="text-accent text-[11px] hover:underline"
              >
                {topSignal.thesis_name}
              </Link>
            </div>
          </div>
        )}

        {/* ── Row 5: summary text (Data) or explain narrative (Explain) ── */}
        <div className={cn(
          feed.thesis_signals.length > 0 ? 'pt-4 border-t border-border/40' : ''
        )}>
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
