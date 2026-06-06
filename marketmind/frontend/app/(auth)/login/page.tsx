'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Zap } from 'lucide-react'
import Link from 'next/link'
import { login } from '@/lib/api'
import Logo from '@/components/ui/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(email, password)
      localStorage.setItem('mm_token', token)
      router.push('/signals')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[360px]">
      {/* Card */}
      <div className="bg-surface/90 border border-border/60 rounded-2xl shadow-2xl shadow-background/60 backdrop-blur-sm p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={44} className="mb-4" />
          <h1 className="text-text-primary font-semibold text-base tracking-tight">
            Market<span className="text-accent">Mind</span>
          </h1>
          <p className="text-text-tertiary text-xs mt-1.5 text-center leading-relaxed">
            Investment intelligence, locally run.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-elevated border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent focus:bg-elevated transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-elevated border border-border text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent focus:bg-elevated transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red text-xs bg-red/8 border border-red/20 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold mt-1"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo mode link */}
        <div className="mt-5 pt-5 border-t border-border/40 flex items-center justify-center gap-2">
          <Link
            href="/demo"
            className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-accent transition-colors"
          >
            <Zap size={10} />
            Explore demo without signing in
          </Link>
        </div>

        {/* Footer hint */}
        <p className="text-text-tertiary/60 text-[11px] text-center mt-4 leading-relaxed">
          Local deployment · No external data sent
        </p>
      </div>
    </div>
  )
}
