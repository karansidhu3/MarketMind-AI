export interface ThesisSignal {
  thesis_id: string
  thesis_name: string
  new_evidence_count: number
  supporting_count: number
  opposing_count: number
  momentum: 'rising' | 'flat' | 'falling'
  confidence: number
  confidence_delta?: number | null  // 7-day change in support rate (e.g. 0.09 = +9pts)
  top_companies: string[]
  highlight: string
  evidence_ids: string[]
  language_shift?: string | null   // IDs of today's evidence records — C-011 provenance
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

export interface AlertTrigger {
  normalised_name: string
  display_name: string
  threshold: number
  current_doc_count: number
}

export interface CompanyAlert {
  id: string
  normalised_name: string
  display_name: string
  threshold: number
  current_doc_count: number
  triggered: boolean
}

export interface FeedResponse {
  feed_date: string
  thesis_signals: ThesisSignal[]
  new_companies: NewCompany[]
  insider_clusters: InsiderCluster[]
  alert_triggers: AlertTrigger[]
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
  weekly_delta: number   // 7-day change in confidence (recent 7d avg − prior 7d avg)
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
  normalised_name: string     // DB key — use for /companies/{key} API calls
  company_name: string
  ticker: string | null
  thesis_names: string[]
  doc_count: number           // unique source documents — primary ranking signal
  mention_count: number       // raw mentions across all docs
  first_seen: string
  last_seen: string
  weekly_counts: number[]     // evidence activity last 4 weeks, oldest → newest
}

// ── Company deep-dive ─────────────────────────────────────────────────────────

export interface CompanyEvidenceItem {
  id: string
  thesis_id: string
  thesis_name: string
  sentiment: 'supporting' | 'opposing' | 'neutral'
  excerpt: string
  score: number
  source_url: string
  source_name: string
  document_date: string | null
}

export interface CompanyThesisBreakdown {
  thesis_id: string
  thesis_name: string
  confidence: number
  doc_count: number
  mention_count: number
  supporting: number
  opposing: number
  neutral: number
}

export interface CompanyDetail {
  normalised_name: string
  display_name: string
  ticker: string | null
  first_seen: string
  last_seen: string
  doc_count: number
  mention_count: number
  weekly_counts: number[]
  thesis_breakdown: CompanyThesisBreakdown[]
  evidence: CompanyEvidenceItem[]
  // Optional ICR fields — populated in demo data; on live data fetched separately via /trajectory/{name}
  icr_series?:    number[]
  icr_current?:   number
  icr_4w_avg?:    number
  is_inflecting?: boolean
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

export interface ThesisExplain {
  thesis_id: string
  narrative: string
  trend: 'strengthening' | 'weakening' | 'stable' | 'none'
  from_cache: boolean
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface HoldingOut {
  id: string
  ticker: string
  company_name: string
  shares: number
  cost_basis: number | null
  added_at: string
}

export interface ThesisExposure {
  thesis_id: string
  thesis_name: string
  confidence: number
  momentum: string
  held_companies: string[]
  total_companies: number
  coverage_pct: number
}

export interface GapCompany {
  normalised_name: string
  company_name: string
  ticker: string | null
  thesis_names: string[]
  doc_count: number
  thesis_confidence: number
}

export interface FeedGapSignal {
  company_name: string
  normalised_name: string
  ticker: string | null
  thesis_names: string[]
  new_signals_today: number
  doc_count: number
}

export interface WatchedCompany {
  id: string
  normalised_name: string
  display_name: string
  ticker: string | null
  doc_count: number
  weekly_counts: number[]
  created_at: string
}

export interface PortfolioAlignment {
  total_holdings: number
  overall_coverage: number
  theses: ThesisExposure[]
  gaps: GapCompany[]
  held_company_docs?: Record<string, number>  // ticker → corpus doc count
}

// ── Corpus health (Sprint 15) ─────────────────────────────────────────────────

export interface CorpusHealth {
  evidence_total:     number
  by_classification:  Record<string, number>
  by_source:          { source_name: string; count: number }[]
  last_document_date: string | null
}

// ── Signal Map / ICR (Sprint 13) ──────────────────────────────────────────────

/** Full ICR series for a single entity — GET /trajectory/{name}. */
export interface TrajectoryDetail {
  normalised_name: string
  icr_series:      number[]   // `weeks` values, oldest first
  icr_current:     number
  icr_4w_avg:      number
  is_inflecting:   boolean
  weeks:           number
}

/** One row from GET /trajectory/top — the primary Signal Map data contract. */
export interface TrajectoryRow {
  normalised_name: string
  display_name:    string
  ticker:          string | null
  icr_series:      number[]   // 12 values, oldest first
  icr_current:     number     // this week's ICR
  icr_4w_avg:      number     // average of prior 4 weeks
  is_inflecting:   boolean    // current >= 2× 4w avg AND >= 3
  acceleration:    number     // recent 2w avg − prior 4w avg
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
