/**
 * Static sample data for the public /demo route.
 * Simulates a realistic MarketMind feed — no backend required.
 */

import type { FeedResponse, CompanyRadarItem } from '@/lib/types'

export const DEMO_FEED: FeedResponse = {
  feed_date: '2026-05-25',
  from_cache: true,
  generated_at: '2026-05-25T06:14:37',
  summary:
    'Vertiv Holdings appeared in 23 independent filings this week as hyperscalers accelerate liquid-cooling deployments — an early infrastructure bottleneck few analysts are flagging yet. AI infra and data-center physical are the two strongest converging signals; semiconductor supply-chain stress is building quietly in the background.',
  alert_triggers: [
    {
      normalised_name: 'vertiv holdings',
      display_name: 'Vertiv Holdings',
      threshold: 20,
      current_doc_count: 23,
    },
  ],
  insider_clusters: [],
  new_companies: [
    {
      company_name: 'Celestica',
      ticker: 'CLS',
      thesis_names: ['AI Infrastructure Bottlenecks', 'Data Center Physical Infrastructure'],
      first_seen: '2026-05-25',
      context:
        'Referenced in four 10-Q filings as a contract manufacturer ramping AI server production for unnamed hyperscaler customers.',
    },
    {
      company_name: 'Powell Industries',
      ticker: 'POWL',
      thesis_names: ['Energy Grid Modernisation'],
      first_seen: '2026-05-25',
      context:
        'Appeared in an 8-K from a major utility citing switchgear delivery timelines as a grid-upgrade bottleneck.',
    },
  ],
  thesis_signals: [
    {
      thesis_id: 'demo-ai-infra',
      thesis_name: 'AI Infrastructure Bottlenecks',
      new_evidence_count: 18,
      supporting_count: 15,
      opposing_count: 2,
      momentum: 'rising',
      confidence: 0.72,
      top_companies: ['NVIDIA', 'Vertiv Holdings', 'Advanced Micro Devices', 'Super Micro Computer'],
      highlight:
        "NVIDIA's 10-Q references a 14-week lead time on liquid-cooling modules, with three hyperscalers flagging power delivery as the primary constraint on next-generation cluster deployment.",
      evidence_ids: [],
      language_shift:
        'Power delivery and cooling cited 3× more frequently than last 30 days; "rack density" appears for first time.',
    },
    {
      thesis_id: 'demo-data-center',
      thesis_name: 'Data Center Physical Infrastructure',
      new_evidence_count: 11,
      supporting_count: 10,
      opposing_count: 1,
      momentum: 'rising',
      confidence: 0.69,
      top_companies: ['Vertiv Holdings', 'Equinix', 'Iron Mountain', 'Carrier Global'],
      highlight:
        "Vertiv's investor day materials describe a 40% backlog increase YoY driven by thermal management orders, with CEO noting 'demand is running faster than our ability to hire.'",
      evidence_ids: [],
      language_shift: null,
    },
    {
      thesis_id: 'demo-semi-supply',
      thesis_name: 'Semiconductor Supply Chain Stress',
      new_evidence_count: 14,
      supporting_count: 11,
      opposing_count: 3,
      momentum: 'rising',
      confidence: 0.65,
      top_companies: ['Applied Materials', 'Micron Technology', 'TSMC', 'KLA Corporation'],
      highlight:
        "Applied Materials' 8-K cites a 22-week fab equipment delivery backlog — the longest since 2021 — while Micron references DRAM capacity constraints persisting through Q3 2026.",
      evidence_ids: [],
      language_shift:
        '"Capacity constraint" and "lead time" language intensified; "inventory correction" mentions dropped significantly.',
    },
    {
      thesis_id: 'demo-energy-grid',
      thesis_name: 'Energy Grid Modernisation',
      new_evidence_count: 8,
      supporting_count: 6,
      opposing_count: 2,
      momentum: 'flat',
      confidence: 0.58,
      top_companies: ['Eaton Corporation', 'Quanta Services', 'NextEra Energy', 'Powell Industries'],
      highlight:
        "Eaton's 10-Q highlights a record grid infrastructure backlog of $4.2B, up 31% YoY, with utility customers citing regulatory approval timelines as the primary gating factor.",
      evidence_ids: [],
      language_shift: null,
    },
    {
      thesis_id: 'demo-defense',
      thesis_name: 'Defense Production Ramp',
      new_evidence_count: 6,
      supporting_count: 5,
      opposing_count: 1,
      momentum: 'flat',
      confidence: 0.61,
      top_companies: ['Lockheed Martin', 'RTX Corporation', 'Kratos Defense', 'Northrop Grumman'],
      highlight:
        "Lockheed's 8-K details a $2.1B supplemental contract for HIMARS resupply, the third such award in 90 days, signaling a sustained production ramp rather than a one-time procurement cycle.",
      evidence_ids: [],
      language_shift: null,
    },
  ],
}

