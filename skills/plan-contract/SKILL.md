---
name: plan-contract
description: The planning standard for any code change that is size M or L (anything touching queries, endpoints, permissions, migrations, deletes or renames is at least M). Front-loads the work - investigate deeply, verify claims against code, list use cases and edge cases, write per-file task cards precise enough to execute blindly, attack the plan with fresh agents, freeze it, build via the shared build pipeline, then run one verification pass against the cards. Use when work moves from "what" to "build", or when coming from issue-intake, frontend-feature-builder, backend-feature-builder, module-loop or bugfix-loop. Also use when asked to "write a plan", "plan this properly", or "make the plan bulletproof".
---

# Plan contract

**The deal:** planning takes most of the wall time, spent reading code, not
writing prose. The plan is attacked until it holds. After it is frozen,
builders execute it blindly and verification is one pass. Finding a gap at plan
time costs minutes; after the build it costs a fix pass plus a suite run.

Rules at the top:
- Every fact on a card comes from `origin/<default branch>` code or installed
  library source, never docs, memory, a prototype or an earlier plan. Cards
  name symbols, not line numbers.
- Every owner question is asked once, batched, with defaults (step 1, last
  bullet). After the freeze nothing asks.
- Attack rounds: at most two; round 2 only if round 1 changed the plan.
- Build steps live in `../_shared/build-pipeline.md`. This file does not repeat
  them.
- A reviewer asked to find problems always finds something: attackers report
  material gaps only.

Size: S is one inline card, no plan file, no attackers, but it still gets the
investigation. M and L follow everything below.

## 1. Investigate

Do it yourself or with read-only agents on disjoint areas. Write findings as
you go. Intake has already confirmed requirements and run the idea phase; the
chosen approach and why it won go in Decisions. If `issue-intake` did not run
(entered from a builder or `bugfix-loop`), do the ask-first batch and the idea
phase here (see `issue-intake`).

- **The ask.** Re-read the owner's messages, the ticket and the approved
  design. List every requirement in the owner's words.
- **The code.** Read every touched file in full. For every symbol you change,
  rename or delete, find every caller and reference: grep, code-graph tools,
  string names, mocks, e2e specs, scripts, migrations, agent docs, ADRs. A
  deletion is followed until nothing is orphaned; anything that becomes unused
  gets a card.
- **Siblings and consumers.** Other entry points of the same route, table or
  endpoint. Consumers: tests, e2e helpers, visual baselines, fixtures, docs,
  analytics/tracking. Repo-wide grep for each new export name.
- **Runtime readers.** When the change disables, gates, defers, limits or
  removes something other code relies on at runtime (a script or global like
  `window.dataLayer`, a provider, cookie, header, env flag, rate limit,
  permission), find every reader of that runtime thing. Callers of the edited
  function are not enough.
- **Reuse audit (once, here).** Search every affected repo and its docs for
  something that already does most of this. Prefer: use as-is, extend via
  props/filters, compose, then create. Pick the laziest option that works:
  existing code, then stdlib, then native platform, then an installed
  dependency, then new code.
- **Contract.** For anything crossing frontend and backend, read both sides
  and write down field by field what the backend returns and what the frontend
  type says.
- **Tests.** Grep unit, e2e and visual specs for changing behaviour. Every test
  that will break is a card line.
- **Environment.** Fresh `origin/<default branch>` per worktree; test database
  migrated to the repo head; ratchet and baseline files current; test commands
  green on an untouched worktree. Fix stale things now.
