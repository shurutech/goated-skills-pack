---
name: commit-review
description: Explain and judge a git commit (or commit range / branch diff) in plain english, what changed, what each touched file's role is, whether the change was actually necessary, how it compares to a reference branch (staging/main), whether the frontend/backend sides of the change actually agree on the API contract, and whether it followed good practice (DRY, YAGNI, scope discipline, accessibility, repo conventions). Use whenever the user asks to "explain this commit", "walk me through this diff", "was this change necessary", "compare this branch to staging/main", "review my commit history", "does the frontend match the backend for this", or wants a code-review-style explainer rather than just a raw diff. Different from a bug-hunting code review: this is an explainer + judgment pass, trace data flow end to end across repos when relevant, verify claims with grep/git rather than trusting the diff at face value, and call out anything that could've reused existing code.
---

# Commit Review

Explain a commit the way a thoughtful senior engineer would walk a teammate through it: plain english, verified against the actual codebase, and honest about whether the change was worth making. This is not the bug-hunting kind of code review, it's an explainer + judgment pass. Skip programmer jargon unless the user has used it themselves.

## Reviewing stance

Apply the discipline good engineers ask of *writing* code (think before coding, simplicity first, surgical changes, goal-driven verification), but pointed at *judging* it:

- **Don't assume, don't hide confusion.** If it's ambiguous which backend endpoint a frontend change talks to, or whether a reference branch was even meant as the comparison target, say so and state your best guess explicitly rather than silently picking one.
- **Simplicity is a review criterion, not just a writing one.** When judging whether an abstraction, config option, or generality was warranted, ask "would a senior engineer call this overcomplicated for what was asked?", same bar you'd hold your own code to.
- **Surgical scope is a review criterion.** A commit that bundles an unrelated refactor, rename, or drive-by cleanup alongside its actual purpose should be called out, even if each part is individually fine.
- **End with a verifiable verdict, not vibes.** "Looks fine" is a weak conclusion. "Necessary, closes a real gap (verified at file:line), no reuse violation found, backend contract matches" is a strong one, a reader can check every clause.

## Why this exists

A diff alone tells you what lines changed, not what actually happens or whether it mattered. "Added a `reorderItems` function" is technically true and useless. The value is in tracing what a change actually *does* end-to-end (a UI drag event that ends up as a field in an API payload), and in checking claims against the codebase instead of taking the commit message's word for it.

## Process

Work through these steps for the target commit (or range/branch). Skip a step only if it genuinely doesn't apply (e.g. no reference branch given).

### 1. Get the facts

```
git show --stat <ref>       # files touched, insertion/deletion counts
git show <ref>               # full diff
git log --oneline <ref> -1   # commit message, author, date
```

For a range or branch: `git log --oneline <base>..<ref>` and `git diff <base>...<ref>`.

### 2. Explain file by file, in plain english

For each touched file:
- What is this file's job in the app (a store? a component? an API client? a util)? One sentence.
- What specifically changed in it, new function, new prop, new import, and what that piece *does*.
- Skip line-by-line narration of formatting/import-sorting noise; focus on the parts that change behavior.

### 3. Trace the data flow, don't just list changes

Follow the change from trigger to effect: a button click → a store action → a field that ends up in a saved payload, or a prop → a render branch → what the user sees. If a new field or function is added, check with `grep` (or a code-graph tool if you have one) whether it's actually *read* somewhere, don't assume a write-only field matters just because it was added confidently. This is usually the difference between "sounds plausible" and "verified."

### 4. Compare against a reference branch (if one is given or obviously implied, e.g. staging/main)

```
git merge-base <reference-branch> <feature-branch-or-ref>
git branch --contains <ref>
git log <reference-branch> --oneline -- <touched-file>
```

Answer: does the reference branch have this code at all? Is this branch a clean split off the reference tip (nothing to reconcile), or has the reference branch moved on in ways that could conflict? Say plainly whether this is "safe net-new addition" or "there's drift to watch."

### 5. Judge necessity

Was this change actually needed, or is it speculative/YAGNI? Back the judgment with evidence, not vibes, e.g. "the `index` field this commit starts writing is read at `exportBuilder.ts:120` and sent to the backend, so wiring up the UI to set it is closing a real gap, not decoration." If you can't find a consumer for something new, say so, that's a legitimate finding, not a failure to look hard enough.

### 6. Check best practices and design principles

Go through these and only report what's actually relevant to this commit, a clean list of "not applicable" is worse than silence:

- **DRY**: does something like this already exist elsewhere in the codebase that could've been reused? Actually `grep` for it, don't guess. Equally important: note if this is genuinely first-of-its-kind (nothing to reuse), and don't invent a violation that isn't there.
- **YAGNI**: any abstraction, config option, or generality added for a case that doesn't exist yet?
- **Scope discipline**: did the commit stay focused, or does it carry unrelated refactors/renames bundled in?
- **Separation of concerns**: does UI code hold logic that belongs in a store/service, or vice versa?
- **Naming**: do new names match the vocabulary already used in the surrounding code?
- **Accessibility / edge cases**: for interactive features (drag-drop, forms, keyboard flows), was the non-mouse/non-happy-path considered (e.g. a keyboard sensor alongside a pointer sensor)?
- **Repo conventions**: does it follow whatever the project's CLAUDE.md documents (patterns, libraries, validation rules, form conventions, etc.)? Read the relevant CLAUDE.md section if one exists before asserting a convention.

### 7. Cross-check the backend when the commit touches the API

If the commit adds/changes a field, endpoint, request payload, or response shape, don't stop at "the frontend sends this." Go find where it lands:

- Locate the backend repo: check for a sibling directory (e.g. a `*-backend` next to the current repo, common in a multi-repo workspace), a path referenced in CLAUDE.md/docs (`docs/backend-contract.md`, `docs/backend-constraints.md`), or ask if it can't be found.
- Find the matching route/handler for the endpoint the frontend calls (grep the URL path from the API client, e.g. `apiEndpoints`/`client.ts`, against the backend's route registration, in a Go/Gin-style backend that's usually `internal/routes/`, `internal/handlers/`, request/response shapes in `internal/dtos/`).
- Check the contract actually matches: field names, types, required-vs-optional, enum values line up between what the frontend sends/expects and what the backend's DTO/handler/validator accepts/returns. A frontend field the backend silently ignores, or a backend requirement the frontend doesn't satisfy, is a real integration bug, not a style nitpick.
- Check validation is aligned in both directions, e.g. if the frontend enforces a regex/max-length client-side, does the backend enforce the same rule, or could a non-UI client (curl, another consumer) send something the frontend would have blocked?
- If the commit is backend-only, do the reverse check: does any frontend code call this endpoint, and does it still match after the change?
- If there's no backend repo to check (frontend-only workspace, or the change is purely internal state with no API surface), say so plainly and skip this step rather than forcing an unrelated finding.

### 8. Flag reuse opportunities without overreaching

If you spot a DRY violation or a pattern that's about to be needed a second time (e.g. a second reorderable list is coming), say so, but frame it as "worth extracting when the second instance actually shows up," not as an immediate must-fix. Don't recommend abstracting after a single use.

## Output shape

Write it like an explainer a teammate could read cold, no header-heavy report unless the commit is large enough to need the structure. For a small commit, a few short paragraphs or a light file-by-file list is enough. For a bigger commit or a branch, use headers per file/step. Always end with a direct necessity/quality verdict, don't make the reader infer it from scattered observations. If asked for a visual walkthrough (mockups, before/after, component diagrams), that's a separate ask, build it as a separate HTML page, not as a substitute for the written explanation.
