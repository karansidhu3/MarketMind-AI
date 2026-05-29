'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, RefreshCw, AlertCircle, X } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ThesisGridCard from '@/components/thesis/ThesisGridCard'
import { SectionLabel } from '@/components/SectionLabel'
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
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-text-primary font-serif-display text-3xl">Investment Themes</h1>
            <p className="text-text-tertiary text-sm mt-0.5">
              Themes you track — scored daily against SEC filings and news.
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg"
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
                  className="btn-primary px-4 py-2 text-sm rounded-lg"
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

        {/* System theses — 2-column grid */}
        {!loading && !error && system.length > 0 && (
          <section className="mb-8">
            <SectionLabel className="mb-4 px-1">System themes</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {system.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26, delay: i * 0.05 }}
                  className={system.length % 2 === 1 && i === system.length - 1 ? 'sm:col-span-2 sm:max-w-[calc(50%-8px)]' : ''}
                >
                  <ThesisGridCard thesis={t} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Custom theses — 2-column grid */}
        {!loading && !error && custom.length > 0 && (
          <section>
            <SectionLabel className="mb-4 px-1">Custom themes</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {custom.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26, delay: i * 0.05 }}
                  className={custom.length % 2 === 1 && i === custom.length - 1 ? 'sm:col-span-2 sm:max-w-[calc(50%-8px)]' : ''}
                >
                  <ThesisGridCard thesis={t} />
                </motion.div>
              ))}
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
