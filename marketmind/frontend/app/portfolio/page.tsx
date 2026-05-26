'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash2, RefreshCw, AlertCircle, BriefcaseBusiness,
  TrendingUp, TrendingDown, Minus, ChevronRight, X, Check, Pencil,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import TickerSearch from '@/components/portfolio/TickerSearch'
import { getHoldings, addHolding, updateHolding, deleteHolding, getPortfolioAlignment } from '@/lib/api'
import { formatConfidence, cn } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import type { HoldingOut, PortfolioAlignment, ThesisExposure, GapCompany } from '@/lib/types'

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
            min="0.0001"
            step="any"
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
          className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-xs font-semibold leading-snug truncate">
            {exposure.thesis_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-text-tertiary text-[11px]">
              Confidence: <span className="text-text-secondary font-medium">{formatConfidence(exposure.confidence)}</span>
              {' · '}
              {exposure.total_companies} companies
            </p>
            <span className={cn('flex items-center gap-0.5 text-[11px]', momColor)}>
              <MomIcon size={9} />
              <span>{exposure.momentum}</span>
            </span>
          </div>
        </div>
        <span className={cn(
          'text-xs font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-full',
          pct >= 30 ? 'text-green bg-green/10' :
          pct >= 10 ? 'text-amber bg-amber/10' :
          'text-text-tertiary bg-elevated'
        )}>
          {pct}%
        </span>
      </div>

      {/* Coverage bar */}
      <div className="h-1.5 bg-border/50 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct >= 30 ? 'bg-green/60' : pct >= 10 ? 'bg-amber/60' : 'bg-border'
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      {/* Holdings in this thesis */}
      {hasHoldings ? (
        <div className="flex flex-wrap gap-1.5">
          {exposure.held_companies.map(ticker => (
            <span key={ticker} className="text-[11px] font-mono text-accent bg-accent/8 border border-accent/15 px-2 py-0.5 rounded-md font-medium">
              {ticker}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-text-tertiary text-[11px] italic">No holdings in this thesis yet.</p>
      )}
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
  const [showAdd,    setShowAdd]    = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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
    try {
      await deleteHolding(id)
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-text-primary font-semibold text-base leading-tight">Portfolio</h1>
            <p className="text-text-tertiary text-xs mt-0.5">
              Track your holdings. See which theses you&apos;re exposed to — and where the gaps are.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-elevated transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          /* ── Skeleton ── */
          <div className="flex gap-6 items-start">
            <div className="flex-[5] space-y-3">
              <Skeleton className="h-8 w-40 mb-4" />
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
            <div className="flex-[7] space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 items-start">

            {/* ── Left: holdings list ── */}
            <div className="flex-[5] min-w-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                  Holdings
                </h2>
                <span className="text-text-tertiary text-xs tabular-nums">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Add form */}
              {showAdd && (
                <div className="mb-3">
                  <HoldingForm
                    onSave={handleAdd}
                    onCancel={() => setShowAdd(false)}
                  />
                </div>
              )}

              {/* Holdings list */}
              {holdings.length === 0 && !showAdd ? (
                <div className="bg-surface border border-border rounded-xl py-12 px-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-3">
                    <BriefcaseBusiness size={18} className="text-text-tertiary" />
                  </div>
                  <p className="text-text-primary text-sm font-medium mb-1">No holdings yet</p>
                  <p className="text-text-tertiary text-xs leading-relaxed max-w-[240px] mx-auto mb-4">
                    Add your positions to see which theses you&apos;re exposed to and where the gaps are.
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Add first holding
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden mb-3">
                    {holdings.map(h => (
                      editingId === h.id ? (
                        <div key={h.id} className="p-3 border-b border-border last:border-0">
                          <HoldingForm
                            initial={h}
                            onSave={async (data) => handleUpdate(h.id, { shares: data.shares, cost_basis: data.cost_basis })}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      ) : (
                        <div
                          key={h.id}
                          className="group flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-elevated/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-accent text-xs font-mono font-semibold">{h.ticker}</span>
                              <span className="text-text-primary text-xs truncate">{h.company_name}</span>
                            </div>
                            <div className="text-text-tertiary text-[11px] mt-0.5 flex items-center gap-2">
                              <span className="tabular-nums">{h.shares.toLocaleString()} shares</span>
                              {h.cost_basis && (
                                <span className="tabular-nums">· ${h.cost_basis.toFixed(2)} cost</span>
                              )}
                            </div>
                            {/* Corpus context line */}
                            {(() => {
                              const theses = tickerTheses[h.ticker] ?? []
                              const docCount = alignment?.held_company_docs?.[h.ticker] ?? 0
                              if (theses.length === 0 && docCount === 0) return null
                              const primary = theses[0]
                              const mom = primary?.momentum ?? 'flat'
                              const MomIcon = mom === 'rising' ? TrendingUp : mom === 'falling' ? TrendingDown : Minus
                              const momColor = mom === 'rising' ? 'text-green' : mom === 'falling' ? 'text-red' : 'text-text-tertiary'
                              return (
                                <div className="text-text-tertiary text-[11px] mt-1 flex items-center gap-1.5 flex-wrap">
                                  {primary && (
                                    <span className={cn('flex items-center gap-0.5', momColor)}>
                                      <MomIcon size={9} />
                                      <span className="text-text-tertiary">{primary.thesis_name.split(' ').slice(0, 3).join(' ')}</span>
                                    </span>
                                  )}
                                  {theses.length > 1 && (
                                    <span className="text-text-tertiary">+{theses.length - 1} more</span>
                                  )}
                                  {docCount > 0 && (
                                    <span className="text-text-tertiary">
                                      · <span className="tabular-nums">{docCount}</span> corpus doc{docCount !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          {/* Actions — visible on hover */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingId(h.id)}
                              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-elevated transition-colors"
                              title="Edit"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(h.id)}
                              disabled={deleting === h.id}
                              className="p-1.5 rounded-lg text-text-tertiary hover:text-red hover:bg-red/5 transition-colors disabled:opacity-50"
                              title="Remove"
                            >
                              {deleting === h.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>

                  {!showAdd && (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1.5 w-full justify-center text-xs text-text-tertiary hover:text-text-secondary border border-dashed border-border hover:border-border rounded-xl py-2.5 transition-colors"
                    >
                      <Plus size={12} />
                      Add holding
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ── Right: alignment + gaps ── */}
            <div className="flex-[7] min-w-0 space-y-6">

              {alignment && (
                <>
                  {/* Overall coverage banner */}
                  <div className="relative bg-surface border border-border rounded-2xl p-5 overflow-hidden">
                    <div
                      aria-hidden
                      className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                      style={{ background: 'radial-gradient(circle, rgb(var(--accent) / 0.06), transparent 70%)' }}
                    />
                    <div className="relative flex items-center gap-5">
                      {/* Big coverage number */}
                      <div className="shrink-0 text-center">
                        <div className={cn(
                          'text-4xl font-bold tabular-nums leading-none',
                          coveragePct >= 30 ? 'text-green' :
                          coveragePct >= 10 ? 'text-amber' :
                          'text-text-tertiary'
                        )}>
                          {coveragePct}%
                        </div>
                        <div className="text-text-tertiary text-[10px] uppercase tracking-wide mt-1 font-medium">
                          thesis coverage
                        </div>
                      </div>

                      <div className="w-px h-12 bg-border shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-semibold mb-1">Portfolio Alignment</p>
                        <p className="text-text-secondary text-xs leading-relaxed">
                          {coveragePct === 0
                            ? 'Add holdings to see how your portfolio aligns with your tracked theses.'
                            : coveragePct < 15
                            ? 'Low overlap. Most thesis companies aren\'t in your portfolio yet — review the gaps below.'
                            : coveragePct < 40
                            ? 'Moderate overlap. You\'re exposed to some thesis companies; significant gaps remain.'
                            : 'Strong overlap. Your portfolio tracks well with your active investment theses.'}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-text-primary text-sm font-semibold tabular-nums">{alignment.total_holdings}</div>
                        <div className="text-text-tertiary text-xs">positions</div>
                      </div>
                    </div>
                  </div>

                  {/* Thesis breakdown */}
                  {alignment.theses.length > 0 && (
                    <div>
                      <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-3 px-1">
                        Thesis Exposure
                      </h2>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {alignment.theses.map(e => (
                          <ExposureCard key={e.thesis_id} exposure={e} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {alignment.gaps.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest">
                          Exposure Gaps
                        </h2>
                        <span className="text-text-tertiary text-xs">
                          Companies on radar you don&apos;t hold · ranked by signal strength
                        </span>
                      </div>
                      <div className="bg-surface border border-border rounded-xl">
                        {alignment.gaps.map((gap, i) => (
                          <GapRow key={`${gap.company_name}-${i}`} gap={gap} rank={i + 1} />
                        ))}
                      </div>
                    </div>
                  )}

                  {alignment.gaps.length === 0 && alignment.theses.length > 0 && (
                    <div className="bg-surface border border-green/20 rounded-xl py-8 px-6 text-center">
                      <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-2">
                        <Check size={14} className="text-green" />
                      </div>
                      <p className="text-text-primary text-sm font-medium">No significant gaps found</p>
                      <p className="text-text-tertiary text-xs mt-1">
                        Your holdings cover the companies currently on the radar.
                      </p>
                    </div>
                  )}
                </>
              )}

              {!alignment && !loading && (
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
