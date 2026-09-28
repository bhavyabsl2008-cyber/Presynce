# Presynce — Vision

> **Canonical copy note:** the master copy of this file lives at
> `C:\Bhavya\presynce-vision.md`, one level above both the v1
> (`attendance-tracker`) and v2 (`presynce-v2`) repos, so it isn't owned
> by either codebase. This is a mirrored copy, added so the v2 repo is
> self-contained for an agent that only has access to this repository.
> If the two ever disagree, the one at `C:\Bhavya\presynce-vision.md` is
> correct — update this copy to match, don't treat this copy as the
> source of a change. See `open-questions.md` for the unresolved
> question of whether this dual-copy arrangement is permanent.

> This document is the constant. It describes what Presynce is and why,
> not what's currently built. Any AI tool, on any model, working on
> either the v1 (`attendance-tracker`) or v2 (`presynce-v2`) codebase
> should read this first — then go to that repo's own docs for the
> current, buildable state of things.
>
> Nothing in this file should ever reference a specific framework,
> library, or folder structure. If a fact here can be made false by a
> commit, it doesn't belong in this file — it belongs in the repo it
> describes.

---

## What Presynce is

An attendance intelligence platform for students. Not a tracker that
displays a percentage — a system that turns raw numbers into
understanding.

## Mission

Help students understand, predict, and improve their attendance through
intelligent insight, not raw percentages.

## Core philosophy

Attendance isn't the product. Confidence is.

Every feature must reduce uncertainty. Every number shown must answer
"so what?" — a percentage with no action attached is a bug, not a
finished feature.

A student should be able to open Presynce and, within seconds, answer
three questions without effort:

1. **Am I safe?**
2. **Can I skip?**
3. **What should I do next?**

If a feature or a screen doesn't serve one of these three, it's
decoration and loses the argument against not existing.

## The emotional target

A student should feel **quiet certainty** — not relief, not
celebration, not urgency. Relief implies the app rescued them from
anxiety it let build up. Celebration implies a game with a score to
chase. Both are spikes; Presynce's job is the opposite of a spike.

This holds even in bad news. A student below threshold should feel
calm, clear authority stating a fact and a path forward — not an alarm.
Never gamify the risk metric. Streaks and reinforcement are acceptable
only for the *habit* of logging, never for the attendance number itself.

## Vision — what it should feel like

- Apple Health for attendance
- Linear for academics
- Notion for organization

Simple. Fast. Calm. Professional.

## Design principles

- Minimal before beautiful
- Information before decoration
- Whitespace should feel intentional, not empty — it does a job
- One primary action per screen
- Motion guides attention; it never performs

## Visual language

No gradients used decoratively. No glassmorphism. No neumorphism. No
gaming aesthetics. No oversized illustrations. Neutral colors as the
base; saturated color reserved for real signal, never applied for its
own sake.

*(Specific hex values, type families, and token names live in each
repo's own design-system doc — they will change; the restraint
described above should not.)*

## Design inspiration — how to use it

Presynce learns from exceptional products without imitating them.
Inspiration may come from products such as Linear, Vercel, Apple, Arc,
Raycast, Notion, Stripe, or others.

When using inspiration:

1. Study the interaction or experience.
2. Identify why it works.
3. Extract the underlying design principle.
4. Reinterpret that principle within Presynce's own design language.
5. Ensure the result feels native to Presynce, not borrowed.

Never copy layouts, animations, styling, or branding directly. Ask: what
problem is this solving, why does it feel intuitive, can the same goal
be reached more simply, and does it actually align with Presynce's
philosophy — or does it just look nice.

Users should recognize the quality of the experience, not the source of
the inspiration.

## Originality

Every feature should contribute to Presynce's own identity. If two
equally good solutions exist, prefer the one that makes Presynce more
recognizable over the one that's merely familiar. Consistency is worth
more than novelty.

## Engineering values (timeless, not rules)

- Business logic never lives inside UI code
- One canonical implementation per responsibility — a duplicated
  implementation is a bug waiting to drift, not a convenience
- Never guess a domain fact (a timetable, a policy, a rule) — cite the
  real source, or ask. Guessing has caused real, user-facing harm to
  this product before, more than once
- Small, readable functions over clever ones
- Structure gets added to solve an observed problem, not a hypothetical
  one

*(The specific layer boundaries, naming conventions, and "never do X"
list enforcing these values live in each repo's own engineering doc —
they're implementation of this philosophy, not the philosophy itself.)*

## What never changes, regardless of stack or session

- Real students depend on this for real academic-standing decisions.
  Correctness is not negotiable for speed.
- A number without an action is an incomplete feature.
- The risk metric is never gamified.
- Nothing gets guessed when it can be sourced or asked.
- Whichever codebase is "live" for users stays untouched by
  experimental work until there's an explicit decision to cut over.
