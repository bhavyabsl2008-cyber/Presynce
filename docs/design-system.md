# Design System

## Direction: Editorial, one geometry, two densities

**Confirmed.** Three design directions were explored — Instrument (dense,
dark-first, precision-instrument feel), Editorial (calm, generous
whitespace, one dominant hero metric), and Structured (strong grid,
typography-driven hierarchy, disciplined spacing).

**Decision: Editorial is the single design language for Presynce.**
Structured and Instrument are not separate identities layered on top —
they are **density settings within the same geometry**: same corner
radii, same type scale, same spacing unit, same runway-bar language,
everywhere. The dashboard runs low density (Editorial default); analytics
and simulation surfaces run high density (more rows, tighter spacing) —
same skeleton, more information per screen, not a different visual
language.

This was a deliberate correction: applying three named directions across
different screens risks the interface reading as a "well-made SaaS
dashboard" — the exact outcome the design review flagged as the current
weakness — because a recognizable identity comes from one consistent
geometry, not from switching design modes per page.

## Five governing principles

1. **Restraint creates trust.** Color communicates state, never
   decoration. When everything has color, nothing means anything.
2. **Information density should match the screen.** Dashboard: calm,
   scannable. Analytics/simulations: dense — users go there specifically
   for depth.
3. **Typography creates hierarchy**, primarily — not shadows, borders, or
   containers. Spacing and alignment do the rest of the work.
4. **Motion explains change.** Motion communicates navigation and state
   transitions. No animation that exists purely to look nice.
5. **Geometry creates identity.** Recurring spacing, proportions, and
   layout patterns — repeated everywhere — are what make a screenshot
   recognizable without the logo.

## The signature geometry: hero + rail

**Status: implemented (Milestone 1.5, refined in 1.6 and later
craftsmanship passes). Still a validated design exploration, not a
fully locked pattern — see `open-questions.md`.**

This is the one place in this document where "locked" doesn't fully
apply. The *principle it resolves* (geometry creates identity, one
asymmetric pattern repeated everywhere) is locked. The *specific
composition* — one priority-ranked subject shown in full detail, the
rest in a compact list — was explicitly framed as a hypothesis to
evaluate in context, and should still be treated that way. Don't
re-litigate it casually, but don't treat it as untouchable either. The
original equal-weight grid layout was kept as a working revert path
(`dashboard-grid.tsx`) specifically because of this.

Every dashboard-type surface in Presynce follows one asymmetric pattern:
the single most urgent item renders as one oversized, full-width module
at the top (the direct, instant answer to "am I safe?" — Editorial:
one dominant hero metric, generous space, no competition for attention).
Everything else drops into a dense, aligned list beneath it (Structured:
consistent alignment, typographic hierarchy, no per-row card chrome).

Same corner radius, same spacing unit, same type scale in both zones —
the asymmetry itself, repeated across every screen, is the identity mark.

**Which subject becomes the hero is not "lowest percentage."** It's
determined by a weighted priority score (`domain/priority.ts`) —
distance below threshold, scarcity of remaining safe skips, cost to
recover, how many classes are actually scheduled soon, and whether
recovery looks mathematically implausible given what's scheduled. See
`architecture.md` for the implementation.

## What's already working (keep)

- Typography pairing: display face for interface text, monospace for
  computed values — creates instant visual distinction between "label"
  and "number you can trust."
- The runway bar over a progress ring — communicates percentage *and*
  required action in one glance; a ring only communicates the number.
- The status color system (safe / warn / danger) — legible at a glance.
- Clean, layered component architecture (see architecture.md).
- Priority-driven hero selection over raw-percentage sorting.
- The shared calm motion vocabulary (see Motion section below).

## Resolved (previously flagged as "reads as generic")

The items below were identified as weaknesses in an early design review
and have since been addressed — kept here as a record of what changed,
not as an active to-do list:

- ~~Every card shares identical proportions~~ — addressed by hero + rail:
  the hero gets `elevated` `Card` treatment and hero-scale typography;
  the rail is deliberately denser and flatter.
- ~~Greeting header eats space that belongs to status info~~ — replaced
  with a minimal "Today" eyebrow label.
- ~~Sections compete for equal visual weight~~ — addressed by the
  hero/rail/action hierarchy.
- ~~Navigation follows generic dashboard convention~~ — `RailNav`/
  `TabBar` now have a real active-state indicator that slides between
  items (see Motion section), not just a static highlighted class.

