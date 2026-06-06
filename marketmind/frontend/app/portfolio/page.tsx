'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, RefreshCw, AlertCircle,
  TrendingUp, TrendingDown, Minus, ChevronRight, X, Check, Pencil,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import TickerSearch from '@/components/portfolio/TickerSearch'
import { SectionLabel } from '@/components/SectionLabel'
import { getHoldings, addHolding, updateHolding, deleteHolding, getPortfolioAlignment } from '@/lib/api'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import { useCompany } from '@/contexts/CompanyContext'
import type { HoldingOut, PortfolioAlignment, ThesisExposure, GapCompany } from '@/lib/types'

// ── Narrative ─────────────────────────────────────────────────────────────────

function buildNarrative(alignment: PortfolioAlignment): string {
  const { theses, gaps, total_holdings } = alignment
  if (total_holdings === 0 || theses.length === 0) return ''

  const covered    = theses.filter(t => t.held_companies.length > 0)
  const risingGaps = theses.filter(t => t.momentum === 'rising' && t.held_companies.length === 0)
  const topGap     = gaps[0]
  const parts: string[] = []

  if (covered.length > 0) {
    const names = [...covered]
      .sort((a, b) => b.coverage_pct - a.coverage_pct)
      .slice(0, 2)
      .map(t => t.thesis_name.split(' ').slice(0, 2).join(' '))
    parts.push(`Positioned in ${names.join(' and ')}`)
  }

  if (risingGaps.length > 0) {
    const shortName = risingGaps[0].thesis_name.split(' ').slice(0, 3).join(' ')
    parts.push(`${shortName} is strengthening — you have no exposure there`)
  } else if (topGap) {
    const shortTheme = topGap.thesis_names[0]?.split(' ').slice(0, 2).join(' ') ?? ''
    parts.push(`Top gap: ${topGap.company_name}${shortTheme ? ` in ${shortTheme}` : ''} — ${topGap.doc_count} corpus docs, not held`)
  }

  return parts.join('. ') + (parts.length ? '.' : '')
}

// ── Gap sparkline — 4-week mini bar chart ────────────────────────────────────

function GapSparkline({ counts }: { counts: number[] }) {
  if (!counts || counts.length === 0 || counts.every(v => v === 0)) return null
  const max    = Math.max(...counts, 1)
  const latest = counts[counts.length - 1]
  const prev   = counts[counts.length - 2] ?? 0
  const surge  = latest >= prev * 2 && prev > 0
  return (
    <div className="flex items-end gap-0.5" style={{ height: 20 }}>
      {counts.map((v, i) => {
        const isCurrent = i === counts.length - 1
        const heightPx  = Math.max(v === 0 ? 0 : 2, Math.round((v / max) * 20))
        return (
          <div
            key={i}
            className={cn(
              'rounded-sm',
              isCurrent && surge ? 'bg-accent' : isCurrent ? 'bg-accent/60' : 'bg-border/60'
            )}
            style={{ width: 4, height: heightPx }}
          />
        )
      })}
    </div>
  )
}

// ── Gap row ───────────────────────────────────────────────────────────────────

