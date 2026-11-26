# Research routine: web-search conventions before designing and before building

Every feature gets a web search for how others solve it, both the design and
the implementation. "Web search conventions" is the most common thing an owner
says after rejecting a round; this routine makes it happen first.

Run it as two parallel subagents (web search), each with a 40-line report cap.
Save both reports to the module's `RESEARCH.md` so a later session and the implementers reuse
them instead of searching again.

## A. Design conventions (before variants)

Search the problem class, not our app. For the surface being built:

- How 4 to 6 products in the same space handle it: direct competitors, the
  general-purpose tools your users also live in (Linear, Notion, Asana,
  Basecamp), plus whatever the feature's own category leader is (Calendly for
  booking, Stripe for billing).
- Established patterns and their names (master-detail, action rail, command
  palette, inline edit, empty-state onboarding) and when each one fails.
- Accessibility pattern from the WAI-ARIA APG for the widget (dialog, tabs,
  listbox, drag and drop, combobox).

Report: one line per product (what they do, link), the 3 to 5 patterns that
recur, and which of them fit what the API actually returns. Each of the 5
variants names the convention it follows. A variant that follows none needs a
reason in the artifact notes.

## B. Implementation conventions (before the plan, and in every implementer brief)

For the libraries actually installed (read `package.json` / `pyproject.toml`
first and search for those versions):

- The library's own docs for the pattern, at the installed version (for
  example Next.js, React, TanStack Query, Tailwind, FastAPI, SQLAlchemy,
  Alembic), not blog posts first.
- Known pitfalls: GitHub issues, changelogs and breaking changes for that
  version; hydration, prerender, focus management, optimistic updates, race
  conditions, N+1 queries, migration locking.
- What a minimal correct implementation looks like, so the over-engineering
  review has something to compare against.

Report: the recommended pattern with a link, the pitfalls that apply here, and
anything that contradicts how the repo already does it (flag, do not silently
follow either side).

## Rules

- Search classes of problem, not repo facts. Where a symbol lives or what a
  local helper does comes from the code, never a search.
- A search result is inferred (`[I]`) until checked against the installed package or a
  real run. Cite what the page said, with the link.
- The repo's own approved pages still win over a competitor: research decides
  between options, it never overrides `what-the-owner-looks-for.md` or the
  standing rules.
- Skip B for pure copy or colour tweaks. Skip both for a one-line fix.
