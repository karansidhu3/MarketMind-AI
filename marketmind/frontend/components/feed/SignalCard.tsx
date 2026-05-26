'use client'

import { TrendingUp, TrendingDown, Minus, ArrowUpRight, GitCompare } from 'lucide-react'
import Link from 'next/link'
import { cn, formatConfidence } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import { Tooltip } from '@/components/ui/Tooltip'
import type { ThesisSignal } from '@/lib/types'

const MOMENTUM = {
  rising: {
    icon:        TrendingUp,
    label:       'Rising',
    textColor:   'text-green',
    bgColor:     'bg-green/10',
    borderColor: 'border-l-green',
    cardTint:    'bg-green/[0.02]',
    barColor:    'bg-green/50',
  },
  flat: {
    icon:        Minus,
    label:       'Flat',
    textColor:   'text-amber',
    bgColor:     'bg-amber/10',
    borderColor: 'border-l-amber',
    cardTint:    'bg-amber/[0.02]',
    barColor:    'bg-amber/50',
  },
  falling: {
    icon:        TrendingDown,
    label:       'Falling',
    textColor:   'text-red',
    bgColor:     'bg-red/10',
    borderColor: 'border-l-red',
    cardTint:    'bg-red/[0.02]',
    barColor:    'bg-red/50',
  },
}

interface SignalCardProps {
  signal: ThesisSignal
  compact?: boolean
  featured?: boolean   // lead-story: larger type, expanded highlight
  /** Map from company_name → normalised_name for deep-dive panel */
  companyNameMap?: Record<string, string>
}

