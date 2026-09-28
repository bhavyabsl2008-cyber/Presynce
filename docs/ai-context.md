# AI Context — Presynce v2 Handoff

Read this first. This document exists so a coding agent with no access
to the conversation history that produced this project can continue
development correctly. It's organized to keep one thing explicit
throughout: **what's locked, what's built, what's still open, and what's
been tried and rejected are four different categories — don't blur them.**

For product philosophy above the level of any specific codebase, see
`vision.md` in this same folder. This file is v2-specific and current.

---

## 1. Locked product principles

Not up for re-debate. If a task seems to require violating one of
these, stop and surface the conflict instead of proceeding.

- **Attendance intelligence, not merely attendance tracking.** The
  product turns a number into understanding — what it means, whether
  it's a problem, what to do about it — not just a display of the
  number.
- **Confidence is the product.** Attendance is the raw material.
- A student opening Presynce must be able to answer three questions
  almost instantly:
  1. **Am I safe?**
  2. **Can I skip?**
  3. **What should I do next?**
  Everything on screen is secondary to these three.
- **Every percentage must answer "so what?"** A bare number is a
  product bug, not a style choice. `"71%"` is never acceptable on its
  own; `"71% — attend 4 in a row to recover"` is the minimum bar.
- **The emotional target is quiet certainty** — not relief, not
  celebration. Relief implies anxiety was allowed to build before being
  resolved; celebration implies a score to chase. Both are spikes; this
  product's job is the opposite of a spike. This holds even in the
  danger state — calm, clear authority stating a fact and a path
  forward, never an alarm.
- **The risk metric is never gamified.** No streaks, no badges, no
  positive-reinforcement effects tied to the attendance percentage
  itself. Streaks/reinforcement are acceptable only for the separate
  behavior of logging consistently.

Full reasoning: `product-philosophy.md`.

---

## 2. Locked design principles

- **Editorial is the single design language.** Not one of three
  interchangeable styles — the only one. What was explored and
  rejected: three separate visual identities switched per screen
  (Instrument for analytics, Editorial for dashboard, Structured for
  lists). Rejected because recognizability comes from one consistent
  geometry, not from mode-switching per page — see
  `rejected-directions.md`.
- **Structured and Instrument are density behaviors, not separate
  identities.** Same radii, same type scale, same spacing unit, same
  runway-bar language everywhere. Only how much information is shown
  per screen changes — dashboard calm and scannable, analytics/lists
  denser.
- **Geometry creates identity.** Recurring spacing, proportions, and
  layout patterns repeated everywhere are what make something
  recognizable without a logo — not one flashy signature element. See
  `rejected-directions.md` for why "one isolated visual motif" was
  explicitly rejected as the identity strategy.
- **Information before decoration.** No gradients, glassmorphism,
  neumorphism, neon, oversized illustrations, or generic SaaS/AI-startup
  aesthetics. Premium means restraint and craftsmanship, not effects.
- **Whitespace is intentional, not uniform.** Spacing should reflect
  relationship — tight between related things, wide before something
  genuinely separate — not one spacing value applied everywhere by
  default.
- **Hierarchy comes primarily from typography, composition, and
  depth** — not from adding more containers, borders, or shadows
  everywhere. Depth/elevation is reserved for the one thing on screen
  that matters most; applying it everywhere erases the signal.
- **Calm, authoritative danger states.** Even "you're below threshold"
  should read as a stated fact with a clear next step, not an alarm.
  Desaturated status colors, not saturated/alarm-red.
- **Motion explains state changes; it never exists for delight alone.**
  Every animated thing ties to something actually changing (a fill
  filling, a hero swapping, a route changing, a list re-sorting).
- **Settle, don't celebrate.** Motion uses one calm ease-out curve, no
  spring overshoot, no bounce, anywhere in the codebase — see
  `lib/motion.ts`. A re-sorted list item should look like it's settling
  into place, not winning a race.
- **No gratuitous animation.** If it doesn't explain a change, it
  doesn't exist.

Full reasoning and current token values: `design-system.md`.

---

## 3. Current v2 implementation

**Framework:** Next.js (App Router) + TypeScript + Tailwind CSS v4 +
Motion (`motion/react`). Firebase/Firestore is the agreed backend but
**not yet integrated** — no `/services` layer exists yet.

**Architecture:** strict layer boundaries (`/domain`, `/services`,
`/hooks`, `/components/ui`, `/components/features`) — but `/services`
and `/hooks` don't exist on disk yet; only `/domain`,
`/components/ui`, `/components/features`, and `/lib` are populated. See
`architecture.md` for the complete, current inventory of every file and
what it does — do not assume anything exists there isn't explicitly
listed.

