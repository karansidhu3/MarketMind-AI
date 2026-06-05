# Video Readiness Plan

## Goal

Prepare MarketMind for a cinematic systems-showcase video optimized for GitHub, recruiters, portfolio presentation, and engineering storytelling.

This is not visual polish for its own sake. Every change here improves one or more of:

- **Filmed readability** — elements that are invisible or ambiguous on a recording
- **Conceptual coherence** — the product's identity should be clear at a glance
- **Hierarchy** — the most important things should read as most important
- **Product identity** — the nav, typography, and visual language should all agree on what this product is

Reference: `docs/video-plan-v1.md` for the full film structure and shot list.

---

## Fixes

---

### 1. Remove Feed from Navigation

#### Why this matters

- **Filmed impact:** A 3-item nav with "Feed" sandwiched between Signals and Portfolio immediately signals a product in mid-transition to any engineer watching. It raises the question: "Why is Feed there?" — which is not a question the film should invite.
- **Product clarity:** The product's primary surfaces are Signals and Portfolio. Feed is a legacy surface from the pre-ICR rebuild era. It is still live but no longer the primary experience.
- **Recruiter perception:** Clean nav = intentional design. Feed in the nav = cleanup debt visible on screen.
- **Narrative:** The film's argument is architectural discipline. An unreasonably persistent nav item contradicts that argument.

#### Files

- `frontend/components/layout/Header.tsx`

#### Current implementation

Three-item NAV array: `Signals | Feed | Portfolio`. Feed uses the `Zap` icon with an alert badge state (`hasAlert`) driven by a `getAlerts()` API call on mount.

#### Required change

1. Remove `{ href: '/feed', icon: Zap, label: 'Feed' }` from the NAV array.
2. Remove the `Zap` import from lucide-react.
3. Remove the `getAlerts` import from `@/lib/api`.
4. Remove `const [hasAlert, setHasAlert] = useState(false)`.
5. Remove the `getAlerts()` useEffect block.
6. Remove `const showBadge = href === '/feed' && hasAlert && !active` from the nav map.
7. Remove the `onClick={() => { if (href === '/feed') setHasAlert(false) }}` handler from the Link.
8. Remove the `{showBadge && (...)}` badge span inside the Link.
9. Simplify the Link: no special onClick needed when Feed is removed.

Result: 2-item nav `Signals | Portfolio`. Clean and intentional.

#### Acceptance criteria

- Nav renders exactly two items: Signals and Portfolio.
- No unused imports remain in Header.tsx.
- No console errors related to missing Feed state.
- Feed route still accessible by URL (just not linked from nav).

#### Priority

**Critical**

#### Estimated effort

**Small** — ~15 lines deleted, 0 lines added.

---

### 2. Enlarge Signal Map and Demo Sparklines

#### Why this matters

- **Filmed impact:** At 4px wide / 28px tall, the ICR sparklines are the primary visual element of the Signal Map — and they are invisible on any compressed video recording. A viewer watching the film sees grey noise where the trajectory curves should be. This single fix has more impact on the film than any other visual change.
- **Product clarity:** The sparkline is the ICR concept made visual. If it cannot be read at a glance, the concept does not land.
- **Hierarchy:** The sparkline should be the hero of each row, not a decorative afterthought.

#### Files

- `frontend/app/signals/page.tsx` — `ICRSparkline` component
- `frontend/app/demo/page.tsx` — `ICRSparkline` component

#### Current implementation

Both files use `BAR_W = 4`, `BAR_GAP = 2`, `H = 28`. The empty-state fallback renders bars at `height: 2`.

#### Required change

Change to `BAR_W = 8`, `BAR_GAP = 3`, `H = 44` in both files.

In the empty-state (all-zero series): keep the minimum bar height at 2px, but update the container width calculation: `series.length * (BAR_W + BAR_GAP) - BAR_GAP`.

No change to color logic, spring animation, or any other properties.

#### Acceptance criteria

- Sparklines are legible at arm's length from the screen.
- Proportions remain correct (tallest bar fills full height, shortest visible).
- Spring animation still fires correctly on load.
- Empty-state (all zeros) renders flat baseline bars.
- Both `/signals` and `/demo` render identically.

#### Priority

**Critical**

#### Estimated effort

**Small** — 6 constant values changed across 2 files.

---

### 3. DM Serif Display on Signal Map Title

#### Why this matters

- **Filmed impact:** The first thing a viewer reads on the primary product surface. "Signal Map" in a default sans-serif system font reads as a generic dashboard. In DM Serif Display, it reads as a product with a typographic identity.
- **Product clarity:** DM Serif is already loaded and used on the portfolio pull-quote — the most editorially successful moment in the product. Applying it to the primary surface title makes the typographic language consistent.
- **Hierarchy:** The title should carry the most visual weight on the page. Currently it is `text-lg font-bold` — smaller than the table header labels.

