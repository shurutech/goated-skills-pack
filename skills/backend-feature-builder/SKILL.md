---
name: backend-feature-builder
description: Builds, extends or fixes backend API features end to end (reference stack Python, FastAPI, SQLModel/SQLAlchemy, Alembic, Postgres; adapt to yours) - branch, orient, reuse the existing service, schema and error layers, decide honestly whether a migration is needed, keep every query tenant-scoped and role-aware with a cross-tenant test, plan to the plan-contract standard, implement, prove it with lint, types, tests and a real authenticated request, doc-sync, review, local CI and the PR. Use when asked to add or implement a backend endpoint, service, model, migration, worker or integration, change API behaviour, fix a backend bug, or refactor backend code. Plan words ("plan", "explain", "what do you think") get a plan and a stop, not code. Open-ended asks go through issue-intake first.
---

# Backend Feature Builder

In a multi-tenant API, "looks done" and "is done" diverge in three places: a
query that forgot its tenant (`organization_id`) filter, a role gate that was
never threaded through, and a migration that should not exist. This skill
closes those three gaps, then runs the shared pipeline. Think first, keep the
diff surgical. Check memory / AGENTS.md for project conventions (how to push,
comment preference).

## Configure for your project

The reference stack is FastAPI + SQLModel on SQLAlchemy 2 async + Alembic +
Postgres + pytest + ruff + mypy. **Adapt the gate commands to your stack** and
record them in your repo's `AGENTS.md` / `CLAUDE.md`.

| Placeholder | Meaning | Reference-stack example |
|---|---|---|
| `<lint>` | Lint + format on touched paths | `uv run ruff check <paths> && uv run ruff format --check <paths>` |
| `<types>` | Type check on touched paths | `uv run mypy <paths>` |
| `<tests>` | Full test suite | `uv run pytest` (redirect long output to a file and read the summary) |
| `<migrate>` | Migration commands | `alembic current`, `alembic upgrade head`, `alembic downgrade -1` |
| `<run server>` | Local server for a real request | `uvicorn app.main:app` or your container |
| `<design rules>` | Hard rules reviewers enforce | `docs/design-rules.md` |
| `<schema patterns>` | Model/migration conventions | `docs/schema-patterns.md` |
| `<adr log>` | Architecture decision records | `docs/adrs.md` |
| `<tenant column>` | The column every business query filters on | `organization_id` |

## Start gate

- Plan words in the ask ("plan", "explain", "what do you think", "how would
  you") mean: write the plan (plan-contract standard) and stop. No branch, no
  edits.
- Open-ended or ambiguous (new module, several reasonable shapes): go through
  `issue-intake`, which asks the blocking questions once and settles the design,
  before this skill builds.
- Well-scoped (described bug, one more field on an existing endpoint): continue.

## 0. Branch

Never build on the default branch. `git status` first; uncommitted changes you
did not make: stop and ask. Pull the default branch fresh, then cut
`feat|fix|refactor/<short-slug>` (a tracker-suggested branch name is used
exactly). This branch is backend only; a frontend change is its own branch and
PR, and the backend lands first.

## 1. Backend-specific orient

Pipeline step 1 applies. Always open `<design rules>`, then only the module or
integration doc the task touches. Open `<adr log>` when a core table is involved
and `<schema patterns>` before writing any model. Identify where the auth
context dependency, the DB session dependency and the domain error classes live
and where the module's router is mounted. Version facts come from the lockfile
and installed source, not memory (see `references/conventions.md`).

## 2. Reuse specifics

Pipeline step 2 applies. Search the module's own service layer first (most
"new" reads are an existing function plus a filter argument). Then the shared
layer: mixins, the base outbound API client, shared enums, pagination and
envelope schemas, the cache helper, and the error module. Domain errors
subclass the base app error with a stable `code` and `status_code`; a bare
framework error (`HTTPException`) bypasses the envelope the frontend depends
on. A copy of a query usually drops a security filter the original had.

## 3. Schema gate

Answer these out loud before touching a model.
1. Does this need a schema change at all? A JSONB extension column, a computed
   response field or a filter on existing columns needs no migration. Do not hide
   structured, queried data in JSONB to dodge one.
2. Can an in-flight migration absorb it? Check the head revision, the versions
   directory and `git log` for unmerged migrations on the branch; a change to the
   same table belongs in that migration (unless it already ran on a shared
   environment: then add a new one and say why).
3. Is it a core table? Any column, index or constraint change needs an ADR in the
   same change as the migration and model edit.
4. Is it an append-only catalog? Codes that ship in stored snapshots are never
   deleted; retire by marking inactive.
