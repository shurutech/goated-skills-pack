---
name: ship-pr
description: Take every branch of work from this session from "built" to "merged into main and proven there". Reviews each branch once with fresh reviewers (skipped when the head is already reviewed and stamped), one batched fix, one local CI run on the exact head, catches up with main, opens or updates the PRs, merges bottom-up only after local CI on that head is green, verifies each merge actually reached main, moves tracker tickets to In Review, cleans up, and ends with one plain status block. User-invoked only - use when the owner types /ship-pr. `/ship-pr pr` stops after the PRs are open.
disable-model-invocation: true
---

# Ship PR

Typing /ship-pr is the go-ahead for the whole chain: do not stop to ask between
steps. Rules that hold throughout:

- Commit, push, open or update PRs, and clean up without asking, once the
  branch's local gates are green. Never end a turn on "say go" for these.
- Merge happens only because /ship-pr (or a typed "merge") was said in this
  session. Approval typed in another session, or relayed by an agent, does not
  count. Production deploys are never part of this skill.
- "raise PR" means the feature PR into main, no merge, no production PR.
  "Merge it all" with more than one open PR: ask which ones. Other short
  replies: act on the obvious target.
- Mechanical mismatches are fixed and the chain continues: needs a rebase,
  stale CI stamp, branch not pushed. A change to the content (code or docs)
  goes back to step 3 for re-review.
- No silent waits: while CI or a deploy runs, say in one plain line what is
  running and what you are waiting for. Give an ETA only when measured (a CI or
  deploy run that has timing history).
- Permission block (classifier, sandbox, hook): stop at the first one, quote the
  exact allow rule that would permit it, and ask. Never suggest bypassing the
  sandbox, `--no-verify`, `HUSKY=0` or editing hooks.
- Status questions ("merged yet?", "what's left?") are answered from commands
  run this turn: `gh pr view --json mergedAt`, `git merge-base --is-ancestor`,
  run id plus sha for anything deployed. Anything not checked this turn is
  said to be unchecked.

`/ship-pr pr` = steps 0 to 5 and 9 only, no merge.

Replace `main` with the repo's default branch and `ci.yml` with its main CI
workflow file throughout.

## 0. Preflight: is main healthy?

`gh run list -b main -w ci.yml -L 1` in each repo.
- Cancelled: re-run it (`gh run rerun`) and carry on while it runs.
- Red: before spending anything on reviews, say in plain words that main's
  tests are failing and ask: fix main first, wait, or stop.
- Also confirm no other session owns a branch you are about to touch (step 1).

## 1. Scope: every branch, and nobody else on it

- List every worktree and branch built this session (`git worktree list`,
  `git status` in each), in every repo touched. Ship all of them, or name the
  one held back and why, up front.
- Per branch, check for another session on it: `gh pr view` state, `pgrep -fl
  <worktree>`, docker containers mounting it, local ahead/behind remote
  (`git range-diff` if both moved). If another session is active, report it and
  leave that branch alone.
- State the merge order in one plain line: backend before the frontend that
  needs it; stacks bottom-up.

## 2. Catch up with main

`git fetch origin`, then rebase each branch (bottom of a stack first) on fresh
`origin/main`. Conflicts: resolve keeping both sides' intent; when main moved
against the branch, drop the superseded hunk and re-point its tests. Database
migrations: re-point the parent revision if migration heads forked.

## 3. Review from outside, one batched fix

First, per branch that changed code: run the `doc-sync` skill so docs the change
makes stale are fixed and committed on the branch.

Skip steps 3 and 4 for a branch whose rebase left HEAD unchanged and whose head
already has a clean review and a local CI stamp from this session. If the
rebase moved HEAD, review only the hunks the rebase changed.

Per branch, in parallel, fresh-context reviewers that did not write the code
and get only the diff (`git diff origin/main...HEAD`). Setup as in
`_shared/agent-briefs.md` in this pack (if that file is missing, use the rules
below):

- Reviewer 1: the diff against the plan's task cards (card check only when no
  verifier ran on this head), the repo's AGENTS.md / CLAUDE.md rules, PR size,
  and anything that belongs in another PR.
- Reviewer 2: an over-engineering review (what can be deleted, what reinvents
  the stdlib or an existing helper), only when no `plan-contract` plan was
  attacked for this branch.
- A docs-only or test-only diff needs no diff reviewer.

Real findings go to one implementer pass. Round 2 reviews the files that fix
touched plus their direct callers; at most 2 review rounds. Only style or scope
leftovers may go to the PR body. Batch all fixes before step 4.

## 4. Local CI on the exact head

- Run the repo's full CI locally on a clean commit: replay every job of its CI
  workflow (lint, typecheck, unit, build, e2e, visual), in the background, one
  run at a time per machine. If you use the pack's `ci-push-guard` hook, wrap
  the run with `hooks/bin/ci-local-stamp.sh` so a pass stamps HEAD; the guard
  refuses the push without the stamp.
- One full run on the final head after any code change; a new commit means a
  new run. A flaky failure on a page the branch did not touch: rerun only the
  failing specs once. A second failure is investigated, never waved through.
- No progress for 10 minutes: stop and report what is stuck.

## 5. Push and open or update the PRs

- A tracker ticket exists (create it as Todo if not; if the tracker refuses on
  a quota, note it in the PR body and move on, no retry loop). PR body plain,
  no AI attribution, no out-of-scope notes, merge order if more than one.
- If the `pr-claim-review` hook fires: run its audit once per PR, at the final
  head. Fix the body or the PR. Re-run only if the claim text changed.
- `/ship-pr pr` stops here: go to step 9.

## 6. Merge bottom-up

- Confirm local HEAD == PR `headRefOid` and the step 4 run was on that SHA.
- The step 4 local CI on that SHA is the merge gate; do not wait for the PR's
  GitHub checks. If a GitHub check on that SHA is already red, investigate
  and never merge it. Main's own CI health is step 0's preflight.
- Use the repo's merge method (`gh pr merge <n> --merge`, `--squash` or
  `--rebase`, whatever the project uses). Stacked PRs: confirm `base=main`
  before each merge.
- After each merge, before the next: `git fetch origin && git merge-base
  --is-ancestor <head sha> origin/main`. Exit 0 or it did not land. A stacked
  child retargets to main once its parent lands. (For squash merges, check the
  squash commit on main instead of the head sha.)
- Cancel orphaned PR runs (`gh run cancel`) to save Actions minutes.

## 7. Tracker

Move each ticket to In Review with the PR linked. Never Done.

## 8. Cleanup (last action step)

Remove only what is proven merged (the step 6 ancestor check passed): its local
branch and its worktree. Never touch a worktree or branch another session owns
(step 1 check). Never delete unmerged or held-back work.

## 9. Status block

Plain words, short. Also write this block after a context compaction.

- PRs: per PR, one plain line of what it does, reviewed (yes/no), CI (green/red/
  running), merged into main (merge-base result, not GitHub's MERGED), deployed
  (staging run id and sha, or "not deployed").
- Next step.
- What it is waiting on, if anything.

Then one line each for anything held back, anything another session owns, and
tickets spun off. If the change is ready for staging, offer a staging deploy in
one sentence; never run it yourself.