export const DEMO_RADAR: CompanyRadarItem[] = [
  {
    normalised_name: 'vertiv holdings',
    company_name: 'Vertiv Holdings',
    ticker: 'VRT',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Data Center Physical Infrastructure'],
    doc_count: 23,
    mention_count: 61,
    first_seen: '2026-04-01',
    last_seen: '2026-05-25',
    weekly_counts: [4, 8, 11, 23],
  },
  {
    normalised_name: 'nvidia',
    company_name: 'NVIDIA',
    ticker: 'NVDA',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Semiconductor Supply Chain Stress'],
    doc_count: 19,
    mention_count: 74,
    first_seen: '2026-04-01',
    last_seen: '2026-05-25',
    weekly_counts: [9, 12, 16, 19],
  },
  {
    normalised_name: 'applied materials',
    company_name: 'Applied Materials',
    ticker: 'AMAT',
    thesis_names: ['Semiconductor Supply Chain Stress'],
    doc_count: 16,
    mention_count: 38,
    first_seen: '2026-04-03',
    last_seen: '2026-05-25',
    weekly_counts: [5, 7, 11, 16],
  },
  {
    normalised_name: 'eaton corporation',
    company_name: 'Eaton Corporation',
    ticker: 'ETN',
    thesis_names: ['Energy Grid Modernisation', 'Data Center Physical Infrastructure'],
    doc_count: 14,
    mention_count: 29,
    first_seen: '2026-04-05',
    last_seen: '2026-05-24',
    weekly_counts: [4, 6, 10, 14],
  },
  {
    normalised_name: 'super micro computer',
    company_name: 'Super Micro Computer',
    ticker: 'SMCI',
    thesis_names: ['AI Infrastructure Bottlenecks'],
    doc_count: 13,
    mention_count: 41,
    first_seen: '2026-04-08',
    last_seen: '2026-05-25',
    weekly_counts: [2, 5, 9, 13],
  },
  {
    normalised_name: 'advanced micro devices',
    company_name: 'Advanced Micro Devices',
    ticker: 'AMD',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Semiconductor Supply Chain Stress'],
    doc_count: 12,
    mention_count: 35,
    first_seen: '2026-04-10',
    last_seen: '2026-05-24',
    weekly_counts: [3, 6, 9, 12],
  },
  {
    normalised_name: 'quanta services',
    company_name: 'Quanta Services',
    ticker: 'PWR',
    thesis_names: ['Energy Grid Modernisation'],
    doc_count: 11,
    mention_count: 22,
    first_seen: '2026-04-12',
    last_seen: '2026-05-23',
    weekly_counts: [3, 5, 8, 11],
  },
  {
    normalised_name: 'kla corporation',
    company_name: 'KLA Corporation',
    ticker: 'KLAC',
    thesis_names: ['Semiconductor Supply Chain Stress'],
    doc_count: 10,
    mention_count: 18,
    first_seen: '2026-04-15',
    last_seen: '2026-05-25',
    weekly_counts: [2, 4, 7, 10],
  },
  {
    normalised_name: 'equinix',
    company_name: 'Equinix',
    ticker: 'EQIX',
    thesis_names: ['Data Center Physical Infrastructure'],
    doc_count: 9,
    mention_count: 20,
    first_seen: '2026-04-18',
    last_seen: '2026-05-22',
    weekly_counts: [2, 4, 6, 9],
  },
  {
    normalised_name: 'lockheed martin',
    company_name: 'Lockheed Martin',
    ticker: 'LMT',
    thesis_names: ['Defense Production Ramp'],
    doc_count: 9,
    mention_count: 17,
    first_seen: '2026-04-20',
    last_seen: '2026-05-25',
    weekly_counts: [3, 4, 6, 9],
  },
  {
    normalised_name: 'micron technology',
    company_name: 'Micron Technology',
    ticker: 'MU',
    thesis_names: ['Semiconductor Supply Chain Stress'],
    doc_count: 8,
    mention_count: 15,
    first_seen: '2026-04-22',
    last_seen: '2026-05-24',
    weekly_counts: [1, 3, 5, 8],
  },
  {
    normalised_name: 'celestica',
    company_name: 'Celestica',
    ticker: 'CLS',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Data Center Physical Infrastructure'],
    doc_count: 7,
    mention_count: 12,
    first_seen: '2026-05-18',
    last_seen: '2026-05-25',
    weekly_counts: [0, 0, 3, 7],
  },
  {
    normalised_name: 'rtx corporation',
    company_name: 'RTX Corporation',
    ticker: 'RTX',
    thesis_names: ['Defense Production Ramp'],
    doc_count: 7,
    mention_count: 14,
    first_seen: '2026-04-28',
    last_seen: '2026-05-23',
    weekly_counts: [1, 3, 5, 7],
  },
  {
    normalised_name: 'kratos defense',
    company_name: 'Kratos Defense',
    ticker: 'KTOS',
    thesis_names: ['Defense Production Ramp'],
    doc_count: 6,
    mention_count: 11,
    first_seen: '2026-05-01',
    last_seen: '2026-05-25',
    weekly_counts: [0, 2, 4, 6],
  },
  {
    normalised_name: 'powell industries',
    company_name: 'Powell Industries',
    ticker: 'POWL',
    thesis_names: ['Energy Grid Modernisation'],
    doc_count: 5,
    mention_count: 8,
    first_seen: '2026-05-22',
    last_seen: '2026-05-25',
    weekly_counts: [0, 0, 1, 5],
  },
]

