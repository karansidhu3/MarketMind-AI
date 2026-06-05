# MarketMind — Cinematic Systems Showcase: Version 1 Film Plan

> **Type:** Systems showcase — not a proof-of-intelligence film.  
> **Audience:** Recruiters, engineers, technical hiring managers, GitHub portfolio viewers.  
> **Goal:** Communicate deep systems thinking, architectural discipline, epistemic rigor, and design maturity.  
> **What this is NOT:** A proof-of-alpha film. No real ICR signals have accumulated yet. The moat is being built.

---

## Positioning

### What the film claims

- ICR — Independent Citation Rate — counts how many structurally independent companies cite an entity in primary SEC filings per week, tracked as a 12-week time series.
- A constraint vocabulary gate (`constraint.py`) ensures only filings discussing supply-chain stress — not passing mentions — advance ICR. This is a documented architectural decision, not a tuning choice.
- The system was rebuilt around ICR after confidence scores were explicitly removed because they inflate toward 70–80% by construction.
- 37 documented architecture decisions. An explicit "What NOT to build" list. Confidence scores removed. Supply chain extraction removed. Insider transactions removed. All with written rationale.
- Runs entirely locally: Postgres, Qdrant, Redis, Ollama, Docker Compose. No API costs.
- Design is intentional: warm neutrals, spring physics, DM Serif for editorial moments, monospace for data.
- The corpus is accumulating. Real ICR requires real time. The system is production-quality.

### What the film does NOT claim

- Any specific real signal discovered — ICR data has not accumulated long enough.
- Investment alpha demonstrated.
- That the demo data is live data. It is clearly labeled sample data.
- "This is what the market doesn't know yet." That story comes later.

### Framing

> *"This is what it looks like to think carefully about information quality, epistemic rigor, temporal accumulation, and product design — before the data has accumulated long enough to tell its first real story."*

The video communicates *how I think*, not *what the system found*.

---

## Pre-Film Fixes

Complete all Critical items before recording. See `docs/video-readiness-plan.md` for full implementation detail.

| Priority | Fix | File |
|---|---|---|
| **Critical** | Remove Feed from nav | `Header.tsx` |
| **Critical** | Enlarge Signal Map sparklines (4→8px wide, 28→44px tall) | `signals/page.tsx`, `demo/page.tsx` |
| **Critical** | DM Serif on Signal Map title | `signals/page.tsx` |
| **Critical** | DM Serif on company page h1 | `companies/[name]/page.tsx` |
| **Critical** | Amber row highlight 0.025→0.05 opacity | `signals/page.tsx`, `demo/page.tsx` |
| **Critical** | `cursor-pointer` on Signal Map rows | `signals/page.tsx` |
| **High** | Evidence excerpt blockquote border | `companies/[name]/page.tsx` |
| **High** | Remove "CareerOS" comment from globals.css | `globals.css` |
| **High** | Delete stale demo exports (DEMO_FEED, DEMO_RADAR, DEMO_NARRATIVES) | `demo/data.ts` |

---

## Film Structure

**Duration:** 2:35 – 2:50  
**Pacing model:** Technical essay, not product demo. Each section lands before the next begins.  
**Mode:** Dark mode for Act I and Act II. Transition to light mode in Act IV.

---

### Opening — The Problem (0:00–0:18)

**No UI. Typography only. Dark background (`#111110`).**

Lines appear sequentially, each ~18 frame fade, DM Serif, white, centered:

```
"Most financial signals arrive at the same moment."
                  ↓ 2.5s hold
"Aggregated from the same sources."
"Parsed by the same models."
"Available to everyone simultaneously."
```

Each line slightly smaller than the one above it. 1 second hold on the final line.

**Hard cut to white.** Not a dissolve. A cut. This is the conceptual break.

---

### Act I — The Signal (0:18–0:52)

**Introduce ICR through the product. `/demo` in dark mode.**

| Moment | Action | Duration |
|---|---|---|
| Page load | Demo Signal Map loads; sparklines animate up from 0 | 2s hold |
| Typography overlay | "Independent Citation Rate" (DM Serif, lower-third) | 1.5s |
| Definition | "How many structurally independent companies referenced an entity in primary SEC filings — per week." | 3.5s |
| Cursor rests on VRT row | Amber highlight visible, Accelerating badge, sparkline shape | 2s |
| Screen Studio zoom | 1.3× on VRT sparkline | 2s hold |
| Typography | "Not mentions. Legal disclosures." | 2s |
| Click Vertiv Holdings | Company page loads with spring animation | 1.5s |
| Hold on ICR card | 12, sparkline, Accelerating badge | 2s |
| Typography | "A company going 0 → 12 in 12 weeks cannot be surfaced by a one-shot query." | 3s |

**This is the thesis statement of the film.**

---

### Act II — The Gate (0:52–1:22)

**Constraint vocabulary gate and architectural discipline. Code editor view.**

