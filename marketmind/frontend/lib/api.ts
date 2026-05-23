import type { CompanyRadarItem, ConfidenceSnapshot, EvidenceOut, FeedResponse, LanguageDelta, ResearchResponse, SupplyChainLink, ThesisOut } from './types'

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

// ── Research ──────────────────────────────────────────────────────────────────

export async function research(query: string, daysBack?: number): Promise<ResearchResponse> {
  return request<ResearchResponse>('/research', {
    method: 'POST',
    body: JSON.stringify({ query, days_back: daysBack ?? null }),
  })
}
