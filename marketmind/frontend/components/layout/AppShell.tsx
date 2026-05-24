'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from './Header'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router  = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('mm_token')
    if (!token) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-14 min-h-screen">
        {children}
      </main>
    </div>
  )
}
