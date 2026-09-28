# Engineering Manifesto

Every rule below is tied to a real incident from v1, not a hypothetical.
If a rule here seems overly strict for a "new" project, remember it isn't
new — it's paying down a specific, already-observed failure mode.

1. **One canonical implementation per responsibility.**
   ← v1 shipped a dead duplicate `sw.js`. Duplicated logic drifts; the
   moment there are two implementations of the same responsibility, one
   of them is quietly wrong.

2. **Never guess a domain fact — cite the source.**
   ← v1's G6 lab-hours bug came from an assumed timetable value that was
   never verified against real data. Batches G1–G8 each require real,
   verified source data. If a domain fact can't be cited, it doesn't go
   in the code; ask instead of filling the gap.

3. **Domain logic is framework-free and unit-tested.**
   Anything that computes a status, a threshold, or a recovery number
   lives in `/domain`, imports nothing from React or Firebase, and has
   tests. This is the layer that actually catches bugs before users do.

4. **Firebase is imported in exactly one layer.**
   `/services` and nowhere else. A component or hook that needs data goes
   through a service, never talks to Firestore directly.

5. **No structure without an observed problem.**
   No Redux, no speculative API abstraction, no multi-university
   abstraction layer. v1's real bugs were never caused by too little
   architecture — don't add layers to solve problems that haven't
   happened.

6. **Every stat ships with its action.**
   A bare percentage is a product bug, not a style choice. See
   product-philosophy.md.

7. **No stat surfaces without a domain function behind it.**
   If a number appears in the UI, it traces back to a named, testable
   function in `/domain` — never computed inline in a component.

8. **Milestone-by-milestone, not big-bang.**
   Explain what and why, build only that milestone, produce a preview,
   wait for approval, iterate, only then move on. Craftsmanship over
   feature count.

9. **Design decisions that weaken the product philosophy get challenged,
   not silently implemented.**
   If a requested feature or design pushes toward gamifying the risk
   metric, adding engagement-bait patterns, or diluting the "three
   questions" hierarchy, say so before building it.

10. **Rejected patterns stay rejected until explicitly revisited.**
    v1's purple/lavender identity and circular progress ring were tried
    and reverted on purpose. Don't reintroduce a previously-rejected
    pattern without an explicit new decision to do so.

11. **Verify, don't assert.**
    `npx tsc --noEmit` (or the equivalent for the layer in question) runs
    before a milestone is called done. A build/type-check failure caused
    by an environment limitation (e.g. blocked font fetch) must be named
    as exactly that, not glossed over.

12. **Every AI tool works from the same source of truth.**
    `/docs` is that source. Claude, Antigravity, ChatGPT, Cursor,
    Windsurf, or any other tool touching this codebase reads
    `ai-context.md` first. If a decision changes, `/docs` is updated in
    the same milestone the decision is made — it does not lag behind the
    code or the conversation history.

13. **Never touch remote git state without being explicitly asked.**
    No `commit`, `push`, `pull`, branch creation, or PR — none of it —
    unless the person explicitly requests that specific action in that
    session. This applies regardless of how confident the change is or
    how far along a milestone is. Producing files/diffs for the person
    to apply themselves is always fine; changing what's on GitHub is not,
    without direct instruction to do so.

## Working rules for a new agent picking this up cold

If you're a coding agent starting on this project without the
conversation history that produced these docs, follow these before
writing anything:

- **Read `docs/ai-context.md` first**, then the specific doc it points
  you to for the task at hand. Don't start from the code and guess the
  intent backward.
- **Inspect the existing implementation before proposing a
  replacement.** `architecture.md` lists exactly what's built. If
  something looks incomplete or inelegant, check `open-questions.md`
  and `rejected-directions.md` before assuming it's an oversight — it
  may be deliberate, or already-decided-against.
- **Preserve business/domain logic.** Anything in `/domain` is the
  layer that's been proven to catch real bugs (rule 2). Don't inline a
  calculation into a component to save a step.
- **One canonical implementation per responsibility** (rule 1) — this
  applies to your own additions too. If something like it already
  exists, extend or reuse it, don't add a parallel version.
- **Don't add dependencies casually.** Every current dependency is
  there for a specific, documented reason (see `architecture.md`'s
  stack section). A new one needs the same bar — a real, current
  problem it solves, not a nice-to-have.
- **Don't redesign an unrelated screen while implementing one
  feature.** If a task is "add X to the dashboard," that's the scope.
  Noticing something else looks off is worth mentioning — quietly
  fixing it in the same pass is not.
- **Don't mistake visual complexity for quality.** The design language
  is explicitly restrained (see `design-system.md`'s visual language
  section and `rejected-directions.md`'s rejected decoration list).
  More effects is not the same as more craftsmanship here.
- **Test both light and dark modes** for anything visual — even though
  dark mode has no toggle wired yet (`open-questions.md`), the tokens
  exist and are meant to work; don't add a component that only makes
  sense in one mode.
- **Preserve responsive behavior.** The nav already branches
  desktop-rail vs. mobile-tabs; don't build something that only works
  at one breakpoint.
- **Run `npx tsc --noEmit` and `npx eslint src` after any change**, and
  treat a failure as something to fix, not something to explain away —
  except for the one known environment-specific exception: `npm run
  build` can fail purely on a blocked Google Fonts fetch in a sandboxed
  environment with no general internet access, which is an environment
  limitation, not a code defect.
- **Explain significant architectural decisions** as you make them —
  in commit messages, PR descriptions, or wherever the person will see
  them — the same way this project's docs explain *why*, not just
  *what*, for every locked decision.
- **Never commit, push, create PRs, or alter remote git state** unless
  explicitly asked to in that specific session (rule 13).
