import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { cn, formatConfidence } from '@/lib/utils'
import type { ThesisSignal } from '@/lib/types'

const MOMENTUM = {
  rising: {
    icon: TrendingUp,
    label: 'Rising',
    textColor:   'text-green',
    bgColor:     'bg-green/10',
    borderColor: 'border-l-green',
  },
  flat: {
    icon: Minus,
    label: 'Flat',
    textColor:   'text-amber',
    bgColor:     'bg-amber/10',
    borderColor: 'border-l-amber',
  },
  falling: {
    icon: TrendingDown,
    label: 'Falling',
    textColor:   'text-red',
    bgColor:     'bg-red/10',
    borderColor: 'border-l-red',
  },
}

export default function SignalCard({ signal }: { signal: ThesisSignal }) {
  const m    = MOMENTUM[signal.momentum]
  const Icon = m.icon
  const total = signal.supporting_count + signal.opposing_count

  return (
    <Link
      href={`/thesis/${signal.thesis_id}`}
      className={cn(
        'block bg-surface border border-border border-l-4 rounded-xl p-4',
        'hover:bg-elevated transition-all duration-150 animate-slide-up',
        m.borderColor
      )}
    >
      <div className="flex items-start gap-4">
        {/* Left: name + badge + highlight + companies */}
        <div className="flex-1 min-w-0">
          {/* Badge row */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
              m.textColor, m.bgColor
            )}>
              <Icon size={10} strokeWidth={2.5} />
              {m.label}
            </span>
            {signal.new_evidence_count > 0 && (
              <span className="text-text-tertiary text-xs">
                +{signal.new_evidence_count} today
              </span>
            )}
          </div>

          {/* Thesis name */}
          <h3 className="text-text-primary font-semibold text-base leading-snug mb-1.5">
            {signal.thesis_name}
          </h3>

          {/* Highlight */}
          {signal.highlight && (
            <p className="text-text-secondary text-xs leading-relaxed mb-3 line-clamp-2">
              {signal.highlight}
            </p>
          )}

          {/* Companies */}
          {signal.top_companies.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {signal.top_companies.slice(0, 5).map(c => (
                <span key={c} className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-md">
                  {c}
                </span>
              ))}
              {signal.top_companies.length > 5 && (
                <span className="text-xs text-text-tertiary">
                  +{signal.top_companies.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: big confidence + supporting/opposing */}
        <div className="shrink-0 text-right space-y-1">
          <div className={cn('text-3xl font-bold tabular-nums leading-none', m.textColor)}>
            {formatConfidence(signal.confidence)}
          </div>
          <div className="text-text-tertiary text-xs">confidence</div>

          {total > 0 && (
            <div className="flex items-center gap-2 justify-end pt-1">
              <span className="text-green text-xs tabular-nums font-medium">
                {signal.supporting_count}↑
              </span>
              <span className="text-red text-xs tabular-nums font-medium">
                {signal.opposing_count}↓
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3 h-[2px] bg-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', {
            'bg-green/60':  signal.momentum === 'rising',
            'bg-amber/60':  signal.momentum === 'flat',
            'bg-red/60':    signal.momentum === 'falling',
          })}
          style={{ width: `${Math.max(signal.confidence * 100, 3)}%` }}
        />
      </div>
    </Link>
  )
}
