/**
 * Static CompanyDetail data for the /demo route.
 *
 * Used by CompanyPanel when demoMode=true — shows real panel structure
 * with curated evidence instead of gating with "Sign in for live data."
 *
 * Evidence excerpts are drawn from or paraphrased from the DEMO_FEED
 * narratives and reflect realistic SEC filing language. They demonstrate
 * the evidence trail, which is the most trust-building element of the product.
 */

import type { CompanyDetail } from './types'

export const DEMO_COMPANY_DETAIL: Record<string, CompanyDetail> = {

  // ── Vertiv Holdings — the demo's primary signal ────────────────────────────
  'vertiv holdings': {
    normalised_name: 'vertiv holdings',
    display_name: 'Vertiv Holdings',
    ticker: 'VRT',
    first_seen: '2026-04-01',
    last_seen: '2026-05-25',
    doc_count: 23,
    mention_count: 61,
    weekly_counts: [4, 8, 11, 23],
    thesis_breakdown: [
      {
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        confidence: 0.79,
        doc_count: 14,
        mention_count: 38,
        supporting: 11,
        opposing: 1,
        neutral: 2,
      },
      {
        thesis_id: 'demo-data-center',
        thesis_name: 'Data Center Physical Infrastructure',
        confidence: 0.69,
        doc_count: 9,
        mention_count: 23,
        supporting: 7,
        opposing: 1,
        neutral: 1,
      },
    ],
    evidence: [
      {
        id: 'vrt-e1',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'supporting',
        excerpt:
          "Vertiv's investor day materials describe a 40% backlog increase year-over-year driven by thermal management orders, with the CEO noting 'demand is running faster than our ability to hire.' Liquid-cooling unit deliveries are now constrained by a 14-week lead time on heat exchanger components.",
        score: 0.91,
        source_url: '#',
        source_name: 'Vertiv Holdings 8-K',
        document_date: '2026-05-22',
      },
      {
        id: 'vrt-e2',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'supporting',
        excerpt:
          "NVIDIA's 10-Q references a 14-week lead time on liquid-cooling modules sourced from third-party thermal management vendors, with three hyperscalers flagging power delivery as the primary constraint on next-generation cluster deployment.",
        score: 0.87,
        source_url: '#',
        source_name: 'NVIDIA 10-Q',
        document_date: '2026-05-15',
      },
      {
        id: 'vrt-e3',
        thesis_id: 'demo-data-center',
        thesis_name: 'Data Center Physical Infrastructure',
        sentiment: 'supporting',
        excerpt:
          "Eaton's 10-Q cites thermal management and power distribution as a shared bottleneck across major hyperscaler build-outs, with select vendors cited as having order backlogs extending into Q1 2027. Procurement language reflects urgency not present in prior filings.",
        score: 0.82,
        source_url: '#',
        source_name: 'Eaton Corporation 10-Q',
        document_date: '2026-05-19',
      },
    ],
  },

  // ── NVIDIA ─────────────────────────────────────────────────────────────────
  nvidia: {
    normalised_name: 'nvidia',
    display_name: 'NVIDIA',
    ticker: 'NVDA',
    first_seen: '2026-04-01',
    last_seen: '2026-05-25',
    doc_count: 19,
    mention_count: 74,
    weekly_counts: [9, 12, 16, 19],
    thesis_breakdown: [
      {
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        confidence: 0.72,
        doc_count: 11,
        mention_count: 48,
        supporting: 8,
        opposing: 2,
        neutral: 1,
      },
      {
        thesis_id: 'demo-semi-supply',
        thesis_name: 'Semiconductor Supply Chain Stress',
        confidence: 0.65,
        doc_count: 8,
        mention_count: 26,
        supporting: 6,
        opposing: 1,
        neutral: 1,
      },
    ],
    evidence: [
      {
        id: 'nvda-e1',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'supporting',
        excerpt:
          "NVIDIA's 10-Q discloses that three major cloud customers have flagged power delivery infrastructure as the binding constraint on H100/H200 cluster deployment timelines, with thermal management lead times cited at 14 weeks for cooling modules.",
        score: 0.88,
        source_url: '#',
        source_name: 'NVIDIA 10-Q',
        document_date: '2026-05-15',
      },
      {
        id: 'nvda-e2',
        thesis_id: 'demo-semi-supply',
        thesis_name: 'Semiconductor Supply Chain Stress',
        sentiment: 'supporting',
        excerpt:
          "Supply chain disclosures in NVIDIA's quarterly filing identify substrate and advanced packaging capacity as gating factors for next-generation GPU production, with CoWoS allocation constraints expected to persist through Q3 2026.",
        score: 0.81,
        source_url: '#',
        source_name: 'NVIDIA 10-Q',
        document_date: '2026-05-15',
      },
      {
        id: 'nvda-e3',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'supporting',
        excerpt:
          "Multiple 10-Q filings from hyperscaler customers reference NVIDIA GPU allocation as a determinant of AI infrastructure build-out timelines, with one filing noting a 22-week lead time for data center delivery of current-generation units.",
        score: 0.77,
        source_url: '#',
        source_name: 'AWS / Azure Supplier Disclosures',
        document_date: '2026-05-10',
      },
    ],
  },

  // ── Applied Materials ──────────────────────────────────────────────────────
  'applied materials': {
    normalised_name: 'applied materials',
    display_name: 'Applied Materials',
    ticker: 'AMAT',
    first_seen: '2026-04-03',
    last_seen: '2026-05-25',
    doc_count: 16,
    mention_count: 38,
    weekly_counts: [5, 7, 11, 16],
    thesis_breakdown: [
      {
        thesis_id: 'demo-semi-supply',
        thesis_name: 'Semiconductor Supply Chain Stress',
        confidence: 0.68,
        doc_count: 16,
        mention_count: 38,
        supporting: 12,
        opposing: 2,
        neutral: 2,
      },
    ],
    evidence: [
      {
        id: 'amat-e1',
        thesis_id: 'demo-semi-supply',
        thesis_name: 'Semiconductor Supply Chain Stress',
        sentiment: 'supporting',
        excerpt:
          "Applied Materials' 8-K discloses a 22-week fab equipment delivery backlog — the longest since 2021 — driven by demand from advanced node fabs in Taiwan and South Korea. The company notes that capacity expansion for cutting-edge nodes is constrained by tool delivery timelines.",
        score: 0.89,
        source_url: '#',
        source_name: 'Applied Materials 8-K',
        document_date: '2026-05-20',
      },
      {
        id: 'amat-e2',
        thesis_id: 'demo-semi-supply',
        thesis_name: 'Semiconductor Supply Chain Stress',
        sentiment: 'supporting',
        excerpt:
          "Multiple customer 10-Q filings cite semiconductor capital equipment delivery timelines as a constraint on production ramp schedules for AI-focused chip designs, with references to 'extended lead times for deposition and etch equipment.'",
        score: 0.83,
        source_url: '#',
        source_name: 'TSMC / Samsung Supplier Filings',
        document_date: '2026-05-12',
      },
      {
        id: 'amat-e3',
        thesis_id: 'demo-semi-supply',
        thesis_name: 'Semiconductor Supply Chain Stress',
        sentiment: 'neutral',
        excerpt:
          "Applied Materials management commentary references strong order momentum from memory and logic customers while noting that revenue recognition timing depends on customer facility readiness, introducing uncertainty in near-term revenue conversion.",
        score: 0.61,
        source_url: '#',
        source_name: 'Applied Materials 10-Q',
        document_date: '2026-05-08',
      },
    ],
  },

  // ── Eaton Corporation ──────────────────────────────────────────────────────
  'eaton corporation': {
    normalised_name: 'eaton corporation',
    display_name: 'Eaton Corporation',
    ticker: 'ETN',
    first_seen: '2026-04-05',
    last_seen: '2026-05-24',
    doc_count: 14,
    mention_count: 29,
    weekly_counts: [4, 6, 10, 14],
    thesis_breakdown: [
      {
        thesis_id: 'demo-energy-grid',
        thesis_name: 'Energy Grid Modernisation',
        confidence: 0.58,
        doc_count: 8,
        mention_count: 16,
        supporting: 6,
        opposing: 1,
        neutral: 1,
      },
      {
        thesis_id: 'demo-data-center',
        thesis_name: 'Data Center Physical Infrastructure',
        confidence: 0.69,
        doc_count: 6,
        mention_count: 13,
        supporting: 5,
        opposing: 1,
        neutral: 0,
      },
    ],
    evidence: [
      {
        id: 'etn-e1',
        thesis_id: 'demo-energy-grid',
        thesis_name: 'Energy Grid Modernisation',
        sentiment: 'supporting',
        excerpt:
          "Eaton's 10-Q highlights a record grid infrastructure order backlog of $4.2B, up 31% year-over-year, with utility customers citing regulatory approval timelines as the primary gating factor for project execution. Switchgear and transformer lead times extended to 52 weeks in some categories.",
        score: 0.86,
        source_url: '#',
        source_name: 'Eaton Corporation 10-Q',
        document_date: '2026-05-14',
      },
      {
        id: 'etn-e2',
        thesis_id: 'demo-data-center',
        thesis_name: 'Data Center Physical Infrastructure',
        sentiment: 'supporting',
        excerpt:
          "Eaton reports that data center customers now represent 28% of its electrical products segment revenue, with power distribution units and UPS systems cited in multiple hyperscaler 10-Q filings as critical path items for new facility commissioning.",
        score: 0.79,
        source_url: '#',
        source_name: 'Eaton Corporation 10-Q',
        document_date: '2026-05-14',
      },
      {
        id: 'etn-e3',
        thesis_id: 'demo-energy-grid',
        thesis_name: 'Energy Grid Modernisation',
        sentiment: 'neutral',
        excerpt:
          "Utility customer filings reference Eaton as a key switchgear supplier in the context of grid upgrade timelines, with permitting and interconnection delays cited as the primary constraint on deployment rather than equipment availability.",
        score: 0.58,
        source_url: '#',
        source_name: 'Duke Energy 10-Q',
        document_date: '2026-05-09',
      },
    ],
  },

  // ── Super Micro Computer ───────────────────────────────────────────────────
  'super micro computer': {
    normalised_name: 'super micro computer',
    display_name: 'Super Micro Computer',
    ticker: 'SMCI',
    first_seen: '2026-04-08',
    last_seen: '2026-05-25',
    doc_count: 13,
    mention_count: 41,
    weekly_counts: [2, 5, 9, 13],
    thesis_breakdown: [
      {
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        confidence: 0.72,
        doc_count: 13,
        mention_count: 41,
        supporting: 10,
        opposing: 2,
        neutral: 1,
      },
    ],
    evidence: [
      {
        id: 'smci-e1',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'supporting',
        excerpt:
          "Multiple hyperscaler 10-Q filings reference Super Micro as a server integrator for AI training infrastructure, with one filing noting that SMCI's liquid-cooling-ready chassis design was a key factor in vendor selection for GPU cluster deployment.",
        score: 0.84,
        source_url: '#',
        source_name: 'Hyperscaler Supplier Disclosures',
        document_date: '2026-05-18',
      },
      {
        id: 'smci-e2',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'supporting',
        excerpt:
          "Super Micro Computer's 8-K discloses design wins for AI inference server platforms at three cloud providers, with production ramp timelines tied to GPU allocation schedules from primary chip suppliers.",
        score: 0.79,
        source_url: '#',
        source_name: 'Super Micro Computer 8-K',
        document_date: '2026-05-11',
      },
      {
        id: 'smci-e3',
        thesis_id: 'demo-ai-infra',
        thesis_name: 'AI Infrastructure Bottlenecks',
        sentiment: 'opposing',
        excerpt:
          "An analyst note cited in a customer 10-K raises concerns about Super Micro's component sourcing concentration and potential supply disruptions in high-demand configurations, suggesting dependency on single-source cooling components.",
        score: 0.52,
        source_url: '#',
        source_name: 'Customer 10-K Filing',
        document_date: '2026-05-05',
      },
    ],
  },

  // ── Remaining companies — derived from DEMO_RADAR ─────────────────────────

  'advanced micro devices': {
    normalised_name: 'advanced micro devices',
    display_name: 'Advanced Micro Devices',
    ticker: 'AMD',
    first_seen: '2026-04-10',
    last_seen: '2026-05-24',
    doc_count: 12,
    mention_count: 35,
    weekly_counts: [3, 6, 9, 12],
    thesis_breakdown: [
      { thesis_id: 'demo-ai-infra', thesis_name: 'AI Infrastructure Bottlenecks', confidence: 0.64, doc_count: 7, mention_count: 22, supporting: 5, opposing: 1, neutral: 1 },
      { thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', confidence: 0.65, doc_count: 5, mention_count: 13, supporting: 4, opposing: 1, neutral: 0 },
    ],
    evidence: [
      { id: 'amd-e1', thesis_id: 'demo-ai-infra', thesis_name: 'AI Infrastructure Bottlenecks', sentiment: 'supporting', excerpt: "AMD's Instinct MI300X series is referenced in three hyperscaler procurement filings as an alternative to NVIDIA for AI inference workloads, with allocation constraints noted through mid-2026.", score: 0.81, source_url: '#', source_name: 'AMD 10-Q', document_date: '2026-05-20' },
      { id: 'amd-e2', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'supporting', excerpt: "AMD's 10-Q discloses reliance on TSMC N3 and N4 process nodes for advanced GPU production, with capacity allocation subject to fab priority scheduling across multiple customers.", score: 0.74, source_url: '#', source_name: 'AMD 10-Q', document_date: '2026-05-20' },
      { id: 'amd-e3', thesis_id: 'demo-ai-infra', thesis_name: 'AI Infrastructure Bottlenecks', sentiment: 'supporting', excerpt: "Customer filings reference AMD as a growing share of AI accelerator spend, particularly for inference use cases where price-performance ratios are increasingly competitive with market-leading alternatives.", score: 0.68, source_url: '#', source_name: 'Cloud Provider 10-Q', document_date: '2026-05-08' },
    ],
  },

  'quanta services': {
    normalised_name: 'quanta services',
    display_name: 'Quanta Services',
    ticker: 'PWR',
    first_seen: '2026-04-12',
    last_seen: '2026-05-23',
    doc_count: 11,
    mention_count: 22,
    weekly_counts: [3, 5, 8, 11],
    thesis_breakdown: [
      { thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', confidence: 0.58, doc_count: 11, mention_count: 22, supporting: 7, opposing: 2, neutral: 2 },
    ],
    evidence: [
      { id: 'pwr-e1', thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', sentiment: 'supporting', excerpt: "Utility 10-Q filings cite Quanta Services as a primary transmission and distribution contractor for grid modernisation programs, with contract awards totaling $1.4B in the quarter across high-voltage and substation work.", score: 0.80, source_url: '#', source_name: 'Utility 10-Q Filings', document_date: '2026-05-16' },
      { id: 'pwr-e2', thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', sentiment: 'supporting', excerpt: "Quanta's 8-K discloses a multi-year transmission line contract in the Southwest US supporting grid interconnection for new renewable generation, with revenue recognition expected over 36 months.", score: 0.76, source_url: '#', source_name: 'Quanta Services 8-K', document_date: '2026-05-08' },
      { id: 'pwr-e3', thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', sentiment: 'neutral', excerpt: "Some customer filings flag permitting timelines and right-of-way acquisition as the binding constraint on transmission project execution, with contractor capacity noted as available but project commencement delayed by regulatory process.", score: 0.55, source_url: '#', source_name: 'Utility 10-Q', document_date: '2026-05-03' },
    ],
  },

  'kla corporation': {
    normalised_name: 'kla corporation',
    display_name: 'KLA Corporation',
    ticker: 'KLAC',
    first_seen: '2026-04-15',
    last_seen: '2026-05-25',
    doc_count: 10,
    mention_count: 18,
    weekly_counts: [2, 4, 7, 10],
    thesis_breakdown: [
      { thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', confidence: 0.65, doc_count: 10, mention_count: 18, supporting: 7, opposing: 1, neutral: 2 },
    ],
    evidence: [
      { id: 'klac-e1', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'supporting', excerpt: "KLA's 10-Q reports process control equipment orders accelerating as advanced node fabs increase inspection intensity to manage defect density at smaller geometries, with backlog up 18% sequentially.", score: 0.83, source_url: '#', source_name: 'KLA Corporation 10-Q', document_date: '2026-05-14' },
      { id: 'klac-e2', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'supporting', excerpt: "Multiple customer filings reference metrology and inspection tool delivery times as a constraint on yield learning cycles for next-generation process nodes, with lead times extending to 18-24 weeks.", score: 0.77, source_url: '#', source_name: 'Foundry Supplier Disclosures', document_date: '2026-05-09' },
      { id: 'klac-e3', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'supporting', excerpt: "TSMC's quarterly report notes increased capital intensity per wafer at N2 and below, with process control tool spend representing a growing share of fab equipment budgets.", score: 0.71, source_url: '#', source_name: 'TSMC 10-Q', document_date: '2026-05-05' },
    ],
  },

  equinix: {
    normalised_name: 'equinix',
    display_name: 'Equinix',
    ticker: 'EQIX',
    first_seen: '2026-04-18',
    last_seen: '2026-05-22',
    doc_count: 9,
    mention_count: 20,
    weekly_counts: [2, 4, 6, 9],
    thesis_breakdown: [
      { thesis_id: 'demo-data-center', thesis_name: 'Data Center Physical Infrastructure', confidence: 0.69, doc_count: 9, mention_count: 20, supporting: 7, opposing: 1, neutral: 1 },
    ],
    evidence: [
      { id: 'eqix-e1', thesis_id: 'demo-data-center', thesis_name: 'Data Center Physical Infrastructure', sentiment: 'supporting', excerpt: "Equinix is referenced in cloud provider 10-Q filings as a colocation partner for edge deployment of AI inference workloads, with interconnection density and power availability cited as selection criteria.", score: 0.79, source_url: '#', source_name: 'Cloud Provider 10-Q Filings', document_date: '2026-05-15' },
      { id: 'eqix-e2', thesis_id: 'demo-data-center', thesis_name: 'Data Center Physical Infrastructure', sentiment: 'supporting', excerpt: "Equinix's 10-Q discloses power capacity expansion programs across 12 metro markets, with hyperscaler demand cited as the primary driver of accelerated construction timelines.", score: 0.73, source_url: '#', source_name: 'Equinix 10-Q', document_date: '2026-05-10' },
      { id: 'eqix-e3', thesis_id: 'demo-data-center', thesis_name: 'Data Center Physical Infrastructure', sentiment: 'neutral', excerpt: "Some utility filings reference data center operators generally as a growing load class requiring grid interconnection upgrades, with Equinix-named facilities cited in two filings in connection with utility capacity planning.", score: 0.58, source_url: '#', source_name: 'Utility 10-Q', document_date: '2026-04-28' },
    ],
  },

  'lockheed martin': {
    normalised_name: 'lockheed martin',
    display_name: 'Lockheed Martin',
    ticker: 'LMT',
    first_seen: '2026-04-20',
    last_seen: '2026-05-25',
    doc_count: 9,
    mention_count: 17,
    weekly_counts: [3, 4, 6, 9],
    thesis_breakdown: [
      { thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', confidence: 0.61, doc_count: 9, mention_count: 17, supporting: 6, opposing: 1, neutral: 2 },
    ],
    evidence: [
      { id: 'lmt-e1', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "Lockheed's 8-K details a $2.1B supplemental contract for HIMARS resupply — the third such award in 90 days — signaling a sustained production ramp rather than a one-time procurement cycle. Multi-year production commitments now extend through 2029.", score: 0.88, source_url: '#', source_name: 'Lockheed Martin 8-K', document_date: '2026-05-22' },
      { id: 'lmt-e2', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "DoD supplier filings reference Lockheed as a prime contractor expanding production capacity for precision munitions, with subcontractor awards cited in three 8-K filings from component manufacturers.", score: 0.79, source_url: '#', source_name: 'Defense Supplier 8-K Filings', document_date: '2026-05-14' },
      { id: 'lmt-e3', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'neutral', excerpt: "Lockheed's 10-Q notes production capacity investments are proceeding on schedule but highlights raw material sourcing as a variable cost risk, with titanium and specialty alloy pricing cited as above historical averages.", score: 0.61, source_url: '#', source_name: 'Lockheed Martin 10-Q', document_date: '2026-05-08' },
    ],
  },

  'micron technology': {
    normalised_name: 'micron technology',
    display_name: 'Micron Technology',
    ticker: 'MU',
    first_seen: '2026-04-22',
    last_seen: '2026-05-24',
    doc_count: 8,
    mention_count: 15,
    weekly_counts: [1, 3, 5, 8],
    thesis_breakdown: [
      { thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', confidence: 0.65, doc_count: 8, mention_count: 15, supporting: 6, opposing: 1, neutral: 1 },
    ],
    evidence: [
      { id: 'mu-e1', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'supporting', excerpt: "Micron's 10-Q references DRAM and HBM capacity constraints persisting through Q3 2026, with AI accelerator customers representing over 30% of HBM demand and allocation managed through long-term supply agreements.", score: 0.85, source_url: '#', source_name: 'Micron Technology 10-Q', document_date: '2026-05-18' },
      { id: 'mu-e2', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'supporting', excerpt: "NVIDIA's 10-Q references HBM capacity as a constraint on high-bandwidth GPU configurations, with Micron and SK Hynix cited as the primary suppliers for HBM3E used in H200 and Blackwell products.", score: 0.80, source_url: '#', source_name: 'NVIDIA 10-Q', document_date: '2026-05-15' },
      { id: 'mu-e3', thesis_id: 'demo-semi-supply', thesis_name: 'Semiconductor Supply Chain Stress', sentiment: 'neutral', excerpt: "Consumer DRAM market commentary in Micron's filing notes improving supply-demand balance in standard configurations, offsetting some pricing pressure from the AI-driven HBM premium.", score: 0.54, source_url: '#', source_name: 'Micron Technology 10-Q', document_date: '2026-05-18' },
    ],
  },

  celestica: {
    normalised_name: 'celestica',
    display_name: 'Celestica',
    ticker: 'CLS',
    first_seen: '2026-05-18',
    last_seen: '2026-05-25',
    doc_count: 7,
    mention_count: 12,
    weekly_counts: [0, 0, 3, 7],
    thesis_breakdown: [
      { thesis_id: 'demo-ai-infra', thesis_name: 'AI Infrastructure Bottlenecks', confidence: 0.72, doc_count: 4, mention_count: 7, supporting: 3, opposing: 0, neutral: 1 },
      { thesis_id: 'demo-data-center', thesis_name: 'Data Center Physical Infrastructure', confidence: 0.69, doc_count: 3, mention_count: 5, supporting: 3, opposing: 0, neutral: 0 },
    ],
    evidence: [
      { id: 'cls-e1', thesis_id: 'demo-ai-infra', thesis_name: 'AI Infrastructure Bottlenecks', sentiment: 'supporting', excerpt: "Celestica is referenced in four 10-Q filings as a contract manufacturer ramping AI server production for unnamed hyperscaler customers, with liquid-cooling-capable chassis cited as a key manufacturing requirement.", score: 0.84, source_url: '#', source_name: 'Hyperscaler Supplier Filings', document_date: '2026-05-22' },
      { id: 'cls-e2', thesis_id: 'demo-data-center', thesis_name: 'Data Center Physical Infrastructure', sentiment: 'supporting', excerpt: "Celestica's 8-K discloses a new long-term supply agreement for AI server integration services, with production volumes expected to scale 3× over the next 18 months. Customer identity not disclosed per NDA.", score: 0.81, source_url: '#', source_name: 'Celestica 8-K', document_date: '2026-05-20' },
      { id: 'cls-e3', thesis_id: 'demo-ai-infra', thesis_name: 'AI Infrastructure Bottlenecks', sentiment: 'supporting', excerpt: "New mention in a hyperscaler procurement filing as a qualified vendor for GPU server integration, representing first appearance of Celestica in this context — prior filings referenced only ODM partners in Taiwan.", score: 0.77, source_url: '#', source_name: 'Cloud Provider 10-Q', document_date: '2026-05-18' },
    ],
  },

  'rtx corporation': {
    normalised_name: 'rtx corporation',
    display_name: 'RTX Corporation',
    ticker: 'RTX',
    first_seen: '2026-04-28',
    last_seen: '2026-05-23',
    doc_count: 7,
    mention_count: 14,
    weekly_counts: [1, 3, 5, 7],
    thesis_breakdown: [
      { thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', confidence: 0.61, doc_count: 7, mention_count: 14, supporting: 5, opposing: 1, neutral: 1 },
    ],
    evidence: [
      { id: 'rtx-e1', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "RTX's 10-Q discloses defense segment backlog at a record $67B, with missile systems and precision munitions representing the fastest-growing categories. Multi-year production contracts now extend delivery schedules through 2028.", score: 0.82, source_url: '#', source_name: 'RTX Corporation 10-Q', document_date: '2026-05-16' },
      { id: 'rtx-e2', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "DoD procurement filings reference RTX as a prime contractor for air defense and strike systems, with supplemental funding requests citing production rate increases as the priority use of allocated funds.", score: 0.76, source_url: '#', source_name: 'DoD Procurement Documents', document_date: '2026-05-09' },
      { id: 'rtx-e3', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'neutral', excerpt: "RTX's commercial aviation segment provides a revenue hedge against defense cycle timing, with Pratt & Whitney engine deliveries cited as running ahead of prior guidance due to airline fleet expansion demand.", score: 0.55, source_url: '#', source_name: 'RTX Corporation 10-Q', document_date: '2026-05-16' },
    ],
  },

  'kratos defense': {
    normalised_name: 'kratos defense',
    display_name: 'Kratos Defense',
    ticker: 'KTOS',
    first_seen: '2026-05-01',
    last_seen: '2026-05-25',
    doc_count: 6,
    mention_count: 11,
    weekly_counts: [0, 2, 4, 6],
    thesis_breakdown: [
      { thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', confidence: 0.61, doc_count: 6, mention_count: 11, supporting: 5, opposing: 0, neutral: 1 },
    ],
    evidence: [
      { id: 'ktos-e1', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "Kratos Defense appears in three prime contractor 10-Q filings as a subcontractor for unmanned aerial systems and drone components, with production volume commitments noted in each. First appearance in this context was May 1 — no prior mentions in the corpus.", score: 0.86, source_url: '#', source_name: 'Prime Contractor 10-Q Filings', document_date: '2026-05-20' },
      { id: 'ktos-e2', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "Kratos' 8-K discloses an undisclosed DoD contract for tactical drone systems, with full program value not disclosed per classification. Language in the filing indicates production volume well above prior programs.", score: 0.81, source_url: '#', source_name: 'Kratos Defense 8-K', document_date: '2026-05-14' },
      { id: 'ktos-e3', thesis_id: 'demo-defense', thesis_name: 'Defense Production Ramp', sentiment: 'supporting', excerpt: "Three independent DoD supplier filings in the past 30 days reference Kratos as a component supplier for target drone programs, suggesting a broader supply chain relationship than what is visible from Kratos' own filings alone.", score: 0.75, source_url: '#', source_name: 'Defense Supply Chain Filings', document_date: '2026-05-10' },
    ],
  },

  'powell industries': {
    normalised_name: 'powell industries',
    display_name: 'Powell Industries',
    ticker: 'POWL',
    first_seen: '2026-05-22',
    last_seen: '2026-05-25',
    doc_count: 5,
    mention_count: 8,
    weekly_counts: [0, 0, 1, 5],
    thesis_breakdown: [
      { thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', confidence: 0.58, doc_count: 5, mention_count: 8, supporting: 4, opposing: 0, neutral: 1 },
    ],
    evidence: [
      { id: 'powl-e1', thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', sentiment: 'supporting', excerpt: "Powell Industries appears for the first time in the corpus this week, referenced in an 8-K from a major utility citing switchgear delivery timelines as a grid-upgrade bottleneck. Prior to May 22, zero mentions across all tracked sources.", score: 0.83, source_url: '#', source_name: 'Utility 8-K', document_date: '2026-05-22' },
      { id: 'powl-e2', thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', sentiment: 'supporting', excerpt: "A second utility filing references Powell Industries switchgear lead times as part of a project delay disclosure, citing 44-week delivery windows for medium-voltage switchgear units required for substation upgrades.", score: 0.79, source_url: '#', source_name: 'Utility 10-Q', document_date: '2026-05-23' },
      { id: 'powl-e3', thesis_id: 'demo-energy-grid', thesis_name: 'Energy Grid Modernisation', sentiment: 'supporting', excerpt: "Three independent utility filings in May reference switchgear supply constraints for grid modernisation projects. Powell Industries is named in two of the three. This pattern — a supplier appearing across independent filings for the first time — is how the corpus surfaces early signals.", score: 0.76, source_url: '#', source_name: 'Utility Filings Cluster', document_date: '2026-05-24' },
    ],
  },
}
