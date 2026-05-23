export interface ThesisSignal {
  thesis_id: string
  thesis_name: string
  new_evidence_count: number
  supporting_count: number
  opposing_count: number
  momentum: 'rising' | 'flat' | 'falling'
  confidence: number
  top_companies: string[]
  highlight: string
}

export interface NewCompany {
  company_name: string
  ticker: string | null
  thesis_names: string[]
  first_seen: string
  context: string
}

export interface InsiderCluster {
  company_name: string
  filing_count: number
  filed_within_days: number
}

export interface FeedResponse {
  feed_date: string
  thesis_signals: ThesisSignal[]
  new_companies: NewCompany[]
  insider_clusters: InsiderCluster[]
  summary: string
  generated_at: string
  from_cache: boolean
}

export interface ThesisOut {
  id: string
  name: string
  description: string
  keywords: string[]
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
  evidence_count: number
  supporting_count: number
  opposing_count: number
  confidence: number
}

export interface EvidenceOut {
  id: string
  thesis_id: string
  document_id: string
  sentiment: 'supporting' | 'opposing' | 'neutral'
  excerpt: string
  score: number
  source_url: string
  source_name: string
  document_date: string | null
  created_at: string
}

export interface CompanyRadarItem {
  company_name: string
  ticker: string | null
  thesis_names: string[]
  doc_count: number      // unique source documents — primary ranking signal
  mention_count: number  // raw mentions across all docs
  first_seen: string
  last_seen: string
}

export interface SourceRef {
  title: string
  source_name: string
  url: string
  source_credibility_score: number
}

export interface ResearchResponse {
  query: string
  answer: string
  evidence: string[]
  sources: SourceRef[]
  confidence: number
}

export interface SupplyChainLink {
  id: string
  parent_company: string
  child_company: string
  relationship_type: 'supplier' | 'customer' | 'partner'
  evidence_text: string
  confidence: number
  source_document_id: string
  created_at: string
}

export interface ConfidenceSnapshot {
  date: string
  confidence: number
  supporting_count: number
  opposing_count: number
  evidence_count: number
}

export interface LanguageDelta {
  status: 'ok' | 'insufficient_data'
  message?: string                 // only when status=insufficient_data
  recent_window: string
  prior_window: string
  evidence_count_recent: number
  evidence_count_prior: number
  appeared: string[]
  disappeared: string[]
  intensified: string[]
  summary: string
  from_cache: boolean
}