| Moment | Action | Duration |
|---|---|---|
| Dissolve to code | `constraint.py` open in editor | 1s |
| Hold on docstring | Camera reads: "without this gate, ICR over-counts: a company that appears in 30 SEC filings as a passing customer reference would score the same as one that appears as a supply bottleneck." | 5s |
| Typography | "A mention does not advance the signal. Constraint language does." | 3s |
| Slow scroll to CONSTRAINT_TERMS | Zoom 1.4× on cluster: `"lead time"`, `"backlog"`, `"sole source"`, `"wafer"`, `"foundry"` | 4s |
| Cut to decisions.md | ADR-034 heading visible | 2s |
| Cut to CLAUDE.md | "What NOT to build" section: confidence scores, supply chain extraction, insider transactions — all with rationale | 4s |
| Typography | "37 documented architecture decisions. Including what not to build." | 3s |

---

### Act III — The System (1:22–1:50)

**Architecture glimpses. Fast pacing. ~2.5s per cut.**

| Moment | Action | Duration |
|---|---|---|
| docker-compose.yml | Service names visible: postgres, qdrant, redis, ollama, backend, frontend, ingestor | 3s |
| Typography | "Runs entirely locally. No API costs." | 2s |
| trajectory_service.py | Zoom 1.5× on: `func.count(distinct(Evidence.filing_ticker))` | 3s |
| Typography | "ICR is a count, not an inference. `COUNT(DISTINCT filing_ticker)` — objective and self-correcting." | 3s |
| scheduler.py | The `_wait_for_ollama()` comment: "Useful when Ollama runs on a remote host (e.g. a PC waking from sleep)" | 2.5s |
| No typography | Let the comment speak. A human detail. | — |

---

### Act IV — The Product (1:50–2:25)

**Light mode. Warm, clean, breathing. Demonstrate the product surfaces.**

| Moment | Action | Duration |
|---|---|---|
| Dissolve from code | Signal Map in light mode, full list loaded | 1s |
| Slow scroll | All 10 rows, sparklines, badges — no cursor interaction | 8s |
| Click "Accelerating" filter | Non-inflecting rows spring out; 4 amber rows remain | 2s |
| Typography | "Acceleration = current week ICR ≥ 2× 4-week average AND ≥ 3 independent citations." | 3s |
| Nav click to Portfolio | Portfolio intelligence mode loads | 1.5s |
| Hold on narrative sentence | DM Serif pull-quote: "Positioned in AI Infrastructure and Energy Grid. Vertiv Holdings — 12 independent citations, not held." | 4s |
| Typography | "What your corpus knows about what you don't hold." | 2.5s |
| Gap signals animate in | Staggered spring entrance, hold briefly | 2s |

---

### Close (2:25–2:45)

**Dissolve to dark. Slow.**

```
MarketMind            ← Logo wordmark, centered
A corpus memory platform.    ← DM Serif, below
The moat is temporal.        ← smaller, 1.5s delay
```

Hold 2 seconds. Fade to black over 1.8s.

Name / GitHub / LinkedIn — small, monospace, bottom of frame, fade in last, fade out with black.

---

## Shot List

| # | Scene | Mode | Route | Duration | Notes |
|---|---|---|---|---|---|
| 01 | Opening typography | — | — | 0:18 | Screen Studio: dark frame, no UI |
| 02 | Signal Map load + sparklines settling | Dark | `/demo` | 0:12 | Capture spring animations on load |
| 03 | VRT row zoom | Dark | `/demo` | 0:08 | Screen Studio 1.3× zoom |
| 04 | VRT company page ICR card | Dark | `/demo` (panel) | 0:10 | Click Vertiv, spring slide-in |
| 05 | constraint.py docstring | Dark | Editor | 0:10 | VS Code, minimal theme |
| 06 | constraint.py CONSTRAINT_TERMS | Dark | Editor | 0:08 | Zoom 1.4× on key terms |
| 07 | CLAUDE.md "What NOT to build" | Dark | Editor | 0:06 | Scroll to section |
| 08 | docker-compose.yml | Dark | Editor | 0:05 | Service names visible |
| 09 | trajectory_service.py COUNT line | Dark | Editor | 0:06 | Zoom 1.5× |
| 10 | scheduler.py Ollama comment | Dark | Editor | 0:05 | No zoom needed |
| 11 | Signal Map full list | Light | `/demo` | 0:10 | Slow scroll, no cursor |
| 12 | Accelerating filter click | Light | `/demo` | 0:06 | Spring removal of rows |
| 13 | Portfolio narrative sentence | Light | `/demo/portfolio` | 0:08 | Zoom 1.25×, hold |
| 14 | Gap signals stagger | Light | `/demo/portfolio` | 0:05 | Watch animation settle |
| 15 | Close typography | Dark | — | 0:20 | Fade to black |

---

## Screen Studio Guidance

