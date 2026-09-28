# Rejected / Superseded Directions

Everything below was seriously explored, then explicitly not chosen.
None of it is a gap waiting to be filled — it's a decision already made.
Re-proposing any of this needs a genuinely new argument, not a fresh
read of the same tradeoffs; if you find yourself reinventing one of
these, that's a signal to re-read this file, not a signal you've found
something the project missed.

## From v1, explicitly not carried into v2

- **Purple/lavender visual identity.** Tried in v1, reverted on purpose.
  Don't reintroduce without an explicit new decision.
- **Circular progress ring** as the primary attendance visual. Tried in
  v1, reverted on purpose. This is why `RunwayBar` exists — a ring
  communicates a number, the runway bar communicates a number *and* the
  required action. Don't reintroduce a ring as a "cleaner" alternative.

## Architectural directions rejected for v2

- **Redux** (or any global state library). v1's real bugs never came
  from insufficient state management architecture — they came from
  guessed domain facts and duplicated logic. Don't add it to solve a
  problem that hasn't actually occurred.
- **A general API abstraction layer.** Same reasoning — no observed
  problem it would solve yet.
- **A multi-university abstraction layer.** Presynce is built for
  Chitkara CSE specifically. Generalizing "in case" adds complexity
  with no current payoff.
- **shadcn CLI-generated primitives.** The CLI needs an interactive
  prompt (Base UI vs React Aria vs Radix) and a registry fetch not
  reliably reachable from the build environment used so far. Primitives
  were hand-written in the same cva + Tailwind convention instead —
  functionally equivalent. This was a tooling-constraint decision, not
  a rejection of shadcn's approach; revisit if there's a real reason to.

## Design directions rejected

- **Three separate visual identities per screen** (Instrument for
  analytics, Editorial for dashboard, Structured for lists, each as its
  *own* look). This was explored and explicitly rejected in favor of
  **one geometry with density variants** — same radii, type scale,
  spacing unit, and runway-bar language everywhere; only how much
  information is shown per screen changes. The three-identity version
  was judged likely to produce exactly the "well-made SaaS dashboard"
  feeling the project is trying to avoid, because recognizability comes
  from one consistent geometry, not from switching modes per page.
- **The original equal-weight grid dashboard** (every subject in an
  identically-sized card, no hierarchy). Superseded by hero + rail.
  Not deleted — kept intentionally at
  `components/features/dashboard/dashboard-grid.tsx` as a one-line
  revert path (`DASHBOARD_LAYOUT` constant in `app/page.tsx`), in case
  hero + rail doesn't hold up under more scrutiny. Its continued
  existence in the codebase does not mean it's a live alternative
  direction — it's an escape hatch.
- **Glassmorphism, neumorphism, neon accents, oversized illustrations,
  gaming aesthetics, generic AI-startup gradients.** Explicitly ruled
  out as part of the visual language. Don't reach for any of these to
  make something feel "more premium" — premium here means restraint and
  craftsmanship, not decoration.
- **A single isolated "signature visual motif"** as the identity
  strategy (e.g. one flashy hero element that's supposed to make the
  product recognizable on its own). Rejected in favor of a *consistent
  interaction language* — the runway bar, the threshold marker, the
  priority-driven hero selection, and the shared calm motion vocabulary
  all repeating together across the product. Recognizability was
  deliberately framed as emerging from hundreds of consistent small
  decisions, not one dramatic idea.

## Motion directions rejected

- **Spring overshoot / bounce / elastic easing**, anywhere. The
  emotional target is quiet certainty, not celebration — bouncy motion
  reads as a win being celebrated, which is the wrong register for an
  attendance-risk product. All motion in the codebase uses a single
  calm ease-out curve (`EASE_CALM` in `lib/motion.ts`), no exceptions.
- **Celebratory animation when a subject's status improves** (e.g. a
  confetti-style or bouncy positive-reinforcement effect when someone
  moves from "danger" to "safe"). Considered and deliberately not
  built — it would gamify the risk metric, which is a permanent product
  rule, not a style preference.
- **A second animation library** (anime.js as an installed dependency).
  anime.js is an agreed *reference for the feel of specific
  micro-interactions* — study the interaction, extract the principle,
  rebuild it with the one motion library already in the stack (Motion,
  `motion/react`). Adding anime.js itself as a dependency would violate
  "one canonical implementation per responsibility" (two animation
  systems doing the same job) and was never intended as a literal
  addition. If a future agent is asked to "use anime.js," check this
  entry before adding the package.

## Emotional/product framing rejected

- **Relief or achievement as the target feeling.** Both were considered
  and rejected in favor of "quiet certainty." Relief implies the product
  let anxiety build before resolving it; achievement implies a score to
  chase. Neither matches "attendance tracking is anxiety management."
- **Any gamification of the attendance percentage itself** — streaks,
  badges, or reinforcement tied to the risk number. Permanently
  rejected. Streaks/reinforcement are allowed only for the separate
  behavior of logging consistently, never for the percentage.
