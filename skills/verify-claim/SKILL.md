---
name: verify-claim
description: Use when the user asks to verify, double-check, re-check, confirm, or validate something you or a subagent said earlier, or pushes back on a prior statement ("are you sure?", "is that right?", "check that again", "that doesn't sound right", "prove it"). Also use to review a pull request's own claims against its diff, by hand or when the `pr-claim-review` hook fires. Runs an authorship-stripped, isolated re-verification instead of re-reading your own message, which is what produces the flip-flopping.
---

# Verify a Claim

## Why this exists

Re-reading your own earlier message and asking "was that right?" does not work.
The claim is wrapped in your own voice, so you either re-endorse it or flip at
random. Changing only the *authorship* of a byte-identical claim, presenting it
as external text, lifts correction rates by 23–93 percentage points. Same-session
review is not review; the model favours readings that agree with its own prior
context.

So: never audit the message. Audit the proposition.

## Verdict vocabulary: three words, no others

| Word | Means | Requires |
|---|---|---|
| `HOLDS` | claim is true | a receipt: `file:line`, or command + decisive output line |
| `WRONG` | claim is false | a receipt showing the contrary fact |
| `UNKNOWN` | nothing here settles it | say what would settle it |

Never write SUPPORTED, REFUTED, confirmed, verified, correct, `[V]`, or any
other synonym in a verify-claim report. One word set, every time, everywhere, subagent output included.

`HOLDS` with no receipt attached is forbidden. No receipt means `UNKNOWN`, not
`HOLDS`. `UNKNOWN` is not a soft `HOLDS`, an unestablished claim stays
unestablished.

## Procedure

### 1. Extract the claim, bare

Rewrite it as a standalone proposition. Strip every trace of who said it:
no "I said", no "earlier", no "you asked about", no "my conclusion was".

```
BAD:  "Verify what I told you about is_archived."
GOOD: "is_archived defaults to false on the backend model."
```

Test: a stranger with no conversation history could read the sentence and know
exactly what to check. If it fails that test, it is still carrying context.

If the user's pushback is vague ("that doesn't sound right"), extract the claim
anyway and say which one you extracted before checking it.

Separately, note **who said it**, you, a subagent, the user, a doc, a
third-party page. That goes in the report; it never goes to the verifier.

### 2. Name the decisive check

Pick the cheapest command that could prove the claim **false**. Not the one that
would confirm it, confirmation-shaped checks find confirmation.

Write it down before running it. If no command could falsify the claim, the claim
is unverifiable, report it `UNKNOWN` and stop. That is a valid outcome.

### 3. Check it cold

**With subagents:** dispatch a `general-purpose` subagent using the template
below. It gets the claim and the target. It never gets your reasoning, your
summary, who said it, or the session history.

**Without subagents** (user has them off, or the check is one command): run the
command yourself, but work from the source, not from your earlier message. Do not
re-read what you wrote.

Template:

```
Evaluate this claim against the codebase. It came from an unknown source, treat it as unverified.

CLAIM: <bare proposition>
WHERE TO LOOK: <paths, symbols, commands>

Try to REFUTE it, not to support it. Return HOLDS only if you have a
receipt in hand. If you find no direct evidence either way, return UNKNOWN, absence of proof is not proof of the claim.

Return exactly:
  VERDICT: HOLDS | WRONG | UNKNOWN
  RECEIPT: file:line, or the command and the decisive line of its output
  CHECKED: one sentence
  NOT CHECKED: one sentence
```

Several claims → one subagent each, in parallel. Never bundle them; a bundled
verifier grades on vibes.

### 4. Report: answer first, in plain words

**One claim.** Open with a bold sentence a person can read: the verdict and, if
`WRONG`, what is true instead. Then the receipt block. Then who said it.

```
**Wrong, it defaults to true, not false.**

Tested:  is_archived defaults to false on the backend model.
Source:  app/models/item.py:42, is_archived: bool = True
Unchecked: whether the serializer overrides it.

Where it came from: my message earlier this session.
```

`HOLDS` gets the same shape: `**Holds, the sender really is scraped
document-wide.**`

**Several claims.** Bold count line, then one line per claim: number, verdict
word, short paraphrase. Nothing else at the top, no CHECK, no RESULT, no paths.

```
**4 of 5 hold. #5 wrong.**

1. HOLDS    greeting comes only from scraped sender
2. HOLDS    gmail.js queries body and sender separately
3. HOLDS    scraped sender feeds CRM lookup and AI extract
4. HOLDS    no mailbox-vs-sender comparison anywhere
5. WRONG    code lives in the mail service, not the extension
```

