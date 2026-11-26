# goated-skills-pack

**Make your AI coding agent check before it claims, plan before it builds, and get reviewed by fresh eyes.**

Skills, hooks and rules for Claude Code and other agent harnesses. MIT-licensed, not tied to any project, built from hundreds of real sessions.

---

## Why

AI agents keep failing in the same few ways:

- They say **"tests pass"** without running them.
- They **change their answer** as soon as you ask "are you sure?"
- They **push a PR** that then needs four follow-up fixes.
- They let the **docs drift** away from the code.

Each skill and hook here exists because one of these kept happening.

## What's inside

| | What | Count |
|---|---|---|
| 🧠 | **Skills**: step-by-step procedures the agent follows | 12 |
| 🛡️ | **Hooks**: code that blocks the bad action outright | 6 |
| 📏 | **Rules**: always-on habits for your `CLAUDE.md` / `AGENTS.md` | 1 file |

## Quick start

```bash
git clone https://github.com/shurutech/goated-skills-pack
cd goated-skills-pack

./install.sh                                # all skills
./install.sh verify-claim anti-sycophancy   # or just a few
./install.sh --hooks --rules                # plus hooks and rules
```

**Update:** `git pull && ./install.sh`

**Let your agent do it:** tell it *"Read AGENTS.md in this repo and set the pack up for my project."*

**Not using Claude Code?** The skills use the open `SKILL.md` format. [`AGENTS.md`](AGENTS.md) covers Codex, Cursor, Gemini CLI and others.

---

## Skills

### 1. Honesty — start here

These need no setup.

**`anti-sycophancy`** — The agent judges your claim on its own merits, gives its conclusion first, and keeps its position unless you give it a reason to change.
> *Real example:* asked to swap loading skeletons for spinners, it pointed out the real problem: two skeletons that didn't match the shape of the content.

**`verify-claim`** — When you ask "are you sure?", the agent restates the claim as a plain sentence and has isolated checkers try to disprove it from the source. It doesn't re-read its own earlier answer, which is what causes flip-flopping.
> *Real example:* 11 checkers tested a plan's claims before any code was written. One claim was wrong: an endpoint didn't return a field the plan relied on. "No backend change needed" was withdrawn.

### 2. Build workflow — from "fix this" to a merged PR

```
issue-intake → plan-contract → feature builder → doc-sync → ship-pr
                                     ↑
                         bugfix-loop (for assigned bugs)
```

Use the whole chain or pick pieces.

**`issue-intake`** — The front door for every request. Asks all the blocking questions at once, sizes the work, and checks for duplicate tickets and open PRs.
> *Real example:* found that two tickets for the requested work already existed, so nothing got built twice.

**`plan-contract`** — For medium and large changes. Investigates, checks claims against the code, and writes per-file task cards. Fresh agents attack the plan before it's frozen.
> *Real example:* the plan attack caught a typo path that would have wiped saved data, a lookup missing its tenant scope, and an undo action without a permission check, all before any code existed.

**`frontend-feature-builder`** / **`backend-feature-builder`** — End-to-end build loops. Reuse what exists, verify the API contract field by field, and prove the change in a real browser or with a real request. Reference stacks: Next.js and FastAPI. Adapt them to yours.

**`bugfix-loop`** — Pulls your assigned bugs from Linear, Jira or GitHub Issues and fixes them one branch at a time. Each fix is verified by actually exercising it.

**`doc-sync`** — After a change, one agent updates every doc that cites the changed files. A second agent, told the edits are wrong, checks them against the code.
> *Why it exists:* a docs linter passed clean while about 60 facts in the docs were wrong.

**`ship-pr`** — Runs only when you type `/ship-pr`. Fresh-eyes review, local CI on the exact commit, then the PRs are opened and merged bottom-up. Each merge is confirmed with git.
> *Real example:* the review caught personal data on its way into an error tracker's logs, before merge.

**`module-loop`** — Redesigns one area of a web app, or makes it responsive. Builds clickable variants inside the running app for you to pick from.

### 3. Everyday helpers

**`commit-review`** — Explains a commit in plain English: what changed, whether it was needed, and whether the frontend and backend agree.

**`standup-summary`** — A verified summary of what you shipped today, built from GitHub and your tracker.

> 💡 The builders start with a **"Configure for your project"** table: test commands, default branch and so on. Fill it in once, or ask your agent to.

---

## Hooks

Skills are instructions, and agents sometimes skip instructions. **Hooks are code that blocks the action.** They're for Claude Code; wiring is in [`hooks/README.md`](hooks/README.md).

| Hook | Stops | Born from |
|---|---|---|
| `claim-guard` | "Tests pass" with no output to prove it | Agents passing off a helper's test results as their own |
| `pr-claim-review` | PR descriptions that don't match the diff | It caught "removed everywhere" when the item was still in a side panel |
| `ci-push-guard` | Pushing before local CI passes on that commit | A PR that needed four follow-up fixes |
| `main-ci-gate` | Merging while main's CI is red | One day: 25 merges, 15 cancelled and 4 failed CI runs |
| `heavy-job-lock` | Agents running lint and test jobs in parallel | 6 parallel lint runs, load at 51 on 15 cores |
| `no-ai-attribution` | AI co-author lines in commits and PRs | Teams that want a clean history |

The repo-specific hooks stay **off until you name your repos** in their environment variables.

**Rough edges:** `claim-guard` also fires on quoted examples. Use its escape token when you're quoting.

---

## Rules

[`rules/CLAUDE.md`](rules/CLAUDE.md) holds always-on habits. The main ones:

- Tag every claim **`[V]` verified** (with proof) or **`[I]` inferred** (with what would check it).
- **Pushback isn't evidence.** "Are you sure?" means re-check, not fold.
- Ask the blocking questions **up front**, each with a default.
- **Reviews go to a fresh agent**, never the one that wrote the code.

Install with `./install.sh --rules`, or paste it into your `AGENTS.md` / `GEMINI.md` / Cursor rules.

---

## More

- **Pairs well with:** superpowers, three.js, motion design and other skills, all linked in [`THIRD_PARTY.md`](THIRD_PARTY.md).
- **Contributing:** PRs welcome. A new skill should come from a failure you actually saw and include one real example. No project-specific names.
- **License:** MIT. `anti-sycophancy` is adapted from [mskadu/opencode-agent-skills](https://github.com/mskadu/opencode-agent-skills) (MIT).
