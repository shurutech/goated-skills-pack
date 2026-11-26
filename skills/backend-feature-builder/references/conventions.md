# Backend conventions for a pinned stack

Written against: fastapi 0.119 (pinned `<0.120`), starlette 0.48, sqlmodel
0.0.x, sqlalchemy 2.0, alembic 1.x, pydantic 2.x, arq 0.28, pytest 9,
pytest-asyncio 1.x, Python `>=3.12`. **Re-read your lockfile**: if your pins
differ, check the installed source before trusting any line below. Your repo's
design rules and ADRs outrank this file; language and framework details live in
`python-fastapi-standards.md`, migrations in `alembic-and-schema.md`, tests in
`testing-setup.md`.

## Pinned FastAPI: do not use newer APIs

Newer FastAPI docs describe features an older pin does not have. Before using
anything you saw in current docs, confirm it exists in the installed package
(`python -c "import fastapi, inspect; ..."` or grep site-packages). Examples
absent at 0.119: `Depends(..., scope="function")`, `fastapi.sse` /
`EventSourceResponse`, `app.frontend()`, `strict_content_type`, native
`telemetry=`. Anything that needs a newer FastAPI is a dependency-bump decision
for the owner and its own PR, not a side edit in a feature.

What applies at 0.119:
- `Annotated[..., Depends(...)]` aliases declared once at module level.
- No `...` (Ellipsis) as a default for required parameters or model fields; no
  `RootModel` (use `Annotated[list[int], Field(min_length=1), Body()]`).
- A return type annotation matching `response_model` on every route.
- Router-level `prefix`, `tags` and shared `dependencies` on the `APIRouter`, not
  in `include_router()`; one HTTP operation per function.
- Class dependencies: prefer a plain function dependency that returns the object
  over `Depends()` on a class.
- Sync (`def`) dependencies and routes run in a threadpool; in an async
  codebase, a blocking library call inside `async def` goes to
  `asyncio.to_thread` or the worker queue.

## SQLAlchemy 2.0 async (notes for when you touch it)

Not mandates; apply when the diff touches the item.
- Session factory: `async_sessionmaker(..., expire_on_commit=False)` when routes
  commit and then return objects. Do not create a second factory with the
  default.
- Touching a relationship or serializing a model after a query: a lazy load on an
  async session raises `MissingGreenlet`. Load eagerly (`selectinload`), or declare
  the relationship `lazy="raise"` so a forgotten load fails loudly instead of
  hanging a request. Add `lazy="raise"` only to a relationship you are already
  changing.
- Touching `asyncio.gather`: never share one `AsyncSession` across branches; give
  each branch its own session, or use one `IN` query.
- Touching engine or lifespan code: `await engine.dispose()` at shutdown.
- SQLModel 0.0.x: `sa_type` plus `sa_column_kwargs` in shared mixins, never
  `sa_column=Column(...)` (a Column belongs to one table).

## Migrations

Alembic on Postgres. Safety rules (expand/contract, `lock_timeout`,
`CONCURRENTLY` in an autocommit block, batched backfill) are in
`alembic-and-schema.md` section 2.

## Python 3.12+ typing

Modern syntax (`str | None`, `list[str]`). If the repo puts
`from __future__ import annotations` at the top of every module, keep it in
files you edit and add it to new ones.

## pytest-asyncio 1.x

The `event_loop` fixture is gone (removed in 1.0); do not write one. With
`asyncio_mode = "auto"` in `pyproject.toml`, `@pytest.mark.asyncio` is
redundant but harmless. See `testing-setup.md` for loop scope.

## arq workers (or any job queue)

Jobs take ids, never ORM objects; open their own session; are safe to run twice;
and the worker declares `max_tries` and `job_timeout`. Check an existing job in
your repo first.
