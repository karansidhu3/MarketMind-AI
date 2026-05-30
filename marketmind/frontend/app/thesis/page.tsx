'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, RefreshCw, AlertCircle, X } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ThesisGridCard from '@/components/thesis/ThesisGridCard'
import { getTheses, createThesis } from '@/lib/api'
import { spring } from '@/lib/motion'
import type { ThesisOut } from '@/lib/types'

export default function ThesisPage() {
  const [theses,  setTheses]  = useState<ThesisOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [showNew, setShowNew] = useState(false)

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [keywords,    setKeywords]    = useState('')
  const [creating,    setCreating]    = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTheses()
      // Rank by weekly momentum first, then by total activity
      setTheses([...data].sort((a, b) => {
        // Primary: weekly_delta descending (fastest-rising themes surface first)
        const deltaDiff = (b.weekly_delta ?? 0) - (a.weekly_delta ?? 0)
        if (Math.abs(deltaDiff) > 0.005) return deltaDiff
        // Secondary: evidence count (most active thesis)
        return b.evidence_count - a.evidence_count
      }))
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

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* Header — title only */}
        <div className="mb-8">
          <h1 className="text-text-primary font-serif-display text-3xl">Investment Themes</h1>
          <p className="text-text-tertiary text-sm mt-0.5">
            Ranked by momentum. Click any theme to investigate.
          </p>
        </div>

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

        {/* Ranked list */}
        {!loading && !error && theses.length > 0 && (
          <div className="max-w-2xl">
            {theses.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.standard, delay: i * 0.04 }}
              >
                <ThesisGridCard thesis={t} />
              </motion.div>
            ))}

            {/* New theme — demoted below the list */}
            <div className="pt-6 mt-2">
              {!showNew ? (
                <button
                  onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <Plus size={11} />
                  Add a custom theme
                </button>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                    transition={spring.standard}
                    className="overflow-hidden"
                  >
                    <div className="bg-surface border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-text-primary text-sm font-semibold">New theme</p>
                        <button onClick={() => setShowNew(false)} className="text-text-tertiary hover:text-text-secondary active:scale-[0.95]">
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
                          autoFocus
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
                        {createError && <p className="text-red text-xs">{createError}</p>}
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
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {/* Empty — no theses at all */}
        {!loading && !error && theses.length === 0 && (
          <div className="max-w-2xl">
            <p className="text-text-tertiary text-sm mb-6">No themes yet.</p>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <Plus size={11} />
              Add a custom theme
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
