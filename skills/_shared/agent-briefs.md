# Agent briefs (implementer and reviewer)

Paste, fill the `<>`. Used by the builders, `plan-contract` and `ship-pr` when a
subagent builds or reviews a PR.

## How the pipeline uses agents

Per PR: one implementer executes the frozen `plan-contract` cards, then one
fresh verifier checks the diff against the cards beside the fast gates, only the
mismatched cards are fixed, then one local CI. One correctness reviewer reads the
diff; an over-engineering reviewer is added only when no `plan-contract` plan
was attacked for the branch (the over-engineering pass happens when the plan is
attacked). `ship-pr` uses the same count and skips review when the head was
already reviewed. Reviewers get the diff and the plan, never the author's
reasoning, and re-check each finding against a concrete failure scenario before
reporting. The claim audit runs once, on the PR.

Review the local diff before the push: `git diff origin/<default branch>` is the
same content a PR shows, so findings arrive while the work is cheap to change.

## Caps for every agent prompt

- Report length: implementers under 20 lines, reviewers under 40. Hand-backs are
  short; every blocker or High finding carries an id and `file:line`.
- One PR per agent. Each hands back a committed branch; the parent runs CI,
  pushes and opens the PR.
- No browser inside agents. The parent does one browser pass on the final head
  (a Playwright script with an explicit `viewport` for narrow widths or RTL;
  resizing a live browser tab often does not relayout).
- Worktrees: give each writing agent its own worktree at launch, or run it in the
  parent's worktree. Agents cannot share one another's worktrees safely.
- Run gates in the foreground with a long timeout, never in the background;
  ending a turn while a background job runs hands back incomplete work. One wait
  per job, no `sleep` poll loops. A lock wait is queueing, not a hang.

## Implementer brief

```
Repo: <owner/repo>. Work in <worktree path> (run everything from here; never cd
elsewhere). No dev server is running. Do NOT run a browser.
Final report under 20 lines: branch, head SHA, each requirement row with its
test result, gate summary lines, anything not done and why, blockers with
file:line.

Read the plan at <plan path> first: it is the spec. Work its requirements table
top to bottom. Then AGENTS.md / CLAUDE.md and <the module doc>. Facts come from
origin/<default branch> code or installed library source, not docs or memory.

Scope: only what the plan asks or what is clearly necessary for it. No extra
features, refactors, abstractions, config, defensive code for impossible states,
or files outside the plan's file list. If the plan is wrong or a file outside it
must change, stop and report instead of working around it.

Rules:
- No visible control (button, field, toggle, menu item) without a real API
  behind it; if the endpoint does not exist, do not ship the control.
- The repo's hard constraints (AGENTS.md / CLAUDE.md) are the gate. Never
  `--no-verify`, never disable hooks.
- Follow the repo's comment rule for added lines. <e.g. "no comments in added
  lines"; check with: git diff --cached | grep '^+' | grep -E '//|/\*'>
- Commit messages and PR bodies: facts only. Quote gate numbers from the
  runner's summary line, never round.
- Never cite absolute line numbers in a doc. A fixed backlog row is deleted in
  the same commit.
- Use the lockfile install (`npm ci`, `uv sync`, ...), never a fresh resolve.
  Push new commits only, no force. Never touch <default branch>, never merge.
- While working run only the fast gates on changed files: <fast gates>. Never
  the full suite mid-task.
- Before hand-back: typecheck, lint on changed files, tests related to every
  changed file. Quote the decisive lines. The parent runs the one full local CI.
- Never edit, delete, skip or loosen an existing test, and never special-case
  inputs, to make a check pass. If a test looks wrong, stop and report it.
- Every new test can fail: expected value is a literal, proven once by breaking
  the code and quoting the failing assertion (mutation receipt), then restore.
- Removing or renaming a flag, script, header or field: grep every runtime
  reader first.
- Report to the parent only; no tracker or GitHub comments.
- Security fixes: the brief lists the triage answers (route live, feature
  offered, who is hurt) and every verifier caveat. If you find the route is
  not mounted, the feature has no frontend use, or a caveat contradicts the
  task, stop and report; do not ship a fix "in case it is re-enabled".

Task: <one PR: plan path, and which requirement rows it covers>. Commit on the
branch and hand back; the parent pushes and opens the PR after review and CI.
If something is impossible, stop and say exactly what and why.
```

