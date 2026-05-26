'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { searchTickers, type TickerEntry } from '@/lib/tickers'
import { cn } from '@/lib/utils'

interface TickerSearchProps {
  onSelect: (entry: TickerEntry) => void
  /** If provided, shows a locked read-only ticker (edit mode) */
  lockedTicker?: string
}

export default function TickerSearch({ onSelect, lockedTicker }: TickerSearchProps) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<TickerEntry[]>([])
  const [open,    setOpen]    = useState(false)
  const [cursor,  setCursor]  = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // ── Search ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const hits = searchTickers(query)
    setResults(hits)
    setCursor(-1)
    setOpen(hits.length > 0 && query.length > 0)
  }, [query])

  // ── Click outside to close ────────────────────────────────────────────────────
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // ── Keyboard navigation ───────────────────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (cursor >= 0 && results[cursor]) pick(results[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function pick(entry: TickerEntry) {
    onSelect(entry)
    setQuery('')
    setOpen(false)
    setCursor(-1)
  }

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Edit mode: ticker is already set; show it as a locked chip
  if (lockedTicker) {
    return (
      <div>
        <label className="text-text-tertiary text-xs mb-1 block">Ticker</label>
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg opacity-60 cursor-not-allowed">
          <span className="text-accent text-sm font-mono font-semibold">{lockedTicker}</span>
          <span className="text-text-tertiary text-xs">(editing shares / cost basis)</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-text-tertiary text-xs mb-1 block">
        Search ticker or company name *
      </label>

      {/* Input */}
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-3 text-text-tertiary pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && query && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder='Type "NVDA" or "NVIDIA"…'
          className="w-full bg-surface border border-border rounded-lg pl-8 pr-8 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-elevated border border-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((entry, i) => (
            <button
              key={entry.ticker}
              type="button"
              onMouseEnter={() => setCursor(i)}
              onClick={() => pick(entry)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                i === cursor ? 'bg-accent/10' : 'hover:bg-border/30'
              )}
            >
              <span className="text-accent text-xs font-mono font-semibold w-14 shrink-0">
                {entry.ticker}
              </span>
              <span className="text-text-primary text-xs flex-1 truncate">
                {entry.name}
              </span>
              {entry.sector && (
                <span className="text-text-tertiary text-[10px] shrink-0 hidden sm:block">
                  {entry.sector}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results hint */}
      {open && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-elevated border border-border rounded-xl shadow-xl px-3 py-3 text-center">
          <p className="text-text-tertiary text-xs">
            No match. You can still type the ticker manually below.
          </p>
        </div>
      )}
    </div>
  )
}
