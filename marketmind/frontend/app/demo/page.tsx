'use client'

import React, { useState } from 'react'
import {
  Sparkles, TrendingUp, TrendingDown, Minus, BookOpen, BarChart2,
  Bell, Quote, Info, Zap, ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import DemoShell from '@/components/layout/DemoShell'
import SignalCard from '@/components/feed/SignalCard'
import CompanyRadar from '@/components/feed/CompanyRadar'
import { cn, formatDate } from '@/lib/utils'
import type { ThesisSignal } from '@/lib/types'
import { DEMO_FEED, DEMO_RADAR, DEMO_NARRATIVES } from './data'

// ── Helpers ───────────────────────────────────────────────────────────────────

function activityLevel(signals: ThesisSignal[]) {
  const total   = signals.reduce((s, t) => s + t.new_evidence_count, 0)
  const rising  = signals.filter(s => s.momentum === 'rising').length
  const falling = signals.filter(s => s.momentum === 'falling').length
  if (total === 0)             return { label: 'Quiet',     color: 'text-text-tertiary', bg: 'bg-elevated border-border',     dot: 'bg-text-tertiary' }
  if (rising >= 2 || total >= 12) return { label: 'Active',    color: 'text-green',         bg: 'bg-green/10 border-green/25',  dot: 'bg-green' }
  if (falling >= 2)            return { label: 'Declining', color: 'text-red',           bg: 'bg-red/10 border-red/25',      dot: 'bg-red' }
  return                              { label: 'Steady',    color: 'text-amber',         bg: 'bg-amber/10 border-amber/25',  dot: 'bg-amber' }
}

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
    <div className={cn(
      'flex-1 min-w-[110px] max-w-[160px] rounded-xl border p-3 transition-all duration-150',
      rising  ? 'border-green/30 bg-green/5'  :
      falling ? 'border-red/30 bg-red/5'      :
                'border-border bg-elevated'
    )}>
      <div className="flex items-center gap-1 mb-1.5">
        <Icon size={11} className={rising ? 'text-green' : falling ? 'text-red' : 'text-text-tertiary'} />
        <p className="text-text-primary text-[11px] font-semibold truncate leading-tight">
          {shortName(signal.thesis_name)}
        </p>
      </div>
      <p className="text-text-tertiary text-[11px] tabular-nums mb-2">
        {signal.new_evidence_count} signal{signal.new_evidence_count !== 1 ? 's' : ''}
      </p>
      <div className="h-[3px] bg-border/60 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', rising ? 'bg-green' : falling ? 'bg-red' : 'bg-text-tertiary/60')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-text-tertiary text-[10px] mt-1 tabular-nums">{pct}% support</p>
    </div>
  )
}

// ── Demo hero ─────────────────────────────────────────────────────────────────

