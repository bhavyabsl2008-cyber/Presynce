# PRESYNCE V2 MASTER SPECIFICATION
## Single Source of Truth — All Engineering Decisions Governed Here

**Version:** 2.0  
**Status:** Active  
**Owner:** Lead Product Engineer + Design Systems Architect

---

## 0. MANDATE

This document is the single source of truth for all Presynce V2 engineering and design decisions. Before touching any file, read this document. If a specification is ambiguous, resolve it here before writing code.

**Non-negotiable rules:**
1. Lab A is the visual identity. No redesigns.
2. Color is semantic, never decorative.
3. Motion communicates state, never decorates.
4. Every scroll reveals useful information. No dead zones.
5. The eye should flow: Hero → Timeline → Decision → Projection → Remaining Day.
6. 60fps. GPU-accelerated. No layout thrash.

---

## 1. VISUAL IDENTITY

**Lab A — Kinetic Editorial** is the locked visual source of truth.

### Canvas
- Background: `#F5F2EC` (warm structural paper)
- Surface: `#FAF8F3` (slightly lighter, for focus surfaces)
- Grid: `rgba(17,16,15,0.04)` at 4rem (64px) cells

### Typography
| Family | Role | Weights |
|--------|------|---------|
| Manrope | Display, hero numbers, headings | 700, 800 |
| IBM Plex Sans | Body, UI labels, nav, descriptions | 400, 500, 600 |
| IBM Plex Mono | ALL numeric data (%, fractions, times) | 500, 600 |

IBM Plex Mono on all numbers is non-negotiable. It prevents layout shift during live updates and communicates precision.

### Color System (Semantic — Never Decorative)
| Token | Value | Use |
|-------|-------|-----|
| Paper | `#F5F2EC` | Canvas background |
| Surface | `#FAF8F3` | Elevated panels |
| Ink | `#11100F` | All primary text, data |
| Ink Secondary | `#69655F` | Labels, inactive UI |
| Ink Tertiary | `#9A968F` | Metadata, timestamps |
| Line | `rgba(17,16,15,0.10)` | Hairline rules |
| Grid | `rgba(17,16,15,0.04)` | Background structure |
| Presynce Violet | `#5B35E8` | Active state, interaction, current class |
| Violet Soft | `#EEE9FF` | Hover field wash |
| Violet Field | `#F5F2FF` | Background on active decision row |
| Safe | `#3DA875` | CAN SKIP — attendance margin healthy |
| Safe Soft | `#E8F5EE` | Background wash |
| Caution | `#D69A32` | 1 skip remaining |
| Caution Soft | `#FBF3E2` | Background wash |
| Danger | `#E25555` | NEEDS — below threshold |
| Danger Soft | `#FCEAEA` | Background wash |

### Geometry
- Border radius: **0px** on all structural elements, buttons, containers
- Shadow/elevation: **0px** — flat, editorial, no floating cards
- Rules: **1px hairline** only

---

## 2. INFORMATION ARCHITECTURE — TODAY

The Today view is a continuous editorial canvas. It is NOT a stack of isolated cards.

```
HERO (TODAY + situational summary)
───────────────────────────────── hairline
TIMELINE (spatial day rail)
───────────────────────────────── hairline
[UNRESOLVED STRIP — collapses when resolved]
───────────────────────────────── hairline
CURRENT CLASS (the decision center)
  → Subject · Time · Room · Count
  → XX.X% (hero data — IBM Plex Mono, large)
  → CAN SKIP XX (semantic status, large)
  → CompactThreshold (physical rail)
  → IF YOU ATTEND → XX.X% → CAN SKIP XX [PRESENT]
  → IF YOU SKIP   → XX.X% → CAN SKIP XX [ABSENT]
───────────────────────────────── hairline
LATER TODAY (dense list, no cards)
  → Subject rows: time · name · % · status
───────────────────────────────── hairline
DAY CONSEQUENCE (typographic summary)
```

### Eye Flow Contract
1. TODAY header — establishes date context
2. NEXT intelligence — next class, time, current %, skip capacity
3. Timeline — spatial overview of the day
4. Unresolved strip — urgent action required
5. Current class — decision center with full projection
6. Later Today — compact upcoming awareness
7. Day consequence — what does today mean overall?

### Density Rules
- Hero: compact. Large type, minimal padding. 48px top padding max.
- Section padding: 32px vertical (not 80px)
- Row height for Later Today: 44px
- No section should require scrolling to reach the decision rows

