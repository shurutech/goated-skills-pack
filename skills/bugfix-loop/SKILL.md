---
name: bugfix-loop
description: Work tracker-assigned bugs one at a time, end to end - pull issues assigned to the user (Linear, Jira, GitHub Issues), rank them, branch per issue off a fresh default branch, fix, verify by actually exercising the fix (browser click-through for UI, real authenticated request for an API), open a PR, move the issue to In Review, then repeat. Covers frontend, backend and issues that span both repos, spun-off bugs found while verifying, and "is ticket X done?" checks. Use for "find my issues and fix them", "pick up the next issue", "what's left", "continue with the next ticket", "is ENG-123 done?".
---

# Bugfix loop

One issue fully shipped (code, PR, tracker status) before the next. This skill is the backlog shape: discover, rank, repeat, tracker bookkeeping. The examples use Linear's MCP tools; for Jira or GitHub Issues use the equivalent calls (list my issues, read one, set status, attach a link). The shared parts live elsewhere:

- `issue-intake` first: duplicate check against PRs and the tracker, restating the problem, questions, `verify-claim` on any root cause, ticket format, worktree order, stacking, out-of-scope handling.
- Build, verify, review and local CI: `_shared/build-pipeline.md` in this pack. Do not restate it. Frontend fixes follow `frontend-feature-builder`, backend fixes `backend-feature-builder`; decide by where the fix lives, not how the ticket is worded.
- PR and merge: `ship-pr`. Commit, push and open the PR without asking once local gates are green; the merge waits for the owner.
- Project conventions (push method, comments policy, how technical to be) come from memory or the repo's CLAUDE.md / AGENTS.md; check them, do not hardcode.

## Loop

```
0. Discover    list issues assigned to me
1. Rank        by priority if set, else by impact
2. Dedupe      PRs + tracker, all states (issue-intake)
3. Understand  restate, questions, verify the cause
4. Plan        plan-contract size S/M; go-ahead rides on the same batched ask
5. Branch      fresh pull, worktree, branch per issue
6. Fix         reuse audit, minimal surgical diff
7. Verify      static checks AND exercise the fix
8. Ship        PR into the default branch, doc-sync before review
9. Tracker     In Review + PR link
10. Repeat     re-pull first, the default branch has moved
```

## Discover and rank

List issues assigned to me (Linear: `list_issues` with `assignee: "me"`). Rank by real `priority` when set; otherwise by impact (data integrity or core flow high, missing feedback medium, cosmetic low). Say the ranking with a one-line reason each.

## Already fixed?

If the ticket looks already fixed (a commit or merged PR on the default branch covers it), ask the owner once, citing the fixing commit or PR, before closing or skipping. A PR that only mentions the ticket is a lead, not proof: confirm each point in code on the default branch.

"Is ticket X done?" means verifying each point of the ticket on the default branch (and on staging or in the browser for UI), not reading the status:

- Close only when every point is verified.
- Partly done: leave a comment listing what is and is not done; do not close.
- Cancel only on the owner's word.

## Plan and confirm

Present the ranked list and a plan for the top issue (outcome, requirement rows, files, tests, gate), with questions batched in the same message. The explicit go-ahead rides on this same single batched ask (no separate wait). After the owner confirms the pattern once, "next issue" or "continue" counts as the go-ahead, but still state the plan before coding each time.

## Branch, every time

1. `git status`; stash unfamiliar changes (`git stash push -u`).
2. Switch to the default branch and pull fresh.
3. Isolated git worktree per issue (skip if the owner declined it this session or you are already in one).
4. Branch off the fresh tip; use the tracker's suggested branch name exactly if it has one (Linear: `gitBranchName`).
5. Pop any stash only in the original checkout.

Skipping the pull produces a branch that lacks the previous issue's merged fix.

One repo per branch. If the issue needs both a frontend and a backend repo, that is two branches and two PRs, and the issue links both. Land the backend first when the frontend depends on a new field or endpoint.

## Fix

- Reuse audit first: search by concept for what already exists (use as-is, extend, compose, only then create). On the backend a duplicate usually loses a soft-delete or tenant filter; check the project's knowledge base (`docs/`, `AGENTS.md`, `CLAUDE.md`, a code index if you have one) first.
- Minimal diff in the project's mandated layers; no speculative abstraction. Frontend: the existing API client wrapper, session helpers, design-system classes, accessible by default. Backend: thin route calling one service, shared auth dependencies, domain errors, response model, every query tenant-scoped and soft-delete filtered with the caller's role threaded in.
- Check the project's comment policy before adding any code comment.

## Verify

A green typecheck or build is necessary, not sufficient.

- Static checks; on the backend scoped to the files you touched (a whole-repo run buries real problems in old backlog).
- Reproduce the bug first for a real before/after.
- UI: dev server plus backend, then exercise the fix with browser automation, including the regression modes the bug implies (deep-link, refresh and back for URL state; longer-than-usual data for layout; render and auto-dismiss for toasts). Show the owner something they can click (a before/after switch, see `module-loop/references/live-artifact.md`), not just screenshots.
- API: module tests then the full suite, with a test that fails without the fix. Then a real authenticated request against the running server, reading the body; confirm a new or changed route is registered in the live schema. For side effects query the database and confirm the rows. For a leak or permissions bug, verify with a second tenant's or another role's credentials.
- Revert any test data you created in a shared environment.
- If the owner reports it still looks wrong, reproduce their exact report before explaining.

## Ship

Commit, push, `gh pr create` per project conventions (pass `--head/--base/--repo` if upstream is not detected). The PR body: short summary plus a test plan of what you actually verified. Base every PR on the default branch unless the project's release flow says otherwise (a hotfix branch off a release branch is a lead's call and must be merged back). Split a PR that grows too large into a stack per `issue-intake`. Run `doc-sync` before review; update docs the fix made stale in the same PR. If you use the `pr-claim-review` hook, it fires an outside reviewer of the PR's claims: wait for it, act on anything it flags, and tell the owner the outcome.

If the tracker refuses new tickets (quota or permission error), stop writing tickets, do not retry in a loop, and note the unfiled items in the PR body.

## Tracker

Set the issue to In Review and attach the PR. Done only after the owner confirms the merge; never infer it from an open PR. That confirmation is also the trigger for finishing the branch and tearing down the worktree; keep it alive through the review window.

## Spinoffs and late finds

Classify any second problem in one line:

- In-scope miss, or trivial and tightly coupled to code you already touch: fix it in the same PR as its own commit and continue.
- Unrelated or a different layer: own ticket with repro and root-cause note, linked to the surfacing PR, assigned as the owner says. It does not go in the PR body; hand the owner the list at the end. The other repo is always separate.
- It changes a decision already made: stop and ask.
- Security, tenant-isolation or data-loss finds are never parked: surface them immediately and give them their own ticket once triage says live and offered. Surface means tell the owner with the `issue-intake` security triage answers (live, offered, who and what, caveats); no fix is built without the owner's yes for that find.

## Finish

End each issue with a three-sentence plain summary: the problem, the change, how it was verified. Plain words, no file paths or identifiers unless asked, links on their own line. Name anything found late and why the plan missed it. Then re-pull and take the next issue.