- **Pre-plan claim verification (fan-out).** Before writing the plan, list the
  factual claims it will rest on (a symbol exists, a caller list, a column
  shape, an endpoint's auth, a library behaviour). Group them **by area** and
  give each fresh read-only agent one batch: one agent per area, not per
  claim. Each re-derives its claims from source and returns confirmed/refuted
  with a receipt, defaulting to refuted when unsure. A refuted claim changes
  the plan before it is written.
- **Use cases and edge cases (contradict yourself).** Assume the change breaks
  something real and look for it. List each realistic way the changed code is
  reached (a user, teammate, test run or attacker will hit it within a month).
  Angles:
  - **Arrival and exit:** email link, reload, in-app nav, redirect, new tab,
    back button, deep link; where the page sends people next.
  - **Who:** every role including admin; unpaid account, impersonation,
    personal access token, logged-out visitor, another tenant (tenant/authz is
    mandatory for any query, endpoint or permission).
  - **Where:** dev machine, test suite, local CI, e2e, staging, production;
    cache or a third party down.
  - **Repetition:** double click, retries, polling, many devices, shared demo
    login, e2e helpers reusing one seeded user.
  - **Data:** empty, legacy rows, very large, odd case or whitespace,
    malformed ids.
  - **Side effects:** analytics, emails, charges, audit rows, anything no test
    covers.

  One row each: case, what happens after the change, receipt (symbol or
  command output), verdict: handled / needs a card / accepted trade-off named
  in Decisions. A suggestion that widens scope gets the same check before it is
  accepted. **A row marked "handled" for a counter, limit or permission is
  executed once** (test or real request); its receipt is the command output.
- **Questions.** Collect every owner question left after intake and ask in one
  batched question in plain words: each option explained, recommended default
  first. A refactor prerequisite, a product-state assumption and a scope
  trade-off belong here. This is the only point that waits for the owner.

## 2. Write the plan

File: `plans/<date>-<slug>.md` (or wherever your repo keeps plans).

Top of file, in this order:

0. **Assumptions.** Product-state assumptions the plan rests on (what exists
   today, who uses it, what data looks like), each marked confirmed or
   assumed with its default. Right at the top so a wrong one is seen first.
1. **Outcome.** Two to five plain lines.
2. **Requirements table.**

   | # | Requirement (owner's words) | Done when (WHEN x THEN y) | Card | Test |
   |---|---|---|---|---|

   Include empty, error, role and other-tenant cases that apply.
3. **Use cases and edge cases.** The full table, handled rows included, so
   attackers and the verifier can contradict them.
4. **Out of scope.** What a builder will be tempted to add.
5. **Decisions.** Choice, answer, one-line reason, alternatives rejected (the
   idea-phase result).
6. **PR split and order.** Cards per PR, backend before the frontend that
   needs it, which cards build in parallel (disjoint files).

Then one **task card per file** (or tightly coupled pair). The card is the
whole brief; a builder needs nothing else and makes no decision.

```
### Card <n>: <path>
Rows: R1, R3
Change:
  - <symbol>: <current behaviour> -> <new behaviour>.
    Exact code for anything non-obvious: signatures, conditions, queries,
    JSX structure, class names, copy text.
Delete: <symbols, imports, files>. Callers checked: <list, or "none: grep X">.
  Removing/renaming a flag, script, header or field: runtime readers
  grepped: <list, or "none: grep X">.
Reuse: <existing thing and path>. Do not create <thing>.
Also touches: <visual baselines, fixtures, docs, ratchet counters, size gates>
Tests:
  - new <file>::<test name>: arrange <..>, act <..>, assert <literal value>
  - update <file>::<test name>: expectation <old> -> <new>, because <row>
Verify: <exact command>  ->  expect <decisive output line>
Do not: <tempting out-of-scope edits>
```

Most important line first; models skip later instructions as specs grow. Exact
code only where the choice is not obvious. The card's tests are the oracle: 1
to 3 acceptance tests, at most 5, literal expected values. Cards sharing a file
say so. "Handle errors appropriately" is not finished: name the pattern and the
file it lives in.

## 3. Attack the plan

Fresh read-only agents in parallel, none has seen your reasoning. Give each
the plan path, the owner's words verbatim and the repo paths. Each attacks
from one angle, must refute, defaults to "broken" when unsure, reports only
material gaps (wrong or missing behaviour, broken caller, missing
requirement, needless layer), and never sees other attackers' output.

**Default two attackers:**
- **Code reality.** Every symbol, path, caller list and contract field on the
  cards is true on `origin/<default branch>`; deletions leave nothing orphaned;
  nothing existing is rebuilt; no breaking test is missing.
- **Use cases and breakage.** Treat the table as wrong. Find flows it misses
  or marks "handled" without a real receipt, walking the step 1 angles. The
  **tenant/authz angle is mandatory**: every query tenant-scoped and
  role-aware, a cross-tenant request denied, no id guessable across tenants.
  Each finding names the flow (who, from where, doing what) and the symbol that
  breaks.

**Add only when they apply:**
- **Simplicity and quality** when the plan adds new files or edits shared
  code: cards, files or layers that need not exist, a lazier option that
  works, duplication, repo rules (AGENTS.md / CLAUDE.md) a card would break.
- **Requirements** only when the owner gave a verbatim requirement list: every
  ask has a row matching the owner's words, every row has a card and a test.

Merge findings yourself and fold valid ones into the plan.

**Round 2** with new agents only if round 1 changed the plan; say what
changed. If round 2 still finds a blocker, the scope is wrong: split it or ask.

**Contradictions and alternatives pass (six thinking hats).** On L plans, or
whenever attackers disagree with at least one premise of the plan, run one
structured pass on the plan's central decision through six separate lenses
(facts, feelings, risks, benefits, alternatives, synthesis). It must name at
least one alternative that abandons the premise (not a variant of it). Fold it
in or reject it in Decisions with a reason.

## 4. Freeze and build

The plan is frozen. Builders and the whole build run per
`../_shared/build-pipeline.md` (implementers per PR or disjoint card group,
card Verify commands, verification, local CI, PR). Builders get only their
cards' path and section. A card that is wrong or impossible is the only reason
to stop: fix the plan, re-issue the card, no improvising.

Discovery during build is classified in one line: in-scope miss, fix and
continue; unrelated, list at the end; changes a decision, stop and ask.
Security, tenant-isolation and data-loss finds are never parked: surface at
once, own ticket once triage says live and offered. Surface means tell the
owner with the `issue-intake` 5a triage answers (live, offered, who and what,
caveats); no fix is built without the owner's yes for that find.

## 5. Verify once

This is the pipeline step 4 verifier plus the use-case rows, not a separate
pass. One fresh verifier gets the plan and `git diff origin/<default branch>`
and answers: is each card done as written, is every named test present,
asserting its literal and able to fail, is anything in the diff not on a card,
are the repo's rules held, does every use-case row still hold against the built
code. Run the `doc-sync` skill beside it; fast gates and the one full local CI
per the build pipeline. A mismatch goes to one builder fix, re-run only its
Verify commands, then one full run. Merge and deploy wait for the owner.

## 6. Learn (required)

After the PR opens, two lines in the plan file:

- Which cards needed a correction mid-build, and why.
- Which verifier or CI findings should have been caught at plan time, and by
  which step; plus anything found late and why the plan missed it.

The same miss twice becomes a bullet in step 1.
