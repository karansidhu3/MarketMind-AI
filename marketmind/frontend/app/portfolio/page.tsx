'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash2, RefreshCw, AlertCircle, BriefcaseBusiness,
  TrendingUp, TrendingDown, Minus, ChevronRight, X, Check, Pencil,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import TickerSearch from '@/components/portfolio/TickerSearch'
import { SectionLabel } from '@/components/SectionLabel'
import { getHoldings, addHolding, updateHolding, deleteHolding, getPortfolioAlignment } from '@/lib/api'
import { formatConfidence, cn } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import type { HoldingOut, PortfolioAlignment, ThesisExposure, GapCompany } from '@/lib/types'

// ── Narrative sentence ────────────────────────────────────────────────────────

function buildNarrative(alignment: PortfolioAlignment): string {
  const { theses, gaps, total_holdings } = alignment
  if (total_holdings === 0 || theses.length === 0) return ''

  const covered     = theses.filter(t => t.held_companies.length > 0)
  const risingGaps  = theses.filter(t => t.momentum === 'rising' && t.held_companies.length === 0)
  const topGap      = gaps[0]
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

// ── Featured gap card ─────────────────────────────────────────────────────────

function FeaturedGap({ gap }: { gap: GapCompany }) {
  const { openCompany } = useCompany()
  return (
    <div
      onClick={() => gap.normalised_name && openCompany(gap.normalised_name)}
      className="cursor-pointer bg-surface border border-accent/20 rounded-2xl p-5 hover:border-accent/40 hover:bg-elevated/40 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-text-tertiary text-[10px] mb-1">Gap signal</p>
          <div className="flex items-baseline gap-2">
            <span className="text-text-primary text-lg font-bold group-hover:text-accent transition-colors">
              {gap.company_name}
            </span>
            {gap.ticker && (
              <span className="text-text-tertiary text-sm font-mono">{gap.ticker}</span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-text-tertiary group-hover:text-accent transition-colors shrink-0 mt-1" />
      </div>

      <p className="text-text-secondary text-sm leading-relaxed mb-3">
        {gap.doc_count} independent corpus documents across{' '}
        {gap.thesis_names.length} theme{gap.thesis_names.length !== 1 ? 's' : ''}.{' '}
        {gap.thesis_confidence >= 0.6
          ? 'High-confidence signal. Not yet in your portfolio.'
          : 'Emerging signal. Not yet in your portfolio.'}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {gap.thesis_names.slice(0, 3).map(t => (
          <span key={t} className="text-[11px] text-text-tertiary bg-elevated border border-border/60 px-2 py-0.5 rounded-md">
            {t}
          </span>
        ))}
        <span className="ml-auto text-accent text-xs font-semibold">
          {gap.doc_count} docs · {Math.round(gap.thesis_confidence * 100)}% conf
        </span>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-border/50 rounded animate-pulse', className)} />
}

// ── Add / edit holding form ───────────────────────────────────────────────────

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

  // Whether the user has already picked a ticker (hides the fallback manual inputs)
  const tickerPicked = !!ticker

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim()) { setError('Select or type a ticker.'); return }
    if (!companyName.trim()) { setError('Company name is required.'); return }
    const sharesNum = parseFloat(shares)
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError('Shares must be a positive number.')
      return
    }
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

      {/* ── Ticker / company search ── */}
      {initial ? (
        /* Edit mode: ticker is locked, only shares + cost basis change */
        <TickerSearch lockedTicker={initial.ticker} onSelect={() => {}} />
      ) : tickerPicked ? (
        /* Selection made: show chip + clear button */
        <div>
          <label className="text-text-tertiary text-xs mb-1 block">Ticker *</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-accent/40 rounded-lg">
            <span className="text-accent text-sm font-mono font-semibold">{ticker}</span>
            <span className="text-text-secondary text-xs flex-1 truncate">{companyName}</span>
            <button
              type="button"
              onClick={() => { setTicker(''); setCompanyName('') }}
              className="text-text-tertiary hover:text-text-secondary transition-colors ml-auto"
              title="Change selection"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* No selection yet: show search */
        <div className="space-y-2">
          <TickerSearch
            onSelect={entry => {
              setTicker(entry.ticker)
              setCompanyName(entry.name)
            }}
          />
          {/* Fallback: manual entry if ticker not in the bundled list */}
          <details className="group">
            <summary className="text-text-tertiary text-[11px] cursor-pointer hover:text-text-secondary transition-colors list-none flex items-center gap-1">
              <span className="group-open:rotate-90 inline-block transition-transform">›</span>
              Not in the list? Enter manually
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-text-tertiary text-xs mb-1 block">Ticker</label>
                <input
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="ACME"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-1 block">Company name</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </details>
        </div>
      )}

      {/* ── Shares + cost basis ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-text-tertiary text-xs mb-1 block">Shares *</label>
          <input
            type="number"
            value={shares}
            onChange={e => setShares(e.target.value)}
            placeholder="100"
            min="0.001"
            step="1"
            required
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-text-tertiary text-xs mb-1 block">Cost basis / share (optional)</label>
          <input
            type="number"
            value={costBasis}
            onChange={e => setCostBasis(e.target.value)}
            placeholder="e.g. 480.00"
            min="0"
            step="any"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && (
        <p className="text-red text-xs flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
        >
          <Check size={12} />
          {saving ? 'Saving…' : initial ? 'Update' : 'Add holding'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-xs text-text-tertiary hover:text-text-secondary hover:bg-border/40 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Thesis exposure card ──────────────────────────────────────────────────────

function ExposureCard({ exposure }: { exposure: ThesisExposure }) {
  const pct = Math.round(exposure.coverage_pct * 100)
  const hasHoldings = exposure.held_companies.length > 0
  const MomIcon = exposure.momentum === 'rising' ? TrendingUp : exposure.momentum === 'falling' ? TrendingDown : Minus
  const momColor = exposure.momentum === 'rising' ? 'text-green' : exposure.momentum === 'falling' ? 'text-red' : 'text-text-tertiary'

  return (
    <div className="bg-surface border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
      {/* Thesis name — most important, reads first */}
      <p className="text-text-primary text-sm font-semibold leading-snug truncate mb-1">
        {exposure.thesis_name}
      </p>

      {/* Momentum label — health before numbers */}
      <span className={cn('inline-flex items-center gap-1 text-[11px] mb-3', momColor)}>
        <MomIcon size={9} />
        <span className="capitalize">{exposure.momentum}</span>
      </span>

      {/* Coverage bar — taller, more visible */}
      <div className="h-2 bg-border/40 rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct >= 30 ? 'bg-green/70' : pct >= 10 ? 'bg-amber/70' : 'bg-border'
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      {/* Numbers — tertiary, supporting */}
      <p className="text-text-tertiary text-[11px] tabular-nums mb-3">
        <span className={cn('font-semibold', pct >= 30 ? 'text-green' : pct >= 10 ? 'text-amber' : 'text-text-tertiary')}>
          {pct}%
        </span>
        {' covered · '}{formatConfidence(exposure.confidence)} conf · {exposure.total_companies} co.
      </p>

      {/* Holdings in this thesis */}
      {hasHoldings ? (
        <div className="flex flex-wrap gap-1.5">
          {exposure.held_companies.map(ticker => (
            <span key={ticker} className="text-[11px] font-mono text-accent bg-accent/8 border border-accent/15 px-2 py-0.5 rounded-md font-medium">
              {ticker}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── Gap company row ───────────────────────────────────────────────────────────

function GapRow({ gap, rank }: { gap: GapCompany; rank: number }) {
  // GapRow renders inside AppShell → CompanyProvider, so the hook resolves correctly here
  const { openCompany } = useCompany()
  const clickable = !!gap.normalised_name

  return (
    <div
      className={cn(
        "relative group flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-elevated/50 transition-colors",
        clickable ? "cursor-pointer" : ""
      )}
      onClick={() => clickable && openCompany(gap.normalised_name)}
    >
      <span className="text-text-tertiary text-[11px] tabular-nums w-4 shrink-0 text-right font-medium">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            "text-text-primary text-xs font-medium truncate",
            clickable ? "group-hover:text-accent transition-colors" : ""
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
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-text-primary text-xs font-semibold tabular-nums">
          {gap.doc_count}
          <span className="text-text-tertiary font-normal ml-0.5 text-[10px]">docs</span>
        </div>
        <div className="text-text-tertiary text-[10px]">
          {formatConfidence(gap.thesis_confidence)} conf
        </div>
      </div>
      <ChevronRight size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [holdings,   setHoldings]   = useState<HoldingOut[]>([])
  const [alignment,  setAlignment]  = useState<PortfolioAlignment | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showAdd,        setShowAdd]        = useState(false)
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [refreshing,     setRefreshing]     = useState(false)

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
    // Optimistically remove immediately so the row disappears without waiting
    setHoldings(prev => prev.filter(h => h.id !== id))
    try {
      await deleteHolding(id)
      // Silently refresh alignment without triggering the loading skeleton
      const a = await getPortfolioAlignment()
      setAlignment(a)
    } catch (e: unknown) {
      // On failure restore the full state
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

  // ticker → theses that list it as a held company
  const tickerTheses = useMemo(() => {
    if (!alignment) return {} as Record<string, import('@/lib/types').ThesisExposure[]>
    const map: Record<string, import('@/lib/types').ThesisExposure[]> = {}
    for (const thesis of alignment.theses) {
      for (const ticker of thesis.held_companies) {
        if (!map[ticker]) map[ticker] = []
        map[ticker].push(thesis)
      }
    }
    return map
  }, [alignment])

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-serif-display text-3xl leading-tight">Portfolio</h1>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-elevated transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ── Stats strip — inline, no cards ── */}
        {!loading && alignment && (
          <div className="flex items-start gap-10 mb-8 pb-5 border-b border-border/50">
            {[
              { label: 'positions', value: String(alignment.total_holdings), color: 'text-text-primary' },
              { label: 'theme coverage', value: `${coveragePct}%`, color: coveragePct >= 30 ? 'text-green' : coveragePct >= 10 ? 'text-amber' : 'text-text-secondary' },
              { label: 'rising themes', value: String(alignment.theses.filter(t => t.momentum === 'rising').length), color: 'text-accent' },
              { label: 'gap signals', value: String(alignment.gaps.length), color: alignment.gaps.length > 0 ? 'text-amber' : 'text-text-secondary' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className={cn('text-2xl font-serif-display leading-none tabular-nums', color)}>{value}</p>
                <p className="text-text-tertiary text-[11px] mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          /* ── Skeleton ── */
          <div className="flex gap-6 items-start">
            <div className="flex-[4] space-y-3">
              <Skeleton className="h-5 w-32 mb-2" />
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
            <div className="flex-[6] space-y-4">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        ) : (
          <div className="flex gap-6 items-start">

            {/* ── Left: Holdings ── always visible, proper cards ── */}
            <div className="flex-[4] min-w-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <SectionLabel>Positions</SectionLabel>
                <span className="text-text-tertiary text-[11px] tabular-nums">{holdings.length}</span>
              </div>

              {showAdd && (
                <div className="mb-3">
                  <HoldingForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
                </div>
              )}

              {holdings.length === 0 && !showAdd ? (
                <div className="bg-surface border border-border rounded-xl py-12 px-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-3">
                    <BriefcaseBusiness size={18} className="text-text-tertiary" />
                  </div>
                  <p className="text-text-primary text-sm font-medium mb-1">No positions yet</p>
                  <p className="text-text-tertiary text-xs leading-relaxed max-w-[200px] mx-auto mb-4">
                    Add holdings to see which themes you&apos;re exposed to.
                  </p>
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
                    const theses = tickerTheses[h.ticker] ?? []
                    const docCount = alignment?.held_company_docs?.[h.ticker] ?? 0
                    const primary = theses[0]
                    const mom = primary?.momentum ?? 'flat'
                    const MomIcon = mom === 'rising' ? TrendingUp : mom === 'falling' ? TrendingDown : Minus
                    const momColor = mom === 'rising' ? 'text-green' : mom === 'falling' ? 'text-red' : 'text-text-tertiary'

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
                        {/* Top accent bar — momentum color */}
                        <div className={cn(
                          'h-0.5 w-full',
                          mom === 'rising' ? 'bg-green/50' : mom === 'falling' ? 'bg-red/40' : 'bg-border'
                        )} />

                        <div className="p-4">
                          {/* Row 1: ticker + momentum badge + actions */}
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

                          {/* Row 2: company name */}
                          <p className="text-text-secondary text-xs truncate mb-3">{h.company_name}</p>

                          {/* Row 3: thesis signal */}
                          {primary ? (
                            <p className={cn('text-[11px] truncate mb-3', momColor)}>
                              {primary.thesis_name.split(' ').slice(0, 3).join(' ')}
                              {theses.length > 1 && <span className="text-text-tertiary"> +{theses.length - 1}</span>}
                            </p>
                          ) : (
                            <div className="mb-3" />
                          )}

                          {/* Row 4: position stats */}
                          <div className="flex items-center gap-2 text-[11px] text-text-tertiary tabular-nums pt-2.5 border-t border-border/40">
                            <span>{h.shares.toLocaleString()} sh</span>
                            {h.cost_basis && <span>· ${h.cost_basis.toFixed(2)}</span>}
                            {docCount > 0 && (
                              <span className="ml-auto text-accent font-semibold">{docCount} docs</span>
                            )}
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
            </div>

            {/* ── Right: Intelligence — narrative + exposure + gaps ── */}
            <div className="flex-[6] min-w-0 space-y-5">

              {/* Narrative — editorial pull quote, no card */}
              <div className="border-l-2 border-accent/35 pl-5 py-1 mb-1">
                <p className="text-text-primary text-xl font-serif-display leading-relaxed mb-2">
                  {narrative || 'Add holdings to see how your portfolio aligns with your tracked themes.'}
                </p>
                {alignment && (
                  <p className="text-text-tertiary text-xs">
                    <span className={cn(
                      'tabular-nums mr-1',
                      coveragePct >= 30 ? 'text-green' : coveragePct >= 10 ? 'text-amber' : 'text-text-secondary'
                    )}>
                      {coveragePct}% theme coverage
                    </span>
                    · {alignment.total_holdings} position{alignment.total_holdings !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {alignment && (
                <>
                  {/* Thesis exposure grid */}
                  {alignment.theses.length > 0 && (
                    <div>
                      <SectionLabel className="mb-3 px-1">Theme exposure</SectionLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {alignment.theses.map(e => (
                          <ExposureCard key={e.thesis_id} exposure={e} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gap signals */}
                  {alignment.gaps.length > 0 && (
                    <div className="space-y-3">
                      <FeaturedGap gap={alignment.gaps[0]} />
                      {alignment.gaps.length > 1 && (
                        <div className="bg-surface border border-border rounded-xl">
                          {alignment.gaps.slice(1, 4).map((gap, i) => (
                            <GapRow key={`${gap.company_name}-${i}`} gap={gap} rank={i + 2} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {alignment.gaps.length === 0 && alignment.theses.length > 0 && (
                    <p className="text-text-tertiary text-sm py-4">No significant gaps — your holdings cover the active radar.</p>
                  )}
                </>
              )}

              {!alignment && (
                <div className="bg-surface border border-border rounded-xl py-12 px-6 text-center">
                  <p className="text-text-tertiary text-sm">Add holdings to see alignment data.</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
