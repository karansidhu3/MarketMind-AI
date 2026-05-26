'use client'

/**
 * MarketMind logo mark — a rising chart line ending in a glowing node.
 *
 * The shape tells the product story: starts flat (the company is unknown),
 * then breaks upward, ends at a bright node (the moment it surfaces on radar).
 *
 * Usage:
 *   <Logo size={24} />   — icon only
 *   <Logo size={24} showWordmark />  — icon + "MarketMind" text
 */

import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export default function Logo({ size = 24, showWordmark = false, className }: LogoProps) {
  // The SVG uses a 20×20 viewBox.
  // Path: starts flat at lower-left, then breaks steeply upward to upper-right.
  // This mirrors the "0 → 3 → 8 → 23 docs" acceleration pattern in the product.
  const s = size

  return (
    <span className={cn('inline-flex items-center gap-2 shrink-0', className)}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MarketMind"
      >
        {/* ── Rising signal line ── */}
        {/* Starts nearly flat, inflects, then accelerates upward */}
        <polyline
          points="1.5,17  4,16.5  6.5,15.5  9.5,12.5  12.5,8  15.5,4  17.5,2"
          stroke="rgb(var(--accent))"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* ── Faint baseline (ground) — gives context to the rise ── */}
        <line
          x1="1.5" y1="17"
          x2="17.5" y2="17"
          stroke="rgb(var(--accent))"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.18"
        />

        {/* ── Endpoint glow ring (outer) ── */}
        <circle
          cx="17.5" cy="2"
          r="4.5"
          stroke="rgb(var(--accent))"
          strokeWidth="0.6"
          opacity="0.18"
        />

        {/* ── Endpoint glow ring (inner) ── */}
        <circle
          cx="17.5" cy="2"
          r="2.8"
          stroke="rgb(var(--accent))"
          strokeWidth="0.8"
          opacity="0.35"
        />

        {/* ── Endpoint node (filled dot) ── */}
        <circle
          cx="17.5" cy="2"
          r="2"
          fill="rgb(var(--accent))"
          opacity="0.95"
        />
      </svg>

      {showWordmark && (
        <span className="text-text-primary font-semibold tracking-tight leading-none select-none">
          Market<span className="text-accent">Mind</span>
        </span>
      )}
    </span>
  )
}