#### Files

- `frontend/app/signals/page.tsx` — the `<h1>` in the page header

#### Current implementation

```tsx
<h1 className="text-text-primary text-lg font-bold tracking-tight">Signal Map</h1>
```

#### Required change

```tsx
<h1 className="text-text-primary text-lg font-serif-display">Signal Map</h1>
```

Remove `font-bold` and `tracking-tight`. DM Serif Display carries its own weight and spacing.

#### Acceptance criteria

- "Signal Map" renders in DM Serif Display on both light and dark modes.
- No layout shift introduced.
- The h1 aligns visually with the subtitle below it.

#### Priority

**Critical**

#### Estimated effort

**Small** — one className change.

---

### 4. DM Serif Display on Company Page Headers

#### Why this matters

- **Filmed impact:** Company names are the primary subjects of the product's deep-dive surface. "Vertiv Holdings" in Geist Sans reads like a spreadsheet cell. In DM Serif Display, it reads like an editorial subject — something being investigated.
- **Narrative:** The film visits the Vertiv company page. The company name is the first thing the camera rests on. It must carry visual authority.
- **Consistency:** Applying DM Serif to the primary editorial moments (title, company name, portfolio narrative) creates a consistent typographic language for claims vs. data.

#### Files

- `frontend/app/companies/[name]/page.tsx` — the `<h1>` company name

#### Current implementation

```tsx
<h1 className="text-text-primary text-2xl font-bold tracking-tight leading-tight">
  {company.display_name}
</h1>
```

#### Required change

```tsx
<h1 className="text-text-primary text-2xl font-serif-display leading-tight">
  {company.display_name}
</h1>
```

Remove `font-bold` and `tracking-tight`.

#### Acceptance criteria

- Company names render in DM Serif Display on the company page.
- The ticker badge next to the name aligns correctly vertically.
- No layout shift in the header grid.

#### Priority

**Critical**

#### Estimated effort

**Small** — one className change.

---

### 5. Increase Amber Inflection Row Emphasis

#### Why this matters

- **Filmed impact:** At `bg-amber/[0.025]`, the inflection row highlight is invisible even in person. On a compressed video recording, it registers as noise — the viewer cannot tell which rows are inflecting. The amber highlight is the visual signal that something is happening. It must be legible.
- **Product clarity:** The distinction between "accelerating" and "not accelerating" is the entire purpose of the inflection detection system. If that distinction is invisible, the product's most important concept does not communicate visually.

#### Files

- `frontend/app/signals/page.tsx` — `SignalRow` component
- `frontend/app/demo/page.tsx` — `SignalRow` component

#### Current implementation

Both files: `row.is_inflecting && 'bg-amber/[0.025]'`

#### Required change

Change to `row.is_inflecting && 'bg-amber/[0.05]'` in both files.

This doubles the opacity but remains subtle — a warm breath on the row, not a neon highlight. The amber sparkline bars and badge still carry the primary visual weight.

#### Acceptance criteria

- Inflecting rows have a perceptibly warmer background than non-inflecting rows, visible at a glance.
- The contrast is readable in both light and dark modes.
- The row still feels part of the table, not highlighted like an alert.

#### Priority

**Critical**

#### Estimated effort

**Small** — two string values changed.

---

### 6. Fix Signal Map Row Cursor

#### Why this matters

- **Product clarity:** Signal Map rows are clickable — clicking a company name navigates to the company page. But `cursor-default` on the row wrapper tells the user nothing is clickable. This is a UX inconsistency that any engineer or designer watching the film would notice.
- **Filmed impact:** When the cursor moves toward a row during filming, the default cursor communicates "this is not interactive" — which contradicts the click interaction that follows.

#### Files

- `frontend/app/signals/page.tsx` — `SignalRow` component className

#### Current implementation

```tsx
'hover:bg-elevated/60 transition-colors cursor-default',
```

#### Required change

```tsx
'hover:bg-elevated/60 transition-colors cursor-pointer',
```

#### Acceptance criteria

- Cursor changes to pointer on row hover.
- No visual regression on the row layout or hover state.

#### Priority

**Critical**

#### Estimated effort

**Small** — one word changed.

---

### 7. Evidence Excerpt Blockquote Styling

#### Why this matters