5. Do model and migration agree on partial-unique indexes, server defaults and
   nullability? Declared in both or it is a bug.
Patterns and migration safety: `references/alembic-and-schema.md`.

## 4. Plan

`plan-contract` standard, size S, M or L (any query, endpoint, permission,
migration, delete or rename is M at least): requirements table in the owner's
words, out of scope, reuse with paths, file list, contract, tests up front,
cards with an "Also touches" line, decisions, gate. The impact list (callers,
wire contract, workers, admin views, permission catalog, effect on existing
rows) goes under Contract. Open questions were asked up front at intake.

## 5. Implement (layering and tenant scope)

Follow `../_shared/build-pipeline.md` from step 3, with these stack rules.

- `router.py` is thin: route, `response_model`, dependencies, one service call,
  commit, return. No `select()` in a router.
- `service.py` owns logic and queries; it takes the session and the caller's
  scope explicitly. A service never commits; the route owns the commit.
- `schemas.py` owns the wire: separate Create, Update and Read shapes; never an
  ORM model on the wire.
- `models.py` owns the table, mixins in the project's declared order.

### Tenant-scope checklist (not skippable, not delegable)

Every item is checked for every query in the diff, by you, before verification:
- [ ] every query on a business table filters on the caller's `<tenant column>`,
      even where a foreign key "should" constrain it (the mixin guarantees the
      column, the service guarantees the filter);
- [ ] every list query on a soft-deleted table excludes deleted rows, and the
      tenant + soft-delete filter lives in one base-query helper, not retyped;
- [ ] the caller's role and user id are threaded into every domain read, with the
      project's visibility rule and the status code the design rules specify
      (some endpoints return 404, not 403, so ids cannot be probed);
- [ ] a detail-by-id read of another tenant's record is indistinguishable from a
      record that does not exist;
- [ ] response models expose only fields that should leave the API;
- [ ] a path that legitimately skips the role rule (a webhook with no caller)
      says so at the call site.

Comments: follow the repo's rule. Never strip existing comments you did not
touch. Language and framework specifics (async, errors, Pydantic, typing,
security, commands): `references/python-fastapi-standards.md`; pinned-version
notes: `references/conventions.md`.

## 6. Verify

Pipeline step 4 applies; the backend hands-on check:
- `<lint>` and `<types>` scoped to the paths you touched. If the repo carries a
  lint or strict-typing backlog, files clean before must be clean after. Say
  which you ran and on what.
- A real authenticated request against `<run server>`: sign in, call the route,
  read the response body, and confirm the route mounted via the live OpenAPI
  schema (`/openapi.json`). For side effects, query the database and confirm
  the rows.
- The verifier's checklist includes the tenant-scope items above (named lines),
  the role threading, wire leaks, callers of changed service functions, and for
  a migration whether the model matches and the downgrade reverses the upgrade.

## 7. Tests (mandatory cases)

Pipeline step 5 applies. For any endpoint that reads or writes a business table
these are never skipped, because they fail silently in production:
- **Cross-tenant isolation**: a second tenant's client cannot read, update or
  delete the record, on both the list and the detail-by-id endpoint.
- **Role boundaries**: each role that should be refused has a test asserting the
  refusal with the specified status code.
- **Unauthenticated**: no token returns 401, not 500.
- Validation failures, and the empty and soft-deleted cases for lists.
- A migration: `upgrade head`, `downgrade -1`, `upgrade head`, data intact.
Fixtures and commands: `references/testing-setup.md`.

## 8. Docs and decisions

Run `doc-sync` per the pipeline. Additionally in the same change: an ADR for a
decision on a core table; the module doc for a contract change;
`<schema patterns>` for a schema-shaped pattern; the backlog for what you could
not handle. A new docs file gets its index row. If product docs live in the
frontend repo, use the paired frontend PR or a small docs branch.

## 9. Local CI (pipeline step 8)

After the last edit: `<tests>` plus any extra CI-only checks your workflow file
runs (complexity rules, schema checks). Full lint/types only on touched typed
code if the repo has a backlog. Migration heads must be single; re-point
`down_revision` if the default branch moved.

## Quality bar

Each is checked or stated plainly as unchecked:
- branch cut from a freshly pulled default branch; design rules and module doc read
- reuse audited; schema gate answered; ADR written if a core table is involved
- tenant-scope checklist complete; role and user context threaded
- real authenticated request made and its body read
- verifier confirmed tenant-scope, role and migration claims
- every requirement row has its named test run green, including cross-tenant and
  role refusals
- pre-existing breakage reported separately; docs synced; PR sized for review
