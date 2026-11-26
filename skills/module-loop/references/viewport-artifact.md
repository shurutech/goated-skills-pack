# Viewport preview: the live app at real widths

Start from `live-artifact.md` (package.sh,
mock-body.js, fixtures, click test, publish to the same URL). The only change is
the wrapper: `index.example.html` there renders a 1440px iframe and `scale()`s
it to fit. For responsive work that hides the very thing under review: a
scaled desktop is not a phone, and the app's media and container queries never
fire. Replace the frame part with this.

## Wrapper changes

1. **The device box sets the real width.** The iframe is `width: 100%` inside a
   `.device` box whose width is the preset. The app inside sees a real
   viewport of that width, so `max-md:` and `@container` behave exactly as on a
   phone.
2. **Free resize is native.** `resize: horizontal; overflow: hidden` on
   `.device` gives a drag handle with no JS. A `ResizeObserver` on the device
   picks up the dragged width, so the next pane resize keeps it instead of
   snapping back to the preset.
3. **Only presets above 1024 scale**, and only when the pane is narrower. The
   readout says so ("1440px, shown at 72%"). While scaled, the drag handle is off
   because a native handle under `transform` tracks the pointer wrongly. At 1024
   and below the device is always 100%, and the pane scrolls if it is narrower.
4. **Changing width must not reload the app.** Only a variant, role or
   start-page change recreates the iframe. A drawer you opened stays open while
   you drag the width. That is how the owner sees what happens on rotate or resize.
5. **Orientation toggle** swaps width and height (390x844 to 844x390).
6. **`outline`, not `border`,** draws the device edge. A border inside a
   `border-box` page eats 2px and the app sees 388 instead of 390.

```html
<span class="lab" id="w-lab">Width</span>
<div class="seg" role="group" aria-labelledby="w-lab" id="widths">
  <button type="button" data-w="320" data-h="640">320</button>
  <button type="button" data-w="375" data-h="667">375</button>
  <button type="button" data-w="390" data-h="844" aria-pressed="true">390 phone</button>
  <button type="button" data-w="768" data-h="1024">768 tablet</button>
  <button type="button" data-w="1024" data-h="768">1024</button>
  <button type="button" data-w="1280" data-h="800">1280</button>
  <button type="button" data-w="1440" data-h="900">1440 desktop</button>
</div>
<button type="button" id="rotate">Rotate</button>
<span class="lab" id="w-now" aria-live="polite"></span>
```

```css
.frame { flex: 1; min-height: 0; overflow: auto; padding: 16px; background: var(--soft) }
.device { box-sizing: content-box; resize: horizontal; overflow: hidden; min-width: 320px; margin-inline: auto; outline: 1px solid var(--line); border-radius: 12px; background: #fff; transform-origin: top left }
.device.scaled { resize: none; margin-inline: 0 }
.device iframe { display: block; width: 100%; height: 100%; border: 0 }
```

```js
var box = document.getElementById("frame");
var dev = document.createElement("div"); dev.className = "device";
box.appendChild(dev);
var w = 390, h = 844, s = 1;
function size() {
  var room = box.clientWidth - 32;
  s = w > 1024 && room < w ? room / w : 1;
  dev.style.width = w + "px"; dev.style.height = h + "px";
  dev.style.transform = s < 1 ? "scale(" + s + ")" : "";
  dev.classList.toggle("scaled", s < 1);
  readout();
}
function readout() {
  document.getElementById("w-now").textContent = w + "x" + h + "px" + (s < 1 ? ", shown at " + Math.round(s * 100) + "%" : "");
}
size();
new ResizeObserver(function () {
  if (s === 1 && dev.offsetWidth !== w) { w = dev.offsetWidth; readout(); }
}).observe(dev);
new ResizeObserver(size).observe(box);
document.querySelectorAll("#widths button").forEach(function (b) {
  b.onclick = function () {
    w = +b.dataset.w; h = +b.dataset.h;
    document.querySelectorAll("#widths button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    size();
  };
});
document.getElementById("rotate").onclick = function () { var t = w; w = h; h = t; size(); };
```

`render()` appends the iframe to `dev` instead of `#frame`, and `fit()` goes away.
Keep the width in `localStorage` (try/catch) like the variant.

## Notes fold for a responsive round

What changes at each width, per surface. What stays identical on desktop (say
"1440 unchanged, 0 baseline diffs" only after the visual check ran). The one
call the owner has to make, with your pick. Plain sentences, no dashes, no arrows.

## Click test additions (`test.example.mjs`)

For each preset and each option: load, assert no horizontal page scroll inside
the frame (`frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth)`),
open the nav drawer, open More actions if the option has it, open one dialog,
then drag `.device` from 390 to 1024 with a drawer open and check nothing
throws on `pageerror`.

## Touch and pointer

An iframe in a desktop browser can't emulate touch, `pointer: coarse` or
`hover: none`, so `(hover: hover)` branches show their desktop form in the
artifact. Say so in the notes. Two things cover it:

- Playwright with `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`
  in the module's spec (set it per describe block if the config has a single
  browser project).
- A short "check on your phone" list in the notes fold for anything only a
  real device shows (keyboard over a sheet, safe area, rubber-band scroll).
