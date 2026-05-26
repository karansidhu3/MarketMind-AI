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

export async function getFeedDates(): Promise<string[]> {
  return request<string[]>('/feed/dates')
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

export async function getPortfolioFeedSignals(): Promise<import('./types').FeedGapSignal[]> {
  return request('/portfolio/feed-signals')
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export async function getWatchlist(): Promise<import('./types').WatchedCompany[]> {
  return request('/watchlist')
}

export async function watchCompany(data: { normalised_name: string; display_name: string; ticker?: string | null }): Promise<import('./types').WatchedCompany> {
  return request('/watchlist', { method: 'POST', body: JSON.stringify(data) })
}

export async function unwatchCompany(id: string): Promise<void> {
  await request(`/watchlist/${id}`, { method: 'DELETE' })
}

// ── Company deep-dive ─────────────────────────────────────────────────────────

export async function getCompany(normalisedName: string): Promise<import('./types').CompanyDetail> {
  return request(`/companies/${encodeURIComponent(normalisedName)}`)
}

// ── Streaming helpers ─────────────────────────────────────────────────────────

/**
 * Parse a ReadableStream of SSE data into typed JSON events.
 * Yields each parsed event object. Stops on [DONE].
 */
async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return
        try { yield JSON.parse(payload) } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Stream the plain-English feed explain summary token by token.
 * Yields string tokens as they arrive. If cached, yields the full text at once.
 */
export async function* streamFeedExplainSummary(): AsyncGenerator<string> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/feed/explain-summary/stream`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  })
  if (res.status === 401) { localStorage.removeItem('mm_token'); window.location.href = '/login'; return }
  if (!res.ok || !res.body) return
  for await (const event of parseSSEStream(res.body)) {
    if (typeof event.chunk === 'string') yield event.chunk
  }
}

/**
 * Stream the unified cross-theme plain-English narrative.
 * Yields string tokens as they arrive. If cached, yields the full text at once.
 * Replaces the five separate per-thesis ExplainCards in the feed's Explain mode.
 */
export async function* streamUnifiedExplain(): AsyncGenerator<string> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/feed/unified-explain/stream`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  })
  if (res.status === 401) { localStorage.removeItem('mm_token'); window.location.href = '/login'; return }
  if (!res.ok || !res.body) return
  for await (const event of parseSSEStream(res.body)) {
    if (typeof event.chunk === 'string') yield event.chunk
  }
}

export type ThesisExplainStreamEvent =
  | { type: 'meta'; trend: string; from_cache: boolean }
  | { type: 'chunk'; text: string }

/**
 * Stream the plain-English thesis explain narrative.
 * First yields a 'meta' event with trend + cache status, then 'chunk' events.
 */
export async function* streamThesisExplain(thesisId: string): AsyncGenerator<ThesisExplainStreamEvent> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/theses/${thesisId}/explain/stream`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  })
  if (res.status === 401) { localStorage.removeItem('mm_token'); window.location.href = '/login'; return }
  if (!res.ok || !res.body) return
  for await (const event of parseSSEStream(res.body)) {
    if (typeof event.trend === 'string') {
      yield { type: 'meta', trend: event.trend, from_cache: Boolean(event.from_cache) }
    } else if (typeof event.chunk === 'string') {
      yield { type: 'chunk', text: event.chunk }
    }
  }
}

// ── Research ──────────────────────────────────────────────────────────────────

export async function research(query: string, daysBack?: number): Promise<ResearchResponse> {
  return request<ResearchResponse>('/research', {
    method: 'POST',
    body: JSON.stringify({ query, days_back: daysBack ?? null }),
  })
}
