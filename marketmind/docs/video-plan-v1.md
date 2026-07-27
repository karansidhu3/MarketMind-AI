````md
# MarketMind — Portfolio Film

**Director's Document**

Runtime: 90–120 seconds  
Format: Screen Studio Capture Only  
Aspect Ratio: 16:9  
Tone: Intentional. Quiet. Editorial.

---

# The Brief

This film is not an investing pitch.

This film is not an AI demonstration.

This film is evidence.

The audience is not deciding whether to use MarketMind.

The audience is:

- Engineering managers
- Recruiters
- Founders
- Technical leads

The goal is simple:

> Demonstrate systems thinking through a product that remembers information over time.

Most financial software answers questions.

MarketMind builds memory.

The distinction is the entire product.

The film should never explain this.

It should become obvious.

---

# Core Observation

Markets react.

News cycles move on.

Corporate filings don't.

Every quarter, thousands of disclosures are published.

Most are read once.

Then forgotten.

MarketMind was built around a different assumption.

> A corpus should remember.

Everything else follows from that idea.

---

# Narrative Structure

The film moves through five ideas.

Not features.

Not architecture.

Ideas.

## 1. Observation (0:00 – 0:15)

Information disappears.

## 2. Memory (0:15 – 0:45)

The corpus accumulates.

## 3. Judgment (0:45 – 1:10)

The system decides what deserves to become memory.

## 4. Reflection (1:10 – 1:40)

Time creates understanding.

## 5. End Card (1:40 – 2:00)

Quiet resolution.

---

# Visual Philosophy

Everything is captured using Screen Studio.

No voiceover.

No talking head.

No architecture diagrams.

No technology logos.

No animated arrows.

No feature callouts.

No startup energy.

No "AI-powered" language.

The interface is the subject.

Motion comes from interaction.

Typography appears rarely.

Every sentence must earn its place.

The audience should leave understanding the philosophy behind the product, not its implementation.

---

# Act I — Observation

## 0:00 – 0:15

Black screen.

Hold.

Typography fades in.

### Card 1

Markets react.

Hold.

Fade.

### Card 2

Filings remain.

Hold.

Fade.

### Card 3

Someone has to remember them.

Hold.

Hard cut into the product.

No logo.

No splash screen.

No introduction.

---

# Act II — Memory

## 0:15 – 0:45

The Signal Map appears.

Rows animate into place.

The cursor waits.

No movement.

No explanation.

Click a company.

Open the evidence.

Read naturally.

Scroll slowly.

Allow the interface to breathe.

Nothing is rushed.

The audience should discover the product instead of being guided through it.

### Typography Card

```text
memory

becomes

measurable.
```

Hold briefly.

Return to the product.

The audience should think:

> This system remembers information over time.

Not:

> This visualizes SEC filings.

---

# Act III — Judgment

## 0:45 – 1:10

The interface gives way to engineering.

Only briefly.

### Sequence

1. Constraint gate
2. COUNT(DISTINCT filing_ticker)
3. Architecture Decisions

No scrolling through code.

No long editor sequences.

Only enough to communicate intent.

The code exists as supporting evidence.

Not as the subject.

### Typography Card

```text
not every mention

becomes memory.
```

Hold.

Return to code.

### Typography Card

```text
memory

should be earned.
```

Hold.

Return to code.

### Typography Card

```text
every decision

was written down.
```

Hold.

Return to the product.

The audience should think:

> This wasn't assembled.

It was designed.

---

# Act IV — Reflection

## 1:10 – 1:40

Return to the product.

Portfolio.

Gap Signals.

Evidence.

Narratives.

Everything settles naturally.

No rapid navigation.

No feature tour.

One typography card.

```text
the corpus

remembers

what your portfolio doesn't.
```

Hold.

Black screen.

Typography only.

### Card 1

Information

isn't knowledge.

Hold.

Fade.

### Card 2

Knowledge

requires memory.

Hold.

Fade.

### Card 3

Memory

requires time.

Silence.

---

# End Card

## 1:40 – 2:00

Black.

Slow fade.

### Card 1

```text
MarketMind
```

Hold.

### Card 2

```text
Corpus Intelligence.
```

Hold.

### Card 3

```text
Built by

Karan Sidhu
```

Hold.

### Card 4

```text
GitHub

LinkedIn
```

Fade to black.

End.

---

# Music Direction

One ambient track.

No percussion.

No cinematic build.

No trailer music.

No emotional climax.

The soundtrack should disappear behind the product.

## References

- Brian Eno
- Nils Frahm
- Ólafur Arnalds
- Hammock

Reference the atmosphere.

Not the emotion.

---

# Capture Checklist

Three recordings.

Everything else is typography built in post.

Capture target is `/demo` and `/demo/portfolio` — not the authenticated
app. The real `/signals` is a live surface and can be genuinely empty
depending on ingestion state; `/demo` is the one built to always be
camera-ready. Confirmed working end to end before filming: Signal Map
rows, sparklines, the company evidence drawer, the Portfolio narrative
sentence, and a gap row opening evidence — all verified live.

## 1. Signal Map — `/demo`

Fresh incognito session. No cached state — this matters more than it
sounds: the row entrance is a real staggered animation, and it plays in
full on a genuinely first load. A warm/cached tab may skip or compress it.

Signal Map loads naturally.

Rows animate.

