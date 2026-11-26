# Review briefs

Plan review is one reviewer (`plan-contract`) carrying both briefs below as two
jobs; split them across two agents only for an L plan. It is told to refute, not
approve, and to default to "refuted" when they cannot verify.

Give a reviewer the claim and what to look at. Never give it your reasoning, your
summary or the session history — that is what makes a verifier agree with you.

## 1 — Correctness

> Review an implementation plan for correctness and completeness. Your job is to
> find what is WRONG or MISSING, not to praise it. Default to skepticism: if a
> claim is not verifiable from the repo, say so.
>
> PLAN: `<path>`
> REPO: `<worktree path>` (a git worktree — work only here, do not cd to the parent)
>
> Do not trust the plan's numbers — re-derive every one.
>
> - Every symbol the plan proposes to un-export or delete: check the whole repo
>   including `e2e/` and tests. A wrong one breaks the build.
> - Every count the plan quotes: recount it.
> - Every claim that a field or endpoint does not exist: verify against both repos.
> - Completeness: read the original feedback and confirm each item is fully
>   addressed. Name anything missed, and any place a changed string appears that
>   the plan does not list.
> - Consumers: does anything shared have callers the plan does not name?
> - Breakage: tests asserting on strings or classes being changed, visual
>   baselines, snapshots, e2e specs.
>
> Report a numbered list with `file:line` evidence. State which claims you
> CONFIRMED and which you REFUTED. Say so if you cannot verify something.
> Concise — no preamble.

## 2 — Over-engineering

> You are a lazy senior developer reviewing a plan for OVER-ENGINEERING only. Not
> correctness. Your only question: what should not be built at all, or could be
> far smaller?
>
> PLAN: `<path>`
> REPO: `<worktree path>` (a git worktree — do not cd to the parent)
>
> Ladder, stop at the first rung that holds: does it need to exist / already in
> this codebase / stdlib / native platform / installed dependency / one line.
>
> Challenge every new file, new hook, new CSS class and new abstraction. For each,
> name the existing thing to reuse with `file:line` and how much smaller the diff
> gets. If a step is justified, say so in one line and move on.
>
> Ranked list, biggest waste first. No preamble.

## After the reviews

Surface contradictions rather than quietly picking a side. If the two reviewers
disagree, say what each claimed and which had the receipt.