**Dashboard:** hero + rail composition (`dashboard-hero-rail.tsx`) —
one priority-ranked subject in full detail (`RunwayBar`, `size="hero"`),
the rest in a dense list (`SubjectRow`). This is implemented and current,
but still a validated *exploration*, not a fully closed decision — see
`open-questions.md`. The prior equal-weight grid layout
(`dashboard-grid.tsx`) is kept, unmodified, as a one-line revert path via
the `DASHBOARD_LAYOUT` constant in `app/page.tsx`.

**Priority scoring:** `domain/priority.ts` — a weighted model, not
"lowest percentage wins." Factors: distance below threshold, scarcity
of remaining safe skips, cost to recover, classes scheduled soon, and
an "unrecoverable" heuristic. Weights are a plain object, tunable
without touching UI.

**`RunwayBar`:** the signature attendance primitive — not a decorative
progress bar. Percentage, threshold marker, and an always-present
action line together. Hero size uses large split-number typography with
a spring count-up; compact size is smaller and static.

**`SubjectRow`:** dense rail list item with `layout`-animated
re-sorting and a hover-revealed affordance.

**`Card` / `Button`:** hand-written cva + Tailwind primitives (not
shadcn-CLI-generated — see `rejected-directions.md` for why). `Card`
has an `elevated` variant; `Button` is a Motion component with a press
micro-interaction.

**Navigation:** `RailNav` (desktop) / `TabBar` (mobile), both with real
`usePathname`-based active-route detection and a `layoutId` sliding
indicator.

**Theme/tokens:** full light + dark token sets defined in `globals.css`.
**Dark mode has no toggle wired yet** — tokens exist, nothing applies
the `.dark` class. Don't build something that assumes dark mode is
switchable today.

**Not implemented:** `/services`, `/hooks`, Firebase integration, any
test suite, dark-mode toggle, `/analytics` page, `/profile` page. The
last two are deliberately out of scope until built for real — don't
design hypothetical interfaces for them.

Full detail, file-by-file: `architecture.md`.

---

## 4. Design inspiration — role and boundaries

Five references, agreed as sources of **principle**, never of component
code or literal styling:

- **Linear** — information density and hierarchy (aggressive type-scale
  jumps, tight scannable list rhythm)
- **motion.dev** — interaction language and layout animation (state
  changes as transitions, not snaps)
- **KokonutUI** — component craftsmanship (primitives that feel
  deliberately finished, not default-library flat)
- **bklit.com** — composition and editorial layout (asymmetric,
  relationship-driven whitespace)
- **anime.js** — micro-interaction *feel*, reference only. **Not an
  installed dependency.** Every animation runs through the one Motion
  library already in the stack — adding anime.js as a package would
  violate "one canonical implementation per responsibility." If asked
  to "use anime.js," rebuild the referenced feel with Motion instead.

Full detail: `design-system.md`.

---

## 5. Rejected / superseded directions

Full record: `rejected-directions.md`. Don't re-propose any of it
without a genuinely new argument — check that file before you do.
Highlights: v1's purple identity and circular progress ring, Redux/API-
abstraction/multi-university-abstraction layers, three-separate-visual-
identities, glassmorphism/neon/gradient decoration, spring-overshoot
motion, gamified risk metric, anime.js as a dependency.

---

## 6. Open questions

Full list: `open-questions.md`. Do not silently resolve any of these
while working on something else. Headlines: whether hero + rail is
final, v1→v2 data migration path, auth provider specifics, dark-mode
toggle mechanism, v2 testing strategy, long-term primitives-library
choice, where the vision document canonically lives.

---

## 7. Working rules for the next agent

Full checklist: the end of `engineering-manifesto.md`. The two that
matter most if you read nothing else:

- **Never commit, push, create PRs, or alter remote git state** unless
  explicitly asked to, in that specific session.
- **Inspect before replacing.** Check `architecture.md`,
  `open-questions.md`, and `rejected-directions.md` before assuming
  something incomplete is an oversight rather than a deliberate,
  already-decided state.

---

## 8. Next-agent starting point

**Where things stand:** v2's foundation is built and working —
tokens, layout shell, primitives, the priority-scoring domain engine,
and a hero + rail dashboard through several craftsmanship passes. It
type-checks and lints clean. It runs with hardcoded test data; there is
no backend connection yet.

**What should probably happen next**, roughly in order of what
unblocks the most: designing the v1→v2 data migration path (blocks
auth), then the Firebase/`/services` integration itself, then real
`/analytics` and `/profile` pages once there's actual data to show on
them (not before).

**What absolutely should not be re-litigated:** anything in section 1
and 2 above, and anything in `rejected-directions.md`. These have real
reasoning behind them, documented, not just asserted.

**What still needs explicit approval before proceeding:** any change to
hero + rail as the dashboard pattern (it's implemented, but still
framed as an exploration — see `open-questions.md`), any dependency
addition, any dark-mode toggle mechanism decision, any auth-provider
decision, and — always — anything touching remote git state.
