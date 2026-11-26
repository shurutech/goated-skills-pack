# Hooks

Claude Code [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) that turn
rules the model tends to forget into checks at the tool boundary. A rule in
CLAUDE.md is advice; a hook that exits 2 blocks the call and shows its message
to the model, so nothing said later in the conversation can talk it out of it.

All hooks are plain Node (no dependencies) and fail open: bad input, a missing
`gh`, or a repo they are not configured for means exit 0 and no effect.

| Hook | Event | What it does | Why |
|---|---|---|---|
| `claim-guard.js` | Stop | If the final message says "tests pass", "build succeeds", "lint is clean" or "verified it works" and no matching command ran since the last edit, blocks once and asks for the command's output or an explicit `[I]` (inferred) tag. | Confident "it works" with nothing run behind it is the most common false claim an agent makes. |
| `no-ai-attribution.js` | PreToolUse (Bash) | Blocks `git commit`, `gh pr create/edit`, releases and issue comments that carry `Co-Authored-By: Claude`, `Generated with Claude Code` or an `@anthropic.com` author. | For teams that don't want AI attribution in history. A preference in CLAUDE.md can be overridden by a later system message; this can't. Skip it if you want attribution. |
| `pr-claim-review.js` | PostToolUse (Bash) | After a PR is created (or its body edited), blocks once and tells the agent to spawn a fresh-context subagent that audits every claim in the PR body against the diff (the `verify-claim` skill's PR mode). | PR bodies drift from their diffs: "frontend only" with a migration in it, "tests pass" with no run. A reviewer that did not write the PR catches it. |
| `ci-push-guard.js` | PreToolUse (Bash) | In repos you list, refuses `git push` / `gh pr create` unless a full local CI run passed on the exact HEAD (a stamp written by `bin/ci-local-stamp.sh`). | "Push and see if CI passes" wastes CI minutes and reviewer attention. Green locally first. |
| `main-ci-gate.js` | PreToolUse (Bash) | In repos you list, refuses `gh pr merge` while the default branch's latest CI run is still running or red; re-triggers a cancelled run. `MAIN_FIX=1 gh pr merge ...` lets the fix for a red main through. | When CI cancels in-flight runs on each push, rapid merges leave a red main that can't be traced to one PR. One merge per CI result. |
| `heavy-job-lock.js` | PreToolUse (Bash) | Under the paths you list, refuses test runs, lint, typecheck, builds and husky commits unless they go through `bin/with-lock.sh` (a machine-wide FIFO lock). | Several agent sessions running heavy gates at once can push a laptop into swap until everything times out. |

`bin/` holds the shell helpers the last three need:

- `with-lock.sh <name> <command...>` runs a command under a named, re-entrant, first-come-first-served lock shared by every session on the machine.
- `lock-lib.sh` is the lock implementation it sources.
- `ci-local-stamp.sh <command...>` runs your full local CI command on a clean commit (under the lock) and stamps HEAD on success, so `ci-push-guard.js` lets the push through.

## Install

```bash
mkdir -p ~/.claude/hooks
cp hooks/*.js ~/.claude/hooks/
cp -R hooks/bin ~/.claude/hooks/
chmod +x ~/.claude/hooks/bin/*.sh
```

Then add the hooks you want to `~/.claude/settings.json` (or a project's
`.claude/settings.json`). Keep only the entries you want:

```json
{
  "env": {
    "CI_PUSH_GUARD_REPOS": "my-org/web-app",
    "MAIN_CI_GATE_REPOS": "my-org/web-app",
    "HEAVY_JOB_LOCK_PATHS": "/projects/web-app"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node \"$HOME/.claude/hooks/no-ai-attribution.js\"", "timeout": 5 },
          { "type": "command", "command": "node \"$HOME/.claude/hooks/ci-push-guard.js\"", "timeout": 10 },
          { "type": "command", "command": "node \"$HOME/.claude/hooks/main-ci-gate.js\"", "timeout": 10 },
          { "type": "command", "command": "node \"$HOME/.claude/hooks/heavy-job-lock.js\"", "timeout": 5 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node \"$HOME/.claude/hooks/pr-claim-review.js\"", "timeout": 10, "statusMessage": "Checking PR claims..." }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node \"$HOME/.claude/hooks/claim-guard.js\"", "timeout": 10, "statusMessage": "Checking claims..." }
        ]
      }
    ]
  }
}
```

## Configuration

Set these in the `env` block of `settings.json` as above, or export them from
your shell profile before starting Claude Code. Every repo/path guard is off
until you name what it should guard.

| Variable | Used by | Default | Meaning |
|---|---|---|---|
| `CI_PUSH_GUARD_REPOS` | ci-push-guard | empty (off) | Comma-separated substrings of the `origin` URL to guard. |
| `CI_LOCAL_CMD` | ci-push-guard | `~/.claude/hooks/bin/ci-local-stamp.sh <your full local CI command>` | What the block message tells the agent to run. Set it to your real command. |
| `MAIN_CI_GATE_REPOS` | main-ci-gate | empty (off) | Comma-separated substrings of the repo (`owner/name` or `origin` URL) to gate. |
| `MAIN_CI_WORKFLOW` | main-ci-gate | `ci.yml` | Workflow file of the default branch's CI. |
| `MAIN_BRANCH` | main-ci-gate | `main` | Default branch name. |
| `HEAVY_JOB_LOCK_PATHS` | heavy-job-lock | empty (off) | Comma-separated path substrings to police (matched against cwd and command). |
| `HEAVY_JOB_LOCK_NAME` | heavy-job-lock | `heavy-jobs` | Lock name to queue on. |
| `WITH_LOCK` | heavy-job-lock | `~/.claude/hooks/bin/with-lock.sh` | Path shown in the block message. |
| `CI_LOCK` | ci-local-stamp.sh | `heavy-jobs` | Lock the local CI run holds. |
| `LOCK_DIR` | lock-lib.sh | `~/.claude/locks` | Where lock and queue files live. |
| `VERIFY_CLAIM_SKILL` | pr-claim-review | `~/.claude/skills/verify-claim/SKILL.md` | Path the reviewer subagent is told to read. |

`claim-guard.js` has an escape hatch: if a message quotes an example claim
rather than asserting it, include the literal token `[claim-guard: quoting]`.
It blocks at most once per message, so it can never loop.

## Test a hook by hand

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"npx vitest run"},"cwd":"/projects/web-app"}' \
  | HEAVY_JOB_LOCK_PATHS=/projects/web-app node ~/.claude/hooks/heavy-job-lock.js; echo "exit $?"
# exit 2 = blocked (message on stderr), exit 0 = allowed
```
