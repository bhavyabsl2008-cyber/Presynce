# Open Questions

Everything here is genuinely unresolved. Do not silently decide any of
these while implementing something else — if one of them blocks a task,
surface it and ask, the way earlier work in this project has (e.g.
challenging a design request before building it). None of these should
be inferred from "what would be reasonable" and then treated as decided.

## Is hero + rail the final dashboard direction?

**Status: validated design exploration, not a locked pattern.**

Hero + rail (one priority-ranked subject shown in full detail, the rest
in a compact list) was explicitly introduced as a hypothesis to
evaluate in context, not a committed decision — see
`rejected-directions.md` for what it replaced and why, but note it is
NOT in the same category as the truly locked principles in
`design-system.md` (Editorial-as-single-language, one-geometry-two-
densities). Those are locked. The specific hero + rail composition is
still open to being reconsidered, which is exactly why
`dashboard-grid.tsx` was kept as a working revert path instead of
deleted.

If asked to iterate on the dashboard, treat hero + rail as the current
best answer, not an untouchable one — but don't replace it unilaterally
either. Surface the tradeoff and ask.

## v1 → v2 data migration path

v2 requires auth from day one; v1 stores everything in `localStorage`
with no account system. What happens to a returning v1 user's existing
data when they sign into v2 for the first time is completely
undesigned — no claim flow, no migration script, no decision on whether
this is even automatic or manual. This must be designed before the auth
flow ships, not discovered as a gap after.

## Auth implementation specifics

"Auth required from day one, Firebase Auth" is decided at the product
level. Not decided: which providers (Google-only, like v1? email/
password? both?), session handling approach, what a logged-out state
looks like, whether there's an onboarding flow beyond sign-in.

## Dark mode

Design tokens for dark mode are fully defined in `globals.css` (a
`.dark` class with a complete parallel token set). **Nothing in the
codebase currently applies that class** — there is no theme toggle, no
system-preference detection, no persistence of a choice. Dark mode is
tokens-ready but functionally unimplemented. Decide the toggle mechanism
(system-preference-only vs. manual toggle vs. both) before treating dark
mode as shippable.

## Testing strategy for v2

`/domain` functions (`attendance.ts`, `priority.ts`) are written to be
pure and unit-testable — that was a deliberate architectural choice —
but **no test suite exists yet in v2**. v1 has 42 passing `node:test`
tests; v2 has none. Whether v2 adopts the same `node:test` approach or
something else (Vitest, etc.) hasn't been decided.

## Primitives library

Hand-written cva + Tailwind primitives are standing in for a real
decision on Base UI vs. React Aria vs. Radix as the underlying
accessible-primitives library (see `rejected-directions.md` for why the
shadcn CLI wasn't used). This works today but hasn't been evaluated as a
long-term choice — worth revisiting once there's a real need for more
complex primitives (dialogs, comboboxes) where accessibility behavior
matters more than it does for `Button`/`Card`.

## Where the vision document should live long-term

A repo-agnostic vision document (`docs/vision.md` in this repo) was
written to sit above both v1 and v2, describing product philosophy
without implementation detail that could go stale. It currently exists
as two copies for practical reasons — see the note at the top of
`docs/vision.md` for the canonical-copy situation. Whether that's the
permanent arrangement, or whether there's a better single-source
solution once both repos are further along, is unresolved.
