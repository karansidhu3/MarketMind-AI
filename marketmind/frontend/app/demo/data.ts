/**
 * Static sample data for the public /demo route.
 */

import type { TrajectoryRow } from '@/lib/types'

// ── Signal Map demo data — mirrors TrajectoryRow contract ─────────────────────
// Sorted: inflecting first (by acceleration desc), then non-inflecting (by acceleration desc).
// 15 rows total: 7 inflecting (amber) + 8 steady.

export const DEMO_TRAJECTORIES: TrajectoryRow[] = [

  // ── Inflecting — 7 companies ─────────────────────────────────────────────────

  {
    normalised_name: 'vertiv holdings',
    display_name:    'Vertiv Holdings',
    ticker:          'VRT',
    icr_series:      [0,1,1,1,2,2,3,4,5,5,7,12],
    icr_current:     12,
    icr_4w_avg:      5.25,
    is_inflecting:   true,
    acceleration:    4.25,
  },
  {
    normalised_name: 'applied materials',
    display_name:    'Applied Materials',
    ticker:          'AMAT',
    icr_series:      [0,1,1,2,2,3,3,3,4,5,7,11],
    icr_current:     11,
    icr_4w_avg:      4.75,
    is_inflecting:   true,
    acceleration:    4.25,
  },
  {
    normalised_name: 'super micro computer',
    display_name:    'Super Micro Computer',
    ticker:          'SMCI',
    icr_series:      [0,0,1,1,1,2,2,3,3,4,6,9],
    icr_current:     9,
    icr_4w_avg:      4.0,
    is_inflecting:   true,
    acceleration:    3.5,
  },
  {
    normalised_name: 'celestica',
    display_name:    'Celestica',
    ticker:          'CLS',
    icr_series:      [0,0,0,0,0,1,1,1,2,2,3,7],
    icr_current:     7,
    icr_4w_avg:      2.0,
    is_inflecting:   true,
    acceleration:    3.0,
  },
  {
    normalised_name: 'kla corporation',
    display_name:    'KLA Corporation',
    ticker:          'KLAC',
    icr_series:      [0,0,1,1,2,2,2,3,3,4,5,8],
    icr_current:     8,
    icr_4w_avg:      3.75,
    is_inflecting:   true,
    acceleration:    2.75,
  },
  {
    normalised_name: 'kratos defense',
    display_name:    'Kratos Defense',
    ticker:          'KTOS',
    icr_series:      [0,0,0,0,0,0,1,1,2,3,4,6],
    icr_current:     6,
    icr_4w_avg:      2.5,
    is_inflecting:   true,
    acceleration:    2.5,
  },
  {
    normalised_name: 'powell industries',
    display_name:    'Powell Industries',
    ticker:          'POWL',
    icr_series:      [0,0,0,0,0,0,0,1,1,2,2,5],
    icr_current:     5,
    icr_4w_avg:      1.5,
    is_inflecting:   true,
    acceleration:    2.0,
  },

  // ── Steady — 8 companies ──────────────────────────────────────────────────────

  {
    normalised_name: 'advanced micro devices',
    display_name:    'Advanced Micro Devices',
    ticker:          'AMD',
    icr_series:      [1,2,2,3,3,4,4,5,5,6,7,8],
    icr_current:     8,
    icr_4w_avg:      5.75,
    is_inflecting:   false,
    acceleration:    1.75,
  },
  {
    normalised_name: 'micron technology',
    display_name:    'Micron Technology',
    ticker:          'MU',
    icr_series:      [0,1,1,2,2,3,3,4,4,5,6,7],
    icr_current:     7,
    icr_4w_avg:      4.75,
    is_inflecting:   false,
    acceleration:    1.75,
  },
  {
    normalised_name: 'eaton corporation',
    display_name:    'Eaton Corporation',
    ticker:          'ETN',
    icr_series:      [2,2,3,4,4,5,5,6,7,7,8,9],
    icr_current:     9,
    icr_4w_avg:      7.0,
    is_inflecting:   false,
    acceleration:    1.5,
  },
  {
    normalised_name: 'quanta services',
    display_name:    'Quanta Services',
    ticker:          'PWR',
    icr_series:      [1,1,2,2,3,3,4,4,5,5,6,7],
    icr_current:     7,
    icr_4w_avg:      5.0,
    is_inflecting:   false,
    acceleration:    1.5,
  },
  {
    normalised_name: 'rtx corporation',
    display_name:    'RTX Corporation',
    ticker:          'RTX',
    icr_series:      [1,1,2,2,3,3,4,4,4,5,5,7],
    icr_current:     7,
    icr_4w_avg:      4.5,
    is_inflecting:   false,
    acceleration:    1.5,
  },
  {
    normalised_name: 'nvidia',
    display_name:    'NVIDIA',
    ticker:          'NVDA',
    icr_series:      [4,5,5,6,7,7,8,9,9,9,10,11],
    icr_current:     11,
    icr_4w_avg:      9.25,
    is_inflecting:   false,
    acceleration:    1.25,
  },
  {
    normalised_name: 'equinix',
    display_name:    'Equinix',
    ticker:          'EQIX',
    icr_series:      [1,1,2,2,3,3,4,4,4,5,5,6],
    icr_current:     6,
    icr_4w_avg:      4.5,
    is_inflecting:   false,
    acceleration:    1.0,
  },
  {
    normalised_name: 'lockheed martin',
    display_name:    'Lockheed Martin',
    ticker:          'LMT',
    icr_series:      [2,2,3,3,3,4,4,4,4,4,4,5],
    icr_current:     5,
    icr_4w_avg:      4.0,
    is_inflecting:   false,
    acceleration:    0.5,
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
 * Gap companies — accelerating signals not represented in holdings.
 * All four are currently inflecting. Sorted by ICR current desc.
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
  {
    company_name: 'Celestica',
    ticker: 'CLS',
    normalised_name: 'celestica',
    thesis_names: ['AI Infrastructure Bottlenecks', 'Data Center Physical Infrastructure'],
    doc_count: 7,
    weekly_counts: [0, 0, 3, 7],
  },
]
