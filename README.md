# goated-skills-pack

Skills, hooks and rules that make AI coding agents **check before they claim, plan before they build, and get reviewed by someone who didn't write the code**.

These came out of months of daily, real-project use with Claude Code across hundreds of sessions. Each one exists because an agent kept failing the same way: it said tests passed that it had never run, it flipped its answer when asked "are you sure?", it pushed a PR that needed four follow-up fixes, or it let docs drift away from the code. Everything here is generic and MIT-licensed, and you can drop it into any project.

> **Agents:** read [`AGENTS.md`](AGENTS.md). It covers install per harness, adapting the pack to a project, and which skill to use when.

## Quick start

```bash
git clone https://github.com/shurutech/goated-skills-pack && cd goated-skills-pack
./install.sh                       # all skills -> ~/.claude/skills
./install.sh verify-claim anti-sycophancy   # or pick a few
./install.sh --hooks --rules       # optional: guard hooks + always-on rules
```

Update: `git pull && ./install.sh`. It replaces only files this pack installed.

You can also tell your agent: *"Read AGENTS.md in this repo and set the pack up for my project."*

The skills use the open `SKILL.md` format, so they work in Claude Code and any other harness that reads skills. Harnesses that only read rules files are covered in [`AGENTS.md`](AGENTS.md).

---

## Start here: honesty and verification

These two skills need no setup and pay off from the first day.

### `anti-sycophancy`
Gets the agent to judge your claim on its own merits, give its conclusion before its evidence, and keep its position when you push back without a reason.

> **In practice:** asked to swap loading skeletons for spinners, the agent pointed out that the real problem was two skeletons whose shapes didn't match the content. In an audit, it withdrew one of its own earlier claims about what a code path did, because the code said otherwise.

### `verify-claim`
Runs when someone says "are you sure?", "double-check that" or "prove it". The agent states the claim as a bare sentence with no "I said earlier", then checks it from the source with isolated checkers that are told to disprove it. Re-reading its own earlier answer is what makes an agent flip-flop. Checking an unattributed sentence doesn't.

> **In practice:** before any code was written, 11 isolated checkers each tested one claim from a plan. One came back wrong: the endpoint the plan relied on didn't return a field the plan needed. The agent withdrew its "no backend change needed", which it had never actually checked. In other sessions the skill walked back an overconfident "the PR's stated cause is wrong" to "my evidence doesn't rule it out".

**Pair with [`rules/CLAUDE.md`](rules/CLAUDE.md).** Every factual claim gets a tag: `[V]` verified, with the receipt (a file and line, or the command and its decisive output line), or `[I]` inferred, with what would check it. A verified claim from a previous turn counts as unverified until it's re-run. "Are you sure?" is a question, not new evidence.

---

## The build workflow

This is a chain of skills that takes a request from "fix this" to a merged PR, with a verification gate at every step. Use the whole chain, or take pieces.

```
request ─► issue-intake ─► plan-contract ─► frontend/backend-feature-builder ─► doc-sync ─► ship-pr
              │  asks every blocking question once      │  fresh-agent review, local CI on the exact commit
              │  finds duplicate tickets and open PRs   │  proves the change works in a real browser or real request
              └─► bugfix-loop (assigned bugs, one at a time)
```

| Skill | What it does | Why it earns its place |
|---|---|---|
| `issue-intake` | The front door for every change request. It asks all blocking questions at once, sizes the work, checks the tracker and open PRs for duplicates, and runs a short idea phase (research, candidate approaches, an attack on them) when there's a design choice. | It has found tickets that already existed for the requested work, and an open PR that, once checked with git, changed nothing any more. Neither had to be built twice. |
| `plan-contract` | For medium and large changes: deep investigation, claims checked against the code, use cases and edge cases, then per-file task cards precise enough to execute blindly. Fresh agents attack the plan before it's frozen. | Plan attacks have caught a typo path that would have wiped saved data, a lookup missing its tenant scope, an undo action missing a permission check, and one response built in five separate places. All of these were found before any code existed. |
| `frontend-feature-builder` | The end-to-end frontend loop: reuse what exists, verify the backend contract field by field, implement, click through in a real browser, test, sync docs, review. Reference stack is Next.js, React and TanStack Query. | It stops "it compiles" from being treated as "it works". |
| `backend-feature-builder` | The same loop for APIs: reuse the service, schema and error layers, decide honestly whether a migration is needed, keep every query tenant-scoped with a cross-tenant test, and prove the change with a real authenticated request. Reference stack is FastAPI, SQLModel and Alembic. | It keeps tenant isolation and migrations deliberate instead of accidental. |
| `bugfix-loop` | Pulls your assigned bugs (Linear, Jira, GitHub Issues), ranks them, and fixes one per branch. Each fix is verified by actually exercising it, then a PR is opened and the ticket moves on. | It reuses existing rules instead of adding new ones, and it says plainly when an environment condition couldn't be confirmed. |
| `doc-sync` | After a change, finds every doc, agent-context note and memory that cites the changed files. One agent updates them, and a second agent, told to assume the edits are wrong, checks them against the code. This repeats until the checker finds nothing. | It exists because a docs linter passed clean while about 60 facts in the docs were wrong. The checker has since caught docs that described a button doing something it doesn't. |
| `ship-pr` | Typed by you, never self-invoked. It reviews each branch once with fresh reviewers and applies one batched fix. It runs local CI on the exact head commit, opens the PRs, and merges bottom-up only when that run is green. Each merge is confirmed with git, not assumed. | A pre-merge review caught personal data heading into an error tracker's logs before it shipped. Other reviews have found real bugs in redesign PRs. |
| `module-loop` | Redesigns one area of a web app, or makes it responsive. It builds clickable variants inside the running app at phone, tablet and desktop widths, lets you pick one, then plans and ships it as one PR. | You choose from real, working options instead of mock-ups. |

