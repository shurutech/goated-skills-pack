---
name: module-loop
description: Redesign or make responsive one module of a web app's frontend (a list page, a detail workspace, settings, the app shell), end to end - read the design language, explore the real module, build variants inside the running app, show them in a live clickable preview for the owner to pick, then plan, review and ship as one reviewable PR. Use at the first design message - "redesign", "revamp", "restyle", design feedback on something shipped, "make it responsive", "mobile friendly", phone/tablet fit, horizontal scroll. Not for a one-line style fix or a single bug (frontend-feature-builder, bugfix-loop).
---

# Module loop

One module per round, with its own design pass, refactor budget, preview, approval and PR. A module too big for one PR splits into sub-module rounds (for example: list page, workspace shell and tabs, each heavy tab). Size it before promising one round. Nothing near 300 files is a PR.

Pick the mode, then read its file now:

- Desktop redesign or design feedback: `modes/redesign.md`
- Fit phones/tablets, keep the desktop look: `modes/responsive.md`

Load this skill at the first design message, before exploring or building. Do not load generic brainstorming or feature-builder skills alongside it; `plan-contract`, `ship-pr` and `doc-sync` are fine.

## Standing rules (both modes)

- Every action the page shows today stays a visible, labelled button. An overflow (⋯) menu holds only low-frequency actions such as rename and delete. "Cleaner" never justifies hiding a CTA.
- UI only: no new features, original copy. New wiring, settings or reworded labels need the owner's yes. Showing data the API already returns but the UI drops is not inventing; cutting copy on "too much text" is not either.
- Reuse the app's existing layout primitives (page shell, side rail, section groups). Never copy a grid-and-rail layout into a third file: the second module to adopt a layout moves the shared piece into a shared component (a separate pure-refactor PR if that widens an approved PR).
- No new global CSS rules. A child styling its parent uses a parent selector utility (Tailwind: `has-[[data-x]]:`). Before pushing, `git diff --stat origin/main -- '*.css'` is empty or carries a reason the owner would accept.
- Every link is a claim: the target page lists that entity and every role who sees the link can open it.
- Read `origin/main` (`git archive origin/main` into a scratch dir), not the checkout, before claiming what exists.

## Phase 0: read before touching

1. Find and read the project's design language (the settled table of tokens, type scale, colour families, what is and is not adopted), plus any UI-patterns or design-rules docs. If you cannot find one, stop and ask. Never design from defaults. `references/design-language.md` lists what such a contract constrains and the traps around it.
2. Read the module's prior design decisions (memory, plan docs, past PRs). Never propose back something the owner rejected.
3. Ask for the reference page up front: is there a page or product the owner wants this to feel like? Add each reference they name to the surface-to-component table in `references/design-language.md`.
4. A complaint about something the design language mandates is an amendment to the design language, the owner's call. Present the scope both ways.

## Idea phase: research conventions (part of round 1)

Before any variant exists, run `references/research-routine.md` part A: web-search how competitors and established patterns handle the surface, look at the app's own pages that already solved it, and read the backend for what the data can do. Each variant names the convention it follows.

## Variant rounds

- Round 1: 5 genuinely different directions, grounded in what the product is, not dashboard furniture.
- After the owner picks one: the pick plus 2-3 variations of it. Never 5 fresh ones. When they mix ("header from A, list from B"), the next round is the mix plus 2-3 variations.
- Repeated rejection, or "liked none", or a flat "not liking it": stop generating. Ask one consolidated question with a picture (before/after crop or ASCII options): which surface, and what is off (character, hierarchy, colour, density). Then delete the rejected variants.
- Ask in pictures and plain words, not identifiers.
- Mock data comes from the real serializer / response shapes, read in the backend, never invented fields. Copy is a claim too: no provenance line ("scored on…") the backend does not support.
- Before each round goes out, check it against `references/what-the-owner-looks-for.md`. Fix any miss first.
- Verify colours and sizes by computed style, not by eye. Park the cursor somewhere neutral before a screenshot (a hovered button can read as disabled).

## Preview rules

- Variants are shown as a live, clickable preview (the real app's static export with an in-page fetch mock, a switch on top, trade-offs in a notes fold), never screenshots. Recipe: `references/live-artifact.md`. Screenshots are only your own pre-publish check (Playwright; recipe in `references/capture.md`).
- Switches cover variant, before/after, role and each edge state; every button works.
- One preview URL across rounds. Label each publish (`Round 2: header variations`). Keep prior variants behind the switch.
- Never read a built JS chunk back to edit it. Edit the source, rebuild, republish.
- Rounds are preview-only until the owner says "implement". Picking a variant is not a go.
- Sweeps and "what's left" lists enumerate routes, tabs and popups/dialogs, not just routes.

## Plan and review

Run `references/research-routine.md` part B (how the approved design is conventionally built with the installed libraries). Write the plan to the project's plans folder (for example `plans/<module>/PLAN.md`) to the `plan-contract` standard, plus: one row per approved decision, an OPEN section for what does not exist yet (backend field, token, spec amendment), the measured refactor budget, and the risks. Attack rounds per `plan-contract`; briefs in `references/review-briefs.md`. Then freeze.

## Build and ship

Follow `_shared/build-pipeline.md` for build, verify, fix and local CI, and `ship-pr` for PR and merge. Do not restate them. Module-specific additions:

- Builders are briefed from the approved preview itself (its source, the variant's markup and classes), never from a summary of it.
- Once the owner says "implement", the path to open PRs runs without further asks; merging stays their call.
- Built vs approved: add the built screen to the same preview beside the approved variant and tick every approved element.
- Delete the dev route, `?v=` switch, `window.name` helper and legacy copies before the PR.
- Mode-specific gates (CSS quota, size, baselines, desktop-identical check) are in the mode file.
- One session per PR or sub-module. Before the context fills, write a `HANDOFF.md` next to the plan (branch, worktree, PR, preview URL, next step). A command with no progress for 10 minutes: stop and report.

## Status block

After a context compaction, and at the end of the round, print:

```
Module / mode:
Round and last preview URL:
Approved so far:
Open questions:
Next step:
```

## Traps

1. Designing without the design language.
2. Proposing back something already rejected.
3. Mock data or copy that invents fields the wire does not have.
4. Wrong colour family: badge tint pairs used for text or surfaces (see `references/design-language.md`).
5. Changing a shared primitive (Button, Card, Badge, Input, Dialog) for one module: grep its consumers first; it is a global change.
6. Claiming a colour or size without reading computed style.
7. Reading the checkout instead of `origin/main`.
8. Declaring something un-migratable without counting consumers per module directory.
9. Tidying by hiding actions in menus.
10. Claiming a header or page has no actions without reading it.
11. A redesigned heading breaks e2e locators that target a tag or class; prefer role-based locators.
