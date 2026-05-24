'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CompanyContextValue {
  selectedCompany: string | null   // normalised_name
  openCompany: (normalisedName: string) => void
  closeCompany: () => void
}

const CompanyContext = createContext<CompanyContextValue>({
  selectedCompany: null,
  openCompany: () => {},
  closeCompany: () => {},
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

  const openCompany  = useCallback((name: string) => setSelectedCompany(name), [])
  const closeCompany = useCallback(() => setSelectedCompany(null), [])

  return (
    <CompanyContext.Provider value={{ selectedCompany, openCompany, closeCompany }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  return useContext(CompanyContext)
}
