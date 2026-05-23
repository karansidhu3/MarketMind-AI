import Link from 'next/link'
import { cn, formatConfidence } from '@/lib/utils'
import type { ThesisOut } from '@/lib/types'

export default function ThesisCard({ thesis }: { thesis: ThesisOut }) {
  const total = thesis.supporting_count + thesis.opposing_count
  const hasEvidence = total > 0

  return (
    <Link
      href={`/thesis/${thesis.id}`}
      className="block bg-surface border border-border rounded-xl p-4 hover:bg-elevated hover:border-border-subtle transition-all duration-150 animate-slide-up"
    >
      {/* Name + system badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-text-primary font-semibold text-sm leading-snug">
          {thesis.name}
        </h3>
        {thesis.is_system && (
          <span className="shrink-0 text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full">
            System
          </span>
        )}
      </div>

      {/* Description */}
      {thesis.description && (
        <p className="text-text-secondary text-xs leading-relaxed mb-3 line-clamp-2">
          {thesis.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <div className="text-text-primary text-sm font-semibold tabular-nums">
            {thesis.evidence_count}
          </div>
          <div className="text-text-tertiary text-xs">signals</div>
        </div>
        <div className="text-center">
          <div className="text-green text-sm font-semibold tabular-nums">
            {thesis.supporting_count}
          </div>
          <div className="text-text-tertiary text-xs">support</div>
        </div>
        <div className="text-center">
          <div className="text-red text-sm font-semibold tabular-nums">
            {thesis.opposing_count}
          </div>
          <div className="text-text-tertiary text-xs">oppose</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-text-primary text-sm font-semibold tabular-nums">
            {formatConfidence(thesis.confidence)}
          </div>
          <div className="text-text-tertiary text-xs">confidence</div>
        </div>
      </div>

      {/* Confidence bar — supporting vs opposing */}
      {hasEvidence && (
        <div className="h-[2px] bg-border rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-green/60 rounded-full"
            style={{ width: `${thesis.confidence * 100}%` }}
          />
        </div>
      )}

      {/* Keywords */}
      {thesis.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {thesis.keywords.slice(0, 6).map(kw => (
            <span key={kw} className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-md">
              {kw}
            </span>
          ))}
          {thesis.keywords.length > 6 && (
            <span className="text-xs text-text-tertiary">+{thesis.keywords.length - 6}</span>
          )}
        </div>
      )}
    </Link>
  )
}
