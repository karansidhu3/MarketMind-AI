'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(email, password)
      localStorage.setItem('mm_token', token)
      router.push('/feed')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[340px] px-4">
      {/* Logo */}
      <div className="mb-9 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-accent font-bold text-lg leading-none">●</span>
          <span className="text-text-primary font-semibold text-lg tracking-tight">MarketMind</span>
        </div>
        <p className="text-text-tertiary text-sm">Investment intelligence, locally run.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent transition-colors"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent transition-colors"
        />

        {error && (
          <p className="text-red text-xs px-0.5 pt-0.5">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
