# Build pipeline (shared by frontend-feature-builder and backend-feature-builder)

The builders own the start gate and the stack-specific steps. Everything from
"orient" to "PR" lives here, once. Say which step you are in as you go.

## Configure for your project

Fill these in once (in your repo's `AGENTS.md` / `CLAUDE.md`, or in memory) so
every step below has a concrete command:

| Placeholder | Meaning | Example |
|---|---|---|
| `<default branch>` | The only PR target | `main` |
| `<fast gates>` | Lint + typecheck + tests related to changed files | `npm run lint && npm run typecheck && npx vitest related <files> --run` |
| `<full local CI>` | The repo's full gate, ideally a replay of CI | `npm run lint && npm run typecheck && npm test && npm run build` |
| `<docs dirs>` | Where agent-facing and product docs live | `docs/`, `AGENTS.md` |

## Rules that outrank the steps

- Evidence beats confidence. "Done" means a command or a real request showed it.
- Authorised steps never end a turn on "say go": commit, push and the feature PR
  run on their own once this branch's local gates are green. Merge, deploy and
  production wait for the owner. `<default branch>` is the only PR target.
- Never edit, delete, skip or loosen an existing test to make a change pass. If a
  test looks wrong, stop and report it.
- No silent waits: while CI or a deploy runs, give one plain status line. Give an
  ETA only when it is measured (a prior run of the same job), never guessed.
- Permission or sandbox block: stop at the first one and quote the exact rule.
  Never suggest disabling the sandbox, `--no-verify`, `HUSKY=0` or hook edits.
- One branch per repo. A frontend branch never carries backend edits or the
  reverse; the other side is its own branch and PR (backend lands first when the
  frontend needs it).

## 1. Orient from the code, not the docs

Read `AGENTS.md` / `CLAUDE.md` for hard constraints and the docs index for what
the task touches. Then take facts from `origin/<default branch>` code or
installed library source: docs, memory, prototypes and old plans are leads, not
evidence. If a code-graph or code-search index exists, use it first. Output: the
constraints found and the files you will work near. A hard constraint that
conflicts with the request: stop and raise it.

## 2. Reuse check

Skip if a frozen `plan-contract` plan exists (its reuse section already did
this). Otherwise search for what already exists by concept, not name. Prefer
use as-is, then add a parameter or variant, then compose, then create new, with
a one-line reason for each new thing. For an M or L change also list siblings
(other entry points of the same route, table or endpoint) and consumers (tests,
e2e helpers, visual baselines, fixtures, docs, analytics), and grep the whole
repo for any export name you add or rename.

## 3. Implement

Cards (or the plan's file list) are the spec. Minimum code that matches the
surroundings: every changed line traces to the request, no speculative
abstractions or config, clean up only orphans your change created. Names and
types carry meaning; follow the repo's comment rule (the builder says which).

Discovery during build (one line each, then continue):
- in-scope miss: fix it and continue;
- unrelated: list it for the final summary, do not widen the diff;
- changes a decision in the plan: stop and ask.

Security, tenant-isolation and data-loss finds are never parked: surface them
immediately and give them their own ticket once triage says live and offered.
Surface means tell the owner with the `issue-intake` 5a triage answers (live,
offered, who and what, caveats); no fix is built without the owner's yes for
that find. The final plain summary names what was found late and why the plan
missed it.

Prototype guard: no visible control (button, field, toggle, menu item) without a
real API behind it. If the endpoint does not exist, the control does not ship.

Also touches: before moving on, check the card's "Also touches" line (visual
baselines, fixtures, docs, ratchet counters, size gates) and update each.

Subagents: use them for parallel independent read-only work, noisy output (web
research, many screenshots), or a big implementation in its own worktree (commit
before hand-back). Review, attack and verify are always a fresh-context agent.
Never nest subagents, never poll CI with an agent, never run parallel writers on
the same files. A brief states objective, scope, output format and stop
condition; hand-backs are short with blockers and file:line. Briefs:
`agent-briefs.md` (next to this file).

## 4. One post-build verifier against the cards

One fresh-context verifier gets the cards and the diff (never your reasoning)
and checks each card was done as written, nothing orphaned, named tests present
and able to fail. It runs beside the fast gates, not after them. Fix only the
mismatched cards. This replaces any separate card re-check.

Then the hands-on check, which no verifier replaces: exercise the real thing
once. Frontend: dev server plus a click-through of the golden path and the edge
states (empty, error, role boundary). Backend: a real authenticated request
against a running server, response body read, rows checked for side effects.
Once per chain on the final head, not per step. Any "handled" row for a counter,
limit or permission is executed once (test or real request); the receipt is the
command output.

## 5. Tests

The tests the plan named, no more: one per requirement row plus listed edge
cases. Write the check for changed behaviour before the gate. Every new test
must be able to fail (expected value is a literal, not the test's own input).
Run them and report output; a test you did not run is not a passing test.

## 6. Doc-sync

Run the `doc-sync` skill when the change alters behaviour, labels, access,
routes or side effects, or moves, renames or deletes files. One-off internal
detail needs none. Docs for the other repo go on that repo's branch. Ask if
unsure something is doc-worthy; prove each doc sentence by grep.

## 7. Fresh-context diff review

One correctness reviewer, in a fresh context, gets only the diff
(`git diff origin/<default branch>...HEAD`, plus `--numstat`: a `- -` row is a
binary file). Skip it only for docs-only or test-only diffs. Add an
over-engineering review pass only when no `plan-contract` plan was attacked for
this branch. `ship-pr` counts the same reviewers, so a branch reviewed here is
not reviewed again.

Round 2 covers only files the fix touched plus their direct callers. Maximum two
rounds. Only style and scope leftovers may go to the PR body; correctness
findings are fixed.

## 8. Local CI once, on the final head

After the last code change, run `<full local CI>` once. Any new commit means a
new run. Flake retries rerun the failing specs only; a failure on a path the
diff does not touch gets one rerun, then is investigated. Never regenerate a
baseline to make red go away. If a step is genuinely too slow to run, say so and
name what was skipped. CI failed but passed locally: reproduce and fix the
cause; never blindly re-run.

## 9. Commit, push, PR

No AI attribution of any kind unless your team wants it. Commit messages follow
`git log` convention. Push and open the feature PR into `<default branch>`
without asking. PR body: facts only; head the gate section "Gate (local run on
the head commit)" and quote the runner's summary line. If the diff bundles
independent concerns, split it into stacked PRs. Then audit the PR body's
claims against its diff with `verify-claim` (or a post-PR claim-review hook if
you run one) and fix the body or the PR when a claim is wrong. Merge waits for
the owner.

## 10. Final summary (plain words)

What changed for the user, how it was checked (one plain sentence per claim),
pre-existing breakage kept separate from your diff, what was found late, what was
deferred. No file:line or identifiers unless asked; links on their own line.
Anything unchecked is said to be unchecked.
