---
name: frontend-feature-builder
description: Builds, extends, fixes or refactors frontend features end to end (reference stack Next.js, React, Tailwind, TanStack Query; adapt to yours) - branch, orient, reuse what exists, verify the backend contract field by field, plan to the plan-contract standard, implement, verify in the browser, test, doc-sync, review, local CI and the PR. Use when asked to add or implement a UI feature, page, component, form or flow, wire the UI to an API, change existing frontend behaviour, fix a frontend bug, or refactor frontend code. Plan words ("plan", "explain", "what do you think") get a plan and a stop, not code. Open-ended or ambiguous asks go through issue-intake first.
---

# Frontend Feature Builder

Frontend work that works and covers the cases: reuse what exists, match the
project's conventions, check the backend it talks to, and prove the result by
running it. Think first, keep the diff surgical.

## Configure for your project

The reference stack is Next.js + React + Tailwind + TanStack Query + Vitest +
Playwright. **Adapt the gate commands to your stack** and record them in your
repo's `AGENTS.md` / `CLAUDE.md` so this skill (and its subagents) can find them.

| Placeholder | Meaning | Reference-stack example |
|---|---|---|
| `<fast gates>` | Checks on changed files only | `npx eslint <files> && npm run typecheck && npx vitest related <files> --run` |
| `<full local CI>` | Full gate on the final head | `npm run lint && npm run typecheck && npm test && npm run build` |
| `<visual tests>` | Pixel baselines, if any | `npm run test:visual` |
| `<api layer>` | Where API calls must go | `src/api/` (query hooks -> typed JSON helper -> fetch wrapper) |
| `<session store>` | Where auth/session state lives | `src/store/...` |
| `<wire types>` | Types for API payloads | `src/types/` |
| `<design system>` | Shared CSS/primitives and their docs | `src/app/design-system.css`, `docs/ui-patterns.md` |
| `<comment rule>` | Your repo's rule on code comments | e.g. "no comments in added lines" |

Note: some setups skip typechecking during `build` (e.g. `ignoreBuildErrors`),
so make typecheck its own gate. A fresh worktree often has no `.env`; pass the
needed env vars on the command line.

## Start gate

- Plan words in the ask ("plan", "explain", "what do you think", "how would
  you") mean: write the plan (plan-contract standard) and stop. No branch, no
  edits.
- Open-ended or ambiguous (new feature area, several reasonable shapes): go
  through `issue-intake`, which asks the blocking questions once and settles the
  design, before this skill builds.
- Well-scoped (described bug, small addition to an existing pattern): continue.

## 0. Branch

Never build on the default branch. `git status` first; uncommitted changes you
did not make: stop and ask. Cut `feat|fix|refactor/<short-slug>` off a fresh
default branch (a tracker-suggested branch name is used exactly); reuse the
current branch if it is already the task's. Backend work this feature needs is
its own branch and PR via `backend-feature-builder`, landed first.

## 1. Frontend-specific orient

Pipeline step 1 applies. Also locate: `<design system>`, `<api layer>`,
`<session store>` and `<wire types>`. With no knowledge base, read the
structure, `package.json` and the closest existing feature.

## 2. Reuse vocabulary

Pipeline step 2 applies. For markup: the shared core classes and primitives
(`Button`, `Card`, `Badge`, `Input`, `Dialog`, ...) are reused as-is.
Everything else is utility classes, not a new class in the shared CSS (a new
shared class needs three or more consumers); no inline `style={{}}` for
anything a utility covers.

## 3. Backend contract check

Frontend-primary, backend-aware: read the backend here, never edit it on this
branch. Find the endpoint(s) in the backend repo's `origin/<default branch>`.
Check field by field: endpoint exists, request and response shapes match the
types in `<wire types>`, auth and role needs match the session handling,
pagination and error shape are handled. Result:
- matches: proceed;
- frontend type drift: fix the type in this work, say so;
- backend missing or incomplete: stop and tell the owner. Offer (a) build the
  backend first on its own branch (recommended when the feature is unusable
  without it), (b) build against an agreed contract with a clear TODO, (c) wait.
  No mock data unless asked.

Pure UI with no backend: say so and skip.

## 4. Plan

`plan-contract` standard, size S, M or L: requirements table in the owner's
words, out of scope, reuse with paths, file list, contract, tests named up
front, cards with an "Also touches" line, decisions, gate. Open questions were
asked up front at intake; the rest are defaults logged under Decisions.

## 5. Implement, verify, ship

Follow `../_shared/build-pipeline.md` from step 3. Frontend specifics:

**Code rules.** Use the mandated layers: a query hook in `<api layer>`, then the
typed JSON helper, then the fetch wrapper (never a raw `fetch` in feature
code); `<session store>` for the session, never raw localStorage; role
allow-lists on nav items. Accessible by default: native elements (`button`,
`label` tied to its input, headings in order), visible focus, keyboard
operability, `aria-*` only where semantics need it. Follow `<comment rule>`; a
surprising fact goes in the commit or PR body. New component under about 300
lines with a sibling test; delete what you replace. Pinned-stack gotchas:
`references/conventions.md`.

**Showing UI to the owner.** Any preview shown to the owner is something they
can click (a preview deploy, a static export with mocked data, or a hosted
artifact with variants behind a switch), not only screenshots. Rebase onto a
fresh `origin/<default branch>` before building the preview. Screenshots are
only your own check.

**Hands-on check (pipeline step 4).** Dev server, then click through the golden
path and the edge states (empty, error, role boundaries, responsive widths). Use
a Playwright script with an explicit `viewport` for narrow widths and RTL. Once
per chain on the final head. Verifier prompts: `references/verification.md`.

**Tests.** Vitest (or your runner) + React Testing Library for logic and states
(loading, empty, error, role gating, boundary inputs); mock the API client
layer, not global `fetch`. Extend the existing Playwright suite for the
critical path; if CI lists e2e specs explicitly, add new specs there. Setup
details: `references/testing-setup.md`.

**Local CI (pipeline step 8).** First read your own diff, including
`git diff --numstat` and `git diff -U0 | grep '^+'` for comments, magic numbers
and debug leftovers. Then, on a clean commit after the last edit, run
`<full local CI>` in the foreground, plus `<visual tests>` when a pixel can
move.

Flakes: a test-runner summary that reports fewer test files than the suite
has is partial discovery under load; rerun before reading traces. A visual
failure on a route the diff does not touch is checked locally on the same
tree, then the job is rerun. Regenerate only baselines your change moved, and
say which.

## Quality bar

Before claiming done, each is checked or stated plainly as unchecked:
- reused existing patterns; every new artifact justified
- backend contract verified field by field (or the gap reported)
- lint, typecheck, tests, build green on the final head
- hands-on browser check done; verifier confirmed the card claims
- every requirement row has its named test, run green
- pre-existing breakage reported separately
- comment rule held; docs synced; PR sized for review (else a stack)
