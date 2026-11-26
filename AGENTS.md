# AGENTS.md: guide for AI agents adopting this pack

You are an AI coding agent and someone pointed you at this repo. This file tells you how to install the pack into the harness you run in, how to adapt it to the user's project, and which pieces to suggest for which problem. Read this file in full before you change anything.

## What is here

| Path | What it is | Format |
|---|---|---|
| `skills/<name>/SKILL.md` | One skill: YAML frontmatter (`name`, `description`) and a markdown procedure. Optional `references/`, `modes/` and `scripts/` sit next to it and are loaded when the skill asks for them. | Agent Skills format (Claude Code, and any harness that reads `SKILL.md`) |
| `skills/_shared/` | Briefs and the build pipeline used by the builder skills. Install it next to the skills; they link to it with `../_shared/...`. | Markdown |
| `rules/CLAUDE.md` | Always-on working rules: evidence-tagged claims, asking questions up front, fresh-context review. | Markdown, works as `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules` and similar |
| `hooks/` | Claude Code `PreToolUse`/`PostToolUse` guard scripts (Node) and their shell helpers in `hooks/bin/`. | See `hooks/README.md` |
| `install.sh` | Copies or symlinks the above into `~/.claude` or `./.claude`. | Bash |

## Skill index

Use this table to pick skills. The `description` field in each `SKILL.md` is the trigger text: a harness that auto-loads skills matches the user's words against it.

| Skill | Load when | Depends on |
|---|---|---|
| [`anti-sycophancy`](skills/anti-sycophancy/SKILL.md) | The user asks for an honest opinion or a review, or pushes back on an answer | none |
| [`verify-claim`](skills/verify-claim/SKILL.md) | Someone asks "are you sure?" or "check that again", or a PR's description needs checking against its diff | none (works best with subagents) |
| [`issue-intake`](skills/issue-intake/SKILL.md) | Any code-change request, before you create a branch or a ticket | routes to the skills below |
| [`plan-contract`](skills/plan-contract/SKILL.md) | The change is medium or large: touches queries, endpoints, permissions, migrations, deletes or renames | `_shared/` |
| [`frontend-feature-builder`](skills/frontend-feature-builder/SKILL.md) | You are building or fixing frontend features (reference stack: Next.js, React, TanStack Query) | `plan-contract`, `doc-sync`, `_shared/` |
| [`backend-feature-builder`](skills/backend-feature-builder/SKILL.md) | You are building or fixing API features (reference stack: FastAPI, SQLModel, Alembic) | `plan-contract`, `doc-sync`, `_shared/` |
| [`bugfix-loop`](skills/bugfix-loop/SKILL.md) | "Fix my assigned bugs" or "next ticket" (Linear, Jira, GitHub Issues) | a builder skill; tracker access |
| [`module-loop`](skills/module-loop/SKILL.md) | Redesigning one area of a web app, or making it responsive | a browser tool, `plan-contract` |
| [`doc-sync`](skills/doc-sync/SKILL.md) | A change altered behaviour, routes or file names, and the docs may now be stale | none |
| [`commit-review`](skills/commit-review/SKILL.md) | "Explain this commit" or "was this change necessary?" | git |
| [`ship-pr`](skills/ship-pr/SKILL.md) | Only when the user types `/ship-pr`: review, run local CI, open PRs, merge | `gh` |
| [`standup-summary`](skills/standup-summary/SKILL.md) | "What did I do today?" | `gh`, tracker access |

## Install, by harness

**Claude Code**
```bash
git clone <this repo> && cd <repo>
./install.sh                 # all skills into ~/.claude/skills
./install.sh --project       # or into ./.claude/skills of the current repo
./install.sh --hooks --rules # optional: guard hooks + always-on rules
```
`--link` symlinks the files instead of copying them, so `git pull` updates the installed copies. In copy mode, `git pull && ./install.sh` updates them. `install.sh` overwrites only files it placed itself. If a skill with the same name already exists and this pack didn't install it, the script skips it; tell the user when that happens. With `--project --hooks`, the hooks land in `./.claude/hooks`. Point the `settings.json` commands and the `WITH_LOCK`, `CI_LOCAL_CMD` and `VERIFY_CLAIM_SKILL` variables at that path, because they default to `~/.claude`.

**Codex CLI, Gemini CLI, OpenCode, Cursor, Windsurf, Copilot and other harnesses that read SKILL.md or rules files**
- If the harness supports Agent Skills (`SKILL.md` folders), copy `skills/*` into its skills directory (for example `~/.codex/skills`, `.opencode/skill`, `.agents/skills`).
- If it only supports a rules file, append `rules/CLAUDE.md` to the project's `AGENTS.md`, `GEMINI.md` or `.cursor/rules/*.mdc`. Then add a short "Skills" section that lists the skill index above with each skill's path, and tell the agent to read a skill's `SKILL.md` in full before it does that kind of task.
- The hooks are specific to Claude Code. On other harnesses, carry over their intent as rules instead (for example: "never push without a green local CI run on this exact commit"; "never add AI attribution to commits").

## Adapting to the user's project (do this, don't skip it)

1. **Fill in the "Configure for your project" tables.** Each builder, `doc-sync` and `_shared/build-pipeline.md` opens with a table of placeholders such as `<fast gates>`, `<full local CI>`, `<default branch>` and `<tenant column>`. Find the real values in the user's repo (package.json scripts, Makefile, CI config, pyproject) and write them into the installed copy. Do not guess. If a value can't be found, ask the user once, together with any other open questions.
2. **Swap the reference stack if needed.** The builder skills use Next.js and FastAPI as worked examples, but the method (orient, reuse what exists, verify the contract, plan, implement, prove it, sync docs, review) does not depend on the stack. Rewrite the stack-specific commands and keep the steps.
3. **Point the tracker at the one they use.** `bugfix-loop` and `standup-summary` use Linear as the example. Map them to whatever the user has (Jira, GitHub Issues, and so on) through the tools you can reach.
4. **Turn hooks on per repo.** `ci-push-guard`, `main-ci-gate` and `heavy-job-lock` stay inactive until their environment variables name repos or paths. See `hooks/README.md`.
5. **Leave the procedures intact.** The value is in steps that look skippable: fresh-context review, verifying before you claim something, asking up front. Trim examples, not steps.

## Rules for you while using these skills

- Read a skill's `SKILL.md` in full before you act on it. Load its `references/` files when the skill tells you to.
- Process skills (`issue-intake`, `plan-contract`) run before implementation skills.
- Never invoke `ship-pr` on your own. The user starts it by typing the command.
- Report what you installed and adapted, plus anything you skipped and why.
