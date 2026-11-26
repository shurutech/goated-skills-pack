---
name: issue-intake
description: >-
  Single front door for every code-change request: a reported bug, a ticket, "this is broken", "fix this", "let's build X", "add a page/endpoint", "raise an issue", "is this already known". Use before any branch, edit or ticket exists. Reads the ask, asks the owner every blocking open point once in plain words, sizes the work (S/M/L), checks the issue tracker and open PRs for duplicates, runs a short idea phase (research, candidate approaches, attack, cheap test) for tasks with a design choice, then routes to bugfix-loop, module-loop, plan-contract plus the builders, or straight to a builder. Also use mid-task when about to state a root cause, create a ticket, hit a prerequisite refactor, find a second problem, or find the work needs more than one PR. Plan words ("plan", "explain", "what do you think") get an answer, not a branch.
---

# Issue Intake

Every code-change request enters here. Code is the last step: first find out
what is being asked, whether it is already done or decided, and how big it is.

"The owner" below is the person who asked for the work and decides scope.
"Tracker" is your issue tracker (Linear, Jira, GitHub Issues, ...).

## Rules at the top

1. Question or plan words ("plan", "explain", "what do you think", "how would
   you...") = answer or plan and stop. No branch, no ticket, no code.
2. Ask first: one batched plain-words question for every open point that
   changes the plan, before deep investigation. Later questions only for facts
   that could not be known up front.
3. Anything touching queries, endpoints, permissions, migrations, deletes or
   renames is size M at least.
4. No causal sentence ships unverified (Gate 3).
5. Security, tenant-isolation and data-loss finds are never parked: surface at
   once, own ticket once triage says it is live and offered (or the owner says
   yes). Surface means tell the owner with the triage answers (section 5a), not
   build. No security fix is built without the owner's yes for that specific
   find.
6. Owner-facing text is plain words: what changed for the user, no
   identifiers unless asked.

## Flow

```
read the ask -> ASK (one batch) -> size -> duplicate check -> idea phase
 -> ticket -> workspace -> route
```

## 1. Read, then ask first

Do a quick read only: the ask in the owner's words (message, ticket, PM text)
and the obvious code it points at. Do not plan yet.

List every open point that would change the plan or the solution: which role
or tenant sees it, expected value, scope edges, UI vs API, whether it ever
worked, a prerequisite refactor, which repo owns a rule. Ask them in **one
batched question** (your agent's ask-user tool if it has one), plain words,
each option explained in a sentence, the recommended default first. Do not ask
what the code can answer.

When requirements come from PM or ticket text, quote them back in that same
question and ask the owner to confirm or correct them. Unconfirmed
requirements are not plan input.

If nothing blocks, say the reading in two lines and go on.

## 2. Size

| Size | Shape | Path |
|---|---|---|
| S | Obvious 1-3 file change, no design choice, no queries/endpoints/permissions/migrations/deletes/renames | Straight to the builder; investigation still happens |
| M | One repo or a clear contract, a design choice or any item from rule 3 | `plan-contract`, then builders |
| L | Several repos, new feature area, shape unsettled, or more than one PR | Idea phase, `plan-contract` with the contradictions pass, builders |

State the size and why in one line. When unsure, take the bigger one.

## 3. Duplicate check (Gate 1)

Before writing a ticket or code, search the tracker (all states, including
Done/Canceled, not just yours) and every affected repo's PRs (all states,
including closed and merged):

```bash
gh pr list --repo <owner>/<repo> --state all --search "<keywords>" --limit 20
```

Use 2-3 keyword sets: the symptom, the surface, the likely code noun. The best
hit is "fixed once, then reverted".

- Open ticket or PR exists: link it, ask whether to take it over. No second ticket.
- Closed or merged PR exists: read its diff. It regressed, or never covered
  this case; say which. This changes the fix.
- Nothing: note what was searched in the ticket's technical comment.
- Ticket looks already fixed on the default branch: ask once and cite the fixing
  commit or PR. A PR that only mentions the ticket is a lead, not proof: confirm
  each point in code first.
- Tracker returns a quota or rate-limit error: stop writing tickets, no retry
  loop, note it in the PR body.

## 4. Idea phase (M/L and any design choice)

Default for new features, redesigns, M/L work and non-obvious bugfixes,
without being asked. S tasks skip it, except a quick doc check when touching
an unfamiliar or recently changed API.

1. **Research.** Web-search how this is conventionally built and how others
   solved similar problems. Official docs first, matched to the pinned
   versions in your lockfile / manifest. Search problem classes, not repo
   facts. Noisy output goes to a read-only agent.
2. **2-4 candidate approaches.** At least one from research, at least one that
   drops the premise ("do we need this at all", "reuse X instead").
3. **Attack them.** Use a six-thinking-hats lens (facts, feelings, risks,
   benefits, alternatives, synthesis) or fresh critic agents: risks,
   contradictions, substitutes.
4. **Cheap test.** Where possible: a spike, a run against real code or data, a
   quick prototype, existing tests. Do not commit to an untested idea when a
   five-minute check exists.
5. **Pick.** Best wins; combining parts is allowed. Say why it won and what
   lost. Record in the plan's Decisions. If the choice is the owner's, it goes
   in the batched ask (or one follow-up if it only surfaced here).

Brainstorming, when the shape is still only an idea: a brainstorming skill
(optional, e.g. `superpowers:brainstorming`).

The reuse audit happens once, in `plan-contract` step 1. Do not repeat it here;
S tasks do a quick grep for an existing helper.

## 5. Root cause needs `verify-claim` (Gate 3)

Before a cause goes into a ticket, comment, PR body or message, run
`verify-claim`: strip authorship, restate as a bare sentence, re-derive from
source. Tag findings `[V]` with the receipt (file:line or decisive command
line) or `[I]` with what would check it.

## 5a. Security find triage (before any branch)

Applies to every security, access or tenant-isolation find: from an audit,
a scan, a sibling check, an agent report or an old session note. A verifier
saying the code fact HOLDS ("this route has no role check") proves the code,
not that it matters. Answer each question with a receipt from the default
branch, this turn:

1. **Live?** Is the route mounted and reachable (router include, prefix,
   nothing shadowing it)? Unmounted or dead code: not a fix, say so.
2. **Offered?** Is the feature something the product offers today: a frontend
   screen or call that uses it, product docs, real rows? Code that exists only
   in the backend with no screen and no use is a cleanup question, not a fix.
   If usage is unclear from code, it is a question for the owner.
3. **Who and what?** Which role can do it, to whom, and what breaks for a real
   user (one line, plain words). "Any member could, in theory" with no real
   victim is low.
4. **Caveats carried?** Copy every verifier caveat ("part X is WRONG",
   "NOT CHECKED: ...") into the ask and into any builder brief. A dropped
   caveat is how a dead route gets a PR.

Then:
- Any answer is no or unknown: it goes to the owner as a question, not a PR.
- All yes: still ask the owner before building, with the four answers in plain
  words, unless the owner already approved this exact find this session.
- A sibling check or scan that turns up more finds: each new find gets its own
  triage and its own owner yes. Approval for the first fix does not cover the
  others.
- The ticket (Gate 4) comes before the branch for security fixes too.

## 6. Ticket (Gate 4)

Work that gets a PR gets a tracker ticket first (not trivial in-session
tweaks).

- **Body: plain words, no tech.** What the person did, what happened, what
  should have happened. No file, function or library names.
- **First comment: the technical note.** Cause with tag and receipt, file and
  line, duplicate-search result, prior PRs touching it.

## 7. Workspace (Gate 5)

Per repo: `git status` (stash unknown changes) -> default branch -> pull
fresh -> create a git worktree -> branch inside the worktree. The pull comes
before the worktree. One repo per branch: a change spanning two repos is two
branches, two PRs.

## 8. Route

| Request | Goes to |
|---|---|
| Bug that is a tracker ticket | `bugfix-loop` |
| UI page/module redesign, restyle, or responsive/mobile | `module-loop` |
| M/L build | `plan-contract`, then `backend-feature-builder` / `frontend-feature-builder` |
| S change | The matching builder directly |
| Script, infra, docs only | Plain careful editing: think first, surgical diff |

Builders and loops run `../_shared/build-pipeline.md`. Do not write code in
this session when a builder or implementer does it.

### Domain skills (on top of the route)

The route above picks the flow. If the task touches a specialist domain (3D,
motion, visual design, code-health audits), read `../_shared/skill-routing.md`,
pick the matching rows, and name those skills in the plan and in every builder
brief. A pure audit ask ("what should we refactor", "review my UI") routes
straight to the audit skill; no branch until a fix is chosen.

### Repo and build order (frontend + backend)

Backend and frontend deploy independently: two branches, two worktrees, two
PRs. Land the backend first whenever the frontend consumes a new field or
endpoint; building the frontend against a contract that does not exist yields
mock data to rip out. Say the order out loud ("backend first: new export
endpoint; then frontend wires the button"). If it is unclear which repo owns a
rule, ask. If backend is first, the frontend half starts from the backend
contract as merged or PR-approved, per the owner. Once both are built, check
the contract field by field (does the frontend type match what the backend
returns, does it call the endpoint that exists, with the right role shape).

### PR stack and merge order (Gate 6)

When the work is more than one PR, announce the merge order before opening
anything and make it visible in GitHub.

- Same repo, dependent slices: a real stack (stacked PRs with a stacking tool
  or manual base branches). Rebase the bottom onto the fresh default branch
  before submitting; a stale bottom leaks unrelated commits into every PR above
  it. Merge bottom-up, never the middle first.
- Cross-repo: not a stack. Independent PRs; the order goes in every PR body
  ("merges after <link>") and on the ticket.

### Refactor prerequisite (Gate 7)

If doing it properly needs restructuring code you were not asked to touch, it
is a plan decision: put it in the batched question in plain words (what, what
stays fragile without it, how big). Found mid-build: the builder stops and
reports; it may be the one question that reaches the owner before the PR.
Never bundle a refactor into a fix PR quietly; never ship a workaround you
believe is wrong without saying so.

## 9. Discovery during build (Gate 8)

When something turns up, classify in one line:

- **In-scope miss**: fix it and continue.
- **Trivial, same code you are editing**: fix, own commit.
- **Unrelated**: new tracker ticket (format above), listed to the owner at the
  end. Never mentioned in the PR body.
- **Changes a decision**: stop and ask.
- **Security, tenant isolation, data loss**: never parked. Surface
  immediately with the section 5a triage answers, own ticket once triage says
  live and offered. Do not build it without the owner's yes.

The final plain summary names what was found late and why the plan missed it.

## 10. Reporting and PR claims

Crisp plain words: the mechanism, not the vocabulary. If it is too tangled for
a paragraph, ask whether to build a visual explainer; do not build one
unprompted.

After a PR opens, audit its body's claims against its diff with a fresh agent
(`verify-claim`, or a post-PR claim-review hook if you run one). Give the agent
only the PR URL; do not pre-review the PR yourself. `WRONG` -> fix the body or
the PR. `UNKNOWN` on a process claim -> run it and quote the summary line, or
delete the sentence. Unclaimed hunks -> missing body line, or the diff carries
something that belongs elsewhere; say which. Docs: behaviour changes run
`doc-sync` (the build pipeline owns when).

## Red flags

- Editing before searching the tracker and PRs.
- "The cause is..." without a receipt this turn.
- A PR with no ticket; a second PR with no stated merge order.
- Stacking on a bottom branch you did not rebase.
- "Cleaning up while I'm here"; "also noticed..." in a PR body.
- Writing implementation code yourself instead of routing.
- Building a security fix from a scan or audit without the 5a answers and the
  owner's yes; "the verifier said HOLDS" used as proof it matters.
- Planning or branching on a question or plan words.
- Asking the owner one question at a time.
