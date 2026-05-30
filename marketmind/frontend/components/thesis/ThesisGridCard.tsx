'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getConfidenceHistory } from '@/lib/api'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import type { ThesisOut, ConfidenceSnapshot } from '@/lib/types'

// ── Sparkline ─────────────────────────────────────────────────────────────────

function MiniSparkline({ points, trend }: { points: number[]; trend: 'up' | 'down' | 'flat' }) {
  if (points.length < 2) return null

  const W = 72, H = 24
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 0.01

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const last  = coords[coords.length - 1].split(',')
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

// ── Trend ─────────────────────────────────────────────────────────────────────

function calcTrend(history: ConfidenceSnapshot[]): 'up' | 'down' | 'flat' {
  if (history.length < 4) return 'flat'
  const recent = history.slice(-3).reduce((s, p) => s + p.confidence, 0) / 3
  const prior  = history.slice(-7, -3).reduce((s, p) => s + p.confidence, 0) / Math.max(history.slice(-7, -3).length, 1)
  const delta  = recent - prior
  if (delta > 0.03) return 'up'
  if (delta < -0.03) return 'down'
  return 'flat'
}

// ── List row ──────────────────────────────────────────────────────────────────

export default function ThesisGridCard({ thesis }: { thesis: ThesisOut }) {
  const [history, setHistory] = useState<ConfidenceSnapshot[]>([])

  useEffect(() => {
    getConfidenceHistory(thesis.id, 14).then(setHistory).catch(() => {})
  }, [thesis.id])

  const hasEvidence = thesis.evidence_count > 0
  const trend       = calcTrend(history)
  const points      = history.map(h => h.confidence)

  return (
    <Link
      href={`/thesis/${thesis.id}`}
      className={cn(
        'group flex items-center gap-4 py-4 border-b border-border/50 last:border-0',
        'hover:bg-elevated/40 -mx-3 px-3 rounded-lg transition-colors active:scale-[0.99]',
        !hasEvidence && 'opacity-60'
      )}
    >
      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <h3 className="text-text-primary font-semibold text-base leading-snug group-hover:text-accent transition-colors truncate">
          {thesis.name}
        </h3>
        {thesis.description && (
          <p className="text-text-tertiary text-xs mt-0.5 line-clamp-1 pr-4">
            {thesis.description}
          </p>
        )}
      </div>

      {/* Sparkline */}
      <div className="shrink-0 w-[72px] flex items-center justify-end">
        {hasEvidence && points.length >= 5 ? (
          <MiniSparkline points={points} trend={trend} />
        ) : (
          <span className="text-[10px] text-text-tertiary">
            {hasEvidence ? 'building…' : 'no signals'}
          </span>
        )}
      </div>
    </Link>
  )
}
