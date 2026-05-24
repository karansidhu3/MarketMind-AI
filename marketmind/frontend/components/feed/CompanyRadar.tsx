import { formatDateShort } from '@/lib/utils'
import type { CompanyRadarItem } from '@/lib/types'

const NEW_WITHIN_DAYS = 7

function isNew(firstSeen: string): boolean {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - NEW_WITHIN_DAYS)
  return new Date(firstSeen) >= cutoff
}

// ── Mini 4-week sparkline ─────────────────────────────────────────────────────

function MiniSparkline({ counts }: { counts: number[] }) {
  if (!counts || counts.length < 2 || counts.every(v => v === 0)) return null

  const max = Math.max(...counts, 1)
  const W = 36, H = 14, PAD = 1

  const pts = counts.map((v, i) => {
    const x = PAD + (i / (counts.length - 1)) * (W - 2 * PAD)
    const y = H - PAD - (v / max) * (H - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const latest = counts[counts.length - 1]
  const prev   = counts[counts.length - 2]
  const rising = latest > prev
  const flat   = latest === prev

  const color = rising ? 'text-green' : flat ? 'text-text-tertiary' : 'text-red'

  return (
    <svg
      width={W}
      height={H}
      className={color}
      style={{ overflow: 'visible' }}
    >
      <title>{`4-week activity: ${counts.join(', ')}`}</title>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* Dot at latest point */}
      <circle
        cx={parseFloat(pts.split(' ').pop()!.split(',')[0])}
        cy={parseFloat(pts.split(' ').pop()!.split(',')[1])}
        r={2}
        fill="currentColor"
      />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompanyRadar({ companies }: { companies: CompanyRadarItem[] }) {
  if (companies.length === 0) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-text-tertiary text-xs mb-1">No companies tracked yet</p>
        <p className="text-text-tertiary/60 text-[10px]">Run ingestion to populate the radar.</p>
      </div>
    )
  }

  const maxDocs = Math.max(...companies.map(c => c.doc_count), 1)

  return (
    <div>
      {companies.map((c, i) => {
        const pct     = (c.doc_count / maxDocs) * 100
        const freshly = isNew(c.first_seen)

        return (
          <div
            key={i}
            className="relative group flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-elevated/60 transition-colors overflow-hidden"
          >
            {/* Relative-strength bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-accent/5 transition-all duration-500 group-hover:bg-accent/8"
              style={{ width: `${pct}%` }}
            />

            {/* Rank */}
            <span className="relative text-text-tertiary text-xs tabular-nums w-4 shrink-0 text-right">
              {i + 1}
            </span>

            {/* Name + thesis */}
            <div className="relative flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-primary text-xs font-medium truncate leading-snug">
                  {c.company_name}
                </span>
                {c.ticker && (
                  <span className="text-accent text-xs font-mono shrink-0">{c.ticker}</span>
                )}
                {freshly && (
                  <span className="text-green text-[9px] font-semibold bg-green/10 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                    NEW
                  </span>
                )}
              </div>
              <p className="text-text-tertiary text-xs truncate leading-snug mt-0.5">
                {c.thesis_names[0]}
                {c.thesis_names.length > 1 && (
                  <span className="ml-1 opacity-60">+{c.thesis_names.length - 1}</span>
                )}
              </p>
            </div>

            {/* Sparkline + doc count + date */}
            <div className="relative shrink-0 flex items-center gap-2">
              {/* 4-week trajectory */}
              <MiniSparkline counts={c.weekly_counts} />

              <div className="text-right">
                <div className="text-text-primary text-xs font-semibold tabular-nums">
                  {c.doc_count} <span className="text-text-tertiary font-normal">docs</span>
                </div>
                <div className="text-text-tertiary text-xs tabular-nums">
                  {formatDateShort(c.last_seen)}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <p className="text-text-tertiary text-[10px] px-3 pt-2 pb-1.5 border-t border-border">
        Ranked by unique source documents · <span className="text-green">NEW</span> = first seen within {NEW_WITHIN_DAYS}d · sparkline = 4-week trend
      </p>
    </div>
  )
}
