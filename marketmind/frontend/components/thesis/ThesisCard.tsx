import Link from 'next/link'
import { cn, formatConfidence } from '@/lib/utils'
import type { ThesisOut } from '@/lib/types'

export default function ThesisCard({ thesis }: { thesis: ThesisOut }) {
  const hasEvidence = thesis.evidence_count > 0

  return (
    <Link
      href={`/thesis/${thesis.id}`}
      className={cn(
        'block bg-surface border border-border rounded-xl p-4',
        'hover:bg-elevated hover:border-border-subtle transition-all duration-150 animate-slide-up',
        !hasEvidence && 'opacity-70'
      )}
    >
      {/* Name + badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-text-primary font-semibold text-sm leading-snug">
          {thesis.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {!hasEvidence && (
            <span className="text-xs text-amber bg-amber/10 px-2 py-0.5 rounded-full">
              No data
            </span>
          )}
          {thesis.is_system && (
            <span className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full">
              System
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {thesis.description && (
        <p className="text-text-secondary text-xs leading-relaxed mb-3 line-clamp-2">
          {thesis.description}
        </p>
      )}

      {hasEvidence ? (
        <>
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

          {/* Confidence bar */}
          <div className="h-[2px] bg-border rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-green/60 rounded-full"
              style={{ width: `${thesis.confidence * 100}%` }}
            />
          </div>
        </>
      ) : (
        /* No evidence — helpful empty state, not fake zeros */
        <div className="flex items-center gap-2 mb-3 py-2 text-text-tertiary text-xs">
          <span>No signals yet — open to run corpus evaluation</span>
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