### Setup
- Record at Retina native (2×). Do not downsample before export.
- Browser: clean profile, no visible extensions, URL bar hidden.
- Cursor: Screen Studio minimal dot, no ring, smallest size.

### Cursor rules
- Move at reading pace. Practice each shot path before recording.
- Hold cursor still for ≥ 1.5s before any click.
- During sparkline zoom: cursor off-screen or bottom-right corner.
- No hovering without intent. Every cursor position is deliberate.

### Zoom targets

| Target | Zoom level | Hold |
|---|---|---|
| VRT sparkline (Signal Map) | 1.30× | 2s |
| ICR number on company page | 1.25× | 3s |
| `CONSTRAINT_TERMS` cluster | 1.40× | 4s |
| `COUNT(DISTINCT filing_ticker)` | 1.50× | 3s |
| Portfolio narrative sentence | 1.25× | 4s |

---

## Final Cut Pro Guidance

### Track layout
```
Track 1 Video:  Screen recordings
Track 2 Video:  Typography overlay compound clips
Track 1 Audio:  Music bed
Track 2 Audio:  Sparse UI sounds (optional, −26dB)
```

### Transition language

| Transition type | Duration | When |
|---|---|---|
| Hard cut | 0 frames | Opening typography → product |
| Product dissolve | 18 frames (0.3s) | Within Act IV |
| Code ↔ product dissolve | 30 frames (0.5s) | Acts II–III ↔ Acts I, IV |
| Fade to black | 108 frames (1.8s) | Close only |

**Do not use:** slides, wipes, pushes, zoom-outs, or any transition that calls attention to itself.

### Typography overlays

- **Typeface:** DM Serif Display (primary claims), Geist Mono (code references)
- **Size hierarchy:** 72pt primary → 36pt sub-claim → 24pt definition
- **Color:** white on dark, `#1C1C1E` on light product shots
- **Animation:** opacity 0→1 over 18 frames. No position. No scale. Hold. Opacity 1→0 over 12 frames.
- **Positioning:** lower-third for definitions, center for primary statements

### Color grade

| Shot type | Adjustment |
|---|---|
| Light mode product | Temperature +4, shadows +2, highlights −1 |
| Dark mode product | Temperature +2, saturation −3 |
| Code editor | Desaturate −8, temperature −2 |

Apply at 25–35% LUT strength if using a warm-neutral LUT. Do not fight the product's existing palette.

---

## Soundtrack Direction

**Genre:** Ambient / minimal electronic or sparse piano with electronic texture.

**References:** Jon Hopkins ("Immunity"), Nils Frahm ("Says"), Rival Consoles ("Persona").

**Avoid:** Beats, cinematic swells, Hans Zimmer textures, drops, anything that sounds like a startup announcement.

**BPM:** 70–90 if any tempo. Fully ambient is also correct.

**Mix levels:**

| Section | Music level |
|---|---|
| Opening typography | −6 dBFS |
| Product shots (UI) | −10 dBFS |
| Code shots | −14 dBFS |
| Close typography | −8 dBFS |

---

## Recruiter Notes

### What signals senior-level thinking

- The `passes_constraint_gate()` docstring — explains a precision/recall tradeoff precisely.
- ADR-031 "Why confidence score fails" — shows statistical self-awareness about your own metrics.
- The "What NOT to build" section — explicit rejection with rationale is rare. Show it.
- 37 ADRs existing at all — not the content but the practice of writing them.
- `filing_ticker` on Evidence rather than `independent_citation_count` on CompanySignal — the correct data model choice that avoids denormalization.
- The corpus cleanse: built something, audited it honestly, deleted 127 rows because they were generated by noisy sources. Documented in a sprint.

### What accidentally signals immaturity (avoid in film)

- Feed in the nav — signals cleanup debt. Remove before filming.
- Empty Signal Map — never show the "No ICR data yet" state.
- Any confidence score in the UI.
- The Feed route, the Themes route.
- Any loading skeleton as the primary subject of a shot.

---

## Version 2 — Future Flagship Film Direction

Version 2 is a fundamentally different film. It requires real accumulated data.

**Minimum requirements to begin Version 2 production:**

- 12+ weeks of production ICR data
- At least 1 real inflection event (a company whose ICR series shows genuine acceleration, traceable to real filings)
- 3+ companies with non-trivial ICR series (not all zeros)
- Real evidence excerpts with specific constraint language from real filings

**The story Version 2 tells:**

> "8 weeks ago, this company appeared in 0 independent SEC filings per week.  
> Here is the first filing that cited it.  
> Here is the week 3 companies independently cited it.  
> Here is the week it inflected.  
> Here are the actual filings. Here is the actual language."

That is a falsifiable claim with evidence attached. It earns the cinematic treatment.

**Version 1 creates the context. Version 2 delivers the proof.**

Q2 10-Q season (mid-July 2026) is the first realistic window for meaningful ICR accumulation. Version 2 production can begin when the data earns it — approximately September 2026 at earliest.
