'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getConfidenceHistory } from '@/lib/api'
import { formatConfidence, cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import type { ThesisOut, ConfidenceSnapshot } from '@/lib/types'

// ── Full-width responsive sparkline ──────────────────────────────────────────

function MiniSparkline({ points, trend }: { points: number[]; trend: 'up' | 'down' | 'flat' }) {
  if (points.length < 2) return null

  const W = 80, H = 28
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 0.01

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const last = coords[coords.length - 1].split(',')
  const color = trend === 'up' ? 'var(--green)' : trend === 'down' ? 'var(--red)' : 'var(--text-tertiary)'

  return (
    <motion.div
      className="origin-left"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ ...spring.gentle, delay: 0.1 }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke={`rgb(${color})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
        <circle
          cx={parseFloat(last[0])}
          cy={parseFloat(last[1])}
          r={2}
          fill={`rgb(${color})`}
          opacity={0.9}
        />
      </svg>
    </motion.div>
  )
}

// ── Trend calculation ─────────────────────────────────────────────────────────

function calcTrend(history: ConfidenceSnapshot[]): 'up' | 'down' | 'flat' {
  if (history.length < 4) return 'flat'
  const recent = history.slice(-3).reduce((s, p) => s + p.confidence, 0) / 3
  const prior  = history.slice(-7, -3).reduce((s, p) => s + p.confidence, 0) / Math.max(history.slice(-7, -3).length, 1)
  const delta  = recent - prior
  if (delta > 0.03) return 'up'
  if (delta < -0.03) return 'down'
  return 'flat'
}

// ── Health badge ──────────────────────────────────────────────────────────────

function HealthBadge({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return (
    <span className="inline-flex items-center gap-1 text-[11px] text-green bg-green/10 border border-green/20 px-2 py-0.5 rounded-full font-semibold">
      <TrendingUp size={9} /> Strengthening
    </span>
  )
  if (trend === 'down') return (
    <span className="inline-flex items-center gap-1 text-[11px] text-red bg-red/10 border border-red/20 px-2 py-0.5 rounded-full font-semibold">
      <TrendingDown size={9} /> Weakening
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary bg-elevated border border-border px-2 py-0.5 rounded-full font-medium">
      <Minus size={9} /> Steady
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
  const supportPct  = hasEvidence ? Math.round(thesis.confidence * 100) : null
  const opposePct   = hasEvidence ? Math.round((thesis.opposing_count / thesis.evidence_count) * 100) : null

  return (
    <Link
      href={`/thesis/${thesis.id}`}
      className={cn(
        'group flex flex-col bg-surface border border-border rounded-2xl p-5',
        'hover:border-accent/30 hover:shadow-sm transition-all duration-150 active:scale-[0.98]',
        !hasEvidence && 'opacity-70'
      )}
    >
      {/* ── Name + badge row ── */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-text-primary font-semibold text-base leading-snug flex-1">
            {thesis.name}
          </h3>
          {thesis.is_system && (
            <span className="text-[10px] text-text-tertiary bg-elevated px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
              System
            </span>
          )}
        </div>
        {hasEvidence
          ? <HealthBadge trend={trend} />
          : <span className="inline-flex items-center text-[11px] text-amber bg-amber/10 border border-amber/20 px-2 py-0.5 rounded-full font-medium">No data yet</span>
        }
      </div>

      {hasEvidence ? (
        <>
          {/* ── Sparkline — needs 5+ data points for a meaningful trend ── */}
          <div className="mb-3">
            {points.length >= 5
              ? <MiniSparkline points={points} trend={trend} />
              : <div className="w-20 h-7 flex items-center">
                  <span className="text-[10px] text-text-tertiary">building history…</span>
                </div>
            }
          </div>

          {/* ── Stats — small, tertiary ── */}
          <div className="flex items-baseline justify-between mb-2">
            <span className={cn(
              'text-sm font-semibold tabular-nums',
              (supportPct ?? 0) >= 60 ? 'text-green' :
              (supportPct ?? 0) >= 40 ? 'text-text-secondary' :
              'text-red'
            )}>
              {supportPct}%
              <span className="text-text-tertiary text-[10px] font-normal ml-1">support</span>
            </span>
            <span className="text-text-tertiary text-[11px] tabular-nums">
              {thesis.evidence_count.toLocaleString()} signals
            </span>
          </div>

          {/* ── Dual-color bar ── */}
          <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="h-full bg-green/60 rounded-l-full transition-all duration-500"
                style={{ width: `${supportPct ?? 0}%` }}
              />
              <div
                className="h-full bg-red/50 rounded-r-full transition-all duration-500"
                style={{ width: `${opposePct ?? 0}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-text-tertiary text-[11px] mt-auto pt-4">
          No signals yet — click to run evaluation
        </p>
      )}
    </Link>
  )
}