## Design inspiration — role and boundaries

Five references are agreed as sources of *principle*, never of
component code or literal styling. Per the project's own inspiration
rule: study the interaction, identify why it works, extract the
principle, reinterpret it inside Presynce's existing tokens, never copy
layout/animation/styling/branding directly.

- **Linear** — information density and hierarchy. Referenced for how
  aggressively type scale can jump between levels to create hierarchy
  without relying on containers/shadows, and for tight, scannable list
  rhythm (informs the rail's density relative to the hero).
- **motion.dev** — interaction language and layout animation. Referenced
  for how state changes (like a re-sort) can be animated as a
  transition rather than a snap — informs `SubjectRow`'s `layout`
  animation and the hero crossfade when the hero subject changes.
- **KokonutUI** — component craftsmanship. Referenced for the idea that
  primitives (buttons, cards) should feel deliberately finished — inset
  highlights, considered shadow layering — not default-library flat.
  Not used as a component source; nothing is copied from it.
- **bklit.com** — composition and editorial layout. Referenced for
  asymmetric composition and whitespace that separates by relationship
  rather than applying one spacing value uniformly — informs the
  tighter hero/rail grouping vs. the wider gap before unrelated actions.
- **anime.js** — subtle micro-interactions, **as a reference for feel
  only**. Not an installed dependency and should not become one — see
  `rejected-directions.md`. Every animation in this codebase runs
  through the single Motion (`motion/react`) library.

## Motion — what's actually implemented

All motion constants live in one place, `src/lib/motion.ts`
(`EASE_CALM`, a calm ease-out curve with no overshoot; `DURATION.fast/
base/slow`) — nothing animates with a value invented locally in a
component. This is deliberate: it's what makes motion feel like one
product decision instead of many small ones.

Implemented:

- **Runway bar fill** animates in via `motion.div` with a calm ease,
  plus a critically-damped spring count-up on the hero's percentage
  number (no overshoot).
- **Hero crossfade** — if the priority-ranked hero subject changes,
  the hero card crossfades via `AnimatePresence` rather than snapping.
  This is motion explaining a real state change, not decoration.
- **`SubjectRow` layout animation** — a `layout` prop so a row settles
  into a new position on re-sort instead of jumping.
- **Nav active-state indicator** — `RailNav` and `TabBar` use
  `usePathname` for real active-route detection and a `layoutId`-based
  sliding highlight (separate `layoutId`s per surface, since both are
  simultaneously mounted and only CSS-hidden per breakpoint).
- **Button press** — `whileTap={{ scale: 0.97 }}`, calm, not bouncy.
- **Staggered dashboard entrance** — hero/rail/action cards fade up
  with a small stagger on mount.

Not implemented: anything tied to dark-mode transitions (dark mode
itself isn't wired yet — see `open-questions.md`), and no animation
exists anywhere that isn't tied to a state change per the "motion
explains, never decorates" principle.

## Tokens (current, unchanged since Milestone 1)

**Color** — near-neutral warm base, one restrained desaturated accent,
saturation reserved almost entirely for status:

| Token | Light | Dark |
|---|---|---|
| bg | `#fafaf8` | `#171613` |
| surface | `#ffffff` | `#201f1b` |
| ink | `#1c1b19` | `#ede9e0` |
| muted | `#6e6b63` | `#a29d90` |
| border | `#e6e3dc` | `#322f28` |
| accent | `#4c5b73` | `#8fa3c2` |
| safe | `#2f7a52` | `#5fb888` |
| warn | `#b4791f` | `#d8a24f` |
| danger | `#b33b3b` | `#d97a7a` |

**Type** — Manrope (display/headings), IBM Plex Sans (body/interface),
IBM Plex Mono (every computed number — the mono cut is what visually
marks a value as data you can trust, not copy). The hero's percentage
uses a split typographic treatment: large integer, smaller decimal —
the one deliberate large-scale moment in the type system.

**Radii** — sm `6px`, md `10px`, lg `16px`. Consistent across every
surface; this consistency is part of the identity, not incidental.

**Depth** — `Card` has an `elevated` boolean prop using
`--shadow-raised` (defined since Milestone 1, unused until the
craftsmanship pass). Elevation is reserved for the one thing on screen
that matters most — applying it everywhere would erase the signal.

**Dark mode tokens are fully defined but not yet wired to any toggle or
system-preference detection** — see `open-questions.md`.
