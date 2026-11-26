# Frontend conventions for a modern pinned stack

Written against: next 16, react 19.2, @tanstack/react-query 5, tailwindcss 4,
eslint 9 (flat config), typescript 5.9, vitest 4, @playwright/test 1.6x. These
are the things models trained on older versions get wrong. **Check your
lockfile**: where your versions or your repo's habits differ, the repo wins.
Repo rules (AGENTS.md, design rules) outrank this file.

## Next 16

- If your app is a static export (`output: "export"`), do not suggest or write
  anything that needs a server: `proxy.ts` / `middleware.ts`, cookies or
  `headers()`, Server Actions, server route handlers, ISR or `revalidate*`,
  rewrites/redirects/headers in `next.config`, Cache Components (`use cache`),
  intercepting routes, the default image loader. Detail pages read ids from a
  query param instead of a dynamic segment.
- Where `params` or `searchParams` are used as props in Next 16, they are async
  and must be awaited (`use()` in a client component). A bare `useSearchParams`
  in a shell needs a Suspense boundary.
- `next build` does not lint, and may not typecheck if `ignoreBuildErrors` is
  set. Run lint and typecheck as separate gates.
- Turbopack is the default for dev and build; do not add webpack-only config.

## React 19.2

- `ref` is a normal prop; do not write `forwardRef` in new code. A ref callback
  that returns a value is treated as a cleanup function, so use a block body:
  `ref={(el) => { node = el; }}`, not `ref={(el) => (node = el)}`.
- `<Context value={...}>` replaces `<Context.Provider>`. New code may use the
  short form; do not rewrite existing ones in an unrelated diff.
- `propTypes`, `defaultProps` on function components, string refs and
  `ReactDOM.render` are removed. `use()` reads a promise or context.
- `useEffectEvent` is for effect callbacks that must read the latest props or
  state without re-triggering the effect.
- Effects are for syncing with something outside React. Derive values during
  render; do not mirror props into state; fetch with a query hook, not
  `useEffect` plus `useState`.
- Without the React Compiler enabled, add `useMemo`, `useCallback` or `memo`
  only for a measured problem, with the measurement in the PR body.

## TanStack Query 5

- Single options-object signature only: `useQuery({ queryKey, queryFn })`.
- `isPending` means no data yet; `isLoading` is `isPending && isFetching`. Use
  `isPending` for the first-load skeleton.
- `cacheTime` is `gcTime`. `keepPreviousData` is
  `placeholderData: keepPreviousData`.
- `onSuccess`, `onError`, `onSettled` are gone from `useQuery`; they remain on
  mutations. React to query results in render or an effect.
- `throwOnError` replaces `useErrorBoundary`.
- Keys come from one central key factory, scoped by user and tenant, and include
  every variable the query function reads. After a mutation, invalidate by key
  prefix, not by guessing a full key.
- Follow the repo's existing pattern (custom hooks vs `queryOptions()`
  factories); do not introduce a second one in a feature diff.

## Tailwind 4

CSS-first: no `tailwind.config.js` by default; theme tokens live in CSS
(`@theme`), and the PostCSS plugin is `@tailwindcss/postcss`. If shared
component CSS is imported into `layer(components)`, a utility overrides a
component class. Renames models still get wrong:

| v3 | v4 |
|---|---|
| `shadow-sm` / `shadow` | `shadow-xs` / `shadow-sm` (same shift for `rounded`, `blur`, `drop-shadow`) |
| `outline-none` | `outline-hidden` (`outline-none` now truly removes the outline) |
| `ring` (3px) | `ring-3` (bare `ring` is 1px) |
| `bg-opacity-50` | `bg-black/50` |
| `flex-shrink-*`, `flex-grow-*` | `shrink-*`, `grow-*` |
| `!bg-red-500` | `bg-red-500!` (important modifier goes last) |
| `bg-gradient-to-r` | `bg-linear-to-r` |

Also: the default border and ring colour is `currentColor`, so state a colour;
`hover:` applies only on hover-capable devices; stacked variants apply left to
right.

## ESLint 9 flat config

`eslint.config.mjs` (flat). There is no `.eslintrc` and no `next lint`. If the
repo ratchets warnings (a baseline file of allowed violations), a new
violation or `eslint-disable` is a rise and is fixed in code, not recorded.

## Accessibility

Native elements first (`button`, `a`, `label`, `dialog`), visible focus,
labelled controls, keyboard operability, `aria-*` only to fill gaps. Test with
role and label queries (`getByRole`, `getByLabelText`). Do not claim an axe
pass unless axe tooling is installed and was run.

## Tests (Vitest 4, RTL 16, Playwright)

Component and hook tests in Vitest with React Testing Library (jsdom via config
or a per-file environment pragma); mock the API client layer, not global
`fetch`. Playwright for the critical path: web-first assertions
(`expect(locator).toBeVisible()`), role locators, no `waitForTimeout`. Visual
baselines only where the UI is stable.