function DemoHero({ explainMode, onToggleMode }: { explainMode: boolean; onToggleMode: (v: boolean) => void }) {
  const totalSignals = DEMO_FEED.thesis_signals.reduce((s, t) => s + t.new_evidence_count, 0)
  const risingCount  = DEMO_FEED.thesis_signals.filter(s => s.momentum === 'rising').length
  const activity     = activityLevel(DEMO_FEED.thesis_signals)
  const topSignal    = DEMO_FEED.thesis_signals.find(s => s.highlight && s.highlight.length > 40)

  return (
    <div className="relative bg-surface border border-border rounded-2xl p-6 mb-8 overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(var(--accent) / 0.06), transparent 70%)' }}
      />

      <div className="relative">

        {/* Row 1: header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            explainMode ? 'bg-green/10' : 'bg-accent/10'
          )}>
            {explainMode
              ? <BookOpen size={14} className="text-green" />
              : <Sparkles size={14} className="text-accent" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-semibold leading-tight">Intelligence Brief</p>
            <p className="text-text-tertiary text-xs mt-0.5 flex items-center gap-1.5">
              {formatDate(DEMO_FEED.feed_date)}
              <span className="text-amber/80 bg-amber/10 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                demo data
              </span>
            </p>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center bg-elevated border border-border/80 rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => onToggleMode(false)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                !explainMode
                  ? 'bg-surface text-text-primary shadow-sm border border-border/50'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              <BarChart2 size={10} /> Data
            </button>
            <button
              onClick={() => onToggleMode(true)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                explainMode
                  ? 'bg-surface text-text-primary shadow-sm border border-border/50'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              <BookOpen size={10} /> Explain
            </button>
          </div>
        </div>

        {/* Row 2: activity bar */}
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
                <span className="font-medium">{risingCount}</span> theme{risingCount !== 1 ? 's' : ''} gaining ↑
              </span>
            </>
          )}
          {DEMO_FEED.new_companies.length > 0 && (
            <>
              <span className="text-border/60 text-xs">·</span>
              <span className="text-text-secondary text-xs">
                <span className="font-medium text-text-primary">{DEMO_FEED.new_companies.length}</span> new companies
              </span>
            </>
          )}
        </div>

        {/* Row 3: thesis pulse cards */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {DEMO_FEED.thesis_signals.map(s => (
            <ThesisPulseCard key={s.thesis_id} signal={s} />
          ))}
        </div>

        {/* Row 4: top signal quote (data mode only) */}
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
              <span className="text-accent text-[11px]">{topSignal.thesis_name}</span>
            </div>
          </div>
        )}

        {/* Row 5: summary / explain text */}
        <div className="pt-4 border-t border-border/40">
          {!explainMode ? (
            <p className="text-text-secondary text-sm leading-relaxed">{DEMO_FEED.summary}</p>
          ) : (
            <p className="text-text-primary text-sm leading-relaxed">
              Switch to an individual thesis card below to read its plain-English narrative.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Explain card (static narratives, no streaming needed) ─────────────────────

const TREND_CONFIG = {
  strengthening: { Icon: TrendingUp,   label: 'Building', color: 'text-green',         bg: 'bg-green/10' },
  weakening:     { Icon: TrendingDown, label: 'Fading',   color: 'text-red',           bg: 'bg-red/10'   },
  stable:        { Icon: Minus,        label: 'Steady',   color: 'text-text-tertiary', bg: 'bg-elevated' },
  none:          { Icon: Minus,        label: 'No data',  color: 'text-text-tertiary', bg: 'bg-elevated' },
}

function DemoExplainCard({ signal }: { signal: ThesisSignal }) {
  const narrative = DEMO_NARRATIVES[signal.thesis_id] ?? ''
  // Infer trend from momentum
  const trend = signal.momentum === 'rising' ? 'strengthening' : signal.momentum === 'falling' ? 'weakening' : 'stable'
  const cfg   = TREND_CONFIG[trend]

  return (
    <div className="block bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-text-primary text-sm font-semibold leading-snug">{signal.thesis_name}</p>
        <span className={cn(
          'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          cfg.color, cfg.bg
        )}>
          <cfg.Icon size={10} />
          {cfg.label}
        </span>
      </div>
      <p className="text-text-secondary text-sm leading-relaxed">{narrative}</p>
      <div className="mt-3 text-text-tertiary text-[11px]">
        {signal.new_evidence_count} new signal{signal.new_evidence_count !== 1 ? 's' : ''} today
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [explainMode, setExplainMode] = useState(false)

  return (
    <DemoShell>
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* ── Demo notice banner ── */}
        <div className="flex items-start gap-3 rounded-xl border border-amber/25 bg-amber/5 px-4 py-3 mb-6">
          <Info size={14} className="text-amber shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-amber text-xs font-semibold">You&apos;re viewing demo mode</p>
            <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
              This is pre-loaded sample data to showcase MarketMind&apos;s interface and intelligence features.
              Real data is generated daily by ingesting SEC filings, news feeds, and company reports — then scored
              against your custom investment theses using a local LLM.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1 text-xs text-accent font-medium hover:underline shrink-0 mt-0.5"
          >
            Sign in <ArrowUpRight size={11} />
          </Link>
        </div>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-text-primary font-semibold text-base leading-tight">Morning Brief</p>
            <p className="text-text-tertiary text-xs mt-0.5">Your thesis intelligence, updated daily.</p>
          </div>
        </div>

        {/* ── Hero ── */}
        <DemoHero explainMode={explainMode} onToggleMode={setExplainMode} />

        {/* ── Two-column layout ── */}
        <div className="flex gap-6 items-start">

          {/* Left: signals */}
          <div className="flex-[7] min-w-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                Theme Signals
              </h2>
              <span className="text-text-tertiary text-xs tabular-nums">
                {DEMO_FEED.thesis_signals.length} active
              </span>
            </div>

            {/* Alert trigger */}
            {DEMO_FEED.alert_triggers.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber/25 bg-amber/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={12} className="text-amber shrink-0" />
                  <span className="text-amber text-xs font-semibold uppercase tracking-widest">
                    Alert Triggered
                  </span>
                </div>
                <div className="space-y-2">
                  {DEMO_FEED.alert_triggers.map(t => (
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
              {explainMode ? (
                DEMO_FEED.thesis_signals.map(signal => (
                  <DemoExplainCard key={signal.thesis_id} signal={signal} />
                ))
              ) : (
                DEMO_FEED.thesis_signals.map(signal => (
                  <SignalCard
                    key={signal.thesis_id}
                    signal={signal}
                    companyNameMap={{}}
                  />
                ))
              )}
            </div>

            {/* New companies */}
            {DEMO_FEED.new_companies.length > 0 && (
              <section className="pt-4">
                <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                  New on Radar
                </h2>
                <div className="space-y-2">
                  {DEMO_FEED.new_companies.map((co, i) => (
                    <div key={i} className="bg-surface border border-border rounded-xl px-4 py-3">
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

          {/* Right: company radar */}
          <div className="flex-[3] min-w-0">
            <div className="sticky top-[76px]">
              <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2 px-1">
                Company Radar
              </h2>
              <div className="bg-surface border border-border rounded-xl">
                <CompanyRadar companies={DEMO_RADAR.slice(0, 20)} initialAlerts={[]} />
              </div>

              {/* What is this? explainer */}
              <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} className="text-accent" />
                  <p className="text-text-primary text-xs font-semibold">How Radar Works</p>
                </div>
                <p className="text-text-tertiary text-[11px] leading-relaxed">
                  Companies ranked by unique source documents — not total mentions. A company appearing in
                  2 filings in March → 8 in April → 23 in May is a signal you can&apos;t get from a search.
                  The sparkline shows the 4-week acceleration trend.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-10 rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="relative flex items-center justify-center w-5 h-5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <div className="absolute inset-0 rounded-full border border-accent/30 animate-pulse-subtle" />
            </div>
            <p className="text-text-primary text-sm font-semibold">
              Market<span className="text-accent">Mind</span> — Persistent Investment Intelligence
            </p>
          </div>
          <p className="text-text-secondary text-xs leading-relaxed max-w-lg mx-auto mb-4">
            Real signals from SEC filings and news, scored against your custom investment theses using
            a local LLM. All data stays on your machine — zero API costs.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Sign in for live data
            <ArrowUpRight size={13} />
          </Link>
        </div>

      </div>
    </DemoShell>
  )
}