function GapRow({ gap, rank }: { gap: GapCompany; rank: number }) {
  const { openCompany } = useCompany()
  const clickable = !!gap.normalised_name

  return (
    <div
      className={cn(
        'relative group flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0',
        'hover:bg-elevated/50 transition-colors',
        clickable ? 'cursor-pointer' : ''
      )}
      onClick={() => clickable && openCompany(gap.normalised_name)}
    >
      <span className="text-text-tertiary text-[11px] tabular-nums w-4 shrink-0 text-right font-medium">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            'text-text-primary text-sm font-medium truncate',
            clickable ? 'group-hover:text-accent transition-colors' : ''
          )}>
            {gap.company_name}
          </span>
          {gap.ticker && (
            <span className="text-accent text-[11px] font-mono shrink-0">{gap.ticker}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {gap.thesis_names.map(t => (
            <span key={t} className="text-text-tertiary text-[10px] bg-elevated px-1.5 py-0.5 rounded-md">
              {t.split(' ').slice(0, 2).join(' ')}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 hidden sm:block">
        <GapSparkline counts={gap.weekly_counts ?? []} />
      </div>
      <div className="shrink-0 text-right">
        <div className="text-text-primary text-xs font-semibold tabular-nums">
          {gap.doc_count}
          <span className="text-text-tertiary font-normal ml-0.5 text-[10px]">docs</span>
        </div>
        <div className="text-red text-[10px] font-medium">Not held</div>
      </div>
      <ChevronRight size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-border/50 rounded animate-pulse', className)} />
}

function IntelligenceSkeleton() {
  return (
    <div className="max-w-3xl">
      <div className="border-l-2 border-border/30 pl-5 py-1 mb-10">
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-4/5 mb-3" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-3 w-24 mb-4" />
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0">
            <Skeleton className="h-3 w-4 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Holding form ──────────────────────────────────────────────────────────────

interface HoldingFormProps {
  initial?: HoldingOut
  onSave: (data: { ticker: string; company_name: string; shares: number; cost_basis?: number }) => Promise<void>
  onCancel: () => void
}

function HoldingForm({ initial, onSave, onCancel }: HoldingFormProps) {
  const [ticker,      setTicker]      = useState(initial?.ticker ?? '')
  const [companyName, setCompanyName] = useState(initial?.company_name ?? '')
  const [shares,      setShares]      = useState(initial?.shares.toString() ?? '')
  const [costBasis,   setCostBasis]   = useState(initial?.cost_basis?.toString() ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const tickerPicked = !!ticker

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim()) { setError('Select or type a ticker.'); return }
    if (!companyName.trim()) { setError('Company name is required.'); return }
    const sharesNum = parseFloat(shares)
    if (isNaN(sharesNum) || sharesNum <= 0) { setError('Shares must be a positive number.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ticker: ticker.trim().toUpperCase(),
        company_name: companyName.trim(),
        shares: sharesNum,
        cost_basis: costBasis ? parseFloat(costBasis) : undefined,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-elevated border border-border rounded-xl p-4 space-y-3">
      {initial ? (
        <TickerSearch lockedTicker={initial.ticker} onSelect={() => {}} />
      ) : tickerPicked ? (
        <div>
          <label className="text-text-tertiary text-xs mb-1 block">Ticker *</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-accent/40 rounded-lg">
            <span className="text-accent text-sm font-mono font-semibold">{ticker}</span>
            <span className="text-text-secondary text-xs flex-1 truncate">{companyName}</span>
            <button type="button" onClick={() => { setTicker(''); setCompanyName('') }}
              className="text-text-tertiary hover:text-text-secondary transition-colors ml-auto">
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <TickerSearch onSelect={entry => { setTicker(entry.ticker); setCompanyName(entry.name) }} />
          <details className="group">
            <summary className="text-text-tertiary text-[11px] cursor-pointer hover:text-text-secondary transition-colors list-none flex items-center gap-1">
              <span className="group-open:rotate-90 inline-block transition-transform">›</span>
              Not in the list? Enter manually
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-text-tertiary text-xs mb-1 block">Ticker</label>
                <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="ACME"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono uppercase" />
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-1 block">Company name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corporation"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent" />
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-text-tertiary text-xs mb-1 block">Shares *</label>
          <input type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="100"
            min="0.001" step="1" required
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-text-tertiary text-xs mb-1 block">Cost basis / share (optional)</label>
          <input type="number" value={costBasis} onChange={e => setCostBasis(e.target.value)} placeholder="e.g. 480.00"
            min="0" step="any"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent" />
        </div>
      </div>

      {error && <p className="text-red text-xs flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold">
          <Check size={12} />
          {saving ? 'Saving…' : initial ? 'Update' : 'Add holding'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-2 rounded-lg text-xs text-text-tertiary hover:text-text-secondary hover:bg-border/40 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [holdings,   setHoldings]   = useState<HoldingOut[]>([])
  const [alignment,  setAlignment]  = useState<PortfolioAlignment | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showAdd,    setShowAdd]    = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [mode,       setMode]       = useState<'intelligence' | 'configure'>('intelligence')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [h, a] = await Promise.all([getHoldings(), getPortfolioAlignment()])
      setHoldings(h)
      setAlignment(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(data: Parameters<typeof addHolding>[0]) {
    await addHolding(data)
    setShowAdd(false)
    await load()
  }

  async function handleUpdate(id: string, data: { shares?: number; cost_basis?: number }) {
    await updateHolding(id, data)
    setEditingId(null)
    await load()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    setHoldings(prev => prev.filter(h => h.id !== id))
    try {
      await deleteHolding(id)
      const a = await getPortfolioAlignment()
      setAlignment(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove holding.')
      await load()
    } finally {
      setDeleting(null)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  const coveragePct = alignment ? Math.round(alignment.overall_coverage * 100) : 0
  const narrative   = alignment ? buildNarrative(alignment) : ''

  const tickerTheses = useMemo(() => {
    if (!alignment) return {} as Record<string, ThesisExposure[]>
    const map: Record<string, ThesisExposure[]> = {}
    for (const thesis of alignment.theses) {
      for (const ticker of thesis.held_companies) {
        if (!map[ticker]) map[ticker] = []
        map[ticker].push(thesis)
      }
    }
    return map
  }, [alignment])

  // ── Intelligence mode ─────────────────────────────────────────────────────

  if (mode === 'intelligence') {
    return (
      <AppShell>
        <div className="max-w-[1400px] mx-auto px-8 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-text-primary font-serif-display text-3xl leading-tight">Portfolio</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-elevated transition-all disabled:opacity-40 active:scale-[0.97]"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setMode('configure')}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Holdings →
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {loading ? (
            <IntelligenceSkeleton />
          ) : (
            <motion.div
              key="intelligence-content"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
              className="max-w-3xl"
            >

              {/* First-run: no holdings yet */}
              {(!alignment || alignment.total_holdings === 0) ? (
                <div className="py-4">
                  <p className="text-text-secondary text-base leading-relaxed mb-6 max-w-md">
                    Connect your holdings to see which investment themes you&apos;re exposed to — and where your portfolio has gaps.
                  </p>
                  <button
                    onClick={() => setMode('configure')}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    Set up holdings
                  </button>
                </div>
              ) : (
                <>
                  {/* Narrative — editorial pull quote */}
                  <div className="border-l-2 border-accent/35 pl-5 py-1 mb-10">
                    <p className="text-text-primary text-xl font-serif-display leading-relaxed mb-2">
                      {narrative}
                    </p>
                    <p className="text-text-tertiary text-xs">
                      <span className={cn(
                        'tabular-nums mr-1',
                        coveragePct >= 30 ? 'text-green' : coveragePct >= 10 ? 'text-amber' : 'text-text-secondary'
                      )}>
                        {coveragePct}% theme coverage
                      </span>
                      · {alignment.total_holdings} position{alignment.total_holdings !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Gap signals — flat ranked list with stagger */}
                  {alignment.gaps.length > 0 && (
                    <div>
                      <SectionLabel className="mb-3">Gap signals</SectionLabel>
                      <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        {alignment.gaps.slice(0, 6).map((gap, i) => (
                          <motion.div
                            key={gap.company_name}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...spring.gentle, delay: i * 0.04 }}
                          >
                            <GapRow gap={gap} rank={i + 1} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {alignment.gaps.length === 0 && alignment.theses.length > 0 && (
                    <p className="text-text-tertiary text-sm">
                      No significant gaps — your holdings cover the active radar.
                    </p>
                  )}
                </>
              )}

            </motion.div>
          )}
        </div>
      </AppShell>
    )
  }

  // ── Configure mode ────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setMode('intelligence')}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors active:scale-[0.97]"
          >
            ← Portfolio
          </button>
          <h1 className="text-text-primary font-serif-display text-3xl leading-tight">Holdings</h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <motion.div
          key="configure-content"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="max-w-xl"
        >

          {showAdd && (
            <div className="mb-4">
              <HoldingForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
            </div>
          )}

          {holdings.length === 0 && !showAdd ? (
            <div className="py-4">
              <p className="text-text-tertiary text-sm mb-5">No holdings yet.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Add first holding
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {holdings.map(h => {
                const theses  = tickerTheses[h.ticker] ?? []
                const primary = theses[0]
                const mom     = primary?.momentum ?? 'flat'
                const MomIcon = mom === 'rising' ? TrendingUp : mom === 'falling' ? TrendingDown : Minus
                const momColor = mom === 'rising' ? 'text-green' : mom === 'falling' ? 'text-red' : 'text-text-tertiary'
                const docCount = alignment?.held_company_docs?.[h.ticker] ?? 0

                return editingId === h.id ? (
                  <div key={h.id}>
                    <HoldingForm
                      initial={h}
                      onSave={async (data) => handleUpdate(h.id, { shares: data.shares, cost_basis: data.cost_basis })}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={h.id}
                    className="group relative bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 hover:shadow-sm transition-all"
                  >
                    <div className={cn('h-0.5 w-full', mom === 'rising' ? 'bg-green/50' : mom === 'falling' ? 'bg-red/40' : 'bg-border')} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-accent font-mono font-bold text-base leading-none tracking-tight">
                          {h.ticker}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {primary && (
                            <span className={cn(
                              'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0',
                              mom === 'rising' ? 'text-green bg-green/10' :
                              mom === 'falling' ? 'text-red bg-red/10' :
                              'text-text-tertiary bg-elevated'
                            )}>
                              <MomIcon size={8} />
                              {mom === 'rising' ? 'Rising' : mom === 'falling' ? 'Falling' : 'Flat'}
                            </span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingId(h.id)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated" title="Edit">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => handleDelete(h.id)} disabled={deleting === h.id} className="p-1.5 rounded-lg text-text-tertiary hover:text-red hover:bg-red/5 disabled:opacity-50" title="Remove">
                              {deleting === h.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-text-secondary text-xs truncate mb-3">{h.company_name}</p>
                      {primary ? (
                        <p className={cn('text-[11px] truncate mb-3', momColor)}>
                          {primary.thesis_name.split(' ').slice(0, 3).join(' ')}
                          {theses.length > 1 && <span className="text-text-tertiary"> +{theses.length - 1}</span>}
                        </p>
                      ) : (
                        <div className="mb-3" />
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-text-tertiary tabular-nums pt-2.5 border-t border-border/40">
                        <span>{h.shares.toLocaleString()} sh</span>
                        {h.cost_basis && <span>· ${h.cost_basis.toFixed(2)}</span>}
                        {docCount > 0 && <span className="ml-auto text-accent font-semibold">{docCount} docs</span>}
                      </div>
                    </div>
                  </div>
                )
              })}

              {!showAdd && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 w-full justify-center text-xs text-text-tertiary hover:text-text-secondary border border-dashed border-border hover:border-border/80 rounded-xl py-3 transition-colors"
                >
                  <Plus size={12} /> Add holding
                </button>
              )}
            </div>
          )}

        </motion.div>
      </div>
    </AppShell>
  )
}