---

## 3. MOTION SYSTEM

### Spring Families
```typescript
SPRING.SNAP  = { stiffness: 500, damping: 35, mass: 0.8 }  // Button press, toggles
SPRING.MOVE  = { stiffness: 320, damping: 30, mass: 1 }     // Node travel, threshold
SPRING.SOFT  = { stiffness: 200, damping: 28, mass: 1 }     // Section reveals, collapses
```

### Named Interactions
1. **Projection** — hover DecisionRow: ghost node travels to projected %, percentage text crossfades, status updates
2. **Commit** — click PRESENT/ABSENT: ghost snaps to solid, old state recedes, section collapses
3. **Threshold crossing** — if projection crosses threshold: marker pulses, status color transitions
4. **Timeline node pulse** — current class node radiates subtle ring continuously
5. **Page entrance** — sections stagger in on mount (18ms delay between each)
6. **Undo** — toast appears at bottom, fades after 4s

### Rules
- No `transition-all`. Use specific motion properties.
- No bouncy springs — all critically damped (no overshoot).
- Reduced motion: instant crossfades, no spatial travel.
- All animations: GPU-accelerated (`transform`, `opacity` only).

---

## 4. COMPONENT CONTRACTS

### `CompactThreshold`
Physical boundary visualization.

Props: `snapshot`, `hoverAction`
- Axis: 1px line, full width, `var(--color-line)`
- Threshold marker: 2px vertical tick at `threshold%`, ink
- Current node: 10px filled circle, ink, `boxShadow: 0 0 0 3px paper`
- Ghost node: 12px dashed circle, colored by consequence, emerges on hover
- Ghost travels via `SPRING.MOVE`
- Threshold marker turns danger color if projection crosses it

### `DecisionRow`
Preview → commit unit.

Props: `action`, `snapshot`, `isActive`, `onActivate`, `onDeactivate`, `onCommit`
- Resting: `IF YOU ATTEND → 79.5% → CAN SKIP 03 [PRESENT]`
- Active: field washes to `violet-field`, button turns violet, threshold ghost moves
- Commit: explicit button or Enter key
- Touch: tap = activate preview; tap commit = commit

### `Timeline`
Spatial day rail.

Node states:
- `resolved●` = 8px filled ink circle
- `current◉` = 12px filled with violet ring + continuous pulse
- `unresolved◌` = 10px dashed danger circle
- `upcoming○` = 8px open ink-tertiary circle

All nodes on single horizontal axis with 1px line. Time above, label below.

### `SemanticStatus`
CAN SKIP XX / NEEDS XX in semantic color. IBM Plex Mono for the number.

### `PageShell`
Paper canvas + grid + PrimaryNav. No modification needed.

---

## 5. MOCK DATA (CANONICAL)

```
DBMS   14/17   unresolved  82.35%  CAN SKIP 2
OOPS   40/47   resolved    85.11%  CAN SKIP 4
CN     36/46   current     78.26%  CAN SKIP 2
FEE    30/43   upcoming    69.77%  NEEDS 3
DECA   23/31   upcoming    74.19%  NEEDS 1
IWT    31/35   upcoming    88.57%  CAN SKIP 5
```

CN (Computer Networks) is the active class. Its decision is the center of the page.

---

## 6. ACCESSIBILITY

- All interactive elements: keyboard operable
- `aria-live="polite"` on undo toast
- `aria-label` on all icon-only elements
- `focus-visible` ring: 2px violet, 2px offset
- `prefers-reduced-motion`: respected
- Color never the only indicator — always paired with text

---

## 7. PERFORMANCE

- No layout thrash — read DOM before write, never mix
- GPU animations only: `transform`, `opacity`, `filter`
- `will-change: transform` only on actively animating elements
- No unnecessary re-renders — callbacks memoized with `useCallback`
- Image-free — SVG and CSS only

---

## 8. ENGINEERING CONVENTIONS

- No magic numbers — all values from tokens
- No hardcoded colors — all `var(--color-*)` or token constants
- No `transition-all` — specific properties only
- No inline component logic > 50 lines — extract to named functions
- All numeric display: `font-family: var(--font-data)`, `font-variant-numeric: tabular-nums`

---

*Last updated: 2026-08-07. This document supersedes all previous specifications.*