## Reviewer brief

```
You are reviewing a change in <repo> as an outside reader. You did not write it
and must not reconstruct the author's intent. READ-ONLY: `git diff`, `git show
origin/<base>:<path>`, file reads (or `gh pr view` / `gh pr diff` for a PR). Never
edit, push, comment, run tests, or check out a branch. Report under 40 lines:
findings only, no praise. Report only correctness gaps that affect behaviour and
rule violations; skip style. Default to dropping a finding you cannot back with a
concrete failure scenario.

Diff: <PR URL, or: branch <branch> in <worktree>; `git diff origin/<base>...HEAD`
and `--numstat` (a `- -` row means binary, which hides the file from review)>.
Base: <BASE>.

Job 0, coverage against the plan (run only when no verifier ran on this head):
read <plan path>. For every card: change made as written, deletions complete
with nothing orphaned, named tests present and asserting literal values so they
fail if the card breaks. For every requirement row: mapped to built cards? List
missing or partial cards and rows, hunks in files with no card, and tests
edited, deleted or loosened beyond a card.

Job 1, correctness and written standards: read AGENTS.md / CLAUDE.md and the
repo's design rules from the base branch, then the full diff. Every finding has
`file:line`, most severe first, as `id path:line - problem - fix`. Check:
1. The repo's comment rule on added lines.
2. Size and single-job files (a component or module that grew past the repo's
   size norm; state moved from a parent into a child).
3. Styling: inline styles beyond measured positions; hardcoded colours where a
   token exists; edits to shared design-system CSS that one feature did not need.
4. Data access: bypassing the repo's API client or data layer in new code.
5. Tests that cannot fail: expectation derived from the code under test or the
   test's own input; sync assertion on state an effect sets; a "does nothing
   while closed" test where closed renders nothing.
6. Two mechanisms for one fact. Before reporting one, `git show` the incumbent
   on origin/<base>: parity with the code it was moved from is not a defect.
7. Selectors and roles that bake in an accessibility gap.
8. Verbatim moves: diff moved bodies against the original.
9. Scope: hunks the title does not cover, stray files, tool-injected blocks,
   `console.log`, `debugger`, `.only`, TODO.
10. Correctness by reading: unhandled promise paths, effects without cleanup,
    state set after await with no cancelled guard, index keys.
11. Docs against code: every sentence the diff adds or rewrites in docs is a
    claim; check it against the head tree. A sentence already false on the base
    and copied forward is still a finding.
12. Backlog hygiene: a fixed backlog row must be deleted in the same diff.
13. Derived state: an effect that only derives a value, state mirroring a prop,
    a `.catch` that turns a failed load into empty/null with nothing on screen,
    a prop passed through components that do not read it.
14. Raw HTML from server, AI or user text must go through a sanitizer.
15. Warning ratchets: any rise in a lint-suppression baseline or a new
    `eslint-disable` (or the stack's equivalent).
Backend diffs add: a query missing its tenant/organization filter or soft-delete
filter, a domain read without the caller's role, an ORM object or internal
column on the wire, a migration whose model declaration or downgrade does not
match, a bare framework error where a domain error exists.

Output Job 0 and Job 1 and nothing else.
```

## Recurring false findings (avoid them)

- A claim read off the working checkout instead of `origin/<default branch>`:
  the branch in the tree lags. Extract with
  `git archive origin/<default branch> <dir> | tar -x -C <scratch>` and grep; a
  pathspec'd `git grep` against a rev silently returns zero on a quoting slip,
  which reads as absence.
- A counter's name mistaken for the thing it counts (`hasX: false` says a
  library is absent, not the pattern). Open the file the counter is about.
- Gate numbers in a PR body nobody can corroborate: quote the runner's line.
  Cross-repo claims cite the other repo's `origin/<default branch>`, never a
  local checkout. Never write a PR number you have not resolved.
- Tool-injected text committed (dev servers and CLIs sometimes write into
  `AGENTS.md` or config files). Check the diff for blocks you did not write.
