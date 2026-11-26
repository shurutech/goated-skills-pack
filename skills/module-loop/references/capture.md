# Capturing variants from the running app

The worktree needs a real install. A hardlinked or symlinked `node_modules` can
fail under some bundlers (Turbopack does), and the main checkout's copy is often
stale (a missing PostCSS plugin after a CSS-framework upgrade renders every page
unstyled with only a console error to show for it).

```
npm ci
npm run dev   # with whatever env flag enables your dev-only routes
```

## Why Playwright and not an agent's browser tab

A browser tab driven by an extension may be hidden: no rAF, no relayout on
resize. Responsive and layout-sensitive captures must use Playwright with an
explicit viewport.

## The script

Two things are usually required or every authed route redirects to sign-in: a
seeded session (in `localStorage`, a cookie, whatever the app reads) and a
stubbed API. Copy the shape from the app's own e2e helpers if it has them.

```js
import { chromium } from "playwright";
const SESSION_KEY = "app-session";
const SESSION = {
  token: "t",
  user: { id: "u1", email: "owner@example.com", name: "Owner" },
  organization: { id: "o1", name: "Example Org" },
  role: { id: "r1", name: "Owner" },
};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await context.addInitScript(({ key, payload }) => window.localStorage.setItem(key, payload),
  { key: SESSION_KEY, payload: JSON.stringify(SESSION) });
const page = await context.newPage();
await page.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await page.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify(SESSION) }));
page.on("console", (m) => m.type() === "error" && console.log("ERR", m.text().slice(0, 200)));
await page.goto("http://localhost:3000/<module>-redesign", { waitUntil: "networkidle" });
```

The script must live inside the worktree, Playwright resolves from the
project's `node_modules`, not from a scratch path outside it.

## Element captures

Hide only genuinely sticky or fixed app chrome, and scope it by computed position
rather than by class name, a selector like `[class*='rail']` will also hide the
thing you are trying to photograph.

```js
await page.evaluate(() => {
  for (const el of document.querySelectorAll("body *")) {
    const pos = getComputedStyle(el).position;
    if ((pos === "sticky" || pos === "fixed") && !el.closest(".v-frame")) el.style.visibility = "hidden";
  }
});
```

Give each captured section padding and a ground colour, or content sits flush to
the pixel edge and reads as cropped.

Before claiming something is clipped or not, measure it:

```js
await el.evaluate((n) => ({ scrollW: n.scrollWidth, clientW: n.clientWidth }));
```

## Verify, do not eyeball

Read computed style for any colour, weight or size you are about to describe.

```js
await page.evaluate(() => getComputedStyle(document.querySelector(".x")).color);
```

An icon button sized with `flex:none` collapses to its content height, pin the
height explicitly and assert it matches its sibling.

## Park the cursor before every shot

After any click, move the mouse to a neutral spot before capturing. A hovered
primary button can render in a tone that an owner reads as disabled, and the
top-left corner may hover an expanding sidebar.

```js
await page.mouse.move(1000, 30);
```

## Avoid `fullPage: true` on app shells

A full-page capture of a shell page taller than the viewport can show blank
columns where sticky/fixed chrome stops at the old viewport height. The live
layout is fine; the capture is not, and it will be read as broken UI. Resize to
the page height instead:

```js
const h = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewportSize({ width: 1480, height: Math.max(1000, h) });
await page.waitForTimeout(1200);
await page.screenshot({ path });
```
