'use client'

import Link from 'next/link'
import {
  ArrowUpRight, TrendingUp, Database, FileText,
  Brain, Clock, Layers, AlertCircle, CheckCircle, XCircle,
} from 'lucide-react'
import DemoShell from '@/components/layout/DemoShell'
import Logo from '@/components/ui/Logo'

// ── Small section helpers ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-border/40 my-12" />
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <DemoShell showBadge={false}>
      <div className="max-w-[720px] mx-auto px-6 py-16">

        {/* ── Hero ── */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <Logo size={32} />
            <span className="text-text-primary font-semibold text-lg tracking-tight">
              Market<span className="text-accent">Mind</span>
            </span>
          </div>

          <h1 className="text-text-primary text-3xl font-semibold tracking-tight leading-tight mb-5">
            Intelligence on the companies that will matter — before it&apos;s obvious.
          </h1>
          <p className="text-text-secondary text-base leading-relaxed">
            MarketMind is a persistent investment intelligence platform that ingests SEC
            filings and financial news daily, scores them against tracked investment
            themes, and builds a compounding corpus of signals over time. The longer it
            runs, the more meaningful each new signal becomes.
          </p>
        </div>

        <Divider />

        {/* ── What it's for ── */}
        <section className="mb-12">
          <SectionLabel>What it&apos;s for</SectionLabel>
          <h2 className="text-text-primary text-xl font-semibold mb-4">
            The layer underneath, not the headline names.
          </h2>
          <div className="space-y-4 text-text-secondary text-sm leading-relaxed">
            <p>
              MarketMind is not for deciding whether to buy Apple, Amazon, or Meta.
              Those companies are already priced in — every analyst, every fund, and every
              retail investor has an opinion on them. The signal is gone before most people
              see it.
            </p>
            <p>
              What MarketMind tracks is the <span className="text-text-primary font-medium">layer underneath</span> —
              the companies that will matter <em>because of</em> what the hyperscalers are doing,
              before the market figures that out. When NVIDIA, Microsoft, and Google are
              racing to build AI clusters at unprecedented scale, who makes the power
              distribution units? Who makes the liquid cooling systems? Who makes the
              switchgear for the grid upgrades those data centers need?
            </p>
            <p>
              Those companies are appearing in SEC filings right now, quietly, in the
              footnotes of 10-Qs and the risk disclosures of 8-Ks. A company appearing in
              2 independent filings in March, 8 in April, 19 in May — not because someone
              is hyping it, but because the companies that depend on it keep disclosing the
              dependency — that&apos;s a signal you can&apos;t find in a search. That&apos;s what
              MarketMind is built to surface.
            </p>
          </div>
        </section>

        {/* ── What it's NOT ── */}
        <section className="mb-12">
          <SectionLabel>Honest about scope</SectionLabel>
          <h2 className="text-text-primary text-xl font-semibold mb-4">
            What it doesn&apos;t do.
          </h2>
          <div className="space-y-3">
            {[
              {
                label: 'Stock price prediction',
                detail: 'MarketMind does not predict whether a stock will go up or down. It tracks the strength of underlying themes and which companies appear in them — not price targets.',
              },
              {
                label: 'Consumer sentiment',
                detail: '"Will Take-Two rise when GTA 6 releases?" That\'s consumer behaviour + media sentiment. MarketMind reads SEC filings and institutional news — not Reddit, not social media, not earnings call vibes.',
              },
              {
                label: 'Buy / sell recommendations',
                detail: 'The app surfaces alignment gaps between your portfolio and what the corpus is signalling. It never tells you to buy or sell anything. You interpret; the app informs.',
              },
              {
                label: 'Real-time trading signals',
                detail: 'Ingestion runs once daily. This is a morning intelligence tool, not a trading terminal. Latency is measured in days, not milliseconds.',
              },
            ].map(({ label, detail }) => (
              <div key={label} className="flex gap-3 p-4 rounded-xl bg-surface border border-border">
                <XCircle size={14} className="text-red/60 shrink-0 mt-0.5" />
                <div>
                  <p className="text-text-primary text-sm font-medium mb-0.5">{label}</p>
                  <p className="text-text-tertiary text-xs leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── How it works ── */}
        <section className="mb-12">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-text-primary text-xl font-semibold mb-6">
            Ingest → Score → Surface → Compound.
          </h2>

          <div className="space-y-4">
            {[
              {
                icon: FileText,
                title: 'Daily ingestion',
                body: 'Every morning, MarketMind pulls SEC filings (8-K, 10-Q, 10-K) and financial news for 60+ curated companies across five thesis sectors. Documents are embedded and stored in a local vector database — nothing leaves your machine.',
              },
              {
                icon: Brain,
                title: 'LLM scoring',
                body: 'Each document is scored against your active investment themes. A local LLM (qwen3:8b via Ollama) classifies each document as supporting, opposing, or neutral for each theme. The support rate is the ratio of supporting signals to total scored signals.',
              },
              {
                icon: TrendingUp,
                title: 'Momentum + language delta',
                body: 'Momentum compares signal activity over two 30-day windows — is the theme accelerating or slowing? Language delta detects when new terms appear or existing ones intensify, which often precedes a narrative shift before the numbers move.',
              },
              {
                icon: Database,
                title: 'Compounding corpus',
                body: 'Every document scored becomes part of a permanent corpus. After weeks of ingestion, "Vertiv Holdings appeared in 23 independent filings" is a statement about a pattern — not a single event. That pattern is invisible to any search or one-shot query.',
              },
              {
                icon: Clock,
                title: 'Daily feed',
                body: 'The feed surfaces what changed today against what the corpus has been building for months. New companies on radar, theme momentum shifts, the top excerpt worth reading — synthesised into a 2-sentence plain English briefing.',
              },
              {
                icon: Layers,
                title: 'Portfolio alignment',
                body: 'Add your holdings. MarketMind scores each theme against your portfolio and surfaces gap companies — high-signal companies from the corpus that you don\'t hold. No buy/sell advice; just the gap between what the data is saying and what you own.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 p-4 rounded-xl bg-surface border border-border">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-semibold mb-1">{title}</p>
                  <p className="text-text-tertiary text-xs leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── Current themes ── */}
        <section className="mb-12">
          <SectionLabel>Current themes</SectionLabel>
          <h2 className="text-text-primary text-xl font-semibold mb-2">
            Five tracked sectors, 60+ companies.
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            These are the pre-seeded themes. You can add your own — any hypothesis
            with a description and a set of keywords will be scored against the same
            daily corpus.
          </p>
          <div className="space-y-3">
            {[
              {
                name: 'AI Infrastructure Bottlenecks',
                desc: 'The physical constraints limiting AI cluster deployment — power delivery, liquid cooling, rack density, and the companies building solutions to each.',
                examples: 'NVIDIA, Vertiv, Super Micro, AMD',
              },
              {
                name: 'Semiconductor Supply Chain Stress',
                desc: 'Fab equipment lead times, DRAM and NAND capacity constraints, and the suppliers who gate the entire semiconductor production cycle.',
                examples: 'Applied Materials, KLA, Micron, TSMC',
              },
              {
                name: 'Energy Grid Modernisation',
                desc: 'Utility infrastructure upgrades driven by electrification, data center load growth, and renewable integration — switchgear, transformers, grid software.',
                examples: 'Eaton, Quanta Services, NextEra, Powell Industries',
              },
              {
                name: 'Defense Production Ramp',
                desc: 'Sustained production increases in munitions, unmanned systems, and platforms — tracking the difference between one-time procurement and a structural ramp.',
                examples: 'Lockheed, RTX, Kratos, Northrop',
              },
              {
                name: 'Data Center Physical Infrastructure',
                desc: 'The buildings, cooling, and power systems hyperscalers need to keep scaling — distinct from the compute layer above it.',
                examples: 'Vertiv, Equinix, Iron Mountain, Carrier',
              },
            ].map(({ name, desc, examples }) => (
              <div key={name} className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-start gap-2 mb-1.5">
                  <CheckCircle size={13} className="text-green/70 shrink-0 mt-0.5" />
                  <p className="text-text-primary text-sm font-semibold">{name}</p>
                </div>
                <p className="text-text-tertiary text-xs leading-relaxed mb-2 ml-5">{desc}</p>
                <p className="text-text-tertiary/70 text-[11px] ml-5">
                  <span className="text-text-tertiary font-medium">Tracked companies: </span>
                  {examples}…
                </p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── Tech stack ── */}
        <section className="mb-12">
          <SectionLabel>Under the hood</SectionLabel>
          <h2 className="text-text-primary text-xl font-semibold mb-2">
            Fully local. Zero API costs.
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            Every component runs in Docker on your own machine. No data is sent to
            external services. The LLM, embeddings, vector database, and relational
            store are all local.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { layer: 'Backend',    tech: 'FastAPI (Python 3.12), async throughout' },
              { layer: 'Frontend',   tech: 'Next.js 15, React 19, Tailwind CSS' },
              { layer: 'Vector DB',  tech: 'Qdrant — document embeddings' },
              { layer: 'Database',   tech: 'PostgreSQL — signals, snapshots, holdings' },
              { layer: 'Cache',      tech: 'Redis — feed cache, ingestion checkpoints' },
              { layer: 'LLM',        tech: 'Ollama — qwen3:8b (reasoning), nomic-embed-text (embeddings)' },
            ].map(({ layer, tech }) => (
              <div key={layer} className="p-3 rounded-xl bg-surface border border-border">
                <p className="text-text-tertiary text-[10px] uppercase tracking-widest font-medium mb-0.5">{layer}</p>
                <p className="text-text-primary text-xs">{tech}</p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── CTA ── */}
        <div className="text-center space-y-4">
          <p className="text-text-primary text-base font-semibold">See it in action</p>
          <p className="text-text-secondary text-sm leading-relaxed max-w-md mx-auto">
            The demo uses pre-loaded sample data — no account needed. The live version
            runs against a real corpus of daily SEC filings and financial news.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/demo"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Try the demo
              <ArrowUpRight size={13} />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-elevated hover:text-text-primary transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </DemoShell>
  )
}
