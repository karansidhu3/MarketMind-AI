import { formatDateShort } from '@/lib/utils'
import type { CompanyRadarItem } from '@/lib/types'

export default function CompanyRadar({ companies }: { companies: CompanyRadarItem[] }) {
  if (companies.length === 0) {
    return (
      <p className="text-text-tertiary text-xs text-center py-8 px-4">
        No companies tracked yet — run ingestion to populate.
      </p>
    )
  }

  const maxDocs = Math.max(...companies.map(c => c.doc_count), 1)

  return (
    <div>
      {companies.map((c, i) => {
        const pct = (c.doc_count / maxDocs) * 100

        return (
          <div
            key={i}
            className="relative group flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-elevated/60 transition-colors overflow-hidden"
          >
            {/* Relative-strength bar — width driven by unique doc count */}
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
                {c.thesis_names.length > 1 && (
                  <span className="ml-1 text-text-tertiary/60">+{c.thesis_names.length - 1}</span>
                )}
              </p>
            </div>

            {/* Doc count (primary) + date */}
            <div className="relative shrink-0 text-right">
              <div className="text-text-primary text-xs font-semibold tabular-nums">
                {c.doc_count} <span className="text-text-tertiary font-normal">docs</span>
              </div>
              <div className="text-text-tertiary text-xs tabular-nums">
                {formatDateShort(c.last_seen)}
              </div>
            </div>
          </div>
        )
      })}

      <p className="text-text-tertiary text-[10px] px-3 pt-2 pb-1 border-t border-border">
        Ranked by unique source documents, not mention frequency
      </p>
    </div>
  )
}
