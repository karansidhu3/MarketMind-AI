import type { CompanyAlert, CompanyRadarItem, ConfidenceSnapshot, EvidenceOut, FeedResponse, LanguageDelta, ResearchResponse, SupplyChainLink, ThesisExplain, ThesisOut } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('mm_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('mm_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<string> {
  const data = await request<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.access_token
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export async function getFeed(date?: string): Promise<FeedResponse> {
  const path = date ? `/feed/${date}` : '/feed'
  return request<FeedResponse>(path)
}

export async function regenerateFeed(): Promise<void> {
  await request('/feed/regenerate', { method: 'POST' })
}

export async function getFeedExplainSummary(): Promise<{ summary: string; from_cache: boolean }> {
  return request('/feed/explain-summary')
}

// ── Theses ───────────────────────────────────────────────────────────────────

export async function getTheses(): Promise<ThesisOut[]> {
  return request<ThesisOut[]>('/theses')
}

export async function getThesis(id: string): Promise<ThesisOut> {
  return request<ThesisOut>(`/theses/${id}`)
}

export async function getThesisEvidence(id: string, limit = 50): Promise<EvidenceOut[]> {
  return request<EvidenceOut[]>(`/theses/${id}/evidence?limit=${limit}`)
}

export async function createThesis(data: { name: string; description: string; keywords: string[] }): Promise<ThesisOut> {
  return request<ThesisOut>('/theses', { method: 'POST', body: JSON.stringify(data) })
}

// ── Company radar ─────────────────────────────────────────────────────────────

export async function getCompanyRadar(minDocs = 1): Promise<CompanyRadarItem[]> {
  return request<CompanyRadarItem[]>(`/theses/radar?min_docs=${minDocs}`)
}

// ── Supply chain ──────────────────────────────────────────────────────────────

export async function getSupplyChain(company: string, limit = 50): Promise<SupplyChainLink[]> {
  return request<SupplyChainLink[]>(`/supply-chain/${encodeURIComponent(company)}?limit=${limit}`)
}

// ── Confidence history ────────────────────────────────────────────────────────

export async function getConfidenceHistory(id: string, days = 30): Promise<ConfidenceSnapshot[]> {
  return request<ConfidenceSnapshot[]>(`/theses/${id}/confidence-history?days=${days}`)
}

export async function getLanguageDelta(id: string, windowDays = 30): Promise<LanguageDelta> {
  return request<LanguageDelta>(`/theses/${id}/language-delta?window_days=${windowDays}`)
}

export async function evaluateThesis(id: string): Promise<{ status: string; message: string }> {
  return request(`/theses/${id}/evaluate`, { method: 'POST' })
}

export async function getThesisExplain(id: string): Promise<ThesisExplain> {
  return request<ThesisExplain>(`/theses/${id}/explain`)
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<CompanyAlert[]> {
  return request<CompanyAlert[]>('/alerts')
}

export async function createAlert(data: { normalised_name: string; display_name: string; threshold: number }): Promise<CompanyAlert> {
  return request<CompanyAlert>('/alerts', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteAlert(id: string): Promise<void> {
  await request(`/alerts/${id}`, { method: 'DELETE' })
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export async function getHoldings(): Promise<import('./types').HoldingOut[]> {
  return request('/portfolio/holdings')
}

export async function addHolding(data: { ticker: string; company_name: string; shares: number; cost_basis?: number }): Promise<import('./types').HoldingOut> {
  return request('/portfolio/holdings', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateHolding(id: string, data: { shares?: number; cost_basis?: number }): Promise<import('./types').HoldingOut> {
  return request(`/portfolio/holdings/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteHolding(id: string): Promise<void> {
  await request(`/portfolio/holdings/${id}`, { method: 'DELETE' })
}

export async function getPortfolioAlignment(): Promise<import('./types').PortfolioAlignment> {
  return request('/portfolio/alignment')
}

// ── Company deep-dive ─────────────────────────────────────────────────────────

export async function getCompany(normalisedName: string): Promise<import('./types').CompanyDetail> {
  return request(`/companies/${encodeURIComponent(normalisedName)}`)
}

// ── Research ──────────────────────────────────────────────────────────────────

export async function research(query: string, daysBack?: number): Promise<ResearchResponse> {
  return request<ResearchResponse>('/research', {
    method: 'POST',
    body: JSON.stringify({ query, days_back: daysBack ?? null }),
  })
}
