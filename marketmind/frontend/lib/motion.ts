export const spring = {
  standard: { type: 'spring' as const, stiffness: 320, damping: 30 },
  gentle:   { type: 'spring' as const, stiffness: 180, damping: 26 },
  snappy:   { type: 'spring' as const, stiffness: 520, damping: 32 },
  bouncy:   { type: 'spring' as const, stiffness: 420, damping: 14 },
}
