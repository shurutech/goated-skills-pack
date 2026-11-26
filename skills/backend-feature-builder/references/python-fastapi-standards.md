# Python + FastAPI standards

> Written from a real multi-tenant FastAPI + Postgres codebase. Names, fixtures, paths and commands are examples: map them to your repo before following them literally.

How to write code in this stack: Python 3.12, FastAPI, SQLModel on SQLAlchemy
2.x async, asyncpg, Pydantic v2, ruff, mypy, pytest. Read this before writing
backend code the first time in a session.

These are the rules that actually catch bugs in this codebase, not a generic
style guide. Where the project's own your design-rules doc says
something different, that file wins — it's the one a reviewer enforces.

---

## 1. Async discipline

The whole app runs on one event loop. Blocking it doesn't slow one request down,
it stalls every concurrent request on the worker. This is the most common way an
LLM-written endpoint becomes a production incident.

**Never block the loop.** Inside any `async def`:

- No `time.sleep()` — use `await asyncio.sleep()`.
- No `requests` — use the async `httpx` client that already exists in the
  project's shared layer.
- No synchronous file reads of anything large, no `subprocess.run`, no CPU-heavy
  loop over thousands of rows. If a library is sync-only and slow, push it into
  `await asyncio.to_thread(...)` or hand the work to the background queue.
- The linter's `ASYNC` rules catch some of this. They don't catch all of it.

**Always await before you return.** A forgotten `await` yields a coroutine
object, and Pydantic will often serialise it into something that looks almost
right. The tell is a response field that's `null` or a string like
`<coroutine object ...>`.

**Don't await in a loop when the calls are independent.** N sequential awaits
cost N round trips.

```python
# Slow: 50 sequential round trips.
for item_id in item_ids:
    results.append(await service.get_item(session, item_id, org_id))

# Fast: one round trip.
stmt = select(Item).where(Item.id.in_(item_ids), Item.organization_id == org_id)
results = (await session.execute(stmt)).scalars().all()
```

For independent *outbound HTTP* calls, `asyncio.gather` is right. For
independent *database* reads, a single query with `IN` or a join is better than
gathering — one session can't run concurrent statements anyway.

**A query inside a loop over rows is the N+1 problem.** If you find yourself
loading a parent list and then fetching each child, use a join or an
`in_()` query and group in Python. On SQLAlchemy relationships, load eagerly
with `selectinload(...)` rather than lazy-loading, which fails outright on an
async session.

**One session, one transaction, one request.** The session dependency does not
auto-commit. The route commits once at the end, after the service work is done.
Inside a service function use `await session.flush()` when you need the row's
generated id, and `await session.refresh(obj)` when you need server-side
defaults back — then let the route own the commit. A service function that
commits on its own takes the decision away from the caller and makes it
impossible to compose two service calls in one transaction.

---

## 2. FastAPI shape

**Routers are thin.** Route function bodies do four things: declare, delegate,
commit, return. Anything else — a `select()`, a business branch, a permission
calculation — belongs in the service.

```python
router = APIRouter(prefix="/settings", tags=["settings"])

DbSession = Annotated[AsyncSession, Depends(get_session)]
ReadSettings = Annotated[CurrentUser, Depends(require_permission("settings.read"))]


@router.get("", response_model=SettingsEnvelope, summary="Get org settings")
async def get_settings(ctx: ReadSettings, session: DbSession) -> SettingsEnvelope:
    settings = await service.get_or_create_one(session, ctx.organization_id)
    await session.commit()
    return SettingsEnvelope.model_validate({"settings": settings})
```

Note the shape worth copying:

- **Dependencies aliased once as `Annotated[...]` type aliases** at module level,
  then reused. Don't repeat `Depends(get_session)` on twelve routes.
- **The permission gate is the type annotation.** The dependency both authorises
  the caller and hands back the auth context, so there is no way to read the
  context without having passed the gate. Prefer that over checking a role
  inside the function body, which is easy to forget on the next route.
- **`response_model` on every route.** It's what stops an internal column
  leaking out when someone adds a field to the model later. A route that returns
  an ORM object with no response model publishes whatever the table has.
- **An explicit return type annotation**, matching the response model.
- **A `summary`** — it's the text in the generated API docs.

**Declaration style.** No `...` as a default for required params or fields, no
`RootModel` (use `Annotated[list[int], Field(min_length=1), Body()]`), router-level
`prefix`/`tags`/`dependencies` on the `APIRouter` rather than in `include_router()`,
one HTTP operation per function, and a function dependency returning an object
rather than `Depends()` on a class. FastAPI is pinned below 0.120: see
`conventions.md` before using any newer API.

