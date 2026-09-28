# Product Philosophy

## What Presynce is

An attendance **intelligence** platform, not merely an attendance
**tracker** — the distinction matters. A tracker displays a number back
to you. Presynce turns that number into understanding: what it means,
whether it's a problem, and what to do about it. For Chitkara University
CSE students specifically, with real stakes (E1/E2 debarment) riding on
the answer. This is not a class project or a portfolio toy that happens
to track attendance — correctness and trustworthiness come before
feature count, always.

Attendance isn't the product. Confidence is.

## The core belief

**Attendance tracking is anxiety management, not habit-building.**

A habit-building product wants engagement. It rewards streaks, celebrates
opens, nudges you back in. Presynce wants the opposite: a student should
open the app, get their answer, and leave calm. If Presynce is addictive,
it has failed at its actual job.

This rules out, permanently, without needing case-by-case debate:

- Duolingo-style gamification on the risk side (badges, streak-shaming,
  "don't break your streak" pressure applied to attendance percentage)
- Enterprise-dashboard chrome — KPI-wall aesthetics that perform
  seriousness instead of delivering clarity
- Social-feed engagement patterns — infinite scroll, notification bait,
  anything designed to bring you back for its own sake

Streaks and reinforcement are allowed **only** for input consistency
(did you log today), never for the risk metric itself. Rewarding someone
for a high attendance percentage is fine; punishing them emotionally for
a low one is not — the product's job is to tell them what to do about it.

## The three questions

When a student opens Presynce, in order, they need answered instantly:

1. **Am I safe?**
2. **Can I skip?**
3. **What should I do next?**

Everything else on screen is secondary to these three. If a design choice
doesn't serve one of these three questions, it's decoration and should
lose the argument against whitespace.

## The rule for every stat

A percentage on its own is anxiety with no exit. A percentage with an
action attached is information you can act on.

> Never: "71%"
> Always: "71% — attend 4 in a row to recover"

This is not a UI guideline, it's a product law. No stat surfaces without
its action.

## Identity target

Calm, trustworthy, premium, immediately recognizable. Not prettier —
*recognizable*. Someone should eventually be able to identify a Presynce
screenshot without seeing the logo. See design-system.md for the concrete
geometric decision this resolves to.

## Relationship to v1

v1 (vanilla JS, live in production) proved the feature set works and
surfaced the real bugs that shaped v2's engineering rules — see
engineering-manifesto.md. v1's purple/lavender identity and its circular
progress ring were both tried and explicitly rejected; v2 does not
reintroduce either without an explicit decision to do so.

v1 stays untouched in production until there is an explicit decision to
cut over. v2 is a from-scratch rebuild, not a migration.