- **Filmed impact:** The evidence trail on company pages contains the most compelling text in the product — real SEC filing language with specific constraint signals. Currently it is plain text with a 6px colored dot. On film, it looks like a debug log, not evidence.
- **Narrative:** The film visits the company page. If the evidence trail is visible at all, it should read as quotations being presented — not items in a list.
- **Recruiter perception:** An intelligence product that presents evidence as formatted quotations signals attention to information hierarchy.

#### Files

- `frontend/app/companies/[name]/page.tsx` — `EvidenceRow` component

#### Current implementation

```tsx
<p className="text-text-secondary text-sm leading-relaxed">{ev.excerpt}</p>
```

#### Required change

```tsx
<p className="text-text-secondary text-sm leading-relaxed border-l-2 border-border/50 pl-3">
  {ev.excerpt}
</p>
```

A left border frames the excerpt as a quotation. The border color (`border/50`) is subtle but directional.

#### Acceptance criteria

- Evidence excerpts render with a visible left border in both light and dark modes.
- The border does not conflict with the sentiment dot on the left.
- Layout remains correct on narrow viewports.

#### Priority

**High**

#### Estimated effort

**Small** — two className properties added.

---

### 8. Remove "CareerOS" from globals.css Comment

#### Why this matters

- **Recruiter perception:** Any engineer reading the repository will open `globals.css` early. A comment referencing a different product ("CareerOS shared design language") creates immediate ambiguity: Is this copied? Is this shared IP? What is the relationship? These are questions the repo should not invite.
- **Product identity:** The design language belongs to MarketMind. The comment should reflect that.

#### Files

- `frontend/app/globals.css` — line 5

#### Current implementation

```css
/* ── Color system (CareerOS shared design language) ──────────────────────── */
```

#### Required change

```css
/* ── Color system ──────────────────────────────────────────────────────────── */
```

#### Acceptance criteria

- No reference to "CareerOS" in the CSS file.
- Comment length roughly preserved for formatting consistency.

#### Priority

**High**

#### Estimated effort

**Small** — one comment line.

---

### 9. Delete Stale Demo Data Exports

#### Why this matters

- **Recruiter perception:** `DEMO_FEED`, `DEMO_RADAR`, and `DEMO_NARRATIVES` are defined and exported in `demo/data.ts` but imported by no current route. They are vestigial from the Feed-era demo (pre-Sprint 16). Any developer reading the file sees exports that go nowhere — the equivalent of dead code.
- **Product clarity:** The current demo uses only `DEMO_TRAJECTORIES`, `DEMO_HOLDINGS`, and `DEMO_GAPS`. The file should reflect the current product, not its history.

#### Files

- `frontend/app/demo/data.ts`

#### Current implementation

File exports: `DEMO_TRAJECTORIES`, `DEMO_FEED`, `DEMO_RADAR`, `DEMO_NARRATIVES`, `DEMO_HOLDINGS`, `DEMO_GAPS`, `DemoHolding`, `DemoGap`.

Of these, `DEMO_FEED`, `DEMO_RADAR`, and `DEMO_NARRATIVES` are unused.

#### Required change

Delete the three unused exports and their content from `demo/data.ts`. Retain: `DEMO_TRAJECTORIES`, `DEMO_HOLDINGS`, `DEMO_GAPS`, and the type interfaces `DemoHolding`, `DemoGap`.

Also remove the `FeedResponse` and `CompanyRadarItem` imports from `@/lib/types` at the top of the file if they are only used by the deleted exports.

#### Acceptance criteria

- `demo/data.ts` contains only actively used exports.
- TypeScript compiles without errors.
- No unused imports remain in the file.

#### Priority

**High**

#### Estimated effort

**Small** — deletion only, ~180 lines removed.

---

### 10. Improve ICR Framing Text on Company Page

#### Why this matters

- **Narrative impact:** The large `text-3xl` ICR number on the company page currently sits above `text-xs` "this week." This labels the number but doesn't communicate what it means. On film, a viewer seeing "12 — this week" needs to already understand ICR to parse it. "12 independent companies this week" communicates the concept at a glance.
- **Filmed impact:** When the camera zooms to the ICR card, the framing text below the number is part of the shot. It should be worth reading.

#### Files

- `frontend/app/companies/[name]/page.tsx` — ICR card in the two-column top section

#### Current implementation

```tsx
<div className="text-text-tertiary text-xs mt-1">this week</div>
```

#### Required change

```tsx
<div className="text-text-tertiary text-[11px] mt-1 leading-tight">
  independent companies this week
</div>
```

#### Acceptance criteria

- Label reads "independent companies this week" below the ICR number.
- Text wraps cleanly within the card width on small viewports.
- No layout overflow in the ICR card.

#### Priority

**Medium**

#### Estimated effort

**Small** — one text string changed.

---

### 11. Improve Corpus Health Footer Legibility

#### Why this matters

