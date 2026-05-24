'use client'

import { useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { formatDateShort, cn } from '@/lib/utils'
import { createAlert, deleteAlert } from '@/lib/api'
import type { CompanyRadarItem, CompanyAlert } from '@/lib/types'

const NEW_WITHIN_DAYS = 7

function isNew(firstSeen: string): boolean {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - NEW_WITHIN_DAYS)
  return new Date(firstSeen) >= cutoff
}

// ── Mini 4-week sparkline ─────────────────────────────────────────────────────

function MiniSparkline({ counts }: { counts: number[] }) {
  if (!counts || counts.length < 2 || counts.every(v => v === 0)) return null

  const max  = Math.max(...counts, 1)
  const W = 40, H = 16, PAD = 1.5

  const pts = counts.map((v, i) => {
    const x = PAD + (i / (counts.length - 1)) * (W - 2 * PAD)
    const y = H - PAD - (v / max) * (H - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const latest = counts[counts.length - 1]
  const prev   = counts[counts.length - 2]
  const rising = latest > prev
  const flat   = latest === prev
  const color  = rising ? 'text-green' : flat ? 'text-text-tertiary' : 'text-red'

  const lastPt   = pts.split(' ').pop()!
  const [lx, ly] = lastPt.split(',').map(parseFloat)

  return (
    <svg width={W} height={H} className={color} style={{ overflow: 'visible' }}>
      <title>{`4-week activity: ${counts.join(', ')}`}</title>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      <circle cx={lx} cy={ly} r={2.5} fill="currentColor" />
    </svg>
  )
}

// ── Alert popover ─────────────────────────────────────────────────────────────

interface AlertPopoverProps {
  company: CompanyRadarItem
  existingAlert: CompanyAlert | undefined
  onSave: (alert: CompanyAlert) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function AlertPopover({ company, existingAlert, onSave, onDelete, onClose }: AlertPopoverProps) {
  const [value,    setValue]    = useState(existingAlert?.threshold ?? company.doc_count + 2)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const alert = await createAlert({
        normalised_name: company.company_name.toLowerCase().replace(/\s+/g, ''),
        display_name: company.company_name,
        threshold: value,
      })
      onSave(alert)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existingAlert) return
    setDeleting(true)
    try {
      await deleteAlert(existingAlert.id)
      onDelete(existingAlert.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-60 animate-slide-up">
      <div className="bg-surface border border-border rounded-2xl shadow-xl shadow-background/40 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber/10 flex items-center justify-center">
              <Bell size={10} className="text-amber" />
            </div>
            <span className="text-text-primary text-xs font-semibold">Alert threshold</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-secondary rounded-md p-0.5 hover:bg-elevated transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        <p className="text-text-tertiary text-[11px] mb-3 leading-relaxed">
          Alert in feed when{' '}
          <span className="text-text-secondary font-medium">{company.company_name}</span>{' '}
          reaches this many docs.
        </p>

        {/* Input */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min={1}
            value={value}
            onChange={e => setValue(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary text-center tabular-nums focus:outline-none focus:border-accent transition-colors"
          />
          <span className="text-text-tertiary text-xs font-medium">docs</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-accent text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : existingAlert ? 'Update' : 'Set alert'}
          </button>
          {existingAlert && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 rounded-lg border border-red/30 text-red text-xs hover:bg-red/5 transition-colors disabled:opacity-50"
            >
              {deleting ? '…' : <BellOff size={12} />}
            </button>
          )}
        </div>

        {/* Current count */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-text-tertiary text-[10px]">Current</span>
          <span className="text-text-secondary text-[11px] font-semibold tabular-nums">{company.doc_count} docs</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface CompanyRadarProps {
  companies: CompanyRadarItem[]
  initialAlerts?: CompanyAlert[]
}

export default function CompanyRadar({ companies, initialAlerts = [] }: CompanyRadarProps) {
  const [alerts, setAlerts]           = useState<CompanyAlert[]>(initialAlerts)
  const [openPopover, setOpenPopover] = useState<string | null>(null)

  if (companies.length === 0) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-text-tertiary text-xs mb-1">No companies tracked yet</p>
        <p className="text-text-tertiary/60 text-[10px]">Run ingestion to populate the radar.</p>
      </div>
    )
  }

  const maxDocs = Math.max(...companies.map(c => c.doc_count), 1)

  function getAlert(company: CompanyRadarItem): CompanyAlert | undefined {
    const norm = company.company_name.toLowerCase().replace(/\s+/g, '')
    return alerts.find(a => a.normalised_name === norm)
  }

  return (
    <div>
      {/* Scrollable row list — capped so the panel never overflows the viewport */}
      <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
      {companies.map((c, i) => {
        const pct       = (c.doc_count / maxDocs) * 100
        const freshly   = isNew(c.first_seen)
        const alert     = getAlert(c)
        const norm      = c.company_name.toLowerCase().replace(/\s+/g, '')
        const isOpen    = openPopover === norm
        const triggered = alert && c.doc_count >= alert.threshold

        return (
          <div
            key={i}
            className="relative group flex items-center gap-2.5 px-3 py-2.5 border-b border-border/60 last:border-0 hover:bg-elevated/50 transition-colors"
          >
            {/* Relative-strength bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-accent/4 transition-all duration-500 group-hover:bg-accent/7 rounded-l-xl"
              style={{ width: `${pct}%` }}
            />

            {/* Rank */}
            <span className="relative text-text-tertiary text-[11px] tabular-nums w-4 shrink-0 text-right font-medium">
              {i + 1}
            </span>

            {/* Name + thesis */}
            <div className="relative flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-primary text-xs font-medium truncate leading-snug">
                  {c.company_name}
                </span>
                {c.ticker && (
                  <span className="text-accent text-[11px] font-mono shrink-0 font-medium">{c.ticker}</span>
                )}
                {freshly && (
                  <span className="text-green text-[9px] font-bold bg-green/10 px-1.5 py-0.5 rounded-full shrink-0 leading-none uppercase tracking-wide">
                    NEW
                  </span>
                )}
              </div>
              <p className="text-text-tertiary text-[11px] truncate leading-snug mt-0.5">
                {c.thesis_names[0]}
                {c.thesis_names.length > 1 && (
                  <span className="ml-1 opacity-60">+{c.thesis_names.length - 1}</span>
                )}
              </p>
            </div>

            {/* Sparkline + stats + bell */}
            <div className="relative shrink-0 flex items-center gap-2">
              <MiniSparkline counts={c.weekly_counts} />

              <div className="text-right">
                <div className="text-text-primary text-xs font-semibold tabular-nums">
                  {c.doc_count}
                  <span className="text-text-tertiary text-[10px] font-normal ml-0.5">d</span>
                </div>
                <div className="text-text-tertiary text-[10px] tabular-nums">
                  {formatDateShort(c.last_seen)}
                </div>
              </div>

              {/* Bell */}
              <div className="relative">
                <button
                  onClick={() => setOpenPopover(isOpen ? null : norm)}
                  className={cn(
                    'p-1.5 rounded-lg transition-all duration-150',
                    alert
                      ? triggered
                        ? 'text-amber bg-amber/10'
                        : 'text-accent bg-accent/10'
                      : 'text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-secondary hover:bg-elevated'
                  )}
                  title={alert ? `Alert at ${alert.threshold} docs` : 'Set alert'}
                >
                  <Bell size={11} className={alert ? 'fill-current opacity-80' : ''} />
                  {alert && (
                    <span className="absolute -top-1 -right-1 text-[8px] bg-accent text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none font-bold">
                      {alert.threshold}
                    </span>
                  )}
                </button>

                {/* Popover — fixed position, escapes overflow:hidden parents */}
                {isOpen && (
                  <AlertPopover
                    company={c}
                    existingAlert={alert}
                    onSave={newAlert => {
                      setAlerts(prev => {
                        const filtered = prev.filter(a => a.normalised_name !== newAlert.normalised_name)
                        return [...filtered, newAlert]
                      })
                      setOpenPopover(null)
                    }}
                    onDelete={id => {
                      setAlerts(prev => prev.filter(a => a.id !== id))
                      setOpenPopover(null)
                    }}
                    onClose={() => setOpenPopover(null)}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
      </div>{/* end scroll container */}

      {/* Footer — pinned outside the scroll area */}
      <p className="text-text-tertiary text-[10px] px-3 pt-2 pb-2 border-t border-border/60 leading-relaxed">
        Ranked by unique source docs · <span className="text-green font-medium">NEW</span> = first seen within {NEW_WITHIN_DAYS}d · sparkline = 4-week trend
      </p>
    </div>
  )
}
