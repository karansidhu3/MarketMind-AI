'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, AlertCircle, Eye, Zap } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { SectionLabel } from '@/components/SectionLabel'
import { getFeed, getCompanyRadar, regenerateFeed, getAlerts, streamUnifiedExplain } from '@/lib/api'
import { formatDate, greet, timeAgo, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { FeedResponse, CompanyRadarItem, ThesisSignal, CompanyAlert } from '@/lib/types'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('bg-border/50 rounded animate-pulse', className)} style={style} />
}

function HeroSkeleton() {
  return (
    <div className="mb-6 sm:mb-8">
      <Skeleton className="h-3 w-28 mb-5" />
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

// ── Feed hero — date only ─────────────────────────────────────────────────────

function FeedHero({ feed }: { feed: FeedResponse }) {
  return (
    <div className="mb-6 sm:mb-8">
      <p className="text-text-tertiary text-xs">{formatDate(feed.feed_date)}</p>
    </div>
  )
}

// ── Unified cross-theme narrative ─────────────────────────────────────────────

function UnifiedExplainBlock({ feedDate, signals }: { feedDate: string; signals: ThesisSignal[] }) {
  const [narrative, setNarrative] = useState('')
  const [streaming, setStreaming] = useState(true)
  const [error,     setError]     = useState('')
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
      <div className="py-1">
        <Skeleton className="h-2.5 w-24 mb-5" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[93%]" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[88%]" />
        </div>
      </div>
    )
  }

  const paras = narrative.split('\n\n').filter(p => p.trim())

  return (
    <div className="py-1">
      <p className="text-text-tertiary text-[11px] mb-5">
        {signals.length} theme{signals.length !== 1 ? 's' : ''}
        {risingThemes.length > 0  && <span className="text-green ml-1.5">· {risingThemes.length} rising</span>}
        {fallingThemes.length > 0 && <span className="text-red ml-1.5">· {fallingThemes.length} fading</span>}
      </p>

      {error ? (
        <p className="text-text-tertiary text-sm">{error}</p>
      ) : (
        <div className="space-y-4">
          {paras.map((para, i) => (
            <p key={i} className="text-text-secondary text-[15px] leading-relaxed">
              {para.trim()}
              {streaming && i === paras.length - 1 && (
                <span className="inline-block w-[2px] h-[0.9em] bg-text-secondary ml-[2px] align-middle animate-pulse" />
              )}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 flex-wrap">
        {signals.map(s => (
          <Link
            key={s.thesis_id}
            href={`/thesis/${s.thesis_id}`}
            className={cn(
              'text-[11px] px-2 py-0.5 rounded-full border transition-colors hover:opacity-80',
              s.momentum === 'rising'  ? 'text-green border-green/30 bg-green/5' :
              s.momentum === 'falling' ? 'text-red border-red/30 bg-red/5' :
                                        'text-text-tertiary border-border/60 bg-elevated/60'
            )}
          >
            {s.thesis_name.split(' ').slice(0, 2).join(' ')}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── "What to watch today" callout ─────────────────────────────────────────────

function buildWatchSentence(
  signals: ThesisSignal[],
  radarItems: CompanyRadarItem[],
): string | null {
  if (signals.length === 0) return null

  // Accelerating radar company (2× week-over-week growth with prior history)
  const accelRadar = radarItems
    .map(c => {
      const latest = c.weekly_counts[c.weekly_counts.length - 1] ?? 0
      const prev   = c.weekly_counts[c.weekly_counts.length - 2] ?? 0
      return { c, latest, prev, ratio: prev > 0 ? latest / prev : 0 }
    })
    .filter(({ latest, prev, ratio }) => ratio >= 2 && latest >= 2 && prev > 0)
    .sort((a, b) => b.ratio - a.ratio)[0]

  // Most-rising thesis
  const risingTop = [...signals]
    .filter(s => s.momentum === 'rising')
    .sort((a, b) => b.new_evidence_count - a.new_evidence_count)[0]

  // Most-active thesis
  const topSignal = [...signals].sort((a, b) => b.new_evidence_count - a.new_evidence_count)[0]

  if (accelRadar) {
    const { c, latest, prev } = accelRadar
    const label = `${Math.round(latest / prev)}×`
    const tp = c.thesis_names.length === 1 ? 'theme' : 'themes'
    return `${c.company_name} is accelerating — activity up ${label} this week across ${c.thesis_names.length} ${tp}.`
  }
  if (risingTop && risingTop.new_evidence_count >= 3) {
    const pct = Math.round(risingTop.confidence * 100)
    return `${risingTop.thesis_name} is gaining strength — ${risingTop.new_evidence_count} new signals today, ${pct}% support rate.`
  }
  if (topSignal && topSignal.new_evidence_count >= 2) {
    return `${topSignal.thesis_name} is most active today — ${topSignal.new_evidence_count} new signals.`
  }
  return null
}

function WatchCallout({ feed, radarItems }: { feed: FeedResponse; radarItems: CompanyRadarItem[] }) {
  const sentence = buildWatchSentence(feed.thesis_signals, radarItems)
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
    <div className="py-14 px-8 text-center">
      <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-3">
        <Zap size={18} className="text-text-tertiary" />
      </div>
      <p className="text-text-primary text-sm font-medium mb-1.5">Nothing new today</p>
      <p className="text-text-tertiary text-xs leading-relaxed max-w-[260px] mx-auto">
        No documents matched your theses since midnight. Check back after the next ingestion run.
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
  const { toast } = useToast()

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [f, r, a] = await Promise.all([
        getFeed(),
        getCompanyRadar(),
        getAlerts(),
      ])
      setFeed(f)
      setRadar(r)
      setAlerts(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load feed.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPage() }, [loadPage])

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateFeed()
      const [f, r, a] = await Promise.all([
        getFeed(),
        getCompanyRadar(),
        getAlerts(),
      ])
      setFeed(f)
      setRadar(r)
      setAlerts(a)
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

        {/* ── Page header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-text-primary font-serif-display text-3xl leading-tight">
              {greet()}
            </h1>
            <p className="text-text-tertiary text-xs mt-1">
              Your thesis intelligence, updated daily.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {feed && !regenerating && (
              <span className="text-[11px] text-text-tertiary hidden sm:inline">
                Updated {timeAgo(feed.generated_at)}
              </span>
            )}
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-elevated transition-all disabled:opacity-40 active:scale-[0.97]"
              title="Regenerate feed"
            >
              <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{regenerating ? 'Regenerating…' : 'Regenerate'}</span>
            </button>
          </div>
        </div>

        {/* ── Loading ───────────────────────────────────────────── */}
        {loading && (
          <>
            <HeroSkeleton />
            <Skeleton className="h-2.5 w-24 mb-5" />
            <div className="space-y-3 mb-12">
              {['w-full', 'w-[93%]', 'w-4/5', 'w-full', 'w-[88%]'].map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w}`} />
              ))}
            </div>
            <div className="border-t border-border/40 pt-8">
              <Skeleton className="h-3 w-28 mb-4" />
              {[...Array(8)].map((_, i) => <RadarRowSkeleton key={i} />)}
            </div>
          </>
        )}

        {/* ── Error ─────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* ── Content ───────────────────────────────────────────── */}
        {!loading && !error && feed && (
          <>
            {/* Date */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <FeedHero feed={feed} />
            </motion.div>

            {/* Watch callout */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.06 }}
            >
              <WatchCallout feed={feed} radarItems={radar} />
            </motion.div>

            {/* ── Narrative — full width ────────────────────────── */}
            {feed.thesis_signals.length === 0 ? (
              <EmptySignals />
            ) : (
              <UnifiedExplainBlock
                key={feed.generated_at}
                feedDate={feed.feed_date}
                signals={feed.thesis_signals}
              />
            )}

            {/* ── Radar — full width, below narrative ───────────── */}
            {radar.length > 0 && (
              <section className="mt-10 pt-8 border-t border-border/40">
                <SectionLabel className="mb-4">Company radar</SectionLabel>
                <CompanyRadar companies={radar.slice(0, 10)} initialAlerts={alerts} />
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
