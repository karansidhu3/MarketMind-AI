'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  /** Defaults to a small help circle icon */
  children?: React.ReactNode
  className?: string
  /** Where the tooltip appears relative to the trigger. Default: 'top' */
  position?: 'top' | 'bottom'
}

/**
 * Lightweight hover tooltip.
 * Wrap any element, or use standalone for the default help-circle icon.
 *
 * Usage:
 *   <Tooltip content="67% of scored signals support this theme." />
 *   <Tooltip content="…"><span>hover me</span></Tooltip>
 */
export function Tooltip({ content, children, className, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <span
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children ?? (
        <HelpCircle size={11} className="text-text-tertiary/50 cursor-help hover:text-text-tertiary transition-colors" />
      )}

      {show && (
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-50',
            'w-max max-w-[220px] px-3 py-2 rounded-lg',
            'bg-elevated border border-border shadow-xl',
            'text-text-secondary text-[11px] leading-relaxed text-center',
            'pointer-events-none whitespace-normal',
            position === 'top'    && 'bottom-full mb-2',
            position === 'bottom' && 'top-full mt-2',
          )}
        >
          {content}
          {/* Arrow */}
          <span
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-0 h-0',
              'border-l-4 border-r-4 border-l-transparent border-r-transparent',
              position === 'top'    && 'top-full border-t-4 border-t-elevated',
              position === 'bottom' && 'bottom-full border-b-4 border-b-elevated',
            )}
          />
        </span>
      )}
    </span>
  )
}