**Route ordering matters.** A literal path must be registered before a
parameterised one that could match it, or `/items/summary` gets captured by
`/items/{item_id}` and fails trying to parse "summary" as a UUID.

**Dependencies are the project's dependency injection.** They are how the
request-scoped things — session, auth context, permission gate, rate limiter —
reach the code without globals. When you need a new cross-cutting requirement,
write a dependency rather than a helper call that each route must remember.

**Path and query parameter types do real work.** Declaring `item_id: UUID`
means a malformed id is rejected as a 422 before your code runs. Use
`Query(..., ge=1, le=100)` for bounds instead of validating by hand.

**Status codes are explicit.** A create returns
`status_code=status.HTTP_201_CREATED`. A delete with no body returns 204.

---

## 3. Errors

Raise the project's domain errors, not bare `HTTPException`.

The codebase has a base `ServiceError` with a stable machine-readable `code`, a
`status_code`, and a default `message`, plus registered handlers that render
every one of them into a single response envelope. The frontend switches on
that `code`. A bare `HTTPException` skips the envelope and gives the frontend a
shape it doesn't handle.

```python
class ItemNotFound(ServiceError):
    code = "item.not_found"
    status_code = status.HTTP_404_NOT_FOUND
    message = "Item not found."
```

Rules that follow from this:

- **Check the error module before defining a new class** — the case you need
  usually exists.
- **Codes are stable identifiers.** Renaming one breaks whatever consumes it,
  the same as renaming a response field.
- **Don't leak internals in messages.** No SQL, no stack text, no "user with
  email X doesn't exist" — that last one lets an attacker enumerate accounts.
  Good auth errors deliberately return the same message for
  "no such user" and "wrong password" for exactly that reason.
- **Never `except Exception: pass`.** If you truly must swallow something, catch
  the specific exception and log it with the project's structured logger.
- **Let unexpected exceptions reach the handler.** The global handler logs with a
  request id and returns a clean 500. Wrapping every service call in try/except
  to return a vague error destroys that trail.

---

## 4. Pydantic v2 schemas

**Three shapes per resource, not one.** A create schema, an update schema, and a
read schema. Reusing one model for all three means either the client can set
server-owned fields, or required fields become optional and the type system
stops helping.

**Never put the ORM model on the wire.** Convert through a read schema.

**Partial updates use `exclude_unset=True`**, which is the difference between
"the client didn't mention this field" and "the client set it to null":

```python
update_data = payload.model_dump(exclude_unset=True)
for field, value in update_data.items():
    setattr(settings, field, value)
```

**Validate at the edge, in the schema.** Constraints belong on the field
(`min_length`, `ge`, `EmailStr`) or in a `field_validator`, not as an `if` at
the top of a service function. That way the error is a 422 with a field path
the frontend can attach to an input, and the service can trust its arguments.

**v2 idiom, not v1.** `model_validate` not `from_orm`, `model_dump` not `dict()`,
`model_config = ConfigDict(...)` not a nested `class Config`, `field_validator`
not `validator`. The linter's pyupgrade rules won't catch these; they're a
correctness and deprecation issue.

**Settings come from the settings object, never `os.environ` at call sites.**
One typed, validated place to read configuration means a missing variable fails
at startup rather than at 2am on the one code path that reads it.

---

## 5. Typing

`mypy` is configured strict with the Pydantic plugin. In practice, strict mode
against SQLModel produces a lot of pre-existing noise from SQLAlchemy's
overloads, so treat it as a signal on the files you touched rather than a gate
you must drive to zero repo-wide. Still write as if it were clean:

- **Annotate every function.** Parameters and return type, including `-> None`.
- **`from __future__ import annotations` at the top of every module** — it's the
  house style here and makes forward references work.
- **Modern syntax:** `str | None`, `list[str]`, `dict[str, Any]`. Not `Optional`,
  not `List`, not `Dict`.
- **`Any` is an admission of defeat.** Sometimes necessary at a third-party
  boundary; never for your own domain objects.
- **No `# type: ignore` without a reason attached to it** and a specific error
  code, and never as a way to silence a real mismatch.
- **A `UUID` is not a `str`.** Keeping them distinct in signatures is what
  catches "passed the org id where the user id goes" at check time instead of
  in production. That bug is invisible if both are typed `str`.

---

## 6. Security rules that bite here

The linter runs bandit's `S` rules on application code. The ones that matter:

- **No secrets in source.** Everything through the settings object, which reads
  the environment. Never a fallback default for a key or password in code.
- **No string-built SQL.** Use the query builder, or `text()` with bound
  parameters. Never an f-string with a caller-supplied value in it.