export default function SignalCard({ signal, compact = false, featured = false, companyNameMap = {} }: SignalCardProps) {
  // Renders inside AppShell → CompanyProvider, so hook resolves correctly
  const { openCompany } = useCompany()
  const m     = MOMENTUM[signal.momentum]
  const Icon  = m.icon
  const total = signal.supporting_count + signal.opposing_count

  const evidenceHref = signal.evidence_ids.length > 0
    ? `/thesis/${signal.thesis_id}?from=feed&eids=${signal.evidence_ids.slice(0, 10).join(',')}`
    : `/thesis/${signal.thesis_id}`

  if (compact) {
    return (
      <Link
        href={evidenceHref}
        className={cn(
          'flex items-center gap-3 border border-border border-l-4 rounded-xl px-4 py-3',
          'hover:bg-elevated transition-all duration-150 animate-slide-up',
          m.borderColor, m.cardTint
        )}
      >
        <span className={cn(
          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          m.textColor, m.bgColor
        )}>
          <Icon size={9} strokeWidth={2.5} />
          {m.label}
        </span>

        <h3 className="text-text-primary font-medium text-sm flex-1 truncate leading-snug">
          {signal.thesis_name}
        </h3>

        {signal.new_evidence_count > 0 && (
          <span className="text-text-tertiary text-xs shrink-0 flex items-center gap-0.5">
            +{signal.new_evidence_count}
            <ArrowUpRight size={9} />
          </span>
        )}

        <div className="shrink-0 flex items-center gap-3">
          {total > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-green text-xs tabular-nums font-medium">{signal.supporting_count}↑</span>
              <span className="text-red text-xs tabular-nums font-medium">{signal.opposing_count}↓</span>
            </div>
          )}
          <span className={cn('text-base font-bold tabular-nums leading-none', m.textColor)}>
            {formatConfidence(signal.confidence)}
          </span>
        </div>
      </Link>
    )
  }

  // Confidence delta display helper
  const deltaStr = (() => {
    const d = signal.confidence_delta
    if (d == null || Math.abs(d) < 0.005) return null
    const pts = Math.round(Math.abs(d) * 100)
    return d > 0 ? `↑+${pts}pts` : `↓−${pts}pts`
  })()
  const deltaColor = signal.confidence_delta != null && signal.confidence_delta > 0 ? 'text-green' : 'text-red'

  // ── Full layout ────────────────────────────────────────────────────────────
  return (
    <Link
      href={evidenceHref}
      className={cn(
        'group block border border-l-4 rounded-xl transition-all duration-200 animate-slide-up',
        featured
          ? 'border-border p-6 hover:shadow-md bg-surface'
          : 'border-border p-5 hover:border-border hover:shadow-sm',
        m.borderColor, m.cardTint
      )}
    >
      <div className="flex items-start gap-5">
        {/* Left: name + badge + highlight + companies */}
        <div className="flex-1 min-w-0">
          {/* Badge row */}
          <div className="flex items-center gap-2 mb-2.5">
            <Tooltip content="Direction of signal activity over the past 30 days compared to the prior period.">
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold cursor-default',
                m.textColor, m.bgColor
              )}>
                <Icon size={10} strokeWidth={2.5} />
                {m.label}
              </span>
            </Tooltip>
            {signal.new_evidence_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-text-tertiary text-xs bg-elevated px-2 py-0.5 rounded-full">
                +{signal.new_evidence_count} today
                <ArrowUpRight size={9} className="opacity-60" />
              </span>
            )}
            {featured && (
              <span className="ml-1 text-[10px] text-accent/70 bg-accent/8 border border-accent/20 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                Lead Story
              </span>
            )}
          </div>

          {/* Thesis name */}
          <h3 className={cn(
            'text-text-primary font-semibold leading-snug mb-2 group-hover:text-accent transition-colors duration-150',
            featured ? 'text-base' : 'text-sm'
          )}>
            {signal.thesis_name}
          </h3>

          {/* Highlight — more lines for featured */}
          {signal.highlight && (
            <p className={cn(
              'text-text-secondary leading-relaxed mb-3',
              featured ? 'text-sm line-clamp-3' : 'text-xs line-clamp-2'
            )}>
              {signal.highlight}
            </p>
          )}

          {/* Language shift — auto-surfaced from cache */}
          {signal.language_shift && (
            <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-lg bg-accent/5 border border-accent/12">
              <GitCompare size={10} className="text-accent shrink-0 mt-0.5" />
              <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">
                {signal.language_shift}
              </p>
              <Tooltip
                content="New or intensified terms appearing in recent filings compared to 30 days ago — an early signal of shifting narrative."
                position="bottom"
              />
            </div>
          )}

          {/* Companies */}
          {signal.top_companies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {signal.top_companies.slice(0, featured ? 8 : 5).map(c => {
                const normName = companyNameMap[c]
                return normName ? (
                  <button
                    key={c}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); openCompany(normName) }}
                    className="text-[11px] text-text-secondary bg-elevated border border-border/60 px-2 py-0.5 rounded-md font-medium hover:text-accent hover:border-accent/40 transition-colors"
                  >
                    {c}
                  </button>
                ) : (
                  <span
                    key={c}
                    className="text-[11px] text-text-secondary bg-elevated border border-border/60 px-2 py-0.5 rounded-md font-medium"
                  >
                    {c}
                  </span>
                )
              })}
              {signal.top_companies.length > (featured ? 8 : 5) && (
                <span className="text-[11px] text-text-tertiary px-1 py-0.5">
                  +{signal.top_companies.length - (featured ? 8 : 5)} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: confidence + delta + ratio */}
        <div className="shrink-0 text-right space-y-1 min-w-[72px]">
          <div className={cn(
            'font-bold tabular-nums leading-none tracking-tight',
            featured ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
            m.textColor
          )}>
            {formatConfidence(signal.confidence)}
          </div>
          <div className="flex items-center justify-end gap-1">
            <div className="text-text-tertiary text-[10px] uppercase tracking-wide font-medium">support rate</div>
            <Tooltip
              content="% of scored signals that support this theme. Based on LLM sentiment analysis of SEC filings and news."
              position="bottom"
            />
          </div>
          {/* 7-day delta */}
          {deltaStr && (
            <div className={cn('text-[11px] font-semibold tabular-nums', deltaColor)}>
              {deltaStr} 7d
            </div>
          )}

          {total > 0 && (
            <div className="flex items-center gap-1.5 justify-end pt-1">
              <span className="text-green text-[11px] tabular-nums font-semibold bg-green/8 px-1.5 py-0.5 rounded-md">
                {signal.supporting_count}↑
              </span>
              <span className="text-red text-[11px] tabular-nums font-semibold bg-red/8 px-1.5 py-0.5 rounded-md">
                {signal.opposing_count}↓
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Supporting / opposing ratio bar — green:red split */}
      {total > 0 ? (
        <div className={cn('bg-border/50 rounded-full overflow-hidden flex', featured ? 'mt-5 h-[4px]' : 'mt-4 h-[3px]')}>
          <div
            className="h-full bg-green/55 transition-all duration-500"
            style={{ width: `${(signal.supporting_count / total) * 100}%` }}
          />
          <div
            className="h-full bg-red/55 transition-all duration-500"
            style={{ width: `${(signal.opposing_count / total) * 100}%` }}
          />
        </div>
      ) : (
        <div className={cn('bg-border/40 rounded-full', featured ? 'mt-5 h-[4px]' : 'mt-4 h-[3px]')} />
      )}
    </Link>
  )
}
