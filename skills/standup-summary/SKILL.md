---
name: standup-summary
description: Build a verified, plain-English standup summary of what the user did in a given window (default: today). Pulls PRs from GitHub and issue activity from the issue tracker (Linear in the examples) and verifies every item before including it. Use whenever the user says "standup", "my standup update", "what did I do today", "what did I do this week", "what did I ship", "summary of my PRs", "summary of my tickets", "recap my work", or asks for a status update of their own recent activity, even without the word summary.
---

# Standup Summary

Produce a standup-ready recap of the user's work in a time window (default: today, per the session's current date). It is very short, roughly eight one-sentence lines in total. Two things make this different from a naive "list recent PRs and tickets" pass:

1. **Every item is individually verified before inclusion**: a changed `updatedAt` timestamp is a lead, not proof of work.
2. **Nothing questionable makes it into the output**: no "excluded" section, no footnotes about noise. If it doesn't verify, it's gone, silently.

## Configure once

Fill these in for your setup (or keep them in your agent's memory / CLAUDE.md):

```
GITHUB_USER   = <your GitHub login>          # e.g. from: gh api user --jq .login
TRACKER       = Linear                       # or Jira, GitHub Issues, ...
TICKET_PREFIX = <your ticket key, e.g. ENG>  # how tickets appear in PR titles/bodies
```

The examples below use Linear's MCP tools (`list_issues`, `get_issue`, `list_comments`). For another tracker, use its equivalent: list my issues updated in the window, then read each issue's state history and comments.

## Why verification matters

Trackers bump `updatedAt` for reasons that have nothing to do with the user doing something that day, background sync, a triage reindex, someone else touching a related field. Taking that timestamp at face value produces a standup update that claims credit for days-old work or, worse, work that never happened (e.g. a ticket that just got moved to "In Review" because someone independently verified an old fix, not because the user shipped anything). Standups are read by other people; a wrong claim here is worse than a missing one.

## Step 1: Gather raw candidates

Use the configured `GITHUB_USER`. Do not guess a username from the user's name or email, a wrong one returns `The listed users cannot be searched` and costs a round trip. Confirm with `gh api user --jq .login` if the search comes back empty or errors.

```bash
gh search prs --author <github-user> --updated ">=<window-start>" \
  --json number,title,url,state,updatedAt,repository -L 50
```

```
list_issues(assignee: "me", updatedAt: "-P1D")   # or appropriate ISO-8601 duration for the window
```

Treat both lists as unverified candidates only.

## Step 2: Verify every PR

For each PR, fetch the full body (not just the title), `gh pr view <n> -R <repo> --json title,state,body,closingIssuesReferences`. From the body, work out:

- What actually changed, in plain language, what a user would have experienced before vs. after. Skip implementation nouns (function names, internal helpers) unless there's genuinely no way to describe the change without one.
- Which ticket it belongs to (`Fixes ENG-123`, a title prefix, or `closingIssuesReferences`). A PR with no discoverable ticket link still counts, just group it under an "Other" bucket rather than dropping it.

Multiple PRs on the same ticket (a split PR stack, a follow-up fix, a superseded/closed attempt) collapse into **one bullet** for that ticket, the standup listener cares about the ticket's story, not the PR count. Keep the extra PRs' changes only as a trailing clause on that same line, and only when a listener would act differently for knowing them. Never as sub-bullets.

## Step 3: Verify every tracker ticket

This is the step most likely to be skipped under time pressure, don't skip it.

For every ticket whose `updatedAt` falls in the window, call `get_issue` and inspect `stateHistory` and (if the state history alone doesn't explain it) `list_comments`:

- **Include** the ticket only if a state transition's `startedAt`/`endedAt` falls inside the window, OR a comment was posted inside the window, OR it's linked to a PR merged/opened inside the window.
- **Silently drop** the ticket if `updatedAt` is the only signal in-window and `stateHistory`/comments show nothing happened then. Do not mention it, list it, or flag it as excluded, the standup listener should never see it existed as a candidate. (This is the exact failure mode that prompted building this skill: tickets showing a same-day timestamp with zero actual same-day activity.)
- If a comment inside the window explains that the fix was **already shipped by someone else** and the user only reviewed/confirmed it, that's real activity, but describe it as "verified/reviewed", never as "fixed" (the user didn't write the fix).
- A ticket created fresh inside the window with no fix yet is real activity too, describe it as **found/filed**, not as a completed fix.

## Step 4: Write the output

Three sections, in this order, with a `Standup, <Day> <DD Mon>` heading above them. Skip any section that has nothing in it.

```
Standup, <Day> <DD Mon>

**Done**
- <one short sentence: the end state, in plain words> (ENG-123)

**Work in progress**
- <one short sentence: what it does and how far it got> (ENG-123)

**Needed from others**
- @Name, <one short sentence: what you are waiting on them for>
```

Length is the point. A whole standup is roughly 8 lines and reads aloud in under a minute. Worked example of the target density:

```
**Done**
- CSV export keeps the column order the user picked (ENG-101).

**Work in progress**
- Profile page with notification settings. PR open (ENG-102).
- Reset-password endpoint, backend. PR open (ENG-103).

**Needed from others**
- Five PRs open, no reviewer. Order: #101, #102, #103 frontend; #41, #42 backend.
```

- **Done**: merged, shipped, or otherwise finished in the window.
- **Work in progress**: started but not finished: PRs open and unmerged, research done but plan not approved, a fix written but not landed. Anything not finished belongs here, never in Done.
- **Needed from others**: blocked items and open asks, one line each, named person first with an `@`.

Rules for the writing itself:
- **One line per item, one sentence, about 15 words.** Hard ceiling 25. Not one line per PR, one line per ticket. No sub-bullets anywhere, ever.
- **Cut, don't pack.** Shorten by dropping detail, never by cramming clauses into the same line. If a line needs a semicolon or a second sentence to survive, the extra half is detail the standup does not need.
- Say the end state only. Skip the before/after contrast, the reason, the mechanism and the verification. Those belong in the PR body, which is where anyone who asks a follow-up will be pointed. Use a short "used to X, now Y" only when the end state alone is meaningless without it.
- Ticket reference goes in bare parentheses at the end, `(ENG-104)`, not as a markdown link, and no GitHub PR links, unless the user explicitly asks for links this time.
- Plain, simple words, describe user-facing behavior, not code. The reader learns from this; don't make them decode jargon. ("the popup disappeared before showing an error" beats "the toast unmounted before the catch block fired.")
- **Needed from others**: when several open PRs are waiting on the same thing, that is one line naming the count and the review order, not one line per PR.
- An item with no ticket still gets its line, just leave the parentheses off.
- No meta-commentary about the verification process, no "excluded X for being noise" section, no confidence caveats. The output is just the clean, true story of the window.
- A ticket found/filed but not fixed goes under Work in progress, clearly marked as filed, not among the Done items.
- If the user hands over extra items of their own (non-code work, things waiting on teammates), sort them into these same three sections rather than appending them at the bottom.

## Step 5: Sanity pass

Before handing back the summary, re-scan it once for these failure modes specifically: (a) any ticket in the output whose evidence is *only* an `updatedAt` bump, pull it if so; (b) any PR described in jargon a non-engineer standup listener wouldn't follow, rewrite in plain terms; (c) anything unfinished sitting under **Done**, move it to Work in progress; (d) any line over 25 words, carrying a semicolon-joined second thought, or explaining why, cut it back to the end state; (e) any sub-bullet, fold it into its parent line or drop it.

## Step 6: The follow-up "what is each one?"

The standup output groups by ticket and says almost nothing about individual PRs. A common follow-up is "explain each", "what is what", or "I don't know what these are". That answer has its own fixed shape, go straight to it, do not start long and get trimmed down over three rounds.

```
**Done**
- **#110**: a tripwire that stops the codebase getting messier than it is today.
- **#112**: the search box stopped losing its text when the results reloaded.

**Still open**
- **#111**: a photo of every page, so the next change can be checked against it.
- **#113/#114**: ran the tool across the app. Unused styles cut by about two thirds.
```

- Two headings only: what is finished, what is still open. No third section.
- One line per PR. PR number in bold, an em dash, then **one** sentence.
- PRs doing the same job share a line, `#113/#114/#115`, not three near-identical lines.
- Drop the ticket IDs here. They earn their place in the standup itself, not in an explainer.
- No file names, no class names, no library names, no function names. If a line cannot survive without one, the line is wrong, say what a person using the app would notice instead.
- Numbers only when the number is the point ("cut from 2,400 to 700"). Otherwise cut them.
- Say what someone would notice, not what the code does. "the team list stopped flashing blank" beats "removed an unconditional setLoading call".
- For a PR that changes nothing visible (an engine swap, a refactor, a test-only change), say that plainly: "swapped the styling engine underneath, nothing looks different."
