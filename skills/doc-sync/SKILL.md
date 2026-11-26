---
name: doc-sync
description: Keep docs true after a code change. Finds every product doc, agent-context note (AGENTS.md, CLAUDE.md, docs/) and agent memory that cites the changed files, has one agent update them, has a second independent agent check the result against the code, and loops until the checker finds nothing (at most 2 rounds). Use whenever a branch changes behaviour, labels, access, routes or side effects, or moves, renames or deletes files - before review, so the docs ride in the same PR. Runs inside plan-contract (verify), the feature builders, bugfix-loop and ship-pr. Also use for "update the docs", "docs are stale", "sync the docs".
---

# Doc sync

Docs that describe what the product does, and agent-context notes that hold
build rules and engineering notes, go stale the moment code moves. Stale
context misleads agents worse than none. This skill runs on branches that
change behaviour or move, rename or delete files, before review, so the docs
ride in the same PR. Pure refactors that touch no cited file need nothing.

Docs work best for this when they cite code with stable receipts like
`path/to/file.ts#SymbolName` (no line numbers). If yours do not yet, start
doing it in the docs you touch; the find step below gets more precise as they do.

## Configure for your project

| Placeholder | Meaning |
|---|---|
| `<doc dirs>` | Product and agent docs, e.g. `docs/ AGENTS.md CLAUDE.md` |
| `<memory dir>` | Your agent's memory folder, if it keeps one |
| `<docs check>` | A script that fails on dead paths in docs, if you have one |

## 1. Find the targets

From the branch's worktree:

```bash
git diff --name-only origin/<default branch>...HEAD > /tmp/changed.txt
# docs that cite each changed file (by path or by basename)
while read f; do
  echo "== $f"; grep -rlF -e "$f" -e "$(basename "$f")" <doc dirs> <memory dir> 2>/dev/null
done < /tmp/changed.txt
```

Output: docs that cite each changed file, changed files no doc cites (a new
surface: decide which doc owns it, if any), and memories naming them. No
changed code files: stop, nothing to do.

Multi-repo products: if the product docs live in another repo, update them in
the paired PR there, or open a small docs branch and ship it beside the code PR
(the docs PR merges after the PR it describes).

## 2. Update (one updater per repo)

Brief, verbatim apart from the lists:

> Docs-only. Update these docs so they match the code on this branch: <docs with their cited files>. Read each file's diff (`git diff origin/<default branch>...HEAD -- <path>`); many hunks change nothing a doc says, skip those. For a relevant change, rewrite the row or sentence from the new source: label, behaviour, condition, who sees it, route, what it writes, side effects. Add new elements fully; delete rows for elements that are gone. Keep each doc's conventions: receipts as path#Symbol, no line numbers, plain words. Agent-context notes: fix only statements the change makes false, keep engineering notes, never paste product behaviour (link the product doc instead). Return the rows changed per doc.

## 3. Check (a different agent, never the updater)

> You check docs another agent just edited. Assume mistakes. For every changed row, open the receipt and the code around it: the code must clearly prove the whole claim. Then read the branch diff yourself and list any user-facing change no doc reflects yet. Fix nothing. Return wrong rows and missing items, each with path#Symbol proof.

## 4. Loop

Findings go back to the updater (the same per-repo updater, or a fresh one with
the findings), then a fresh checker. Stop when a checker returns nothing. At
most 2 rounds; still dirty after 2: list what is left in the PR body and tell
the owner.

## 5. Memories

For each memory the finder listed, read it. A memory that states something the
change made false: update it (or delete it if the whole point is gone) and fix
its index line. Never carry a memory's claim into a doc without checking the
code.

## 6. Gate

If `<docs check>` exists it must pass, and it is the check for path existence:
checkers need not re-verify that a cited path exists, only that the code proves
the claim. Receipts for unmerged code in another repo can use a PR prefix
(e.g. `api#123:`) and be skipped by that check.

Commit the doc edits as their own commit on the branch ("Update docs for
<change>"), before review and local CI.