- **Filmed impact:** The corpus health footer ("152 primary disclosures · 2 trade press · 154 total evidence rows · last filing Jun 1") is the "corpus pulse" — the ambient signal that the system is alive and accumulating. At `text-[11px]`, it is readable in person but marginal on film.
- **Narrative:** Making the temporal accumulation of the corpus visible is part of the film's argument. The footer should not require squinting.

#### Files

- `frontend/app/signals/page.tsx` — `CorpusFooter` component

#### Current implementation

Footer text uses `text-[11px]` for all elements.

#### Required change

Change the data values (`primary`, `tradePres`, `evidence_total`, `lastDate`) from `text-[11px]` to `text-xs`. Labels ("Corpus", "primary disclosures", etc.) can remain at `text-[11px]`.

Increase the `mt-8 pt-5` spacing to `mt-10 pt-6` for more visual separation from the table.

#### Acceptance criteria

- Corpus counts are readable at standard recording distance.
- Footer does not compete visually with the table above it.
- Section label "CORPUS" retains its uppercase tracking style.

#### Priority

**Medium**

#### Estimated effort

**Small** — a few className changes.

---

## Cinematic Readiness Roadmap

---

### Before Version 1 Film

**Goal:** Architecture showcase. Systems-thinking showcase. Design maturity showcase.

Complete all **Critical** items before recording. Complete **High** items if filming within 2 weeks.

**Required UI maturity:**
- [ ] Feed removed from nav
- [ ] Signal Map sparklines readable on film (≥8px wide, ≥44px tall)
- [ ] DM Serif on primary editorial typography (Signal Map title, company name)
- [ ] Amber inflection emphasis visible at recording distance
- [ ] Evidence excerpts styled as quotations, not list items

**Required product maturity:**
- Signal Map populated with demo data — already done via `/demo`
- Company page ICR card with realistic static data — already done
- Portfolio intelligence mode with narrative sentence — already done
- All legacy surfaces (Feed, Themes) absent from filmed nav

**Required data maturity:**
- None. Version 1 films the demo, which uses static sample data. The film's honest claim is about the system, not its outputs. No real ICR data is needed for Version 1.

**What to film:**
- `/demo` for Signal Map (static data, fully populated, spring animations)
- `/demo/portfolio` for portfolio intelligence mode
- `/demo` CompanyPanel drawer for company deep-dive (Vertiv)
- Code editor: `constraint.py`, `decisions.md`, `CLAUDE.md`, `trajectory_service.py`, `docker-compose.yml`, `scheduler.py`

**What NOT to film:**
- `/signals` (empty state — no real ICR data yet)
- `/feed` (legacy surface, wrong era)
- `/thesis` (deprecated)
- Any loading skeleton as a primary subject
- Any empty state

---

### Before Version 2 Flagship Film

**Goal:** Proof of intelligence. Proof of temporal moat. Real signals demonstrated with real evidence.

Version 2 makes a falsifiable claim with evidence attached. It cannot be produced until the system has earned it.

**Required data maturity:**
- ≥12 weeks of production ICR data (earliest: September 2026)
- ≥1 verified inflection event: a real company whose ICR series shows genuine week-over-week acceleration, traceable to real filings with real constraint language
- ≥3 companies with non-trivial ICR series (not predominantly zeros)
- ≥5 real evidence excerpts from real filings that stand on their own as meaningful signals

**Required UI maturity (additional to Version 1):**
- Large-format trajectory visualization on company pages (current DocTrajectory is too small for a flagship film)
- The "discovery moment" designed — a visual treatment for when a company first inflects that is more prominent than the current amber badge
- Sparklines enlarged further if needed based on Version 1 filming experience
- Evidence excerpts styled to show the filing company (the *citing* company) clearly — this is the cross-citation structure that makes ICR meaningful

**Required product maturity (additional to Version 1):**
- The Signal Map has populated live data, not just demo data
- At least one company's trajectory story is traceable end-to-end: Signal Map → Company Page ICR card → Evidence trail showing the independent filers

**What the Version 2 film tells:**
> "8 weeks ago this entity appeared in 0 independent SEC filings per week.
> Here is the first filing that cited it.
> Here is the week 3 structurally independent companies cited it.
> Here is the week it inflected.
> These are the actual filings. This is the actual language."

**Version 2 timeline estimate:**
- Q2 10-Q season: mid-July to mid-August 2026 (first major batch of cross-company filings)
- First meaningful ICR data review: August 1, 2026
- Version 2 production decision: September 1, 2026 (if ≥1 inflection event in real data)
- Version 2 filming: September–October 2026

**Version 1 creates the context. Version 2 delivers the proof.**
