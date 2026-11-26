# Testing setup reference

Two layers: a **unit runner** (Vitest or Jest) for component/logic, and
**Playwright** for e2e. Extend what exists; only scaffold what's missing.

## Detect first

Before installing anything, check `package.json`:
- If a unit runner (`vitest`, `jest`) is already a devDependency, use it; don't
  add a second one.
- Playwright is often already present (`@playwright/test`). Reuse the existing
  `e2e/` directory and config rather than creating a parallel harness.

## Typical Vitest setup

`vitest.config.ts` (default environment, path alias mirroring tsconfig
`paths`, a setup file), colocated `*.test.ts(x)`. DOM tests use jsdom, either
by config or a per-file `// @vitest-environment jsdom` first line. Only in a
repo with no runner: install Vitest, React Testing Library and jest-dom, ask
first, and mirror the tsconfig `paths` alias.

## What a good unit test covers

Beyond the happy path, these are where real bugs live:
- Loading / empty / error render states.
- Role-gated UI: element present for allowed role, absent for others.
- Boundary inputs: empty string, max length, zero, negative, unicode.
- Form validation: each invalid case produces the expected message.
- Callback wiring: the right handler fires with the right args on interaction.

Mock the API client layer (the project's fetch wrapper), not global `fetch`, so
tests exercise the same path production does.

## Playwright e2e

- Add specs to the existing `e2e/` dir; follow the existing spec's structure
  (selectors, fixtures, auth setup).
- Cover the critical path end-to-end. Where the backend runs in the test env,
  assert the real integrated flow; otherwise document that it's stubbed.
- Prefer role/label/text selectors over brittle CSS/nth-child.

## Running

```bash
npm test            # unit
npm run test:e2e    # e2e
```

Report the actual output. If something fails, quote the failing assertion;
don't paraphrase "some tests failed."
