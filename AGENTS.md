# Presynce v2 — Agent Instructions

**Read `docs/ai-context.md` before making any change.** It is the
handoff document for this repository — locked product/design
principles, exactly what's currently implemented, design inspiration
boundaries, rejected directions, open questions, and working rules, all
in one place.

Do not start from the code and guess intent backward. Do not propose an
architectural change without checking `docs/architecture.md`,
`docs/open-questions.md`, and `docs/rejected-directions.md` first —
something that looks incomplete may be deliberate or already decided
against.

**Never commit, push, create PRs, or alter remote git state unless
explicitly asked to in that specific session.**

This is a real Next.js project (App Router, TypeScript, Tailwind v4,
Motion) with no unusual API deviations — the framework itself needs no
special handling. What needs care is the product and design context in
`docs/`, not the framework mechanics.