- **No `shell=True`.** Pass an argument list.
- **`random` is not for tokens.** Use `secrets` for anything a user shouldn't be
  able to guess.
- **Don't log secrets, tokens, or full request bodies.** The project has a
  telemetry sanitiser for outbound AI payloads; use the equivalent care
  everywhere. A logged bearer token is a logged credential.
- **Sensitive-at-rest columns use the project's encrypted string type** — OAuth
  tokens, webhook secrets, client secrets. Note you cannot search by an
  encrypted value, so never use it on an identifier you need to query.

The `S101` (assert) and `B008` (`Depends()` in argument defaults) rules are
deliberately disabled — asserts are fine in tests, and `Depends()` in a default
is how FastAPI works.

---

## 7. Clean code and design principles, applied here

The general principles are only useful when they're concrete about this layout.

**Single responsibility, at the file level.** The module layout already encodes
it: `router` for HTTP, `service` for logic, `schemas` for the wire, `models` for
the table, `admin` for the admin panel views. Most "where do I put this" is
answered by that list. When a `service.py` passes a thousand-odd lines, the
resource has grown sub-resources — split those into a sub-package with their own
service and router rather than growing one file forever.

**Dependency inversion, via `Depends`.** The service receives a session; it does
not build one. The route receives an auth context; it does not decode a token.
This is also what makes the tests possible — the test suite overrides the
session dependency, which it could not do if a service opened its own.

**Functions do one thing at a readable length.** A service function that
authorises, queries, mutates, sends an email, and enqueues a job is five
functions. Split it and let the top-level one read like a summary of the steps.

**Early return over nesting.** Guard clauses at the top, happy path unindented
at the bottom. Three levels of nesting in a service function is usually a
missing early return.

**Names carry the meaning.** `organization_id`, not `oid`. `assigned_to_user_id`,
not `user2`. `get_or_create_one`, not `handle`. This is what makes the
no-comments rule work: a comment explaining a name is a signal to fix the name.
Booleans read as assertions (`is_active`, `has_premium_plan`). Async functions
that hit the database read as verbs (`list_items`, `assign_item`).

**Don't repeat a filter.** If four service functions each hand-write
`.where(Model.organization_id == org_id, Model.deleted_at.is_(None))`, the fifth
one will forget half of it. Factor the base query into one small helper the rest
build on — this is the one place in a backend where DRY is a security control
rather than a matter of taste.

**Depend on the module's public surface.** Import from another module's
`service` and `schemas`; don't reach into its internals or query its tables
directly from your module. Cross-module table access is how two modules end up
with two different ideas of the same rule.

**No speculative flexibility.** No abstract base class with one implementation,
no strategy pattern for a branch that has two cases, no configuration flag
nobody asked for. Delete the layer that only exists in case someone needs it.

**YAGNI beats clever.** The simplest thing that satisfies the request and the
design rules is the right thing, and it's also the thing the next reader can
change safely.

---

## 8. Commands

Everything runs inside the backend container. Check the project's
`commands doc` for the current canonical list — but note that
file can drift from what's actually installed, so trust a failed command over
the doc.

```bash
# Lint — scope to what you touched; the repo has a large pre-existing backlog,
# so a whole-repo run buries your real problems in unrelated ones.
docker exec <backend container> bash -c "cd /app && ruff check app/modules/<mod>/"
docker exec <backend container> bash -c "cd /app && ruff format app/modules/<mod>/"

# Types — strict mode is noisy against SQLModel. Scope it, and compare against
# what the file reported before your change rather than chasing zero.
docker exec <backend container> bash -c "cd /app && mypy app/modules/<mod>/"

# Tests — full suite
docker exec <backend container> bash -c \
  "cd /app && python -m pytest tests/ -c /dev/null -o asyncio_mode=auto -o testpaths=tests"

# Tests — one file or one test
docker exec <backend container> bash -c \
  "cd /app && python -m pytest tests/modules/<mod>/test_x.py::test_y -v \
   -c /dev/null -o asyncio_mode=auto -o testpaths=tests"

# Migrations — read the design rules on migrations before generating anything
docker exec <backend container> alembic current
docker exec <backend container> alembic upgrade head
docker exec <backend container> alembic downgrade -1

# Did the route actually mount?
curl -s http://localhost:8000/openapi.json | python3 -c \
  "import sys,json; d=json.load(sys.stdin); [print(m.upper(), p) for p, ms in d['paths'].items() for m in ms]"

# Logs, and a restart when hot-reload misses a change
docker logs <backend container> -f
docker restart <backend container>
```

Do not run `alembic downgrade base`, do not delete migration files on a shared
branch, and do not force-push a shared branch.
