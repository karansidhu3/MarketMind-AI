'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertCircle, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import AppShell from '@/components/layout/AppShell'
import SignalCard from '@/components/feed/SignalCard'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { getFeed, getCompanyRadar, regenerateFeed } from '@/lib/api'
import { formatDate, greet } from '@/lib/utils'
import type { FeedResponse, CompanyRadarItem } from '@/lib/types'

export default function FeedPage() {
  const [feed,         setFeed]         = useState<FeedResponse | null>(null)
  const [radar,        setRadar]        = useState<CompanyRadarItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [f, r] = await Promise.all([getFeed(), getCompanyRadar()])
      setFeed(f)
      setRadar(r)
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
    } catch {
      // silently fail — load() will catch errors
    } finally {
      setRegenerating(false)
    }
  }

  const today = new Date().toISOString()

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-8 py-8">

        {/* ── Header ─────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
                {greet()}
              </h1>
              <p className="text-text-tertiary text-sm mt-0.5">
                {feed ? formatDate(feed.feed_date) : formatDate(today)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {feed && !feed.from_cache && (
                <span className="text-xs text-green bg-green/10 px-2.5 py-1 rounded-full">
                  Live
                </span>
              )}
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

          {/* Summary */}
          {feed?.summary && (
            <div className="bg-surface border border-border rounded-xl px-4 py-3 flex gap-3">
              <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
              <p className="text-text-secondary text-sm leading-relaxed">{feed.summary}</p>
            </div>
          )}
        </div>

        {/* ── Loading ────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <RefreshCw size={16} className="text-text-tertiary animate-spin" />
            <div className="text-center">
              <p className="text-text-secondary text-sm">Generating your intelligence briefing…</p>
              <p className="text-text-tertiary text-xs mt-1">
                Local LLM synthesis — takes 30–90 seconds on first load
              </p>
            </div>
          </div>
        )}

        {/* ── Error ──────────────────────────────── */}
        {!loading && error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* ── Main content ───────────────────────── */}
        {!loading && !error && feed && (
          <div className="flex gap-6 items-start">

            {/* Left column: thesis signals + insider clusters + new companies */}
            <div className="flex-[7] min-w-0 space-y-3">

              {feed.thesis_signals.length === 0 ? (
                <div className="text-center py-20 text-text-tertiary text-sm">
                  No signals yet — ingestion may still be running.
                </div>
              ) : (
                feed.thesis_signals.map(signal => (
                  <SignalCard key={signal.thesis_id} signal={signal} />
                ))
              )}

              {/* Insider clusters */}
              {feed.insider_clusters.length > 0 && (
                <section className="pt-4">
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
                <section className="pt-2">
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
                          <span className="ml-auto text-green text-xs bg-green/10 px-2 py-0.5 rounded-full">
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

            {/* Right column: company radar */}
            <div className="flex-[3] min-w-0">
              <div className="sticky top-8">
                <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                  Company Radar
                </h2>
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <CompanyRadar companies={radar.slice(0, 20)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