The builders use [`skills/_shared/`](skills/_shared): agent brief templates, the build pipeline, and a skill-routing table. Each builder opens with a **"Configure for your project"** table (gate commands, default branch, tenant column). Fill it in once, or ask your agent to.

## Everyday helpers

| Skill | What it does |
|---|---|
| `commit-review` | Explains and judges a commit or branch in plain English: what changed, whether the change was necessary, whether the frontend and backend agree on the API contract, and what existing code could have been reused. |
| `standup-summary` | A verified, plain-English summary of what you shipped today (or this week), built from GitHub and your tracker. Each item is checked before it's included. |

---

## Hooks: guards that hold when the agent doesn't

Skills are instructions, and agents sometimes skip instructions. Hooks are code: they block the tool call. Each one below was written after a specific failure. They're for Claude Code; see [`hooks/README.md`](hooks/README.md) for wiring and environment variables. The repo-specific guards stay inactive until you name the repos they apply to.

| Hook | Blocks | Why it exists | Record |
|---|---|---|---|
| `claim-guard` | A reply saying "tests pass", "build passes", "no type errors" and so on, with no command output to back it | Agents relayed a subagent's test results as their own | Fired in about 50 sessions. It made the agent re-run the suite and quote the summary line, instead of passing on "all N tests pass" from a helper's report. |
| `pr-claim-review` | Nothing. After a PR opens, it checks the PR description's claims against the diff | Nothing checked what PR descriptions claimed | Fired in about 50 sessions. It caught "removed everywhere" while the item was still in a side panel, "adds" for something that already existed, and wrong line counts. |
| `ci-push-guard` | `git push` and PR creation until local CI has passed on that exact commit | One PR needed four follow-up fix commits that a single local run would have caught | Fired in about 25 sessions. It held even when told to skip CI. |
| `main-ci-gate` | Merging while main's own CI is red or still running | In one day, 25 merges left 15 cancelled and 4 failed main CI runs | It turns merging into "wait for green, then merge", with no hunting for whoever broke main. |
| `heavy-job-lock` | Running lint, tests, builds and commits in parallel across agents, by queuing them machine-wide | Six parallel lint runs pushed load to about 51 on 15 cores, and each took 5–15 minutes instead of 2 | The most-fired guard, at about 400 queued runs. |
| `no-ai-attribution` | Commits and PRs that carry AI co-author or "generated with" lines | It keeps history clean if your team wants that | Preventive; it has never had to fire. |

**Honest rough edges.**
- `claim-guard` also fires on quoted examples, so you sometimes need its escape token.
- On its first runs, `plan-contract` ran too long because steps were skipped or run out of order. The current version puts the fresh-context review before the full local CI run and checks the environment before planning starts.

Adjust the hooks to taste.

---

## Rules

[`rules/CLAUDE.md`](rules/CLAUDE.md) holds always-on working rules: evidence-tagged claims, asking blocking questions up front with defaults, review always done by a fresh-context agent, subagent briefs with an objective, scope and stop condition. Append it to `~/.claude/CLAUDE.md`, or to `AGENTS.md` / `GEMINI.md` / Cursor rules in other harnesses. `./install.sh --rules` does the Claude Code version for you.

## Pairs well with

Skills by other authors that we recommend next to this pack, such as superpowers, three.js and motion design skills: [`THIRD_PARTY.md`](THIRD_PARTY.md). They're linked rather than copied.

## Contributing

PRs welcome. A new skill should come from a failure you actually saw, describe the procedure step by step, and include one concrete "in practice" example. Keep skills free of project-specific names; put those in a "Configure for your project" table.

## License

MIT. `skills/anti-sycophancy` is adapted from [mskadu/opencode-agent-skills](https://github.com/mskadu/opencode-agent-skills), MIT; its license file is included.
