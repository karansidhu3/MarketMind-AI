'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getConfidenceHistory } from '@/lib/api'
import { formatConfidence, cn } from '@/lib/utils'
import type { ThesisOut, ConfidenceSnapshot } from '@/lib/types'

// ── Mini sparkline SVG ────────────────────────────────────────────────────────

function MiniSparkline({ points, trend }: { points: number[]; trend: 'up' | 'down' | 'flat' }) {
  if (points.length < 2) return null

  const W = 80, H = 28
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 0.01

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const color = trend === 'up' ? 'var(--green)' : trend === 'down' ? 'var(--red)' : 'var(--text-tertiary)'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={`rgb(${color})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {/* Endpoint dot */}
      {(() => {
        const last = coords[coords.length - 1].split(',')
        return (
          <circle
            cx={parseFloat(last[0])}
            cy={parseFloat(last[1])}
            r={2.5}
            fill={`rgb(${color})`}
            opacity={0.9}
          />
        )
      })()}
    </svg>
  )
}

// ── Trend calculation ─────────────────────────────────────────────────────────

function calcTrend(history: ConfidenceSnapshot[]): 'up' | 'down' | 'flat' {
  if (history.length < 4) return 'flat'
  const recent = history.slice(-3).reduce((s, p) => s + p.confidence, 0) / 3
  const prior  = history.slice(-7, -3).reduce((s, p) => s + p.confidence, 0) / Math.max(history.slice(-7, -3).length, 1)
  const delta = recent - prior
  if (delta > 0.03) return 'up'
  if (delta < -0.03) return 'down'
  return 'flat'
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-green bg-green/10 px-1.5 py-0.5 rounded-full font-medium">
      <TrendingUp size={9} /> Rising
    </span>
  )
  if (trend === 'down') return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-red bg-red/10 px-1.5 py-0.5 rounded-full font-medium">
      <TrendingDown size={9} /> Weakening
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-text-tertiary bg-elevated px-1.5 py-0.5 rounded-full font-medium">
      <Minus size={9} /> Stable
    </span>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ThesisGridCard({ thesis }: { thesis: ThesisOut }) {
  const [history, setHistory] = useState<ConfidenceSnapshot[]>([])

  useEffect(() => {
    getConfidenceHistory(thesis.id, 14).then(setHistory).catch(() => {})
  }, [thesis.id])

  const hasEvidence = thesis.evidence_count > 0
  const trend       = calcTrend(history)
  const points      = history.map(h => h.confidence)

  // 7-day signal count from history
  const recentSignals = history.length >= 2
    ? (history[history.length - 1]?.evidence_count ?? 0) - (history[history.length - 7]?.evidence_count ?? history[0]?.evidence_count ?? 0)
    : null

  const supportPct  = hasEvidence ? Math.round(thesis.confidence * 100) : null
  const opposePct   = hasEvidence ? Math.round((thesis.opposing_count / thesis.evidence_count) * 100) : null

  return (
    <Link
      href={`/thesis/${thesis.id}`}
      className={cn(
        'group flex flex-col bg-surface border border-border rounded-2xl p-5 h-full',
        'hover:border-accent/30 hover:bg-elevated/40 transition-all duration-150',
        !hasEvidence && 'opacity-70'
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-text-primary font-semibold text-sm leading-snug flex-1">
          {thesis.name}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {thesis.is_system && (
            <span className="text-[10px] text-text-tertiary bg-elevated px-2 py-0.5 rounded-full">
              System
            </span>
          )}
          {!hasEvidence && (
            <span className="text-[10px] text-amber bg-amber/10 px-2 py-0.5 rounded-full">
              No data
            </span>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {thesis.description && (
        <p className="text-text-tertiary text-[11px] leading-relaxed mb-4 line-clamp-2 flex-1">
          {thesis.description}
        </p>
      )}

      {hasEvidence ? (
        <>
          {/* ── Sparkline + trend ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {points.length >= 2
                ? <MiniSparkline points={points} trend={trend} />
                : <div className="w-20 h-7 flex items-center">
                    <div className="h-px w-full bg-border" />
                  </div>
              }
            </div>
            <TrendBadge trend={trend} />
          </div>

          {/* ── Key numbers ── */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className={cn(
                'text-2xl font-bold tabular-nums leading-none',
                (supportPct ?? 0) >= 60 ? 'text-green' :
                (supportPct ?? 0) >= 40 ? 'text-text-primary' :
                'text-red'
              )}>
                {supportPct ?? '—'}%
              </div>
              <div className="text-text-tertiary text-[10px] mt-0.5 uppercase tracking-wide">support rate</div>
            </div>
            <div className="text-right">
              <div className="text-text-primary text-sm font-semibold tabular-nums">
                {thesis.evidence_count.toLocaleString()}
              </div>
              <div className="text-text-tertiary text-[10px] uppercase tracking-wide">signals</div>
            </div>
            {recentSignals !== null && recentSignals > 0 && (
              <div className="text-right">
                <div className="text-green text-sm font-semibold tabular-nums">+{recentSignals}</div>
                <div className="text-text-tertiary text-[10px] uppercase tracking-wide">7-day</div>
              </div>
            )}
          </div>

          {/* ── Dual-color bar ── */}
          <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="h-full bg-green/60 rounded-l-full transition-all duration-500"
                style={{ width: `${(supportPct ?? 0)}%` }}
              />
              <div
                className="h-full bg-red/50 rounded-r-full transition-all duration-500"
                style={{ width: `${(opposePct ?? 0)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div className="flex-1 flex items-end">
          <p className="text-text-tertiary text-[11px] italic">
            No signals yet — click to run evaluation
          </p>
        </div>
      )}
    </Link>
  )
}
