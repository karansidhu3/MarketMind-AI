'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from './Header'
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext'

// ── CompanyNavigator ──────────────────────────────────────────────────────────
// Sprint 14: replaces CompanyPanel in the main app (ADR-036).
// Watches selectedCompany and navigates to the full /companies/[name] page.
// CompanyPanel is preserved in DemoShell where it still renders a drawer.

function CompanyNavigator() {
  const router = useRouter()
  const { selectedCompany, closeCompany } = useCompany()
  const closeRef = useRef(closeCompany)
  closeRef.current = closeCompany

  useEffect(() => {
    if (selectedCompany) {
      router.push(`/companies/${encodeURIComponent(selectedCompany)}`)
      closeRef.current()
    }
  }, [selectedCompany, router])

  return null
}

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
    <CompanyProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 min-h-screen">
          {children}
        </main>
        <CompanyNavigator />
      </div>
    </CompanyProvider>
  )
}
