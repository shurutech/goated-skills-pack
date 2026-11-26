# Testing backend changes

> Written from a real multi-tenant FastAPI + Postgres codebase. Names, fixtures, paths and commands are examples: map them to your repo before following them literally.

pytest with `pytest-asyncio` in auto mode, and httpx driving the FastAPI app
in-process through `ASGITransport` — so a test makes a real request through the
real middleware, dependencies, and error handlers, against a real Postgres,
without a network hop or a running server.

---

## 1. How the harness works

Read `tests/conftest.py` before writing tests. The important mechanics:

**Tests run in a transaction that rolls back.** The `session` fixture opens an
async session and rolls it back at the end, so tests don't leave rows behind
even though they share the development database. Do not commit for real inside
a test to "make it stick" — that's how a test suite starts poisoning the
database it runs against.

**The session is injected into the app.** The fixture overrides the app's
session dependency so the request handler and the test body share one session
and one transaction. This is the payoff of taking the session as a dependency
instead of building it inside a service: the test can substitute it.

**The environment is pinned before any app import.** `conftest.py` sets `ENV`
at the top, above the imports, because the settings object is constructed and
cached on first import. Any module-level import that pulls in settings before
that line silently gets the wrong configuration. If you add an import to
`conftest.py`, keep it below that line and keep the `noqa` markers that are
already there.

**Test layout mirrors the app.** `tests/modules/<module>/`,
`tests/integrations/<name>/`, `tests/shared/`, `tests/workers/`, and
`tests/cross_org/` for isolation tests. Put your test where the code lives.

---

## 2. The fixtures

| Fixture | What you get |
|---|---|
| `session` | Async session, rolled back at the end |
| `unauthenticated_client` | Client with no auth header — for signup, signin, health, and 401 checks |
| `client` | Client authed as a fresh signup, premium plan, with the bearer token already in the default headers |
| `current_user` | The user record behind `client` |
| `current_tenant` | The organization record behind `client` |
| `auth_session` | The raw signup result, when you need the token or ids directly |
| `other_tenant_client` | A second user in their **own** organization — the cross-org isolation fixture |

Reach for `client` by default. Use `unauthenticated_client` only when the point of the
test is the unauthenticated path.

---

## 3. Shape of a test

```python
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_creating_an_item_returns_it(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/items",
        json={"name": "Org A Item", "email": "a@example.com"},
    )

    assert response.status_code == 201
    assert response.json()["item"]["name"] == "Org A Item"
```

Points worth copying:

- **Full path including the version prefix.** `/api/v1/items`.
- **Assert the status code first**, before digging into the body. When a request
  fails, `response.json()["item"]` raises a `KeyError` that tells you nothing;
  the status-code assertion tells you it was a 422 and shows you the body.
- **Assert on the response body's real shape.** If the API wraps its payload in
  an envelope, the test asserts through the envelope. That's a free check that
  you didn't change the contract by accident.
- **One behaviour per test**, and the test name says the behaviour. Not
  `test_items_1`.

---

## 4. The tests that aren't optional

These are the failures that reach production quietly, because the happy path
keeps working.

**Cross-org isolation — the highest-value backend test there is.** For any new
endpoint that reads or writes a business table, `other_tenant_client` must not be
able to see or touch the first organization's record:

```python
@pytest.mark.asyncio
async def test_items_invisible_across_orgs(
    client: AsyncClient, other_tenant_client: AsyncClient
) -> None:
    created = await client.post("/api/v1/items", json={...})
    item_id = created.json()["item"]["id"]

    listed = await other_tenant_client.get("/api/v1/items")
    assert item_id not in [item["id"] for item in listed.json()["items"]]

    fetched = await other_tenant_client.get(f"/api/v1/items/{item_id}")
    assert fetched.status_code == 404      # 404, not 403 — a 403 confirms it exists
```

Cover both the list endpoint and the detail-by-id endpoint. The list case
catches a missing organization filter; the detail case catches a service that
looks a row up by primary key alone. They're different bugs.

The 404-not-403 point is a real rule, not a preference: a 403 tells the caller
"this record exists but isn't yours", which is enough to enumerate another
customer's records. Check the project's design rules for which endpoints this
applies to.

**Role boundaries.** Every role the endpoint should refuse gets a test asserting
the refusal, with the status code the design rules name. Don't test only the
owner path — the owner path is the one that works.

**The unauthenticated path.** No token means 401. Use `unauthenticated_client`. This
catches a route that was accidentally registered without its auth dependency,
which no other test will notice.

**Validation failures.** A missing required field, a malformed UUID, an
out-of-range number. Assert 422 and, where it matters, that the error names the
offending field.

**The empty and soft-deleted cases for list endpoints.** An empty list is a
valid response, not an error. A soft-deleted row must not come back.

**The migration, if you wrote one.** Run `upgrade head`, then `downgrade -1`,
then `upgrade head` again, and confirm the data survived. A migration is code;
an untested downgrade is a footgun handed to whoever is on call.

---

## 5. Writing tests that don't lie

**Turn the request into a failing test first.** Write the test, watch it fail
for the reason you expect, then make it pass. A test written after the code and
never seen red is a test that might be asserting nothing.

**Assert the outcome, not the implementation.** Check the response and the
resulting rows, not that a particular internal function was called. Tests
coupled to internals block the refactor they were supposed to protect.

**Don't assert on a hardcoded id, timestamp, or generated email.** The fixtures
generate unique values per run; read ids out of responses instead.

**No `time.sleep` to wait for something.** If the thing is async, await it. If
it's queued, invoke the worker function directly in the test.

**A test that needs a comment to explain what it's checking needs a better
name.** The name is the specification.

---

## 6. Running them

```bash
# Everything
docker exec <backend container> bash -c \
  "cd /app && python -m pytest tests/ -c /dev/null -o asyncio_mode=auto -o testpaths=tests"

# One file
docker exec <backend container> bash -c \
  "cd /app && python -m pytest tests/modules/<mod>/test_x.py -v \
   -c /dev/null -o asyncio_mode=auto -o testpaths=tests"

# One test
docker exec <backend container> bash -c \
  "cd /app && python -m pytest tests/modules/<mod>/test_x.py::test_y \
   -v -c /dev/null -o asyncio_mode=auto -o testpaths=tests"
```

The `-c /dev/null -o ...` flags exist because the project config isn't picked up
from inside the container's working directory; keep them. Outside the container,
plain `uv run pytest` reads `pyproject.toml`, which sets `asyncio_mode = "auto"`
(so `@pytest.mark.asyncio` is redundant but harmless).

**pytest-asyncio 1.4 (locked).** The `event_loop` fixture no longer exists; do
not define one. If a fixture and its tests must share one loop, set
`asyncio_default_fixture_loop_scope` and `asyncio_default_test_loop_scope`
together in `pyproject.toml` rather than overriding on the command line.

Run your new tests first, then the module's whole test directory to catch what
you broke nearby. Run the full suite before reporting done.

**Report failures honestly, with the output.** If a test was already failing
before your change, say that explicitly and separately — don't fold it into
your summary as if you caused it, and don't quietly fix it inside an unrelated
diff either.
