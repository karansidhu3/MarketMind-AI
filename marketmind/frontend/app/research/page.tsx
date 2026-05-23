'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ExternalLink, RefreshCw, Search } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { research } from '@/lib/api'
import { formatConfidence, cn } from '@/lib/utils'
import type { ResearchResponse } from '@/lib/types'

const STARTER_QUERIES = [
  'Which companies are most exposed to AI chip bottlenecks?',
  'What is the current state of grid modernization investment?',
  'Are there early signs of defense production ramping?',
  'What are the key risks to data center growth?',
]

export default function ResearchPage() {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState<ResearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [elapsed, setElapsed] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [query])

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [loading])

  async function handleSubmit(q?: string) {
    const q_ = (q ?? query).trim()
    if (!q_ || loading) return
    if (q) setQuery(q)
    setError('')
    setLoading(true)
    setResult(null)
    try {
      setResult(await research(q_))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Research failed.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const credColor = (score: number) =>
    score >= 0.8 ? 'text-green' : score >= 0.5 ? 'text-amber' : 'text-red'

  return (
    <AppShell>
      <div className="max-w-[800px] mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-text-primary text-2xl font-semibold tracking-tight">Research</h1>
          <p className="text-text-tertiary text-sm mt-0.5">
            Ask anything about your market database.
          </p>
        </div>

        {/* Query input */}
        <div className="relative bg-surface border border-border rounded-xl overflow-hidden focus-within:border-accent transition-colors mb-4">
          <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
            <Search size={16} className="text-text-tertiary mt-0.5 shrink-0" />
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about market trends, companies, or investment theses…"
              rows={1}
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary text-sm resize-none focus:outline-none leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-text-tertiary text-xs">⏎ send · ⇧⏎ new line</span>
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || loading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                query.trim() && !loading
                  ? 'bg-accent text-white hover:opacity-90'
                  : 'bg-elevated text-text-tertiary cursor-not-allowed'
              )}
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              Ask
            </button>
          </div>
        </div>

        {/* Starter queries */}
        {!result && !loading && !error && (
          <div className="mb-8">
            <p className="text-text-tertiary text-xs mb-2.5">Try asking:</p>
            <div className="space-y-1.5">
              {STARTER_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg bg-surface border border-border text-text-secondary text-sm hover:bg-elevated hover:text-text-primary transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3 py-8">
            <div className="flex items-center gap-2.5 text-text-secondary">
              <RefreshCw size={14} className="animate-spin shrink-0" />
              <span className="text-sm">Searching your market database…</span>
              <span className="text-text-tertiary text-xs tabular-nums ml-auto">{elapsed}s</span>
            </div>
            <div className="h-0.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent/40 rounded-full animate-pulse-subtle" style={{ width: '60%' }} />
            </div>
            <p className="text-text-tertiary text-xs">
              Local LLM is retrieving and synthesising relevant evidence — complex queries can take 60–120 seconds.
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-5 animate-slide-up">
            {/* Answer */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-widest">Answer</span>
                <span className="text-text-tertiary text-xs tabular-nums">
                  {formatConfidence(result.confidence)} confidence
                </span>
              </div>
              <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </p>
            </div>

            {/* Evidence snippets */}
            {result.evidence.length > 0 && (
              <div>
                <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2.5">
                  Key Evidence
                </h2>
                <div className="space-y-2">
                  {result.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="bg-surface border border-border rounded-xl px-4 py-3 text-text-secondary text-xs leading-relaxed"
                    >
                      <span className="text-text-tertiary font-mono mr-2">{i + 1}.</span>
                      {ev}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {result.sources.length > 0 && (
              <div>
                <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-2.5">
                  Sources
                </h2>
                <div className="space-y-1.5">
                  {result.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg bg-surface border border-border hover:bg-elevated transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate group-hover:text-accent transition-colors">
                          {src.title}
                        </p>
                        <p className="text-text-tertiary text-xs mt-0.5">{src.source_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-xs tabular-nums font-medium', credColor(src.source_credibility_score))}>
                          {Math.round(src.source_credibility_score * 100)}%
                        </span>
                        <ExternalLink size={11} className="text-text-tertiary group-hover:text-accent transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setQuery(''); textareaRef.current?.focus() }}
              className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
            >
              ← Ask another question
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
