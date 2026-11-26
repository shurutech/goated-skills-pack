# Mode: redesign

Read after `SKILL.md`. Rules there (variants, preview, standing rules) apply.

## Explore the module as it is

Read the real components, not a summary. For each piece of feedback find the exact `file:line` that causes it and quote it; feedback names a symptom, you need the cause. Grep every consumer of anything shared before proposing to change it: two consumers means two visual baselines move.

**Parity table, every round.** Read the real component on `origin/main` end to end and list each button, state, empty copy, dialog and link, then where it lives in each variant. Tag anything dropped, hidden behind a menu, reworded or invented. It goes in the preview.

## Where variants are built

Never re-drawn wireframes or a mock with its own look. Variants are built inside the real app with real components and tokens.

- Tab inside an existing page: variants behind a `?v=` switch in the real component, `v=0` rendering a verbatim `<tab>-legacy` copy of main for before shots. Delete both at ship.
- Surface outside any shell: a dev-only route (for example a `page.dev.tsx` that only builds when an env flag like `ENABLE_DEV_ROUTES=1` is set).
- Small surface (one header, one card, a badge): standalone artboards work, but only as replicas. Lift the token block and real class rules verbatim from the app's stylesheet and write the same markup the component writes. Full pages with real data belong in the dev route.
- Give the worktree a real dependency install (`npm ci`); a symlinked `node_modules` can fail under some bundlers. Stub the API and seed the session or authed routes bounce to sign-in (`references/capture.md`).
- Motion: use the lightest entry point of the motion library the app already ships; watch the bundle-size budget.
- "Too much text" means cut copy hard and fold lists into a small card.

## Build: module-scoped refactor budget

Measure first with whatever code-quality baseline the repo has (over-exported symbols, duplicated fixtures, click handlers on non-buttons, hex literals, untested files, files over 500 lines). Hold every counter at or below where you found it. Fix what is real, in files you are already touching; no neighbouring-module refactors.

- Size: no file the redesign writes or rewrites ends above ~300 lines.
- Props: no prop the redesign adds passes through more than one component that does not read it.
- The component the redesign supersedes is deleted in the same PR; every new hook or section ships with a sibling test that can fail.
- Implementers apply a "do less" pass first (does this need to exist, is it already in the codebase, stdlib, native platform). Its notes go in the PR body, not in code comments.

**CSS quota (every global CSS file the app has).** In the same PR:

1. The module's rewritten markup uses utilities; touched files lose their inline `style={{}}`.
2. Classes used only by this module are deleted from whichever file holds them.
3. A module that owns a whole CSS file converts it and deletes it.
4. Dead classes in a CSS file the PR already edits go too, once `references/css-policy.md` proves them dead.
5. The PR body states each CSS file's line count before and after; a flat count needs a stated reason.

The shared core classes and the shared primitives stay.

## Gate additions

- Every redesigned tab gets a visual baseline spec, wired into CI. Inspect every PNG an update changes.
- Every new or touched e2e spec: `--repeat-each=20 --workers=8`. A CI failure that passed locally is reproduced and fixed at the cause, never rerun.
- If the round changed the design language, update the UI-patterns doc in the same PR.
