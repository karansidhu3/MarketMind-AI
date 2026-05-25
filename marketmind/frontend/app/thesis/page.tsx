'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, AlertCircle, X } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ThesisCard from '@/components/thesis/ThesisCard'
import { getTheses, createThesis } from '@/lib/api'
import type { ThesisOut } from '@/lib/types'

export default function ThesisPage() {
  const [theses,  setTheses]  = useState<ThesisOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [showNew, setShowNew] = useState(false)

  // New thesis form state
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [keywords,    setKeywords]    = useState('')
  const [creating,    setCreating]    = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTheses(await getTheses())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      const kws = keywords.split(',').map(k => k.trim()).filter(Boolean)
      await createThesis({ name: name.trim(), description: description.trim(), keywords: kws })
      setName(''); setDescription(''); setKeywords('')
      setShowNew(false)
      await load()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create.')
    } finally {
      setCreating(false)
    }
  }

  const system  = theses.filter(t => t.is_system)
  const custom  = theses.filter(t => !t.is_system)

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-text-primary text-2xl font-semibold tracking-tight">Investment Themes</h1>
            <p className="text-text-tertiary text-sm mt-0.5">
              Themes you track — scored daily against SEC filings and news.
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-sm text-white bg-accent px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Theme
          </button>
        </div>

        {/* New thesis form */}
        {showNew && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-text-primary text-sm font-semibold">New Investment Theme</h2>
              <button onClick={() => setShowNew(false)} className="text-text-tertiary hover:text-text-secondary">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Theme name (e.g. AI Infrastructure Bottlenecks)"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <textarea
                placeholder="Describe the investment hypothesis…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent transition-colors resize-none"
              />
              <input
                type="text"
                placeholder="Keywords (comma-separated): AI chips, data center, power grid…"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent transition-colors"
              />
              {createError && (
                <p className="text-red text-xs">{createError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-3.5 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-48">
            <RefreshCw size={16} className="text-text-tertiary animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 text-red text-sm bg-red/5 border border-red/20 rounded-xl px-4 py-3">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* System theses */}
        {!loading && !error && system.length > 0 && (
          <section className="mb-8">
            <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-3 px-1">
              System
            </h2>
            <div className="space-y-2">
              {system.map(t => <ThesisCard key={t.id} thesis={t} />)}
            </div>
          </section>
        )}

        {/* Custom theses */}
        {!loading && !error && custom.length > 0 && (
          <section>
            <h2 className="text-text-tertiary text-xs font-medium uppercase tracking-widest mb-3 px-1">
              Custom
            </h2>
            <div className="space-y-2">
              {custom.map(t => <ThesisCard key={t.id} thesis={t} />)}
            </div>
          </section>
        )}

        {/* Empty */}
        {!loading && !error && theses.length === 0 && (
          <div className="text-center py-20 text-text-tertiary text-sm">
            No themes found.
          </div>
        )}
      </div>
    </AppShell>
  )
}