// ── Portfolio demo data ───────────────────────────────────────────────────────

export interface DemoHolding {
  ticker: string
  company_name: string
  thesis_names: string[]
  doc_count: number
  momentum: 'rising' | 'flat' | 'falling'
}

export interface DemoGap {
  company_name: string
  ticker: string
  normalised_name: string
  thesis_names: string[]
  doc_count: number
  weekly_counts: number[]
}

/** Simulated holdings — what the demo user "holds" */
export const DEMO_HOLDINGS: DemoHolding[] = [
  {
    ticker: 'NVDA',
    company_name: 'NVIDIA',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Semiconductor Supply Chain Stress'],
    doc_count: 19,
    momentum: 'rising',
  },
  {
    ticker: 'ETN',
    company_name: 'Eaton Corporation',
    thesis_names: ['Energy Grid Modernisation', 'Data Center Physical Infrastructure'],
    doc_count: 14,
    momentum: 'rising',
  },
  {
    ticker: 'LMT',
    company_name: 'Lockheed Martin',
    thesis_names: ['Defense Production Ramp'],
    doc_count: 9,
    momentum: 'flat',
  },
]

/**
 * Companies with strong corpus signals that the demo user doesn't hold.
 * Sorted by urgency: doc_count × thesis_count × recency (all current).
 */
export const DEMO_GAPS: DemoGap[] = [
  {
    company_name: 'Vertiv Holdings',
    ticker: 'VRT',
    normalised_name: 'vertiv holdings',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Data Center Physical Infrastructure'],
    doc_count: 23,
    weekly_counts: [4, 8, 11, 23],
  },
  {
    company_name: 'Advanced Micro Devices',
    ticker: 'AMD',
    normalised_name: 'advanced micro devices',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Semiconductor Supply Chain Stress'],
    doc_count: 12,
    weekly_counts: [3, 6, 9, 12],
  },
  {
    company_name: 'Applied Materials',
    ticker: 'AMAT',
    normalised_name: 'applied materials',
    thesis_names: ['Semiconductor Supply Chain Stress'],
    doc_count: 16,
    weekly_counts: [5, 7, 11, 16],
  },
  {
    company_name: 'Super Micro Computer',
    ticker: 'SMCI',
    normalised_name: 'super micro computer',
    thesis_names: ['AI Infrastructure Bottlenecks'],
    doc_count: 13,
    weekly_counts: [2, 5, 9, 13],
  },
]

/**
 * Narrative text shown in Explain mode per thesis (pre-rendered, no streaming needed).
 */
export const DEMO_NARRATIVES: Record<string, string> = {
  'demo-ai-infra':
    "The AI infrastructure thesis is strengthening rapidly. Over the past two weeks the corpus has shifted from general 'AI capex' language to highly specific bottleneck language — power delivery, liquid cooling, and rack density are now the dominant themes. Vertiv and Super Micro are being cited in documents that don't even reference NVIDIA, which is the clearest signal that the infrastructure layer is becoming a story in its own right. The 14-week lead time on cooling modules flagged in NVIDIA's 10-Q is the kind of concrete constraint that historically precedes supply-chain re-ratings. Momentum: building, not peaking.",
  'demo-data-center':
    "Data-center physical infrastructure is corroborating the AI-infra signal from a different angle. Vertiv's backlog growth is being validated by independent filings from HVAC and power-distribution suppliers — companies that wouldn't show up in a typical tech screen. The convergence between hyperscaler CapEx guidance and the capacity signals from their supply base is tightening. Watch for Carrier Global and Eaton mentions to accelerate if this thesis continues to build.",
  'demo-semi-supply':
    "Semiconductor supply-chain stress is re-emerging after the 2023 inventory correction. The language delta is clear: 'inventory correction' mentions have dropped sharply while 'capacity constraint' and 'lead time' language is surging. Applied Materials' 22-week backlog is the headline, but the more interesting signal is in the smaller equipment vendors starting to appear in filings for the first time. This typically precedes an analyst upgrade cycle by 4–6 weeks.",
  'demo-energy-grid':
    "Energy grid modernisation is building steadily but without urgency — regulatory timelines are the recurring friction point in the language. Eaton's record backlog is real, but utility customers are gating execution on permits, not product availability. The thesis is valid and durable; it's just not accelerating yet. Powell Industries appearing for the first time this week in switchgear-bottleneck context is worth watching.",
  'demo-defense':
    "Defense production is showing a pattern of sustained, steady growth rather than spikes. Three HIMARS-scale contracts in 90 days is the kind of reorder cadence that signals a structural production ramp, not procurement lumps. Kratos and smaller drone-component manufacturers are appearing more frequently, suggesting the ramp is broader than the primes. Confidence is moderate because the thesis depends on sustained political will — the one variable the corpus can't directly observe.",
}
