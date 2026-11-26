import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const require = createRequire(process.cwd() + "/");
const { chromium } = require("@playwright/test");

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error(`usage: node responsive-probe.mjs <url> [url...]   (run from the frontend worktree)
  SETUP=file.mjs   module whose default export is async (page) => {} run before each goto (stub API, seed session)
  PRESETS=w x h,…  detailed report sizes (default phone, landscape, tablet, laptop, desktop)
  SWEEP=320:1440:16  overflow-only sweep range and step; SWEEP=0 turns it off`);
  process.exit(2);
}
const PRESETS = (process.env.PRESETS || "320x640,375x667,390x844,844x390,768x1024,1024x768,1280x800,1440x900")
  .split(",").map((s) => s.split("x").map(Number));
const [lo, hi, step] = (process.env.SWEEP ?? "320:1440:16").split(":").map(Number);
const setup = process.env.SETUP ? (await import(pathToFileURL(resolve(process.env.SETUP)).href)).default : null;

function scan(minTarget) {
  const vw = document.documentElement.clientWidth;
  const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
  const hidden = (el) => {
    if (el.closest("[inert],[aria-hidden=true],dialog:not([open])")) return true;
    const s = getComputedStyle(el);
    return s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0;
  };
  const fixed = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === "fixed") return true;
    return false;
  };
  const scrollerAbove = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if ((o === "auto" || o === "scroll") && p.getBoundingClientRect().right <= vw + 1) return true;
    }
    return false;
  };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "")
    + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "");
  const all = [...document.body.querySelectorAll("*")].filter((el) => !hidden(el));
  const culprits = (ignoreScrollers) => all.filter((el) => {
    if (fixed(el)) return false;
    const b = el.getBoundingClientRect();
    if (!b.width || b.right <= vw + 1) return false;
    const p = el.parentElement;
    const parentFits = !p || p === document.body || p.getBoundingClientRect().right <= vw + 1;
    return parentFits && (ignoreScrollers || !scrollerAbove(el));
  }).map((el) => `${name(el)} right edge ${Math.round(el.getBoundingClientRect().right)}`);
  let wide = overflow > 0 ? culprits(false) : [];
  if (overflow > 0 && !wide.length) wide = culprits(true);
  const boxes = all.filter((el) => el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && el !== document.body);
  const inner = boxes.filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowX))
    .map((el) => `${name(el)} scrolls ${el.scrollWidth}/${el.clientWidth}`);
  const clipped = boxes.filter((el) => /hidden|clip/.test(getComputedStyle(el).overflowX) && !fixed(el))
    .map((el) => `${name(el)} clips ${el.scrollWidth - el.clientWidth}px`);
  const sel = "a[href],button,[role=button],[role=tab],[role=menuitem],input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex='-1'])";
  const targets = all.filter((el) => el.matches(sel)).map((el) => ({ el, b: el.getBoundingClientRect() })).filter((t) => t.b.width && t.b.height);
  const inline = (el) => el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p,li,td,label");
  const under = (t) => t.b.width < minTarget || t.b.height < minTarget;
  const centre = (t) => [t.b.left + t.b.width / 2, t.b.top + t.b.height / 2];
  const small = targets.filter((t) => under(t) && !inline(t.el)).filter((t) => {
    const [cx, cy] = centre(t), r = minTarget / 2;
    return targets.some((o) => {
      if (o === t || o.el.contains(t.el) || t.el.contains(o.el)) return false;
      const dx = Math.max(o.b.left - cx, 0, cx - o.b.right), dy = Math.max(o.b.top - cy, 0, cy - o.b.bottom);
      if (Math.hypot(dx, dy) < r) return true;
      if (!under(o)) return false;
      const [ox, oy] = centre(o);
      return Math.hypot(ox - cx, oy - cy) < minTarget;
    });
  }).map((t) => `${Math.round(t.b.width)}x${Math.round(t.b.height)} ${name(t.el)} "${(t.el.innerText || t.el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`);
  const zoomInputs = vw < 768 ? all.filter((el) => el.matches("input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea")
    && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => `${name(el)} font ${getComputedStyle(el).fontSize}`) : [];
  return { overflow, wide, inner, clipped, small, zoomInputs };
}

const browser = await chromium.launch();
let failed = false;
const head = (list, n = 8) => list.slice(0, n).concat(list.length > n ? [`… ${list.length - n} more`] : []);
for (const url of urls) {
  for (const [width, height] of PRESETS) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1024, isMobile: width < 768 || height < 500 });
    const page = await ctx.newPage();
    if (setup) await setup(page);
    await page.goto(url, { waitUntil: "networkidle" });
    const r = await page.evaluate(scan, 24);
    failed ||= r.overflow > 0;
    console.log(`\n${url} @ ${width}x${height}  page overflow: ${r.overflow > 0 ? r.overflow + "px FAIL" : "none"}`);
    for (const w of head(r.wide)) console.log(`  wide     ${w}`);
    for (const c of head(r.clipped)) console.log(`  clipped  ${c}   (content cut off? judge)`);
    for (const i of head(r.inner)) console.log(`  scroller ${i}   (inner scroll, judge if intended)`);
    for (const s of head(r.small, 12)) console.log(`  target   ${s}   (under 24px, no 24px spacing)`);
    for (const z of head(r.zoomInputs)) console.log(`  ios-zoom ${z}`);
    await ctx.close();
  }
  if (step > 0) {
    const ctx = await browser.newContext({ viewport: { width: lo, height: 900 } });
    const page = await ctx.newPage();
    if (setup) await setup(page);
    await page.goto(url, { waitUntil: "networkidle" });
    const bad = [];
    for (let w = lo; w <= hi; w += step) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const o = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
      if (o > 0) {
        const last = bad.at(-1);
        if (last && last.to === w - step) Object.assign(last, { to: w, max: Math.max(last.max, o) });
        else bad.push({ from: w, to: w, max: o });
      }
    }
    failed ||= bad.length > 0;
    const ranges = bad.map((b) => (b.from === b.to ? `${b.from}` : `${b.from}-${b.to}`) + ` (up to +${b.max}px)`);
    console.log(`\n${url} sweep ${lo}-${hi} step ${step}: ${ranges.length ? "overflow at " + ranges.join(", ") + " FAIL" : "no page overflow at any width"}`);
    await ctx.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