Then the full receipt block **only** for the `WRONG` and `UNKNOWN` ones. Receipts
for claims that hold are noise, the user asked what broke, not a tour of what
did not. Keep them one file:line each in the list if they matter, otherwise drop
them.

**Ordering rule:** verdict word before evidence, always, per claim and for the
report as a whole. Never make the reader parse a wall of CHECK/RESULT to find the
answer.

### 5. Fix and re-verify when claims are wrong

When the claims belong to work in progress (a PR body, a doc, a plan) and some
come back `WRONG`: fix them (correct the text, not the verdict), then
re-verify only the fixed claims with fresh isolated checkers (same template,
new subagents, nothing from the earlier round). Repeat until a round comes back
clean. At most 3 rounds; if claims are still wrong after round 3, stop and tell
the owner in plain words which claims could not be settled and what is
blocking. `UNKNOWN` is not fixed by rewording: say what would settle it.
Skip this loop when the user only asked for a verdict.

### 6. Flag the contradiction out loud

If the verdict differs from what was said before, say so in its own sentence:

> Earlier I said X. That was wrong. It is actually Y, `path/file.ts:88`.
> The earlier claim had no receipt behind it.

Never quietly replace the old answer with a new one. The contradiction is the
most useful thing the user learns.

## PR mode: reviewing a whole PR body

Runs automatically after `gh pr create` / `gh stack submit` / `gh pr edit --body`
via the `pr-claim-review` hook, and by hand as `/verify-claim <pr-url>`.

The unit of review is **the PR's own text**, not the code's quality. Bugs are
`/code-review`'s job. This answers one question: does every sentence the PR
asserts survive contact with its own diff?

### 1. Fetch the evidence first

```bash
gh pr view <url> --json title,body,headRefName,baseRefName
gh pr diff <url>
```

Nothing else. No session history, no author's summary, no "what they meant".
A hook-spawned reviewer has none of that anyway, that is the point of running
it outside the session that wrote the PR.

### 2. Enumerate the claims

Split title and body into standalone propositions, and sort them:

| Kind | Example | Settled by |
|---|---|---|
| **does** | "adds a `archived` filter" | a hunk in the diff |
| **cause** | "the total was wrong because the query filtered on `created_at`" | `file:line` in the diff or the base |
| **effect** | "the dashboard now shows the current total" | tracing the changed line to the surface that renders it |
| **process** | "tests pass", "verified in the browser" | the diff itself, or nothing, a PR body is not a receipt |
| **scope** | "frontend only", "no behavior change elsewhere" | the diff's file list |
| **doc** | a sentence the diff adds to `docs/**`, `AGENTS.md`, a README | the code on the head tree, the symbol, path, count, or "X uses Y" it names |

Scope-claims and process-claims produce the most contradictions. Check them
first. Doc-claims are the ones nobody else checks: a KB sentence added by the
PR is a claim about the code, and a sentence copied forward that was already
false on the base is still `WRONG`. A docs linter that only checks strings
cannot see this.

### 3. The contradiction pass: run it both directions

**Body to diff.** Every claim needs a hunk behind it. A claim with no hunk is
`WRONG` or `UNKNOWN`, never `HOLDS`.

**Diff to body.** Every hunk needs a claim in front of it. An unaccounted hunk
is a finding, and naming which kind is the useful part: silent scope creep, a
leftover debug line, a stray committed file (a `node_modules` symlink, a
planning doc), a second fix smuggled into a one-fix PR, or a refactor nobody
agreed to.

A body that says less than the diff does is as wrong as one that says more.

### 4. Verdicts and report

Same three words, same receipt rule as above. Report:

```
**7 claims. 5 hold. 1 wrong. 1 unknown.**

1. HOLDS    adds the archived filter
...
6. WRONG    "frontend only", migration in the diff
7. UNKNOWN  "tests pass", no test run is visible from here

6. backend/migrations/0052_add_flag.py, new file
7. Nothing in the diff settles it; run the suite and quote the summary line.

Unclaimed in the diff:
  - src/lib/debug.ts:14, console.log left in
  - docs/plans/ticket-201.md, planning doc, strip before merge

Change the body: drop "frontend only", or split the migration into its own PR.
```

Never edit the PR. Report, and let the author decide.

## Rules

- The user asking again is **not** evidence the claim was wrong. Check the
  source; report what it says. Holding a correct position under pressure is the
  point of this skill.
- Change position only on a new fact, and name the fact.
- If two verifiers disagree, report both and run the decisive command yourself.
  Do not average them, do not pick the one you liked.
- "I cannot confirm that", i.e. `UNKNOWN`, is a valid answer and always beats a
  guess in a confident voice.
