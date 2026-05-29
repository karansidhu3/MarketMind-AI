import type { ReactNode, CSSProperties } from 'react'

export function SectionLabel({
  children, className, style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <p
      className={`text-[11px] font-medium uppercase tracking-[0.07em] text-neutral-400 ${className ?? ''}`}
      style={style}
    >
      {children}
    </p>
  )
}