Open one company — the panel's arrival is its own beat, not a side
effect of "opening evidence." Backdrop blur, spatial depth, the drawer
sliding in from the right: this is the single clearest "interface as
subject" moment in the product and the one that most directly proves the
film's own stated philosophy ("motion comes from interaction"). Frame it
deliberately. Let the slide-in complete and hold half a second before any
further movement — earn the arrival before reading past it.

Read evidence.

Scroll slowly.

## 2. Engineering Evidence

Three short captures.

- Constraint gate
- COUNT(DISTINCT filing_ticker)
- Architecture Decisions (ADR folder)

Nothing else.

No scrolling through the repository.

No Docker Compose glamour shots.

No stack tour.

## 3. Portfolio Intelligence — `/demo/portfolio`

Navigate naturally.

Open Portfolio.

View the narrative sentence.

Gap Signals.

Click one gap row — same evidence drawer as Act II, different entry
point. Worth capturing once here specifically because it proves the
drawer isn't a one-off feature of the Signal Map, it's the product's one
consistent way of answering "tell me more."

Allow every interaction to settle.

No unnecessary cursor movement.

---

Before recording:

Disable cursor highlights in Screen Studio.

Use the smallest cursor.

Every movement should feel deliberate.

Never move faster than someone could comfortably read.

---

# Execution Craft — Screen Studio + Final Cut

This is where "Apple-like" stops being a mood and becomes settings and
numbers. The plan already has the restraint right. This section is the
difference between a video that reads as restrained on purpose and one
that reads as unfinished.

## Screen Studio

- No gradient background, no device frame, no padding treatment. Full
  bleed on the interface itself. Screen Studio's default backgrounds are
  a SaaS-launch-video cliché this plan already explicitly rejects — don't
  let the capture tool's defaults reintroduce it.
- Record at the highest available resolution and 60fps, even though the
  final export will likely sit lower. Headroom for reframing and any
  speed-ramping in Final Cut without visible quality loss.
- Turn off click ripple/highlight effects (already noted) — but also
  turn off automatic cursor-follow zoom if it's set to trigger on every
  click. Reserve zoom for the two or three moments that are actually
  worth leaning into (the panel opening, the constraint gate code, the
  narrative sentence) — zoom on everything is the same mistake as
  highlighting everything: nothing ends up emphasized.

## Cursor choreography

Every cursor movement in the final cut should look pre-planned, not
navigated live. In practice that means: rehearse each capture's mouse
path before recording, move in straight lines rather than correcting
mid-motion, and pause fully before clicking rather than clicking on
arrival. A cursor that hesitates for a beat before acting reads as
intentional. A cursor that clicks the instant it arrives reads as
automated.

## Typography

- One typeface, one weight for restraint, one heavier weight reserved
  for the handful of lines meant to land hardest (per the doctrine
  already implicit in this plan: heavy weight only means something if
  it's rare). SF Pro Display if available; a geometric grotesk as the
  fallback — don't mix families.
- Tight tracking at display size (roughly -0.02em to -0.03em), never
  tighter — past that letters start touching and it reads as cramped
  rather than considered.
- Pick one entrance curve and one duration band for every card in the
  film, and don't vary them scene to scene: ease-out-quart or -quint,
  no bounce, no elastic. 200–400ms for card transitions is the range to
  live in. Consistency here is what makes the typography moments feel
  like one authored system instead of separately-timed title cards.

## Sound

The plan is right that the soundtrack should disappear behind the
product — don't add anything that competes with that. But consider one
extremely subtle layer underneath the ambient track: a nearly-inaudible
tick or soft tap synced to the two or three deliberate clicks in the
film (the company row, the gap row). Not a notification chime, not
skeuomorphic UI sound — something closer to a keyboard's felt thock than
an app's feedback sound. If it's noticeable on first listen, it's too
loud. Cut it before adding it if there's any doubt.

## Color

The three captures happen in different sessions, possibly different
lighting, possibly different times of day. Before final assembly, do one
pass matching white balance and contrast across all three so they read
as one continuous world rather than three separate recordings stitched
together. This is invisible when done right and distracting when
skipped — nobody consciously notices consistent color grading, everybody
unconsciously notices inconsistent color grading.

## The one hard cut

Every transition in this plan is a hold, a fade, or a dissolve — which
is correct, that's the film's whole register. Reserve exactly one true
hard cut for the very end: the last typography card cutting to black
with no fade, no dissolve. In a film built entirely from soft transitions,
one instant cut reads as the loudest, most deliberate gesture in the
entire piece — precisely because nothing else in the film prepares you
for it. Don't use this technique anywhere else, or it stops working here.

---

# Editing Philosophy

Remove everything that feels like marketing.

Remove everything that feels like a tutorial.

Remove everything that feels like an architecture presentation.

Keep only what demonstrates:

- Systems thinking
- Product judgment
- Restraint
- Execution

Every cut should answer:

> Does this improve understanding?

If not,

remove it.

---

# Hard Constraints

The film is not allowed to contain:

- Voiceovers
- Architecture diagrams
- Technology logos
- Stack slides
- Feature lists
- Animated arrows
- Cursor highlights
- Startup language
- Claims about investment alpha
- Performance statistics
- "AI-powered"
- "Revolutionary"
- "Powerful"
- "Smart"
- "Intuitive"

Avoid explaining the implementation.

The product should demonstrate the thinking.

The film should never claim it.

---

# The Standard

The viewer should finish the film with one impression:

> This person builds software that accumulates memory instead of producing answers.

Not because the film said so.

Because the product made it obvious.
````
