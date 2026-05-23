import { formatDateShort } from '@/lib/utils'
import type { CompanyRadarItem } from '@/lib/types'

export default function CompanyRadar({ companies }: { companies: CompanyRadarItem[] }) {
  if (companies.length === 0) {
    return (
      <p className="text-text-tertiary text-xs text-center py-8 px-4">
        No companies tracked yet.
      </p>
    )
  }

  const maxMentions = Math.max(...companies.map(c => c.mention_count), 1)

  return (
    <div>
      {companies.map((c, i) => {
        const pct = (c.mention_count / maxMentions) * 100

        return (
          <div
            key={i}
            className="relative group flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-elevated/60 transition-colors overflow-hidden"
          >
            {/* Relative-strength background bar */}
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
              </div>
              <p className="text-text-tertiary text-xs truncate leading-snug mt-0.5">
                {c.thesis_names[0]}
              </p>
            </div>

            {/* Mentions + date */}
            <div className="relative shrink-0 text-right">
              <div className="text-text-primary text-xs font-semibold tabular-nums">
                {c.mention_count}×
              </div>
              <div className="text-text-tertiary text-xs">
                {formatDateShort(c.last_seen)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
