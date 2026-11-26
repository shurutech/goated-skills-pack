# Mode: responsive

Read after `SKILL.md`. The module keeps the look it has today and learns to fit every width. Same standing rules, preview and build tail as redesign.

## Settle scope first (ask the owner once)

- Target browsers. Example settled scope: Chrome only (desktop, Android, Chrome on iPhone, which runs WebKit underneath). For anything newer than ~2025 also check the Safari column on caniuse. Run every check in Playwright's Chromium.
- Widths: phone, tablet, desktop; floor 320px (WCAG 1.4.10). Include landscape phone 844x390 (wider than `md`, only 390 tall).
- Desktop is pixel identical at 1440x900. Zero existing baselines change without the owner's yes.
- Shell first: the app shell (nav, top bar) gets its own round before any module.
- 3 options per module, differing only in how small screens behave (round-1 count for this mode; after a pick, pick plus 2-3 variations).
- Action overflow is chosen per module: main action plus a "More actions" text button opening a sheet of labelled items, or every button visible via wrap or scroll strip. Never an icon-only ⋯ hiding actions, never fewer actions than desktop, and at 768 and above every button is visible as today.

## Read first

1. The design language, UI-patterns and design-rules docs (Phase 0 in `SKILL.md`). Same tokens and type scale at every width.
2. The shell round's decisions doc (`SHELL.md`) once it exists.
3. `references/evidence.md`: options cite research, not taste.

## Shell round (first round only)

Inventory what exists: media-query hooks and their queries, global stylesheet media blocks. Decide and write in `SHELL.md`:

- One breakpoint truth: `max-width: 768px` includes 768 but Tailwind `max-md:` is `< 768`. Pick one and align.
- Phone nav pattern: visible primary destinations beat hamburger alone. Options: bottom bar of 4-5 plus More, drawer with a "Menu" text label, tablet icon rail.
- Viewport meta: `viewport-fit=cover` (Next.js: `export const viewport = { viewportFit: "cover" }`) or every `env(safe-area-inset-*)` is 0.
- The sheet primitive for "More actions" and dialog-as-sheet, built on the existing drawer and dialog components.

## Surface inventory

List each surface (header and actions, tabs, table, list, card grid, side rail, master-detail, form, dialog, drawer, chart, board, drag and drop, filters, empty and loading states):

| Surface | file:line | What breaks (probe output, width range) | Candidate patterns |
|---|---|---|---|

Measure: `node <this skill>/scripts/responsive-probe.mjs <url>` from the frontend worktree (it resolves `@playwright/test` from the current directory). Easiest target is the preview's `local/` copy (has the API mock); against a dev server pass `SETUP=setup.mjs` (default export takes `page`, stubs the API, seeds the session). It sweeps 320-1440 every 16px for page overflow and, per preset, reports the culprit element, clipped content, inner scrollers, targets under 24px (WCAG 2.5.8) and phone inputs under 16px. Exit 1 on any page overflow. It sees the first state only; open drawers, sheets and dialogs are e2e's job. Sweeps enumerate routes, tabs and popups.

Also grep for fixed widths (`min-w-[1100px]`), missing `flex-wrap`, `100vh`, `group-hover:` reveals with no tap path, and media-query hook call sites. The parity table covers every button, state, link and dialog at desktop, tablet and phone.

## Research per scenario

Search each scenario a surface presents (9-column table on a 375px phone, master-detail on a tablet, sticky rail below 1024px, canvas on touch, multi-step dialog on a phone). Find 3-5 real products, the named pattern, its known failure, any study. Prefer 2024+ sources; a pre-2020 practice needs a newer source. Append to the module's `RESEARCH.md` with links. `references/responsive-patterns.md` is where research starts, not a replacement.

## Options in the real app

Each option names, per surface, its pattern and the research line behind it, and is genuinely different (cards, priority columns, sticky first column plus scroll).

**Switch.** Responsive edits are class additions, so no legacy copy. Read `window.name` (set by the preview wrapper, `references/live-artifact.md` step 1) in a dev-only helper and pick classes from it. Avoid reading search params in the shell if that breaks a static export. Delete the helper at ship.

**Keep desktop unmoved:**

- Keep every existing class and add `max-lg:`, `max-md:`, `max-sm:` overrides. Mobile-first rewrites drift by a pixel.
- `@container` adds layout containment: the element becomes the containing block for fixed/absolute descendants, starts a stacking context, stops sizing to content. Use it on variable-width panes only after checking those descendants; name nested ones (`@container/rail`).
- CSS before JS. A JS media-query hook only when the DOM must differ. Polarity: its server snapshot is usually `false`, so make `false` the desktop tree by querying `max-width`, never `min-width`. Render one tree; never mount both and hide one.
- `dvh` for full-height layouts; on sheets and forms keep the focused input and submit button above the keyboard (`visualViewport` if CSS cannot).
- Safe-area via `pb-[env(safe-area-inset-bottom)]`, only after the shell's `viewport-fit=cover` lands.
- Phone inputs at least 16px (WebKit zooms on focus).
- Targets at least 24x24 or 24px apart; aim ~44 on phone primary actions, extra room at edges and corners. Enlarge hit area with padding.
- Every hover-only affordance gets a tap or focus path; gate hover reveals on `(hover: hover)`.
- Layout survives 200% text at 390 and 1440 with no clipped labels.

## Preview

Follow `references/live-artifact.md`, but replace the wrapper's scaled 1440 frame with the real-width device box in `references/viewport-artifact.md` (presets including landscape, drag handle, rotate). Everything clickable: nav drawer, More sheet, cards, dialogs as sheets. Run the probe on every option before each round; any page overflow at any width means the round does not go out. Things only a real phone shows (keyboard over a sheet, toolbar, safe area) go to the owner as a short "check on your phone" list in the preview notes.

## Gate additions

- Desktop gate: the visual-baseline job exactly as CI runs it, no update. Any 1440 diff is a bug in this PR.
- Hydration check: one spec loads each changed route at 1440 and screenshots at `domcontentloaded`, catching a media-query tree that flashes the phone layout first.
- New baselines per width: in the module's visual spec add `test.describe` blocks with `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })` and a 768x1024 block; generate with `--update-snapshots=missing -g`.
- Behaviour spec at 320, 390, 768 and 844x390: no page overflow per route; nav drawer and More sheet open, trap focus, close on Escape, return focus; a dialog opens as a sheet.
- Bundle size check: JS a phone layout adds is paid by desktop too.
- The PR body lists each surface and its pattern at each width.

## Mode traps

1. A scaled iframe judged as a phone: use real widths.
2. Mobile-first rewrite, `@container` or `min-width` media hook moving desktop.
3. A module round before the shell round.
4. Data dropped at narrow widths.
5. Only checking presets: failures sit between them.
6. `overflow:hidden` counted as fixed: it clips; read each `clipped` line.
7. `100vh` sheets, safe-area without `viewport-fit=cover`, keyboard covering submit.
8. Probing in a hidden browser tab that never relayouts: use Playwright with an explicit viewport.
9. Landscape phones treated as tablets.
